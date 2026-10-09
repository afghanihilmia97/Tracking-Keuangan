# Konfigurasi Firebase FinanceTrack

Dokumen ini digunakan setelah akun Google siap. Jangan memasukkan service-account key ke aplikasi atau repositori.

## 1. Buat proyek

1. Buka Firebase Console dan buat proyek `FinanceTrack`.
2. Tambahkan aplikasi Web dan Android dengan package `com.financetrack.harian`.
3. Aktifkan Authentication: Google dan Email/Password.
4. Buat Cloud Firestore dalam mode Production.
5. Aktifkan Google Drive API di Google Cloud Console.

## 2. Variabel build web

Salin nilai konfigurasi aplikasi Web ke variabel berikut di environment deployment:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 3. Struktur data

```text
users/{uid}
  entitlement/current
  workspaces/{workspaceId}
workspaces/{workspaceId}
  members/{uid}
  finance/current
  backups/{backupId}
```

Setiap dokumen workspace hanya boleh dibaca oleh UID yang tercatat sebagai anggota. Status Premium harus ditulis oleh backend setelah Google Play memverifikasi purchase token, bukan oleh aplikasi klien.

## 4. Google Drive

Minta scope `drive.file`, bukan akses penuh ke seluruh Drive. Cadangan dibuat sebagai file JSON terenkripsi atau data aplikasi tersembunyi dan hanya berjalan setelah pengguna memberi izin.
