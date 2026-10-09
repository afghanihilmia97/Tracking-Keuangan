"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type SecurityState = { pinHash: string; biometricEnabled: boolean };
const key = "financetrack-security-v1";
const blank:SecurityState={pinHash:"",biometricEnabled:false};
async function hashPin(pin:string){const bytes=new TextEncoder().encode(pin);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");}

export function useAppSecurity(){
  const [settings,setSettings]=useState<SecurityState>(blank);
  const [locked,setLocked]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [biometricAvailable,setBiometricAvailable]=useState(false);
  const persist=(value:SecurityState)=>{setSettings(value);localStorage.setItem(key,JSON.stringify(value));};
  const unlockBiometric=useCallback(async()=>{
    if(!Capacitor.isNativePlatform())return false;
    try{
      const {BiometricAuth,AndroidBiometryStrength}=await import("@aparajita/capacitor-biometric-auth");
      const info=await BiometricAuth.checkBiometry();
      setBiometricAvailable(info.isAvailable);
      if(!info.isAvailable)return false;
      await BiometricAuth.authenticate({reason:"Buka data keuangan FinanceTrack",androidTitle:"Buka FinanceTrack",androidSubtitle:"Verifikasi identitas Anda",allowDeviceCredential:true,androidBiometryStrength:AndroidBiometryStrength.weak});
      setLocked(false);return true;
    }catch{return false;}
  },[]);
  useEffect(()=>{const id=window.setTimeout(()=>{let next=blank;try{next={...blank,...JSON.parse(localStorage.getItem(key)||"{}")};}catch{}setSettings(next);setLocked(!!next.pinHash);setLoaded(true);if(next.biometricEnabled)void unlockBiometric();else if(Capacitor.isNativePlatform())import("@aparajita/capacitor-biometric-auth").then(({BiometricAuth})=>BiometricAuth.checkBiometry()).then(info=>setBiometricAvailable(info.isAvailable)).catch(()=>undefined);},0);return()=>clearTimeout(id);},[unlockBiometric]);
  const setPin=async(pin:string)=>{const pinHash=await hashPin(pin);persist({...settings,pinHash});toast.success("PIN aplikasi diaktifkan");};
  const verifyPin=async(pin:string)=>{if(await hashPin(pin)===settings.pinHash){setLocked(false);return true;}return false;};
  const removePin=()=>{persist(blank);setLocked(false);toast.success("Kunci aplikasi dinonaktifkan");};
  const clearSecurity=()=>{localStorage.removeItem(key);setSettings(blank);setLocked(false);};
  const toggleBiometric=async(enabled:boolean)=>{if(enabled){if(!settings.pinHash){toast.error("Aktifkan PIN terlebih dahulu");return false;}const ok=await unlockBiometric();if(!ok){toast.error("Biometrik tidak tersedia atau dibatalkan");return false;}persist({...settings,biometricEnabled:true});toast.success("Biometrik diaktifkan");return true;}persist({...settings,biometricEnabled:false});toast.success("Biometrik dinonaktifkan");return true;};
  return{settings,locked,loaded,biometricAvailable,setPin,verifyPin,removePin,clearSecurity,toggleBiometric,unlockBiometric,lock:()=>setLocked(true)};
}

export function LockScreen({verifyPin,onBiometric,biometric}:{verifyPin:(pin:string)=>Promise<boolean>;onBiometric:()=>Promise<boolean>;biometric:boolean}){
  const [pin,setPin]=useState("");const [error,setError]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();if(await verifyPin(pin)){setError(false);setPin("");}else{setError(true);setPin("");}}
  return <div className="lock-screen"><div className="lock-card"><span className="lock-logo"><LockKeyhole/></span><p>FinanceTrack terkunci</p><h1>Masukkan PIN Anda</h1><form onSubmit={submit}><Input autoFocus inputMode="numeric" type="password" maxLength={6} minLength={4} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setError(false)}} placeholder="••••••"/>{error&&<small>PIN tidak sesuai. Coba lagi.</small>}<Button type="submit" disabled={pin.length<4}>Buka aplikasi</Button></form>{biometric&&<button className="biometric-button" onClick={()=>void onBiometric()}><Fingerprint/>Gunakan biometrik</button>}<span className="lock-note"><ShieldCheck/>Data tetap tersimpan di perangkat ini</span></div></div>;
}

export function SecuritySettings({security}:{security:ReturnType<typeof useAppSecurity>}){
 const [open,setOpen]=useState(false);const [pin,setPin]=useState("");const [confirm,setConfirm]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(pin!==confirm){toast.error("Konfirmasi PIN tidak sama");return;}await security.setPin(pin);setOpen(false);setPin("");setConfirm("");}
 return <section className="panel settings-card"><div className="panel-title"><div><h2>Keamanan aplikasi</h2><p>Kunci akses ke catatan keuangan Anda</p></div></div><button className="setting-row" onClick={()=>security.settings.pinHash?security.lock():setOpen(true)}><span className="setting-icon"><KeyRound/></span><span><strong>{security.settings.pinHash?"Kunci sekarang":"Aktifkan PIN"}</strong><small>{security.settings.pinHash?"PIN sudah aktif":"Gunakan PIN 4-6 angka"}</small></span>{security.settings.pinHash?<LockKeyhole/>:<span/>}</button>{security.settings.pinHash&&<><div className="setting-row"><span className="setting-icon"><Fingerprint/></span><span><strong>Sidik jari / biometrik</strong><small>{Capacitor.isNativePlatform()?(security.biometricAvailable?"Tersedia di perangkat":"Tidak tersedia"):"Aktif pada aplikasi Android"}</small></span><Switch checked={security.settings.biometricEnabled} onCheckedChange={v=>void security.toggleBiometric(v)}/></div><button className="security-remove" onClick={security.removePin}>Hapus PIN dan biometrik</button></>}<Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Buat PIN FinanceTrack</DialogTitle></DialogHeader><form className="entry-form" onSubmit={submit}><div><Label>PIN baru</Label><Input type="password" inputMode="numeric" minLength={4} maxLength={6} pattern="[0-9]{4,6}" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} required/></div><div><Label>Ulangi PIN</Label><Input type="password" inputMode="numeric" minLength={4} maxLength={6} pattern="[0-9]{4,6}" value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,""))} required/></div><div className="dialog-actions"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button><Button type="submit">Aktifkan</Button></div></form></DialogContent></Dialog></section>;
}
