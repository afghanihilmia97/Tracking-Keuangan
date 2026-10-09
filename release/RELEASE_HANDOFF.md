# FinanceTrack — paket persiapan Play Store

Status: source dengan integrasi Billing disiapkan, pembayaran OFF secara default. Belum dinyatakan lolos build Android, pengujian perangkat, atau review Google Play.

## 1. AAB bertanda tangan

Di komputer dengan Android Studio dan Java 21: `npm ci`, `npm run android:sync`, lalu Build > Generate Signed Bundle / APK > Android App Bundle. Gunakan upload key milik pemilik aplikasi. Jika pernah mengunggah aplikasi, gunakan upload key yang sudah terdaftar; jangan menggantinya sembarangan.

Alternatif GitHub: unggah source ke repositori Anda, kemudian isi Settings > Secrets and variables > Actions:

- UPLOAD_KEYSTORE_BASE64: isi keystore yang telah dienkode base64.
- UPLOAD_KEY_ALIAS: alias upload key.
- UPLOAD_STORE_PASSWORD: password keystore.
- UPLOAD_KEY_PASSWORD: password key.

Jalankan Actions > FinanceTrack signed Android bundle > Run workflow. Unduh artifact FinanceTrack-signed-AAB setelah build sukses. Workflow belum dijalankan pada paket ini. Jangan masukkan keystore/password ke Git.

Di Firebase, tambahkan SHA-1 dan SHA-256 sertifikat App Signing dari Play Console, lalu unduh ulang android/app/google-services.json. Sertifikat upload key dan App Signing dapat berbeda. Uji login dari instalasi Play Internal Testing.

## 2. Pengujian

Gunakan TEST_MATRIX.csv. Isi PASS/FAIL dan bukti sesudah pengujian nyata, jangan hanya berdasarkan source. Jalankan di minimal dua versi Android dan dua akun Google terpisah. Prioritas: saldo setelah edit/hapus, pemulihan saat ganti perangkat, isolasi UID, penghapusan data, dan login native.

## 3. Premium

Integrasi Google Play Billing, verifikasi server, pemulihan pembelian, dan pengelolaan langganan sudah disiapkan dalam source. Belum di-build/deploy atau diuji dengan transaksi Google Play. Ikuti PREMIUM_SETUP.md untuk menyiapkan produk, profil pembayaran, service account, RTDN, dan license testing sebelum mengaktifkan penjualan. Flag lokal tidak mengaktifkan Premium.

## 4. Play Console

Gunakan STORE_LISTING.md dan DATA_SAFETY_PLAY_CONSOLE.md. Ikon dan feature graphic tersedia di store-assets/. Screenshot harus diambil dari build final pada perangkat; gambar mockup portofolio tidak membuktikan fungsi aplikasi.

- App access: fitur lokal tanpa login; Google opsional. Jelaskan fitur yang perlu login untuk reviewer.
- Ads: No untuk build tanpa SDK iklan.
- Kategori: Finance. Aplikasi pencatat keuangan, bukan layanan pinjaman/perbankan.
- Isi deklarasi Financial features sesuai layanan yang benar-benar ada.
- Lengkapi kuesioner rating dan target audiens sesuai pengguna yang dituju; rating tidak dapat ditentukan sepihak.
- Cek URL /privacy, /delete-account, /terms, /support dapat dibuka tanpa login.
- Pastikan email dukungan dapat menerima permintaan penghapusan dan tim benar-benar memprosesnya.
- Publikasikan aturan Firebase yang disertakan; audit final setelah SDK berubah.

## 5. Testing dan produksi

Unggah AAB ke Internal testing, periksa pre-launch report, perbaiki kegagalan, lalu Closed testing. Untuk akun pribadi baru yang terkena persyaratan, sediakan setidaknya 12 penguji yang ikut terus-menerus selama 14 hari. Simpan feedback, perbaikan, dan hasil pengujian untuk permintaan akses produksi. Penguji harus benar-benar menguji aplikasi. Mengikuti 14 hari tidak menjamin persetujuan produksi.

## Batas verifikasi paket ini

Android SDK tidak tersedia di lingkungan pengerjaan dan koneksi unduhan SDK gagal. AAB belum dihasilkan. Akun Play Console, perangkat Android fisik, dan akses administratif Firebase belum tersedia untuk pengujian end-to-end. Tidak ada pembelian, deployment, atau closed test yang telah dijalankan melalui paket ini.

Referensi: https://developer.android.com/studio/publish/app-signing ; https://support.google.com/googleplay/android-developer/answer/14151465 ; https://support.google.com/googleplay/android-developer/answer/13327111
