import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export const metadata = {title:"Penghapusan Akun — FinanceTrack",description:"Cara menghapus akun dan data FinanceTrack."};

export default function DeleteAccountPage(){return <main className="privacy-page"><article>
  <Link href="/"><ArrowLeft size={18}/>Kembali ke FinanceTrack</Link>
  <div className="privacy-title"><span><Trash2/></span><div><p>Kontrol data pengguna</p><h1>Hapus Akun FinanceTrack</h1></div></div>
  <p>Anda dapat meminta penghapusan akun FinanceTrack dan data yang terkait kapan saja.</p>
  <h2>Melalui aplikasi</h2>
  <ol><li>Buka <strong>Pengaturan</strong>.</li><li>Pilih <strong>Hapus akun dan data</strong>.</li><li>Konfirmasikan penghapusan.</li></ol>
  <h2>Tanpa aplikasi</h2>
  <p>Kirim permintaan dari alamat email Google yang digunakan untuk FinanceTrack. Cantumkan subjek “Hapus Akun FinanceTrack”. Kami dapat meminta verifikasi kepemilikan akun untuk melindungi data Anda.</p>
  <a className="legal-action" href="mailto:spywarecode97@gmail.com?subject=Hapus%20Akun%20FinanceTrack&body=Halo%2C%20saya%20meminta%20penghapusan%20akun%20FinanceTrack%20yang%20terhubung%20dengan%20alamat%20email%20ini.">Kirim permintaan penghapusan</a>
  <h2>Data yang dihapus langsung</h2>
  <ul><li>Akun Firebase Authentication.</li><li>Catatan keuangan dan dokumen sinkronisasi di Cloud Firestore.</li><li>Foto struk pada folder pengguna di Firebase Storage.</li><li>Keanggotaan serta data keluarga yang terhubung dengan pengguna.</li><li>Transaksi, pengaturan, PIN, status Premium lokal, cache sinkronisasi, dan data FinanceTrack di perangkat.</li></ul><p>Penghapusan akun tidak membatalkan langganan Google Play. Batalkan perpanjangan terlebih dahulu melalui Google Play. Token pembelian dan UID dihapus dari registry Premium; hash token serta hash akun dipertahankan untuk mencegah klaim ulang. Akun yang dihapus tidak dapat dipulihkan atau hak Premiumnya dipindahkan ke akun Firebase baru.</p>
  <p>Sebelum penghapusan dimulai, Google akan meminta verifikasi akun kembali. Langkah ini mencegah akun terhapus jika sesi lama atau perangkat digunakan orang lain. Aplikasi hanya menampilkan pemberitahuan berhasil setelah penghapusan cloud dan akun Firebase selesai.</p>
  <h2>Waktu pemrosesan</h2><p>Penghapusan melalui aplikasi diproses langsung setelah verifikasi ulang berhasil. Jika salah satu bagian gagal, akun tidak ditandai berhasil dihapus dan pengguna dapat mencoba kembali. Permintaan email akan ditangani paling lambat 30 hari setelah verifikasi. Data tertentu hanya dapat dipertahankan jika diwajibkan oleh hukum atau diperlukan untuk mencegah penipuan dan penyalahgunaan.</p>
</article></main>}
