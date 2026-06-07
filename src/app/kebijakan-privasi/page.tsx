import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — MikroGent",
  description: "Kebijakan Privasi layanan MikroGent yang diselenggarakan oleh PT. Lintas Jaringan Nusantara.",
};

const LAST_UPDATED = "14 Mei 2026";

export default function KebijakanPrivasiPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mikrogent-logo-text.png" alt="MikroGent" className="h-7 w-auto" />
          </Link>
          <Link href="/daftar" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Kembali ke pendaftaran
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900">Kebijakan Privasi</h1>
        <p className="mt-3 text-sm text-gray-500">Terakhir diperbarui: {LAST_UPDATED}</p>

        <section className="mt-10 space-y-4">
          <p>
            Kebijakan Privasi ini disusun oleh <strong>PT. Lintas Jaringan Nusantara</strong>
            (selanjutnya disebut <strong>&quot;Perusahaan&quot;</strong>, <strong>&quot;kami&quot;</strong>,
            atau <strong>&quot;Kami&quot;</strong>) selaku Pengendali Data Pribadi sebagaimana
            dimaksud dalam Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan
            Data Pribadi (<strong>&quot;UU PDP&quot;</strong>) untuk layanan perangkat lunak
            sebagai jasa dengan merek dagang <strong>&quot;MikroGent&quot;</strong>
            (selanjutnya disebut <strong>&quot;Layanan&quot;</strong>) yang dapat diakses melalui
            domain mikrogent.com.
          </p>
          <p>
            Kebijakan Privasi ini menjelaskan jenis Data Pribadi yang Kami kumpulkan,
            dasar hukum dan tujuan pemrosesan, cara Kami menggunakannya, kepada
            siapa Kami membagikannya, jangka waktu penyimpanan, hak-hak Pengguna,
            serta tindakan keamanan yang Kami terapkan.
          </p>
          <p>
            Dengan menggunakan Layanan, Pengguna menyatakan telah membaca,
            memahami, dan menyetujui Kebijakan Privasi ini sebagai dasar pemrosesan
            Data Pribadi Pengguna.
          </p>
        </section>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">1. Identitas Pengendali Data Pribadi</h2>
        <div className="mt-3 rounded-xl bg-gray-50 p-5 text-sm">
          <p><strong>PT. Lintas Jaringan Nusantara</strong></p>
          <p>Surel privasi: <a href="mailto:privasi@mikrogent.com" className="text-blue-600 hover:text-blue-500">privasi@mikrogent.com</a></p>
          <p>Surel umum: <a href="mailto:halo@mikrogent.com" className="text-blue-600 hover:text-blue-500">halo@mikrogent.com</a></p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">2. Jenis Data Pribadi yang Kami Kumpulkan</h2>
        <p className="mt-3">
          Kami mengumpulkan Data Pribadi sebagai berikut:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            <strong>Data identitas dan kontak</strong>: nama lengkap, alamat surel,
            nomor telepon seluler (WhatsApp), alamat, dan nama brand atau bisnis
            (apabila Pengguna mendaftar untuk keperluan komersial).
          </li>
          <li>
            <strong>Data akun</strong>: kata sandi (disimpan dalam bentuk
            <em> hashed</em> menggunakan algoritma kriptografi yang aman dan tidak
            dapat dibaca oleh Perusahaan), preferensi akun, dan riwayat aktivitas
            pada Layanan.
          </li>
          <li>
            <strong>Data teknis</strong>: alamat IP, jenis perangkat, sistem
            operasi, peramban, identifier perangkat, log akses, serta data lain
            yang dihasilkan secara otomatis ketika Pengguna mengakses Layanan.
          </li>
          <li>
            <strong>Data konfigurasi perangkat</strong>: kredensial koneksi
            perangkat MikroTik (alamat IP, port, nama pengguna, kata sandi) yang
            Pengguna masukkan ke dalam Layanan. Kredensial ini disimpan dalam
            bentuk terenkripsi (<em>encryption at rest</em>) menggunakan algoritma
            AES-256-GCM.
          </li>
          <li>
            <strong>Konten percakapan</strong>: pesan, perintah, dan instruksi yang
            Pengguna kirim kepada Agen AI, beserta jawaban yang diberikan, untuk
            keperluan penyediaan Layanan dan audit.
          </li>
          <li>
            <strong>Log aktivitas</strong>: catatan perintah yang dieksekusi pada
            perangkat MikroTik Pengguna melalui Layanan, beserta hasil keluarannya,
            yang disimpan untuk keperluan audit, debugging, dan kepatuhan hukum.
          </li>
        </ol>
        <p className="mt-3">
          Kami <strong>tidak</strong> mengumpulkan kategori Data Pribadi yang
          bersifat spesifik sebagaimana diatur dalam Pasal 4 ayat (2) UU PDP
          (data kesehatan, data biometrik, data genetika, data anak, data
          keuangan pribadi, atau data lain yang sesuai ketentuan peraturan).
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">3. Dasar Hukum Pemrosesan</h2>
        <p className="mt-3">
          Kami memproses Data Pribadi Pengguna berdasarkan dasar hukum sebagai
          berikut sesuai Pasal 20 UU PDP:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            <strong>Persetujuan</strong> dari Pengguna yang diberikan secara sah
            pada saat pendaftaran Akun;
          </li>
          <li>
            <strong>Pelaksanaan perjanjian</strong> antara Pengguna dan Perusahaan
            sebagaimana diatur dalam Syarat dan Ketentuan;
          </li>
          <li>
            <strong>Kepatuhan terhadap kewajiban hukum</strong> Perusahaan, termasuk
            kewajiban penyimpanan log dan kerja sama dengan aparat penegak hukum;
          </li>
          <li>
            <strong>Kepentingan sah</strong> Perusahaan untuk menjaga keamanan,
            mencegah penyalahgunaan, dan meningkatkan kualitas Layanan.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">4. Tujuan Pemrosesan Data Pribadi</h2>
        <p className="mt-3">
          Kami menggunakan Data Pribadi Pengguna untuk tujuan-tujuan sebagai
          berikut:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>menyediakan, mengoperasikan, dan memelihara Layanan;</li>
          <li>memverifikasi identitas Pengguna dan mencegah pendaftaran ganda atau penyalahgunaan;</li>
          <li>melaksanakan instruksi Pengguna untuk berinteraksi dengan perangkat MikroTik milik atau yang dikelola oleh Pengguna;</li>
          <li>berkomunikasi dengan Pengguna terkait Akun, perubahan Layanan, pemberitahuan keamanan, dan informasi penting lainnya;</li>
          <li>melakukan audit, pemeliharaan, dan investigasi keamanan;</li>
          <li>memenuhi kewajiban hukum, peraturan perundang-undangan, dan permintaan resmi dari otoritas yang berwenang;</li>
          <li>menegakkan Syarat dan Ketentuan, termasuk menangani laporan penyalahgunaan;</li>
          <li>mengembangkan, menguji, dan meningkatkan fitur Layanan, dengan cara yang melindungi privasi Pengguna.</li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">5. Pembagian Data Kepada Pihak Ketiga</h2>
        <p className="mt-3">
          Kami <strong>tidak menjual</strong> Data Pribadi Pengguna kepada pihak
          mana pun. Kami hanya membagikan Data Pribadi dalam keadaan-keadaan
          berikut:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            <strong>Penyedia layanan pihak ketiga (Prosesor Data)</strong> yang
            membantu pengoperasian Layanan, termasuk:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                penyedia layanan kecerdasan buatan (Anthropic, OpenAI) untuk
                memproses percakapan Agen AI;
              </li>
              <li>
                penyedia layanan surel transaksional (Resend) untuk pengiriman
                surel verifikasi dan pemberitahuan;
              </li>
              <li>
                penyedia layanan pesan instan (Fonnte) untuk pemberitahuan
                berbasis WhatsApp kepada administrator;
              </li>
              <li>
                penyedia infrastruktur server dan jaringan pengiriman konten
                (Content Delivery Network).
              </li>
            </ul>
            Para penyedia layanan tersebut hanya memproses Data Pribadi sesuai
            instruksi Perusahaan dan terikat oleh kewajiban kerahasiaan dan
            keamanan data.
          </li>
          <li>
            <strong>Aparat penegak hukum dan otoritas yang berwenang</strong>,
            apabila terdapat permintaan resmi yang sah berdasarkan peraturan
            perundang-undangan yang berlaku.
          </li>
          <li>
            <strong>Pihak yang dirugikan</strong> dan/atau penasihat hukumnya,
            dalam rangka penyelesaian sengketa atau penegakan hak, sepanjang
            diperlukan dan diperkenankan oleh hukum.
          </li>
          <li>
            <strong>Pihak yang berkepentingan dalam transaksi korporasi</strong>,
            misalnya dalam hal penggabungan, akuisisi, atau pengalihan aset
            Perusahaan, dengan tetap memperhatikan kewajiban pelindungan data
            pribadi.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">6. Transfer Data Lintas Negara</h2>
        <p className="mt-3">
          Sebagian penyedia layanan pihak ketiga yang Kami gunakan (seperti
          penyedia AI dan surel) berkedudukan di luar wilayah Republik Indonesia.
          Dalam hal demikian, Data Pribadi Pengguna dapat ditransfer ke negara
          tempat pemroses tersebut berkedudukan. Kami memastikan bahwa transfer
          tersebut dilakukan sesuai dengan ketentuan UU PDP dan dengan tingkat
          pelindungan yang setara.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">7. Penyimpanan dan Keamanan Data</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Kami menyimpan Data Pribadi di server yang Kami operasikan dengan
            tindakan pengamanan teknis dan organisasional yang wajar dan
            proporsional.
          </li>
          <li>
            Kata sandi Akun disimpan dalam bentuk <em>hashed</em> menggunakan
            algoritma kriptografi yang aman, sehingga tidak dapat dipulihkan
            menjadi bentuk semula.
          </li>
          <li>
            Kredensial Perangkat MikroTik disimpan dalam bentuk terenkripsi
            menggunakan algoritma AES-256-GCM dengan kunci yang dikelola secara
            terpisah.
          </li>
          <li>
            Akses ke sistem Kami dibatasi dengan kontrol akses berbasis peran,
            otentikasi yang kuat, dan pencatatan audit. Hanya personel yang
            berwenang yang dapat mengakses Data Pribadi sejauh diperlukan untuk
            menjalankan tugasnya.
          </li>
          <li>
            Meskipun Kami menerapkan tindakan keamanan yang wajar, tidak ada
            sistem yang sepenuhnya kebal dari risiko. Kami tidak menjamin
            keamanan mutlak Data Pribadi dari peristiwa yang berada di luar
            kendali Kami.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">8. Jangka Waktu Penyimpanan</h2>
        <p className="mt-3">
          Kami menyimpan Data Pribadi selama:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Akun Pengguna masih aktif;
          </li>
          <li>
            diperlukan untuk tujuan-tujuan yang disebutkan dalam Kebijakan Privasi
            ini;
          </li>
          <li>
            diperlukan untuk memenuhi kewajiban hukum, menyelesaikan sengketa,
            atau menegakkan perjanjian.
          </li>
        </ol>
        <p className="mt-3">
          Setelah Akun dihentikan, Kami akan menghapus atau menganonimkan Data
          Pribadi dalam jangka waktu paling lama 1 (satu) tahun, kecuali jika
          peraturan perundang-undangan mensyaratkan jangka waktu penyimpanan
          yang lebih panjang. Log aktivitas dan audit dapat disimpan lebih lama
          untuk kepentingan kepatuhan hukum.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">9. Hak-Hak Subjek Data Pribadi</h2>
        <p className="mt-3">
          Sesuai dengan Pasal 5 sampai dengan Pasal 13 UU PDP, Pengguna memiliki
          hak-hak sebagai berikut:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>hak untuk mendapatkan informasi mengenai pemrosesan Data Pribadi;</li>
          <li>hak untuk melengkapi, memperbarui, dan/atau memperbaiki kesalahan dan/atau ketidakakuratan Data Pribadi;</li>
          <li>hak untuk memperoleh akses dan salinan Data Pribadi;</li>
          <li>hak untuk mengakhiri pemrosesan, menghapus, dan/atau memusnahkan Data Pribadi;</li>
          <li>hak untuk menarik kembali persetujuan pemrosesan Data Pribadi;</li>
          <li>hak untuk mengajukan keberatan atas tindakan pengambilan keputusan yang hanya didasarkan pada pemrosesan otomatis;</li>
          <li>hak untuk menunda atau membatasi pemrosesan Data Pribadi secara proporsional dengan tujuan pemrosesan;</li>
          <li>hak untuk menuntut dan menerima ganti rugi atas pelanggaran pemrosesan Data Pribadi;</li>
          <li>hak untuk mendapatkan dan menggunakan Data Pribadi dari Perusahaan dalam bentuk yang sesuai dengan struktur dan/atau format yang lazim digunakan antar sistem elektronik (hak atas portabilitas data).</li>
        </ol>
        <p className="mt-3">
          Pengguna dapat menggunakan hak-hak tersebut dengan menghubungi Kami
          melalui surel{" "}
          <a href="mailto:privasi@mikrogent.com" className="text-blue-600 hover:text-blue-500">
            privasi@mikrogent.com
          </a>. Kami akan menanggapi permintaan tersebut paling lambat dalam
          jangka waktu 3 x 24 (tiga kali dua puluh empat) jam sejak diterimanya
          permintaan yang lengkap dan sah.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">10. Cookie dan Teknologi Pelacakan</h2>
        <p className="mt-3">
          Kami menggunakan cookie dan teknologi sejenis untuk menjaga sesi
          Pengguna tetap aktif, mengingat preferensi, serta menganalisis
          penggunaan Layanan untuk peningkatan kualitas. Pengguna dapat
          mengatur peramban untuk menolak cookie, namun hal tersebut dapat
          mempengaruhi fungsionalitas Layanan.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">11. Pemberitahuan Pelanggaran (Breach Notification)</h2>
        <p className="mt-3">
          Dalam hal terjadi kegagalan pelindungan Data Pribadi yang berisiko
          tinggi terhadap hak-hak Pengguna, Kami akan memberitahukan kejadian
          tersebut kepada Pengguna dan kepada lembaga yang berwenang paling
          lambat dalam jangka waktu 3 x 24 (tiga kali dua puluh empat) jam
          sejak Kami mengetahui adanya pelanggaran, sebagaimana diatur dalam
          Pasal 46 UU PDP.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">12. Anak di Bawah Umur</h2>
        <p className="mt-3">
          Layanan tidak ditujukan untuk dan tidak boleh digunakan oleh anak
          yang berusia di bawah 18 (delapan belas) tahun. Kami tidak secara
          sengaja mengumpulkan Data Pribadi anak di bawah umur. Apabila
          Pengguna mengetahui adanya Data Pribadi anak yang terlanjur kami
          kumpulkan, mohon hubungi Kami agar Data Pribadi tersebut dapat
          dihapus.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">13. Perubahan Kebijakan Privasi</h2>
        <p className="mt-3">
          Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu
          untuk mencerminkan perubahan praktik atau peraturan. Perubahan akan
          diberlakukan sejak dipublikasikan pada halaman ini, dengan tanggal
          pembaruan terbaru ditunjukkan di bagian atas. Untuk perubahan yang
          material, Kami akan memberitahukan Pengguna melalui surel atau
          pemberitahuan dalam aplikasi.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">14. Hukum yang Berlaku</h2>
        <p className="mt-3">
          Kebijakan Privasi ini diatur dan ditafsirkan berdasarkan hukum Negara
          Republik Indonesia, khususnya Undang-Undang Nomor 27 Tahun 2022
          tentang Pelindungan Data Pribadi beserta peraturan pelaksananya.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">15. Kontak</h2>
        <p className="mt-3">
          Untuk pertanyaan, keluhan, atau permohonan terkait pelindungan Data
          Pribadi, Pengguna dapat menghubungi Kami melalui:
        </p>
        <div className="mt-3 rounded-xl bg-gray-50 p-5 text-sm">
          <p><strong>PT. Lintas Jaringan Nusantara</strong></p>
          <p>Surel privasi: <a href="mailto:privasi@mikrogent.com" className="text-blue-600 hover:text-blue-500">privasi@mikrogent.com</a></p>
          <p>Surel umum: <a href="mailto:halo@mikrogent.com" className="text-blue-600 hover:text-blue-500">halo@mikrogent.com</a></p>
          <p>Surel penyalahgunaan: <a href="mailto:abuse@mikrogent.com" className="text-blue-600 hover:text-blue-500">abuse@mikrogent.com</a></p>
        </div>

        <div className="mt-16 border-t border-gray-100 pt-6 text-center text-sm text-gray-400">
          <p>
            Lihat juga{" "}
            <Link href="/syarat-ketentuan" className="text-blue-600 hover:text-blue-500">
              Syarat dan Ketentuan
            </Link>
            .
          </p>
          <p className="mt-2">© {new Date().getFullYear()} PT. Lintas Jaringan Nusantara. Hak cipta dilindungi.</p>
        </div>
      </article>
    </div>
  );
}
