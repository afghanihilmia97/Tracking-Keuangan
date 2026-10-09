# FinanceTrack Premium — pengaturan Google Play

Kode ini menyiapkan pembelian Android, pemulihan pembelian, harga langsung dari Google Play, serta verifikasi pembelian di Firebase. Pembayaran masih OFF secara default. Belum ada deploy Firebase, build Android, atau transaksi Google Play yang dijalankan dari paket ini.

## 1. Aktifkan rekening penerimaan

Buka Play Console → Monetization → Payments profile. Buat profil pembayaran, isi identitas usaha/pribadi yang benar, rekening penerimaan, dan selesaikan verifikasi yang diminta Google. Pembayaran pelanggan diproses Google Play dan hasil penjualan dibayarkan melalui profil tersebut. Integrasi Xendit tidak diperlukan untuk alur Android ini.

## 2. Buat produk untuk aplikasi com.financetrack.harian

| Jenis | Product ID | Base plan ID | Saran harga awal |
|---|---|---|---|
| Subscription | financetrack_premium_monthly | monthly | Rp19.000/bulan |
| Subscription | financetrack_premium_annual | annual | Rp179.000/tahun |
| One-time, non-consumable | financetrack_premium_lifetime | tidak ada | Rp399.000 |

Aktifkan kedua base plan dengan perpanjangan otomatis, periode P1M/P1Y, dan negara penjualan yang diinginkan. Gunakan base plan tanpa trial/promosi untuk konfigurasi awal. Untuk lifetime, buat satu purchase option pembelian biasa, tanpa konsumsi dan tanpa penawaran tambahan. Harga UI berasal dari Google Play, bukan angka contoh yang tersimpan dalam kode.

Unggah AAB bertanda tangan dengan izin Billing ke Internal testing. Daftarkan license tester dan tester track, lalu pasang aplikasi lewat tautan Google Play. APK sideload biasa belum membuktikan pembayaran siap produksi. Pembelian tes tidak menghasilkan uang riil.

## 3. Hubungkan server verifikasi

Firebase project: financetrack-d8239. Cloud Functions memerlukan paket Blaze dan akun billing Google Cloud; pantau biaya operasional. Region callable: asia-southeast2.

1. Aktifkan Google Play Android Developer API pada proyek Google Cloud yang sesuai.
2. Pilih service account runtime Functions. Default Functions gen2 umumnya memakai `<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`; periksa identitas aktual di Cloud Console setelah deploy. Tambahkan akun tersebut di Play Console → Users and permissions dan beri akses aplikasi FinanceTrack untuk membaca informasi pembelian/subscription serta mengelola order/subscription (termasuk acknowledgement). Akses IAM Google Cloud saja tidak memberikan akses Play Console.
3. Gunakan Application Default Credentials dari runtime, bukan file kunci JSON yang dimasukkan ke APK/repository. Pastikan service account dapat membaca/menulis Firestore.
4. Jalankan dari root proyek:

```bash
npm --prefix functions install
npm --prefix functions test
npx firebase-tools login
npx firebase-tools use financetrack-d8239
```

Buat `functions/.env.financetrack-d8239` berisi:

```dotenv
BILLING_ENABLED=false
```

Lalu deploy backend beserta aturan:

```bash
npx firebase-tools deploy --only functions:billing,firestore:rules,storage --project financetrack-d8239
```

Codebase menggunakan callable gen2 dan satu trigger Auth gen1 untuk membersihkan data pembelian saat akun dihapus. Jangan menghapus trigger tersebut tanpa pengganti.

## 4. Notifikasi status dari Google Play

Functions membuat subscription untuk topic Pub/Sub `financetrack-play-billing`. Di Google Cloud, berikan role Pub/Sub Publisher pada `google-play-developer-notifications@system.gserviceaccount.com` untuk topic itu. Di Play Console → Monetization setup → Real-time developer notifications, isi:

`projects/financetrack-d8239/topics/financetrack-play-billing`

Aktifkan notifikasi subscription dan one-time products. Kirim test notification, lalu uji cancellation/refund/revoke. Server memeriksa ulang status melalui Google Play; pesan RTDN sendiri bukan bukti pembayaran. Token pembelian disimpan hanya pada collection server `billingPurchases`, yang tidak dapat dibaca/ditulis klien berdasarkan rules.

