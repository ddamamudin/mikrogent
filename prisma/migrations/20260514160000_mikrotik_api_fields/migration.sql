-- Tambah field RouterOS API ke MikrotikCredential.
-- apiEnabled: true kalau service /ip service api udah aktif di router (di-set via SSH).
-- apiPort: port API (default 8728, atau 8729 buat api-ssl). Belum di-expose ke user
-- buat sekarang; default 8728 dipakai semua user.
ALTER TABLE "MikrotikCredential" ADD COLUMN "apiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MikrotikCredential" ADD COLUMN "apiPort" INTEGER NOT NULL DEFAULT 8728;
