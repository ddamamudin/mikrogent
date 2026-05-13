import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-blue-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-gray-600">
          URL yang Kakak buka tidak tersedia atau sudah dipindah.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
