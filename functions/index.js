import { getAuth } from 'firebase-admin/auth';
import { auth as authTriggers } from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { defineBoolean } from 'firebase-functions/params';
import { GoogleAuth } from 'google-auth-library';
import { PACKAGE, PRODUCTS, hash, normalizePurchase, bestEntitlement } from './billing.js';
initializeApp();
const db = getFirestore();
const enabled = defineBoolean('BILLING_ENABLED', {default:false});
const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/androidpublisher']});
const options = {region:'asia-southeast2', timeoutSeconds:60, maxInstances:10};
function user(request) {
  if (!request.auth) throw new HttpsError('unauthenticated','Masuk dengan Google terlebih dahulu.');
  if (!enabled.value()) throw new HttpsError('failed-precondition','Pembayaran belum diaktifkan oleh pengelola.');
  return request.auth.uid;
}
async function play(path, method='GET', data) {
  const client = await auth.getClient();
  const result = await client.request({url:`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/${path}`,method,data});
  return result.data;
}
async function verify(uid, productId, token) {
  const product = PRODUCTS[productId];
  const encoded = encodeURIComponent(token);
  const purchase = product.type === 'subs'
    ? await play(`subscriptionsv2/tokens/${encoded}`)
    : await play(`products/${productId}/tokens/${encoded}`);
  const state = normalizePurchase(productId, purchase, uid);
  const reference = db.doc(`billingPurchases/${hash(token)}`);
  // Bind a token to exactly one Firebase UID. Never store tokens in client-readable paths.
  await db.runTransaction(async tx => {
    const old = await tx.get(reference);
    if (old.exists && (old.data().ownerHash || hash(old.data().uid)) !== hash(uid)) throw new HttpsError('permission-denied','Pembelian sudah terkait dengan akun lain.');
    tx.set(reference, {uid, ownerHash:hash(uid), productId, token, updatedAt:FieldValue.serverTimestamp()}, {merge:true});
  });
  if (state.active && !state.acknowledged) {
    await play(`${product.type === 'subs' ? 'subscriptions' : 'products'}/${productId}/tokens/${encoded}:acknowledge`, 'POST', {});
  }
  await db.doc(`users/${uid}/billingPurchases/${hash(token)}`).set({productId,registeredAt:FieldValue.serverTimestamp()}, {merge:true});
  return state;
}
async function refresh(uid) {
  await getAuth().getUser(uid);
  const purchases = await db.collection('billingPurchases').where('uid','==',uid).get();
  const states = await Promise.all(purchases.docs.map(async doc => {
    const {productId,token} = doc.data();
    try { return await verify(uid,productId,token); }
    catch(error) {
      const status = error.response?.status;
      if (status === 404 || status === 410) return {active:false};
      throw error; // Network/permission failures must not masquerade as cancellation.
    }
  }));
  const entitlement = bestEntitlement(states);
  await db.doc(`users/${uid}/premium/current`).set({...entitlement,verifiedAt:FieldValue.serverTimestamp()});
  return entitlement;
}
export const billingStatus = onCall(options, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated','Masuk dengan Google terlebih dahulu.');
  if (!enabled.value()) return {enabled:false,entitlement:{active:false}};
  try { return {enabled:true,entitlement:await refresh(request.auth.uid)}; }
  catch { throw new HttpsError('unavailable','Status Premium belum bisa diverifikasi. Coba lagi.'); }
});
export const verifyPlayPurchase = onCall(options, async request => {
  const uid = user(request);
  const {productId,token} = request.data || {};
  if (typeof productId !== 'string' || !Object.hasOwn(PRODUCTS,productId) || typeof token !== 'string' || token.length < 10 || token.length > 4096) throw new HttpsError('invalid-argument','Data pembelian tidak valid.');
  try {
    await verify(uid,productId,token);
    return {entitlement:await refresh(uid)};
  } catch(error) {
    if (error instanceof HttpsError) throw error;
    if (error.message === 'account-mismatch') throw new HttpsError('permission-denied','Gunakan akun FinanceTrack yang melakukan pembelian.');
    throw new HttpsError('unavailable','Pembelian belum bisa diverifikasi. Gunakan Pulihkan pembelian setelah koneksi tersedia.');
  }
});
// Configure Play Console RTDN to projects/<project>/topics/financetrack-play-billing.
export const playBillingNotification = onMessagePublished({...options,topic:'financetrack-play-billing',retry:true}, async event => {
  const message = event.data.message.json;
  if (!enabled.value() || message.packageName !== PACKAGE || message.testNotification) return;
  const token = message.subscriptionNotification?.purchaseToken || message.oneTimeProductNotification?.purchaseToken || message.voidedPurchaseNotification?.purchaseToken;
  if (!token) return;
  const record = await db.doc(`billingPurchases/${hash(token)}`).get();
  if (!record.exists) return; // The authenticated app registers new purchases.
  const {uid} = record.data();
  try { await refresh(uid); }
  catch(error) { throw new Error('Play verification temporarily unavailable'); }
});

async function removeBillingData(uid) {
  const records = await db.collection('billingPurchases').where('uid','==',uid).get();
  for (const record of records.docs) {
    await record.ref.set({ownerHash:hash(uid),productId:record.data().productId});
  }
  await db.recursiveDelete(db.collection(`users/${uid}/billingPurchases`));
  await db.recursiveDelete(db.collection(`users/${uid}/premium`));
}
export const deletePremiumData = onCall(options, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated','Login diperlukan.');
  if (Date.now()/1000 - Number(request.auth.token.auth_time || 0) > 300) throw new HttpsError('failed-precondition','Login ulang sebelum menghapus akun.');
  await removeBillingData(request.auth.uid);
  return {deleted:true};
});
// Also clean up when Auth is deleted outside the application.
export const cleanupDeletedPremiumAccount = authTriggers.user().onDelete(account => removeBillingData(account.uid));
