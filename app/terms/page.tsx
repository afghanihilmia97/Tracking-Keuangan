import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";

export const metadata = {title:"Ketentuan Penggunaan — FinanceTrack",description:"Ketentuan penggunaan aplikasi FinanceTrack."};

export default function TermsPage(){return <main className="privacy-page"><article>
  <Link href="/"><ArrowLeft size={18}/>Kembali ke FinanceTrack</Link>
  <div className="privacy-title"><span><FileCheck2/></span><div><p>Berlaku mulai: 30 September 2026</p><h1>Ketentuan Penggunaan</h1></div></div>
  <p>Dengan menggunakan FinanceTrack, Anda menyetujui ketentuan berikut. Jika Anda tidak menyetujuinya, hentikan penggunaan aplikasi.</p>
  <h2>Tujuan aplikasi</h2><p>FinanceTrack membantu pengguna mencatat dan meninjau keuangan pribadi. Informasi, prediksi, dan ringkasan di aplikasi bukan nasihat keuangan, pajak, hukum, investasi, atau perbankan.</p>
  <h2>Tanggung jawab pengguna</h2><p>Anda bertanggung jawab atas ketepatan data yang dimasukkan, keamanan perangkat, PIN, akun Google, dan file cadangan. Periksa kembali data sebelum mengambil keputusan keuangan.</p>
  <h2>Akun</h2><p>Login Google bersifat opsional untuk fungsi akun. Anda tidak boleh menyalahgunakan layanan, mencoba mengakses data pengguna lain, atau mengganggu keamanan aplikasi. Anda dapat menghapus akun melalui Pengaturan atau halaman Penghapusan Akun.</p>
  <h2>Premium dan pembayaran</h2><p>Pembelian Android diproses melalui Google Play ketika layanan pembayaran diaktifkan. Harga dan periode ditampilkan sebelum Anda menyetujui pembayaran. Paket bulanan dan tahunan diperpanjang otomatis kecuali dibatalkan melalui Google Play; paket lifetime sekali bayar. Hak akses diberikan setelah server memverifikasi pembayaran. Permintaan pengembalian dana mengikuti kebijakan Google Play. Menghapus aplikasi atau akun FinanceTrack tidak membatalkan langganan. Hak akses terkait akun FinanceTrack yang melakukan pembelian; masuk akun yang sama untuk pemulihan.</p>
  <h2>Ketersediaan</h2><p>Kami berupaya menjaga aplikasi berfungsi dengan baik, tetapi tidak menjamin layanan selalu bebas gangguan atau kehilangan data. Buat cadangan secara berkala.</p>
  <h2>Perubahan</h2><p>Fitur dan ketentuan dapat diperbarui untuk alasan keamanan, hukum, atau peningkatan layanan. Tanggal pembaruan akan dicantumkan pada halaman ini.</p>
  <h2>Kontak</h2><p>Pertanyaan dapat dikirim ke <a href="mailto:spywarecode97@gmail.com">spywarecode97@gmail.com</a>.</p>
</article></main>}
