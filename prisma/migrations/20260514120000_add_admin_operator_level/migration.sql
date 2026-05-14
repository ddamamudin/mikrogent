-- Tambah tier role: ADMIN (owner ISP) & OPERATOR (staff harian).
-- SUPER tetap = pemilik aplikasi (Diki), invisible dari sudut pandang ADMIN.
ALTER TYPE "AdminLevel" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "AdminLevel" ADD VALUE IF NOT EXISTS 'OPERATOR';
