'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import type {PremiumEntitlement,PremiumPlanId} from './premium';
import {billingStatus,buyPremium,isPlayAndroid,managePremium,playProducts,restorePremium,type PlayProduct} from './play-billing';
export function usePremium(uid:string|null,onEntitlement:(value:PremiumEntitlement)=>void) {
  const [products,setProducts]=useState<PlayProduct[]>([]);
  const [enabled,setEnabled]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [checkedAt,setCheckedAt]=useState<string|null>(null);
  const [android,setAndroid]=useState(false);
  const current=useRef(uid);current.current=uid;
  const inFlight=useRef<string|null>(null);
  const refresh=useCallback(async(restore=false)=>{
    if(!uid || inFlight.current===uid) return;
    inFlight.current=uid;setBusy(true);setError('');
    try {
      const status=await billingStatus();
      if(current.current!==uid) return;
      setEnabled(status.enabled);onEntitlement(status.entitlement);
      if(status.enabled && isPlayAndroid()) {
        if(restore) {
          const recovered=await restorePremium();
          if(current.current!==uid) return;
          onEntitlement(recovered.entitlement);
          if(recovered.pending) toast.info('Pembayaran masih tertunda. Premium aktif setelah pembayaran selesai.');
        }
        const catalog=await playProducts();
        if(current.current===uid) setProducts(catalog.products);
      }
      if(current.current===uid) setCheckedAt(new Date().toLocaleString());
    } catch(e) {
      if(current.current===uid) {onEntitlement({active:false});setEnabled(false);setProducts([]);setError(e instanceof Error?e.message:'Status Premium belum dapat diverifikasi.');}
    } finally {if(inFlight.current===uid)inFlight.current=null;if(current.current===uid)setBusy(false);}
  },[uid,onEntitlement]);
  useEffect(()=>{
    setAndroid(isPlayAndroid());setProducts([]);setEnabled(false);setError('');setCheckedAt(null);setBusy(false);onEntitlement({active:false});
    void refresh(true);
    const visible=()=>{if(document.visibilityState==='visible') void refresh(true);};
    document.addEventListener('visibilitychange',visible);
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh(false);},5*60*1000);
    let disposed=false;let remove:(()=>void)|undefined;
    if(isPlayAndroid()) void import('@capacitor/app').then(async({App})=>{
      const listener=await App.addListener('appStateChange',({isActive})=>{if(isActive)void refresh(true);});
      if(disposed) await listener.remove();else remove=()=>void listener.remove();
    });
    return ()=>{window.clearInterval(interval);disposed=true;remove?.();document.removeEventListener('visibilitychange',visible);};
  },[refresh,onEntitlement]);
  const purchase=async(plan:PremiumPlanId)=>{
    if(!uid || inFlight.current===uid)return;
    const purchaseUid=uid;inFlight.current=uid;setBusy(true);setError('');
    try {
      const result=await buyPremium(plan,uid);
      if(current.current!==purchaseUid)return;
      onEntitlement(result.entitlement);setCheckedAt(new Date().toLocaleString());
      if(result.entitlement.active)toast.success('Premium berhasil diaktifkan.');
      else toast.info(result.pending?'Pembayaran masih tertunda.':'Pembelian belum aktif. Coba Pulihkan pembelian.');
    }catch(e){if(current.current===purchaseUid)setError(e instanceof Error?e.message:'Pembelian tidak berhasil.');}
    finally{if(inFlight.current===uid)inFlight.current=null;if(current.current===purchaseUid)setBusy(false);}
  };
  return {products,enabled,busy,error,checkedAt,android,purchase,restore:()=>refresh(true),manage:()=>managePremium().catch(()=>toast.error('Halaman langganan tidak dapat dibuka.'))};
}
