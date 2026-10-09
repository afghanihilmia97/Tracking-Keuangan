# Monetisasi Google Play FinanceTrack

## Produk yang dibuat di Play Console

| ID produk | Jenis | Harga Indonesia |
|---|---|---:|
| `financetrack_premium_monthly` | Langganan bulanan | Rp19.000 |
| `financetrack_premium_annual` | Langganan tahunan | Rp179.000 |
| `financetrack_premium_lifetime` | Produk sekali bayar | Rp399.000 |

Gunakan base plan auto-renewing untuk bulanan dan tahunan. Paket lifetime dibuat sebagai in-app product non-consumable.

## Urutan aktivasi

1. Buat akun Play Console dan verifikasi identitas pengembang.
2. Lengkapi listing, kebijakan privasi, Data Safety, dan closed testing.
3. Buat tiga produk dengan ID yang persis sama seperti tabel.
4. Hubungkan Google Play Developer API ke backend Firebase.
5. Verifikasi purchase token di backend, simpan entitlement, dan dengarkan Real-time Developer Notifications.
6. Sediakan tombol pulihkan pembelian dan pengelolaan langganan.

Jangan mengaktifkan Premium hanya berdasarkan respons lokal aplikasi. Entitlement harus berasal dari hasil verifikasi server agar tidak mudah dimanipulasi.
