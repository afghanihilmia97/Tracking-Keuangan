import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";

export const metadata = {title:"Bantuan — FinanceTrack",description:"Bantuan dan kontak dukungan FinanceTrack."};

export default function SupportPage(){return <main className="privacy-page"><article>
  <Link href="/"><ArrowLeft size={18}/>Kembali ke FinanceTrack</Link>
  <div className="privacy-title"><span><CircleHelp/></span><div><p>Pusat bantuan</p><h1>Dukungan FinanceTrack</h1></div></div>
  <h2>Login Google tidak berhasil</h2><p>Pastikan aplikasi terbaru terpasang, internet aktif, dan layanan Google Play tersedia. Jika masalah tetap terjadi, sertakan merek ponsel, versi Android, serta tangkapan layar pesan kesalahan.</p>
  <h2>Data tidak muncul</h2><p>Versi Gratis menyimpan data pada perangkat. Memasang ulang aplikasi atau menghapus penyimpanan aplikasi dapat menghapus data lokal. Gunakan Ekspor cadangan sebelum berganti perangkat.</p>
  <h2>Pembelian Premium</h2><p>Pembelian belum tersedia sampai Google Play Billing diaktifkan. Aplikasi tidak akan meminta transfer langsung atau informasi kartu di luar layar pembayaran resmi Google Play.</p>
  <h2>Hubungi dukungan</h2><p>Email dukungan: <a href="mailto:spywarecode97@gmail.com">spywarecode97@gmail.com</a>. Usahakan tidak mengirim PIN, kata sandi, nomor kartu, atau isi catatan keuangan sensitif.</p>
  <a className="legal-action" href="mailto:spywarecode97@gmail.com?subject=Bantuan%20FinanceTrack">Kirim email dukungan</a>
</article></main>}
