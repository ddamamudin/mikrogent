import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-10">{APP_NAME}</h1>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-blue-500/20"
          >
            Daftar
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white hover:bg-gray-100 rounded-xl font-semibold text-lg transition border border-gray-200 text-gray-700"
          >
            Masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