## 5. Nyalakan untuk pengujian

Setelah produk, service account, dan RTDN selesai, ubah nilai `BILLING_ENABLED=true` dalam file env tersebut, lalu deploy Functions lagi. Jalankan build web dan Android:

```bash
npm ci
npx tsc --noEmit
npm run android:sync
cd android
bash gradlew bundleRelease
```

Java 21 dan Android SDK 36 dibutuhkan untuk build. Signing harus memakai upload key milik Anda. Bisa menggunakan runner cloud; tidak perlu menjalankan Android Studio di laptop. Workflow Android yang disertakan tidak pernah dijalankan atau diunggah ke GitHub dalam pekerjaan ini.

## Hasil pemeriksaan paket ini

- 6 tes unit normalisasi status pembelian lulus.
- Syntax 9 file TS/TSX yang berubah dan JavaScript server diperiksa.
- Full TypeScript check, install dependency Functions, build native Android, deploy Firebase, dan transaksi license tester belum dijalankan. Android SDK/dependency proyek tidak tersedia di lingkungan pengerjaan.

## 6. Pemeriksaan sebelum penjualan riil

- Masuk akun Google/Firebase, beli bulanan/tahunan/lifetime dengan license tester.
- Status PURCHASED baru membuka Premium setelah server memverifikasi dan acknowledge; pending/cancel tidak membuka.
- Tutup aplikasi saat transaksi, buka kembali dan gunakan Pulihkan pembelian.
- Pasang ulang/ganti HP; masuk akun FinanceTrack yang sama dan pulihkan.
- Login web memakai UID yang sama: status terverifikasi berlaku di web, pembelian web belum tersedia.
- Akun FinanceTrack berbeda tidak dapat mengklaim token yang sama.
- Uji renewal, cancellation (tetap aktif sampai expiry), grace, hold, pause, expiration, refund/revoke.
- Putus koneksi server: tampilkan gagal verifikasi, jangan menganggap pembayaran berhasil. Versi ini membutuhkan koneksi untuk memverifikasi Premium; hak offline belum diberikan.
- Logout tidak menghapus pembelian dan tidak membatalkan subscription. Hapus akun membersihkan data pembelian personal, tetapi tidak membatalkan subscription di Play.
- Perbarui Data Safety (purchase history, user identifiers, financial information sesuai implementasi), listing, kebijakan privasi, dan pengujian aplikasi.

Paket tidak boleh dianggap siap produksi hanya karena tes logika lulus. Build native, deploy server dan semua skenario license tester wajib diselesaikan terlebih dahulu.

## Perilaku paket

Premium membuka batas jumlah dompet, anggaran, tujuan, tagihan, recurring, serta ekspor PDF yang sudah ada. Tidak mengiklankan backup Drive, analisis AI, atau kolaborasi keluarga sebagai manfaat yang sudah selesai. Paket aktif tidak dapat dibeli lagi/diubah dari tombol aplikasi; perubahan dilakukan melalui Google Play, atau beli paket lain setelah hak sebelumnya habis.

Sinkronisasi akun tersedia seperti sebelumnya. Tidak ada penguncian lokal dengan flag Premium palsu. Status server diperiksa saat login, saat app kembali aktif, setiap lima menit ketika terbuka, dan setelah pembelian/pemulihan.

## Data yang dihapus

Callable `deletePremiumData` mensyaratkan reautentikasi terbaru dan menghapus token serta UID dari registry server, lalu menghapus dokumen Premium pribadi. Trigger Auth juga melakukan cleanup bila akun dihapus di luar aplikasi. Hash token dan hash UID dipertahankan sebagai tombstone anti-klaim ulang; tidak berisi token asli/email. Tidak menjanjikan pemindahan entitlement akun yang sudah dihapus ke akun Firebase baru. Jangan menggunakan Admin `deleteUsers` bulk tanpa menjalankan cleanup, karena bulk deletion tidak memicu Auth onDelete.

## Referensi resmi

- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/test
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
- https://developer.android.com/google/play/billing/rtdn-reference
- https://support.google.com/googleplay/android-developer/answer/3092739
- https://firebase.google.com/docs/functions/config-env
