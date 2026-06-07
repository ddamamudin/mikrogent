# mikrogent - Platform Agent untuk Publik

## Identitas Project
- **Nama**: mikrogent.com
- **Domain**: mikrogent.com, www.mikrogent.com
- **Port**: 3007 (PM2)
- **Path**: `/opt/projects/mikrogent/`
- **Database**: `mikrogent` di pg-main (localhost:5432)

## Stack
- Next.js (App Router, TypeScript)
- PostgreSQL via pg-main
- Session cookie auth (role: ADMIN / user)
- TLS: cert file di `/opt/certs/mikrogent.com/`
- Brand color: `brand-orange` (bukan biru seperti mikroplay)

## Struktur App (src/app/)
- `/admin` - dashboard admin
- `/dashboard/agent` - halaman utama user setelah login
- `/site` - public site pages
- `/masuk`, `/daftar`, `/lupa-password`, `/atur-ulang-password`, `/verifikasi-email`
- `/kebijakan-privasi`, `/syarat-ketentuan`

## Hubungan dengan Mikroplay
Struktur hampir identik dengan mikroplay - kemungkinan fork/white-label untuk "Publik".
Bedanya: branding (logo mikrogent-logo-text.png, warna orange vs biru).

## Cara Deploy/Restart
```bash
pm2 restart mikrogent
pm2 logs mikrogent
```

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
