# Data Safety Google Play — FinanceTrack

Dokumen ini mengikuti perilaku FinanceTrack versi 1.6.0. Gunakan untuk mengisi **Play Console → App content → Data safety**. Periksa kembali setiap kali SDK, iklan, pembayaran, analitik, atau cara penyimpanan berubah.

## Jawaban umum untuk rilis sekarang

| Pertanyaan Play Console | Jawaban |
|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Ya, mengumpulkan data** |
| Apakah data dibagikan kepada pihak ketiga? | **Tidak**. Google/Firebase digunakan sebagai penyedia layanan, bukan untuk periklanan atau penjualan data. |
| Apakah semua data dienkripsi saat dikirim? | **Ya** — koneksi Google dan Firebase menggunakan HTTPS/TLS. |
| Apakah pengguna dapat meminta penghapusan data? | **Ya** |
| URL penghapusan akun | `https://financetrack-harian.ptajitt15.chatgpt.site/delete-account` |
| URL kebijakan privasi | `https://financetrack-harian.ptajitt15.chatgpt.site/privacy` |
| Apakah aplikasi memiliki akun? | **Ya, tetapi opsional**. Aplikasi dapat digunakan secara lokal tanpa login. |

Menurut definisi Google Play, data dianggap “dikumpulkan” jika dikirim keluar perangkat. Karena login dan sinkronisasi bersifat pilihan, seluruh jenis data cloud di bawah ditandai **opsional**.

## Jenis data yang dicentang sekarang

| Kategori Play Console | Jenis data | Dikumpulkan | Dibagikan | Wajib/opsional | Diproses sementara | Tujuan |
|---|---|---:|---:|---|---:|---|
| Info pribadi | Nama | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi; Pengelolaan akun |
| Info pribadi | Alamat email | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi; Pengelolaan akun |
| Info pribadi | ID pengguna | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi; Pengelolaan akun; Keamanan |
| Info keuangan | Info keuangan lainnya | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi |
| Info keuangan | Riwayat pembelian (jika Billing diaktifkan) | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi; Pengelolaan akun; Keamanan |
| Foto dan video | Foto | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi |
| Aktivitas aplikasi | Konten buatan pengguna lainnya | Ya | Tidak | Opsional | Tidak | Fungsi aplikasi |

“Info keuangan lainnya” mencakup transaksi, saldo, anggaran, tujuan tabungan, utang-piutang, tagihan, kategori, nominal, tanggal, transaksi berulang, dan statistik keuangan. “Konten buatan pengguna lainnya” mencakup catatan atau keterangan bebas yang ditambahkan pengguna.

## Jangan dicentang pada rilis sekarang

- **Info pembayaran pengguna:** FinanceTrack tidak menerima nomor kartu atau rekening pembayaran.
- Untuk rilis dengan Billing OFF tanpa pembelian, riwayat pembelian belum dikumpulkan. Jika Billing ON, gunakan baris Riwayat pembelian di atas.
- **Log kerusakan dan Diagnostik:** Firebase Crashlytics/Performance Monitoring belum terpasang.
- **ID perangkat atau ID lainnya untuk diagnostik:** belum dikumpulkan oleh Crashlytics pada build ini.
- Lokasi, kontak, SMS/MMS, riwayat telepon, audio, kalender sistem, riwayat web, dan aplikasi terpasang.
- Data untuk iklan atau pemasaran.

## Saat Premium Google Play Billing diaktifkan

Sebelum merilis build Billing, tambahkan **Info keuangan → Riwayat pembelian** sebagai data yang dikumpulkan, tidak dibagikan, opsional, tidak diproses sementara, untuk **Fungsi aplikasi** dan **Pengelolaan akun**. Implementasi menyimpan ID produk, token pembelian, status langganan, masa berlaku, dan hak akses Premium—bukan nomor kartu atau detail metode pembayaran.

## Saat Firebase Crashlytics diaktifkan

Sebelum merilis build Crashlytics, tambahkan **Log kerusakan**, **Diagnostik**, dan **Perangkat atau ID lainnya** sebagai data yang dikumpulkan, tidak dibagikan, untuk tujuan **Analitik**. Disarankan meminta persetujuan pengguna. Jika pengumpulan selalu aktif dan tidak dapat dimatikan, pilih **wajib**, bukan opsional.

## Prosedur penghapusan yang dinyatakan

1. Pengguna membuka **Pengaturan → Hapus akun dan data**.
2. Google meminta autentikasi ulang sebelum data dihapus.
3. FinanceTrack menghapus folder foto berdasarkan UID di Firebase Storage.
4. FinanceTrack menghapus dokumen keuangan, sinkronisasi, dan keanggotaan keluarga di Firestore.
5. Server menghapus token/UID pembelian dan dokumen Premium personal. Hash token dan hash UID dipertahankan untuk mencegah klaim ulang; nyatakan pengecualian retensi ini pada formulir dan kebijakan privasi. Langganan tidak otomatis dibatalkan oleh penghapusan akun. FinanceTrack kemudian menghapus akun Firebase Authentication.
6. FinanceTrack membersihkan transaksi, PIN, preferensi, cache sinkronisasi, status Premium lokal, dan data perangkat.
7. Pengguna tanpa akses aplikasi dapat mengajukan permintaan melalui halaman penghapusan akun atau email dukungan.

## Pemeriksaan sebelum Submit

- Pastikan Firebase Security Rules terbaru sudah dipublikasikan.
- Pastikan tautan privasi dan penghapusan dapat dibuka tanpa login.
- Jangan nyatakan Crashlytics atau Billing aktif sebelum SDK tersebut benar-benar dirilis.
- Audit seluruh SDK pihak ketiga pada AAB final.
- Jika AdMob ditambahkan, audit ulang karena ID iklan, interaksi iklan, diagnostik, atau lokasi perkiraan dapat mengubah deklarasi.
