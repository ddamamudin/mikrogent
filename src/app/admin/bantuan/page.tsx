export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "MikroGent";

export default async function BantuanPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminLevel: true },
  });
  // Halaman Bantuan dibuat khusus untuk role ADMIN.
  // Superadmin (gak butuh panduan, dia yang bikin sistemnya) dan Operator (akses terbatas)
  // diarahkan ke dashboard masing-masing.
  const level = admin?.adminLevel ?? "SUPER";
  if (level !== "ADMIN") redirect("/admin/dashboard");

  const sections: Array<{
    icon: string;
    title: string;
    desc: string;
    points: Array<{ label: string; detail: string }>;
  }> = [
    {
      icon: "📊",
      title: "Dashboard",
      desc: "Ringkasan operasional. Buka pertama tiap kali login untuk lihat apa yang perlu di-handle.",
      points: [
        { label: "Banner kuning di atas", detail: "Muncul kalau ada tenant nunggu divalidasi. Klik 'Lihat daftar' untuk loncat ke halaman Tenant." },
        { label: "Stat cards", detail: "Total tenant, jumlah aktif, pending validasi, chat hari ini, router terhubung, feedback terbuka. Card yang punya angka penting di-highlight ring kuning." },
        { label: "Tenant Terbaru", detail: "5 pendaftar terakhir. Tombol 'Validasi' inline biar bisa approve cepat tanpa masuk halaman tenant." },
        { label: "Aktivitas Terakhir", detail: "Feed 6 aksi terbaru dari sesama admin & operator. Pantau siapa ngapain." },
      ],
    },
    {
      icon: "👥",
      title: "Tenant",
      desc: "Halaman untuk kelola semua reseller. Validasi, suspend, set kuota, hapus akun.",
      points: [
        { label: "Validasi", detail: "Pendaftar baru harus divalidasi sebelum bisa pakai agent. Klik tombol Validasi di row tenant." },
        { label: "Suspend / Aktifkan", detail: "Untuk freeze sementara akun tenant tanpa hapus data. Tenant gak bisa login saat di-suspend." },
        { label: "Set Kuota", detail: "Klik 'Detail' untuk masuk halaman tenant. Di sana bisa atur limit chat harian, voice, dan kuota router per tenant. Kosongkan untuk pakai default global." },
        { label: "Reset Kuota", detail: "Tombol Reset di kolom Kuota Hari Ini untuk paksa balikin counter chat / voice tenant ke nol. Berguna kalau tenant butuh tambahan kuota mendadak." },
        { label: "Hapus", detail: "Hard delete. Data tenant, router, chat history semua kehapus permanen. Tidak bisa di-undo." },
      ],
    },
    {
      icon: "➕",
      title: "Tambah User",
      desc: "Kelola staff dan bikin akun baru. Tombol '+ Tambah User' buat akun langsung dari sini.",
      points: [
        { label: "Bikin Admin", detail: "Akses penuh sama seperti kamu, kecuali fitur khusus superadmin. Bisa kelola tenant + bikin operator." },
        { label: "Bikin Operator", detail: "Staff harian. Akses terbatas: cuma validasi tenant dan balas inbox feedback. Cocok untuk CS atau NOC junior." },
        { label: "Bikin Tenant (Reseller)", detail: "Akun reseller yang dibuat manual. Auto-validated, langsung bisa pakai agent (skip verifikasi email)." },
        { label: "Reset Password", detail: "Tombol di row admin/operator untuk paksa ganti password mereka. Kasih password baru ke user via WA atau channel aman lainnya." },
      ],
    },
    {
      icon: "🌐",
      title: "Router",
      desc: "Lihat status koneksi router milik tenant. Read-only untuk role admin.",
      points: [
        { label: "Cek Status", detail: "Kolom Status nunjukkin Terhubung (hijau), Putus (kuning), atau Belum Onboarding (abu). Refresh otomatis kalau ada perubahan." },
        { label: "Tes Koneksi", detail: "Klik tombol Tes Koneksi untuk verifikasi SSH ke router tenant. Berguna saat tenant lapor agent gak jalan." },
        { label: "Filter", detail: "Pakai dropdown Semua Tenant / Terhubung / Putus / Belum Ada Router untuk cari tenant tertentu dengan cepat." },
      ],
    },
    {
      icon: "📜",
      title: "Log Aktivitas",
      desc: "Riwayat semua aksi admin yang terjadi di sistem. Untuk audit dan investigasi.",
      points: [
        { label: "Filter aksi", detail: "Dropdown Semua Aktivitas untuk filter berdasarkan jenis aksi (validasi, suspend, hapus, dll)." },
        { label: "Detail", detail: "Tiap row punya kolom Detail yang nunjukkin target aksi (nama tenant, perubahan yang dilakukan, dll)." },
        { label: "Pagination", detail: "Data lama tetap tersimpan. Klik Sebelumnya / Berikutnya untuk navigasi." },
      ],
    },
    {
      icon: "⚙️",
      title: "Pengaturan",
      desc: "Konfigurasi sistem dan agent AI. Hati-hati saat ubah, perubahan langsung berlaku untuk semua tenant.",
      points: [
        { label: "Halaman daftar tenant", detail: "Toggle ini matikan pendaftaran publik di /daftar. Tenant baru cuma bisa dibikin manual dari menu Tambah User." },
        { label: "Default Kuota Router", detail: "Jumlah router default untuk tenant baru. Centang 'Sync ke user existing' untuk naikkin kuota tenant lama yang masih di bawah default." },
        { label: "Provider AI & Model", detail: "Pilih OpenAI atau Anthropic untuk chat agent. Atur API key + pilih model sesuai kebutuhan." },
        { label: "Voice Conversation", detail: "Toggle fitur telepon agent + atur batas durasi voice harian per tenant." },
        { label: "Persona Agent", detail: "Sistem prompt yang ngatur gaya bicara agent. Edit ini untuk customize karakter agent." },
        { label: "Knowledge Base", detail: "Konteks tambahan yang dikasih ke agent (mis. cheatsheet RouterOS). Tetap ringkas, jangan ratusan KB karena makan token." },
        { label: "Ganti Password", detail: "Update password akun kamu sendiri. Min 8 karakter." },
      ],
    },
    {
      icon: "📥",
      title: "Inbox (icon amplop di header)",
      desc: "Feedback dari tenant. Balas keluhan / pertanyaan dan tandai selesai.",
      points: [
        { label: "Balas", detail: "Klik thread untuk lihat semua pesan. Reply langsung di textarea bawah." },
        { label: "Tandai Resolved", detail: "Kalau masalah sudah beres, tandai resolved supaya turun dari inbox aktif." },
      ],
    },
  ];

  const tips: Array<{ title: string; body: string }> = [
    {
      title: "Cek banner kuning di Dashboard tiap login",
      body: "Itu shortcut paling cepat lihat apa yang perlu di-handle hari ini. Jangan langsung skip ke Tenant.",
    },
    {
      title: "Gunakan tombol Validasi inline di Dashboard",
      body: "Lebih cepat dari masuk halaman Tenant. Cocok kalau cuma 1-5 pendaftar baru per hari.",
    },
    {
      title: "Selalu Tes Koneksi setelah onboarding router baru",
      body: "Status Terhubung baru aktif setelah SSH berhasil verifikasi. Agent gak akan jalan kalau status masih Putus.",
    },
    {
      title: "Hati-hati saat ubah Provider AI",
      body: "Switch dari OpenAI ke Anthropic atau sebaliknya akan ganti agent untuk semua tenant. Pastiin API key tujuan sudah ada saldo.",
    },
    {
      title: "Operator gak punya akses Router / Log / Pengaturan",
      body: "Kalau ada staff yang complain gak bisa akses, cek role mereka di menu Tambah User. Mungkin perlu di-upgrade jadi Admin.",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Panduan Pengelolaan {APP_NAME}</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-1">
          Referensi cepat fitur-fitur admin. Klik judul untuk lompat ke section.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/40 mb-2">Daftar Isi</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sections.map((s) => {
            const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            return (
              <a key={slug} href={`#${slug}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 hover:text-blue-600 dark:hover:text-blue-400 transition">
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Sections */}
      {sections.map((s) => {
        const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return (
          <section key={slug} id={slug} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm scroll-mt-20">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl shrink-0" aria-hidden="true">{s.icon}</span>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{s.title}</h2>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{s.desc}</p>
              </div>
            </div>
            <ul className="space-y-3 pl-1">
              {s.points.map((p) => (
                <li key={p.label} className="border-l-2 border-blue-200 dark:border-blue-500/30 pl-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{p.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Tips */}
      <section className="bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl shrink-0" aria-hidden="true">💡</span>
          <div>
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">Tips & Hal yang Perlu Diingat</h2>
            <p className="text-sm text-amber-800 dark:text-amber-300/80 mt-0.5">Best practice biar kerja sehari-hari lebih lancar.</p>
          </div>
        </div>
        <ul className="space-y-3">
          {tips.map((t) => (
            <li key={t.title}>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t.title}</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="text-center text-xs text-gray-400 dark:text-white/30 pb-4">
        Ada hal yang masih bingung? Tanya superadmin langsung via WhatsApp.
      </div>
    </div>
  );
}
