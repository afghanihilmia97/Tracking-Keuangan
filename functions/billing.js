import { createHash } from 'node:crypto';
export const PACKAGE = 'com.financetrack.harian';
export const PRODUCTS = {
  financetrack_premium_monthly: {plan:'monthly',type:'subs'},
  financetrack_premium_annual: {plan:'annual',type:'subs'},
  financetrack_premium_lifetime: {plan:'lifetime',type:'inapp'},
};
export const hash = value => createHash('sha256').update(value).digest('hex');
export function normalizePurchase(productId, purchase, uid, now = Date.now()) {
  const product = typeof productId === "string" && Object.hasOwn(PRODUCTS,productId) ? PRODUCTS[productId] : null;
  if (!product) throw new Error('unsupported-product');
  const account = product.type === 'subs'
    ? purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId
    : purchase.obfuscatedExternalAccountId;
  if (account !== hash(uid)) throw new Error('account-mismatch');
  if (product.type === 'inapp') return {
    active: purchase.purchaseState === 0,
    plan: product.plan, source:'lifetime', expiresAt:null,
    acknowledged:purchase.acknowledgementState === 1,
  };
  const states = ['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'];
  const items = (purchase.lineItems || []).filter(item => item.productId === productId);
  const expiry = Math.max(0, ...items.map(item => Date.parse(item.expiryTime) || 0));
  return {
    active:states.includes(purchase.subscriptionState) && expiry > now,
    plan:product.plan, source:'google_play', expiresAt:expiry ? new Date(expiry).toISOString() : null,
    acknowledged:purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
  };
}
export function bestEntitlement(purchases) {
  const active = purchases.filter(p => p.active);
  active.sort((a,b) => (b.plan === 'lifetime' ? Infinity : Date.parse(b.expiresAt || '') || 0) - (a.plan === 'lifetime' ? Infinity : Date.parse(a.expiresAt || '') || 0));
  const first = active[0];
  return first ? {active:true,plan:first.plan,source:first.source,expiresAt:first.expiresAt} : {active:false};
}
