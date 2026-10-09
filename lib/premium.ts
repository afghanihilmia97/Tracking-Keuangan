export type PremiumPlanId = "monthly" | "annual" | "lifetime";

export const premiumPlans = [
  { id:"monthly" as const, label:"Bulanan", price:19000, period:"/bulan", productId:"financetrack_premium_monthly" },
  { id:"annual" as const, label:"Tahunan", price:179000, period:"/tahun", productId:"financetrack_premium_annual", recommended:true },
  { id:"lifetime" as const, label:"Lifetime", price:399000, period:"sekali bayar", productId:"financetrack_premium_lifetime" },
];

export const freeLimits = { wallets:3, budgets:3, goals:2, recurring:2, bills:3 } as const;

export type PremiumEntitlement = {
  active:boolean;
  plan?:PremiumPlanId;
  expiresAt?:string;
  source?:"google_play"|"lifetime";
};

export { isFirebaseConfigured as firebaseClientReady } from "./firebase-client";

// Hak Premium hanya aktif setelah pembelian diverifikasi backend Google Play.
// Jangan mempercayai flag localStorage sebagai bukti pembelian.
export function loadEntitlement():PremiumEntitlement {
  return {active:false};
}
