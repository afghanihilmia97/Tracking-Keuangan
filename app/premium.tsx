"use client";
import {Cloud,Crown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {premiumPlans,type PremiumPlanId} from '@/lib/premium';
import type {PlayProduct} from '@/lib/play-billing';
export function PremiumView({active,firebaseReady,connected,android,enabled,busy,error,checkedAt,products,onChoose,onConnect,onRestore,onManage}:{
 active:boolean;firebaseReady:boolean;connected:boolean;android:boolean;enabled:boolean;busy:boolean;error:string;checkedAt:string|null;products:PlayProduct[];
 onChoose:(plan:PremiumPlanId)=>void;onConnect:()=>void;onRestore:()=>void;onManage:()=>void;
}) {
 return <div className="premium-page">
  <section className="premium-hero"><span><Crown/></span><div><p>FINANCETRACK PREMIUM</p><h2>{active?'Premium Anda aktif':'Lebih leluasa mengatur keuangan'}</h2><small>Dompet, anggaran, tujuan, tagihan dan transaksi berulang tanpa batas jumlah. Ekspor laporan PDF.</small></div></section>
  <section className="panel" aria-live="polite"><h2>{busy?'Memeriksa pembelian…':active?'Pembelian terverifikasi':!connected?'Masuk untuk membeli Premium':enabled?'Pilih paket Premium':'Pembayaran belum tersedia'}</h2>
   {!connected && <Button disabled={!firebaseReady||busy} onClick={onConnect}><Cloud/> Masuk dengan Google</Button>}
   {connected&&!enabled&&!error&&<p>Paket akan tersedia setelah pengaturan pembayaran Google Play selesai.</p>}
   {connected&&!android&&<p>Pembelian dilakukan melalui aplikasi Android yang dipasang dari Google Play. Premium yang sudah dibeli juga berlaku di web dengan akun FinanceTrack yang sama.</p>}
   {error&&<p role="alert">{error} Jika sudah membayar, gunakan Pulihkan pembelian.</p>}
   {checkedAt&&<p>Terakhir diverifikasi: {checkedAt}</p>}
   {connected&&<div style={{display:'flex',gap:12,flexWrap:'wrap'}}><Button variant="outline" disabled={busy} onClick={onRestore}>{android?'Pulihkan pembelian':'Periksa status Premium'}</Button>{active&&<Button variant="outline" onClick={onManage}>Kelola langganan Google Play</Button>}</div>}
  </section>
  {connected&&android&&enabled&&!active&&<div className="premium-plans">{premiumPlans.map(plan=>{
   const product=products.find(p=>p.productId===plan.productId);
   return <section className="panel" key={plan.id}><h2>{plan.label}</h2><h3>{product?.price||'Paket belum tersedia'}</h3><p>{plan.id==='monthly'?'Ditagih setiap bulan dan diperpanjang otomatis.':plan.id==='annual'?'Ditagih setiap tahun dan diperpanjang otomatis.':'Sekali bayar, tanpa perpanjangan otomatis.'}</p><Button disabled={busy||!product} onClick={()=>onChoose(plan.id)}>{plan.id==='lifetime'?'Beli Lifetime':'Berlangganan'}</Button></section>;
  })}</div>}
  <section className="panel"><p>Harga mengikuti Google Play dan ditampilkan sebelum konfirmasi pembayaran. Batalkan perpanjangan melalui menu langganan Google Play. Menghapus aplikasi atau akun FinanceTrack tidak membatalkan langganan. Pembayaran tertunda belum membuka Premium.</p></section>
 </div>;
}
