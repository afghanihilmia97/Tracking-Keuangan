# FinanceTrack — web + Android source package

This archive contains the FinanceTrack web source and its Capacitor Android project.

## Web

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Create a production build with `npm run build`.

## Android

The Android project is in `android/` and uses package name `com.financetrack.harian`.

1. Install dependencies with `npm ci`.
2. Run `npm run android:sync` to build the web app and copy it into Capacitor.
3. Open `android/` in Android Studio, or run `cd android && ./gradlew assembleDebug`.

For a Play Store release, configure a release keystore outside the repository and set the signing values through `keystore.properties` or the `FINANCETRACK_*` environment variables. Never commit a private keystore, passwords, or `.env` files.

`android/app/google-services.json` is the Firebase client configuration for this app. Firebase rules and web configuration are included in `firebase/` and `lib/firebase-client.ts`.

## Included / excluded

Source, configuration, Firebase rules, store assets, and the Android Gradle project are included. Dependencies, generated web output, Gradle caches, APK/AAB files, local signing files, and Git metadata are intentionally excluded; regenerate them locally with the commands above.


Google Play Premium: lihat release/PREMIUM_SETUP.md. Pembayaran OFF sampai produk/server selesai dikonfigurasi; kode belum diuji dengan transaksi Play.
