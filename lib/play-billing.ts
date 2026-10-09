import { Capacitor, registerPlugin } from '@capacitor/core';
import { financeFirebaseApp } from './firebase-client';
import { premiumPlans, type PremiumEntitlement, type PremiumPlanId } from './premium';
export type PlayProduct = {productId:string;title:string;price:string;period:string};
type Purchase = {token:string;products:string[];state:number};
const Billing = registerPlugin<{
  getProducts():Promise<{products:PlayProduct[]}>;
  purchase(options:{productId:string;uid:string}):Promise<{purchases:Purchase[]}>;
  restore():Promise<{purchases:Purchase[]}>;
  manageSubscriptions():Promise<void>;
}>('FinanceBilling');
async function callable<I,O>(name:string,data:I):Promise<O> {
  const app = await financeFirebaseApp();
  const {getFunctions,httpsCallable} = await import('firebase/functions');
  return (await httpsCallable<I,O>(getFunctions(app,'asia-southeast2'),name)(data)).data;
}
export function isPlayAndroid() {return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';}
export const billingStatus = () => callable<Record<string,never>,{enabled:boolean;entitlement:PremiumEntitlement}>('billingStatus',{});
export const playProducts = () => Billing.getProducts();
async function verify(purchases:Purchase[]) {
  let pending=false;
  for(const purchase of purchases) {
    if (purchase.state !== 1) {pending=true;continue;}
    for(const productId of purchase.products) {
      if(!premiumPlans.some(p => p.productId === productId)) continue;
      await callable('verifyPlayPurchase',{productId,token:purchase.token});
    }
  }
  return {...await billingStatus(),pending};
}
export async function buyPremium(plan:PremiumPlanId,uid:string) {
  const status=await billingStatus();
  if(!status.enabled) throw new Error('Pembayaran belum diaktifkan oleh pengelola.');
  if(status.entitlement.active) throw new Error('Premium sudah aktif. Kelola paket melalui Google Play.');
  const product=premiumPlans.find(p=>p.id===plan)!;
  return verify((await Billing.purchase({productId:product.productId,uid})).purchases);
}
export const restorePremium = async () => verify((await Billing.restore()).purchases);
export async function managePremium() {
  if(isPlayAndroid()) await Billing.manageSubscriptions();
  else window.open('https://play.google.com/store/account/subscriptions','_blank','noopener,noreferrer');
}
