# FinanceTrack — Tracking Keuangan

Aplikasi pencatatan keuangan pribadi untuk web dan Android. Dibangun menggunakan React, TypeScript, Vinext/Vite, Capacitor, dan Firebase.

## Fitur

- Pemasukan dan pengeluaran, edit transaksi, kategori, catatan, dan foto struk.
- Multi-dompet, anggaran, tujuan tabungan, utang-piutang, dan tagihan.
- Kalender transaksi, laporan, filter, pengingat, dan transaksi berulang.
- Preferensi bahasa, mata uang, tema, PIN/biometrik, dan widget Android.
- Login Google, sinkronisasi per UID, keluar akun, dan penghapusan data.
- Source integrasi Google Play Billing dan verifikasi pembelian di Firebase Functions.

## Status rilis

Source versi Android **1.6.0 / versionCode 20**. Pembayaran Premium masih OFF secara default sampai produk Play Console, backend, RTDN, dan pengujian selesai. Duitku belum diintegrasikan. Repository ini berisi source, bukan APK/AAB siap instal atau bukti aplikasi sudah lolos review toko.

## Menjalankan web

Node.js >= 22.13.0 diperlukan.

```bash
npm ci
npm run dev
```

Build produksi:

```bash
npm run build
```

Proyek menggunakan Vinext/Vite dan menghasilkan worker Cloudflare. Pemindahan ke hosting/provider lain perlu menyesuaikan runtime; jangan menganggap konfigurasi Next.js standar langsung sesuai.

## Android

Package: `com.financetrack.harian`. Java 21, Android SDK 36, dan Android Build Tools 36 diperlukan.

```bash
npm ci
npm run android:sync
cd android
bash gradlew assembleDebug
```

Untuk AAB rilis, konfigurasi upload keystore sendiri, lalu jalankan `bash gradlew bundleRelease`. Workflow manual **FinanceTrack signed Android bundle** di tab Actions dapat membangun melalui runner cloud tanpa Android Studio di laptop. Isi secrets signing sesuai [panduan rilis](release/RELEASE_HANDOFF.md) sebelum menjalankannya. Workflow belum dijalankan dalam proses unggahan source ini.

## Firebase dan pembayaran

- `lib/firebase-client.ts`: konfigurasi web dan sinkronisasi.
- `android/app/google-services.json`: konfigurasi Firebase client Android.
- `firebase/`: aturan Firestore dan Storage.
- `functions/`: backend verifikasi pembelian Google Play.

Konfigurasi client Firebase bukan kredensial Admin. Untuk penggunaan oleh proyek lain, ganti konfigurasi dengan proyek Firebase sendiri dan publikasikan security rules yang sesuai. Jangan mengunggah service account, secret API pembayaran, `.env`, atau private keystore.

Tes logika pembelian:

```bash
npm --prefix functions test
```

Lihat [setup Premium](release/PREMIUM_SETUP.md) untuk produk, service account, RTDN, deployment, dan license testing. Aktivasi server dan pengujian pembelian nyata masih diperlukan.

## Struktur

| Folder | Isi |
|---|---|
| `app/`, `components/`, `lib/` | Web, tampilan, dan logika keuangan |
| `android/` | Proyek native Capacitor dan plugin Billing |
| `firebase/`, `functions/` | Security rules dan verifikasi pembayaran |
| `store-assets/` | Ikon dan materi toko aplikasi |
| `release/` | Panduan konfigurasi dan matriks pengujian |

Panduan lain: [Play Store](PLAY_STORE.md), [Data Safety](DATA_SAFETY_PLAY_CONSOLE.md), [source package](PACKAGE_README.md).

Dependensi, cache, build output, APK/AAB, konfigurasi signing lokal, dan kredensial server tidak disertakan. Build Android, audit SDK, pengujian perangkat, serta pengaturan akun toko wajib diselesaikan sebelum rilis produksi.
