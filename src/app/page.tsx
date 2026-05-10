import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <span className="text-2xl font-bold text-blue-400">Mikroplay</span>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm text-white/80 hover:text-white transition">
            Masuk
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition">
            Daftar Gratis
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center text-center px-6 py-28">
        <h1 className="text-5xl font-extrabold leading-tight mb-6 max-w-3xl">
          Kelola Hotspot MikroTik dari{" "}
          <span className="text-blue-400">Satu Tempat</span>
        </h1>
        <p className="text-lg text-white/60 max-w-xl mb-10">
          Platform manajemen hotspot modern untuk ISP dan reseller. Dashboard personal, voucher instan, laporan realtime — semua gratis.
        </p>
        <Link
          href="/register"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-lg font-bold transition shadow-lg shadow-blue-500/30"
        >
          Mulai Sekarang →
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-8 pb-24">
        {[
          {
            icon: "🌐",
            title: "Dashboard Personal",
            desc: "Setiap reseller dapat subdomain sendiri: brand.mikroplay.com",
          },
          {
            icon: "🎟️",
            title: "Voucher Generator",
            desc: "Cetak voucher hotspot dengan QR code langsung dari browser",
          },
          {
            icon: "📊",
            title: "Laporan Realtime",
            desc: "Monitor penjualan, user aktif, dan traffic router secara live",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-white/50 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
