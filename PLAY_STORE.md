# FinanceTrack — Checklist Rilis Google Play

## Identitas build

- Nama aplikasi: FinanceTrack
- Package ID: `com.financetrack.harian`
- Versi: `1.6.0` (`versionCode 20`)
- Kategori: Finance
- Bahasa utama: Indonesia
- Target SDK: Android 16 / API 36
- Minimum SDK: Android 7 / API 24
- Format rilis: Android App Bundle (`.aab`)

## Sudah disiapkan di aplikasi

- Target API 36 dan koneksi cleartext dinonaktifkan.
- Google Sign-In native Android dengan Firebase Authentication.
- Data pengguna dipisahkan berdasarkan Firebase UID melalui Firestore Rules.
- Menu keluar akun, hapus data lokal, dan hapus akun beserta data cloud.
- Halaman publik: `/privacy`, `/terms`, `/delete-account`, dan `/support`.
- Backup sistem Android dimatikan untuk mencegah pemindahan data keuangan tanpa kendali pengguna.
- File provider hanya membuka direktori khusus aplikasi, bukan seluruh penyimpanan eksternal.
- Tombol pembayaran Premium dinonaktifkan sampai Google Play Billing dan verifikasi server tersedia.
- Konfigurasi build release mendukung upload keystore yang disimpan di luar Git.

## Wajib dilakukan di Firebase Console

1. Daftarkan SHA-1 debug untuk APK uji.
2. Unduh ulang `google-services.json` dan letakkan di `android/app/`.
3. Setelah aplikasi dibuat di Play Console, aktifkan Play App Signing.
4. Salin SHA-1 **App signing key certificate** dari Play Console ke aplikasi Android di Firebase.
5. Unduh ulang `google-services.json`, sinkronkan, lalu buat AAB final.

## Wajib dilakukan di Play Console

1. Verifikasi identitas akun developer dan perangkat.
2. Buat aplikasi FinanceTrack menggunakan package ID yang sama.
3. Aktifkan Play App Signing dan unggah AAB ke Internal testing terlebih dahulu.
4. Isi App access: fitur dasar dapat digunakan tanpa login; login Google bersifat opsional.
5. Isi Ads: aplikasi versi ini tidak menampilkan iklan.
6. Isi Content rating, Target audience (bukan aplikasi khusus anak), News apps, dan deklarasi kebijakan lain yang muncul.
7. Isi Data safety sesuai bagian di bawah.
8. Masukkan URL kebijakan privasi dan penghapusan akun.
9. Tambahkan email dukungan, ikon 512×512, feature graphic 1024×500, serta screenshot ponsel.
10. Untuk akun developer pribadi baru, selesaikan closed testing sesuai jumlah penguji dan durasi yang ditampilkan Play Console sebelum meminta akses produksi.

## URL untuk listing

- Kebijakan privasi: `https://financetrack-harian.ptajitt15.chatgpt.site/privacy`
- Penghapusan akun: `https://financetrack-harian.ptajitt15.chatgpt.site/delete-account`
- Ketentuan: `https://financetrack-harian.ptajitt15.chatgpt.site/terms`
- Dukungan: `https://financetrack-harian.ptajitt15.chatgpt.site/support`

## Rancangan Data safety versi 1.6.0

Jawaban akhir harus diperiksa kembali terhadap AAB dan SDK yang tampil di Play Console.

- Data dienkripsi saat dikirim: Ya.
- Pengguna dapat meminta penghapusan data: Ya.
- Data dijual: Tidak.
- Informasi pribadi: alamat email, nama, dan user ID hanya saat pengguna memilih login Google; tujuan App functionality dan Account management.
- Informasi keuangan: dikumpulkan secara opsional ketika sinkronisasi Firebase dipilih; lihat DATA_SAFETY_PLAY_CONSOLE.md.
- Foto struk: dipilih pengguna; dapat dikirim ke Firebase Storage ketika sinkronisasi aktif.
- Autentikasi biometrik: diproses perangkat; aplikasi tidak menerima sidik jari atau data wajah.
- Analytics, lokasi, kontak, SMS, riwayat telepon, health data: Tidak dikumpulkan oleh versi ini.

## Premium

Produk digital tidak boleh diaktifkan melalui transfer manual di aplikasi. Sebelum Premium dijual:

1. Buat subscription bulanan dan tahunan serta in-app product lifetime di Play Console.
2. Build integrasi Google Play Billing yang disertakan.
3. Deploy backend verifikasi purchase token yang disertakan; konfigurasi service account dan RTDN.
4. Uji tombol Pulihkan pembelian dan Kelola langganan yang disertakan.
5. Uji pembelian, pembatalan, grace period, refund, dan pemulihan pada testing track.

## Pengujian sebelum produksi

- Instal dari Internal testing, bukan hanya sideload APK.
- Uji login Google, logout, dan hapus akun pada minimal dua versi Android.
- Uji tambah/edit/hapus transaksi, batas paket Gratis, PIN/biometrik, notifikasi, widget, foto struk, ekspor/impor, PDF/CSV, offline, mode gelap, rotasi, dan tombol kembali.
- Periksa Android vitals, pre-launch report, Data safety, serta semua tautan listing.
- Simpan upload keystore dan kredensialnya di tempat aman yang terpisah.

Panduan konfigurasi Premium: release/PREMIUM_SETUP.md. Pembayaran masih OFF secara default; belum ada transaksi uji atau deploy server.
