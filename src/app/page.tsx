export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSessionFromCookie } from "@/lib/session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  if (session) redirect("/dashboard/agent");

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Nav />
      <Hero />
      <Capabilities />
      <HowItWorks />
      <SecuritySection />
      <ClosingCta />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikrogent-logo-text.png" alt="MikroGent" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/masuk"
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
          >
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker transition shadow-sm"
          >
            Daftar
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="px-5 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div className="order-2 md:order-1">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-orange bg-brand-orange-50 px-3 py-1.5 rounded-full">
            AI Agent untuk Mikrotik
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-gray-900">
            AI Agent yang mampu kelola Mikrotik Anda.
          </h1>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-lg">
            MikroGent adalah Agentic AI yang paham router Anda. Tinggal ngobrol
            pakai bahasa sehari-hari, urusan Kelola Router Mikrotik biar dia yang
            selesaikan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center text-base font-semibold text-white px-6 py-3.5 rounded-xl bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker transition shadow-sm"
            >
              Daftar Gratis
            </Link>
            <Link
              href="/masuk"
              className="inline-flex items-center justify-center text-base font-medium text-gray-700 px-6 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
            >
              Sudah punya akun
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Pendaftaran perlu verifikasi email dan validasi admin. Biasanya aktif
            kurang dari 24 jam pada hari kerja.
          </p>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative max-w-md mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/agent-logo.png"
              alt="MikroGent"
              className="w-full h-auto object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  const items = [
    {
      title: "Atur user dan bandwidth",
      desc: "Bikin user PPPoE atau hotspot, set kecepatan, atur queue. Tinggal sebut yang Anda mau, agent translate ke command RouterOS.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Kelola banyak router sekaligus",
      desc: "Punya lebih dari satu router cabang? Kelola semua dari satu chat atau panggilan suara.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="6" rx="2" />
          <rect x="2" y="14" width="20" height="6" rx="2" />
          <line x1="6" y1="7" x2="6.01" y2="7" />
          <line x1="6" y1="17" x2="6.01" y2="17" />
        </svg>
      ),
    },
    {
      title: "Pantau dan troubleshoot",
      desc: "Cek user yang lagi online, pantau bandwidth, cari tahu kenapa koneksi pelanggan putus. Semua via chat dan halaman monitor.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      title: "Generate voucher hotspot",
      desc: "Bikin voucher dalam jumlah banyak siap cetak, lengkap dengan format yang rapi. Cocok buat Reseller yang berbisnis Hotspot / Voucher.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
          <line x1="9" y1="9" x2="9" y2="15" />
          <line x1="15" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <section className="px-5 sm:px-6 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-3">
            Apa yang bisa dia lakukan
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Semua perintah router lewat satu obrolan
          </h2>
          <p className="mt-4 text-gray-600">
            Gak perlu inget sintaks RouterOS. Ngomong yang Anda mau, agent yang
            kerjain detailnya.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-brand-orange/40 transition"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-orange-50 text-brand-orange flex items-center justify-center mb-4">
                {it.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                {it.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Daftar pakai email",
      desc: "Isi data dasar (nama, email, alamat, nomor WA). Klik link verifikasi yang masuk ke inbox Anda.",
    },
    {
      n: "2",
      title: "Tunggu validasi admin",
      desc: "Tim kami cek pendaftar baru untuk keamanan. Biasanya pendaftar divalidasi kurang dari 24 jam pada hari kerja.",
    },
    {
      n: "3",
      title: "Hubungkan router",
      desc: "Hubungkan router Anda untuk bisa langsung ngobrol atau telepon dengan agent. Anda bisa menghubungkan lebih dari satu router dan mengelola semuanya dari MikroGent.",
    },
    {
      n: "4",
      title: "Mulai ngobrol",
      desc: "Tanya dan perintahkan Agent apapun soal router Anda. Mulai dari cek status, bikin user, atur queue, sampai backup konfigurasi. Semua pakai bahasa Indonesia biasa.",
    },
  ];

  return (
    <section className="px-5 sm:px-6 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-3">
            Cara mulai
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Empat langkah, siap pakai
          </h2>
        </div>
        <ol className="space-y-5">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex gap-5 p-5 sm:p-6 rounded-2xl bg-white border border-gray-200"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-b from-brand-orange to-brand-orange-dark text-white flex items-center justify-center font-semibold">
                {s.n}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {s.title}
                </h3>
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="px-5 sm:px-6 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-3">
            Keamanan
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Kredensial router Anda dijaga
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-brand-orange-50 text-brand-orange flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Enkripsi AES-256-GCM di server
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Password SSH router Anda disimpan dalam bentuk terenkripsi. Tidak
              pernah dilog, tidak pernah keluar dari server dalam bentuk plain.
              Kunci enkripsi dipisah dari database supaya backup database aja
              tidak cukup untuk membaca password.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-brand-orange-50 text-brand-orange flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              SSH dibatasi ke satu IP
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Service SSH router Anda cuma terima koneksi dari satu IP, yaitu
              server MikroGent. Kalau pun kredensial bocor di kemudian hari,
              akses ke router tetap terbatas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="px-5 sm:px-6 py-20 sm:py-24 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          Siap mulai?
        </h2>
        <p className="mt-4 text-gray-600 text-lg">
          Daftar pakai email, hubungkan router, lalu ngobrol langsung dengan
          LAIA (Lintas AI Agent).
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/daftar"
            className="inline-flex items-center justify-center text-base font-semibold text-white px-7 py-3.5 rounded-xl bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker transition shadow-sm"
          >
            Daftar Gratis
          </Link>
          <Link
            href="/masuk"
            className="inline-flex items-center justify-center text-base font-medium text-gray-700 px-7 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
          >
            Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 px-5 sm:px-6 py-12">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mikrogent-logo-text.png"
              alt="MikroGent"
              className="h-7 w-auto brightness-0 invert"
            />
          </div>
          <p className="text-sm max-w-md leading-relaxed">
            Agentic AI Ekslusif untuk mitra-mitra PT. Lintas Jaringan Nusantara.
          </p>
        </div>
        <div className="sm:text-right">
          <div className="flex flex-wrap sm:justify-end gap-4 sm:gap-6 mb-4">
            <Link
              href="/syarat-ketentuan"
              className="text-sm hover:text-white transition"
            >
              Syarat &amp; Ketentuan
            </Link>
            <Link
              href="/kebijakan-privasi"
              className="text-sm hover:text-white transition"
            >
              Kebijakan Privasi
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} PT. Lintas Jaringan Nusantara
          </p>
        </div>
      </div>
    </footer>
  );
}
