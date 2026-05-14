import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Mikroplay",
  description: "Syarat dan Ketentuan penggunaan layanan Mikroplay oleh PT. Repla Inti Media.",
};

const LAST_UPDATED = "14 Mei 2026";

export default function SyaratKetentuanPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-7 w-auto" />
          </Link>
          <Link href="/daftar" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Kembali ke pendaftaran
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900">Syarat dan Ketentuan Penggunaan Layanan</h1>
        <p className="mt-3 text-sm text-gray-500">Terakhir diperbarui: {LAST_UPDATED}</p>

        <section className="mt-10 space-y-4">
          <p>
            Syarat dan Ketentuan ini (selanjutnya disebut <strong>&quot;Syarat&quot;</strong>) merupakan
            perjanjian elektronik yang sah dan mengikat secara hukum antara Anda
            (selanjutnya disebut <strong>&quot;Pengguna&quot;</strong>) dengan <strong>PT. Repla Inti Media</strong>,
            suatu perseroan terbatas yang didirikan menurut hukum Republik Indonesia
            (selanjutnya disebut <strong>&quot;Perusahaan&quot;</strong>), selaku penyelenggara layanan
            perangkat lunak sebagai jasa (Software as a Service) dengan merek dagang
            <strong> &quot;Mikroplay&quot;</strong> (selanjutnya disebut <strong>&quot;Layanan&quot;</strong>) yang dapat
            diakses melalui domain mikroplay.com beserta seluruh sub-domain dan
            antarmuka aplikasi terkait.
          </p>
          <p>
            Dengan melakukan pendaftaran, mengakses, dan/atau menggunakan Layanan,
            Pengguna dianggap telah membaca, memahami, dan menyetujui untuk terikat
            secara hukum oleh seluruh ketentuan dalam Syarat ini. Apabila Pengguna
            tidak menyetujui sebagian atau seluruh ketentuan ini, Pengguna wajib
            menghentikan akses dan tidak menggunakan Layanan.
          </p>
        </section>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">1. Definisi</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong>Layanan</strong> berarti platform perangkat lunak Mikroplay yang
            menyediakan antarmuka kecerdasan buatan (AI Agent) untuk membantu
            Pengguna mengelola, memantau, dan mengonfigurasi perangkat jaringan
            MikroTik melalui koneksi Secure Shell (SSH).
          </li>
          <li>
            <strong>Akun</strong> berarti akun digital yang dibuat oleh Pengguna pada
            Layanan untuk mengakses dan menggunakan fitur Layanan.
          </li>
          <li>
            <strong>Kredensial Perangkat</strong> berarti seluruh informasi otentikasi
            (termasuk namun tidak terbatas pada alamat IP, port, nama pengguna, kata
            sandi, dan/atau kunci kriptografi) yang diberikan oleh Pengguna kepada
            Layanan untuk tujuan pengelolaan perangkat MikroTik.
          </li>
          <li>
            <strong>Konten Pengguna</strong> berarti seluruh data, perintah, instruksi,
            kredensial, dan informasi lain yang diunggah, dimasukkan, atau dihasilkan
            oleh Pengguna melalui Layanan.
          </li>
        </ul>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">2. Pendaftaran dan Akun Pengguna</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Pengguna wajib memberikan data pendaftaran yang benar, akurat, terkini,
            dan lengkap, serta wajib memperbaharui data tersebut apabila terjadi
            perubahan.
          </li>
          <li>
            Pengguna bertanggung jawab penuh atas seluruh aktivitas yang terjadi di
            bawah Akunnya, termasuk seluruh tindakan yang dilakukan oleh pihak lain
            yang menggunakan Akun tersebut, baik dengan atau tanpa sepengetahuan
            Pengguna.
          </li>
          <li>
            Pengguna wajib menjaga kerahasiaan kata sandi dan kredensial Akun, serta
            segera memberitahukan kepada Perusahaan apabila terjadi penggunaan tidak
            sah atau pelanggaran keamanan terhadap Akunnya.
          </li>
          <li>
            Perusahaan berhak untuk menolak, menunda, atau membatalkan pendaftaran
            apabila terdapat indikasi pelanggaran terhadap Syarat ini, peraturan
            perundang-undangan, atau kebijakan internal Perusahaan, tanpa kewajiban
            memberikan alasan.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">3. Pernyataan dan Jaminan Pengguna</h2>
        <p className="mt-3">
          Dengan menggunakan Layanan, Pengguna menyatakan dan menjamin bahwa:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Pengguna adalah pemilik sah atau pihak yang memiliki otorisasi tertulis
            yang sah dari pemilik atas setiap perangkat MikroTik yang
            kredensialnya dimasukkan ke dalam Layanan.
          </li>
          <li>
            Seluruh Kredensial Perangkat yang dimasukkan adalah kredensial yang
            diperoleh secara sah dan bukan hasil dari pencurian, peretasan,
            penyalahgunaan kewenangan, atau cara melawan hukum lainnya.
          </li>
          <li>
            Penggunaan Layanan oleh Pengguna tidak akan melanggar hak pihak ketiga
            mana pun, termasuk namun tidak terbatas pada hak kekayaan intelektual,
            hak privasi, dan hak atas keamanan sistem elektronik.
          </li>
          <li>
            Pengguna berusia paling sedikit 18 (delapan belas) tahun atau telah
            cakap secara hukum untuk mengikatkan diri dalam perjanjian ini.
          </li>
          <li>
            Apabila Pengguna mendaftar atas nama atau untuk kepentingan suatu
            badan hukum, Pengguna menyatakan dan menjamin memiliki kewenangan
            untuk mengikat badan hukum tersebut pada Syarat ini.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">4. Aturan Penggunaan (Acceptable Use)</h2>
        <p className="mt-3">
          Pengguna <strong>dilarang</strong>, baik secara langsung maupun tidak
          langsung, melakukan hal-hal berikut:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Mengakses, mengelola, atau melakukan tindakan apa pun terhadap perangkat
            MikroTik atau sistem elektronik milik pihak ketiga tanpa otorisasi yang
            sah dari pemiliknya;
          </li>
          <li>
            Menggunakan Kredensial Perangkat yang diperoleh melalui pencurian,
            peretasan, intersepsi, rekayasa sosial, penyalahgunaan kewenangan
            (termasuk kewenangan yang telah berakhir), atau cara melawan hukum
            lainnya;
          </li>
          <li>
            Menggunakan Layanan untuk tujuan yang bertentangan dengan hukum yang
            berlaku, termasuk namun tidak terbatas pada Undang-Undang Informasi dan
            Transaksi Elektronik, Undang-Undang Telekomunikasi, dan Undang-Undang
            Pelindungan Data Pribadi;
          </li>
          <li>
            Mendistribusikan, menanamkan, atau menjalankan perangkat lunak
            berbahaya (malware), termasuk namun tidak terbatas pada virus, ransomware,
            backdoor, rootkit, kode jahat, atau jenis serupa lainnya;
          </li>
          <li>
            Menjadikan Layanan sebagai sarana untuk melakukan serangan terhadap
            jaringan atau sistem elektronik milik pihak ketiga, termasuk namun
            tidak terbatas pada serangan denial-of-service, brute-force,
            port-scanning massal, atau lateral movement;
          </li>
          <li>
            Memfasilitasi perjudian daring, penipuan, phishing, distribusi konten
            pornografi, ujaran kebencian, atau kegiatan terlarang lainnya melalui
            perangkat yang dikelola melalui Layanan;
          </li>
          <li>
            Melakukan rekayasa balik (reverse engineering), dekompilasi,
            pembongkaran (disassembly), atau upaya lain untuk memperoleh kode sumber
            Layanan;
          </li>
          <li>
            Menyalahgunakan, membebani secara berlebihan, atau mengganggu
            ketersediaan dan kinerja Layanan, baik melalui automasi, skrip, maupun
            cara lain;
          </li>
          <li>
            Memberikan, menjual kembali, atau memindahkan akses Akun kepada pihak
            lain tanpa persetujuan tertulis dari Perusahaan, kecuali dalam
            kerangka Perjanjian Kerja Sama (PKS) resmi sebagai mitra reseller.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">5. Tanggung Jawab Pengguna atas Tindakan Pribadi</h2>
        <p className="mt-3">
          Pengguna mengakui dan menyetujui bahwa:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Layanan adalah perangkat (tool) yang bersifat netral dan eksekusi
            seluruh perintah dilakukan berdasarkan instruksi dan Kredensial
            Perangkat yang disediakan oleh Pengguna sendiri.
          </li>
          <li>
            Perusahaan tidak memiliki kemampuan, kewajiban, maupun kewenangan untuk
            memverifikasi keabsahan otorisasi Pengguna atas setiap perangkat yang
            kredensialnya dimasukkan ke dalam Layanan. Tanggung jawab atas
            keabsahan tersebut sepenuhnya berada pada Pengguna.
          </li>
          <li>
            Segala tindak pidana, perbuatan melawan hukum, pelanggaran kontraktual,
            atau kerugian apa pun yang ditimbulkan oleh Pengguna melalui Layanan
            adalah tanggung jawab pribadi Pengguna sepenuhnya, dan tidak dapat
            dialihkan, dibebankan, atau dimintakan pertanggungjawaban kepada
            Perusahaan.
          </li>
          <li>
            Termasuk dalam tanggung jawab pribadi Pengguna sebagaimana dimaksud
            pada ayat (3) di atas adalah:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                penggunaan kredensial milik orang lain tanpa hak;
              </li>
              <li>
                akses atau pengelolaan perangkat MikroTik yang bukan milik Pengguna
                tanpa otorisasi sah dari pemiliknya;
              </li>
              <li>
                tindakan destruktif atau manipulatif terhadap perangkat jaringan
                yang merugikan pemilik perangkat atau pihak ketiga;
              </li>
              <li>
                pelanggaran terhadap perjanjian kerahasiaan atau hubungan kerja
                yang sebelumnya pernah dimiliki Pengguna dengan pemilik perangkat;
              </li>
              <li>
                tindak pidana di bidang teknologi informasi, telekomunikasi, dan
                pelindungan data pribadi.
              </li>
            </ul>
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">6. Ganti Rugi (Indemnity)</h2>
        <p className="mt-3">
          Pengguna dengan ini sepakat untuk <strong>membebaskan, melindungi, dan
          mengganti rugi</strong> Perusahaan, pemegang saham, pengurus, karyawan,
          afiliasi, dan agen-agennya dari dan terhadap setiap dan seluruh tuntutan,
          gugatan, proses hukum, kerugian, kerusakan, kewajiban, biaya, dan
          pengeluaran (termasuk namun tidak terbatas pada biaya jasa advokat) yang
          timbul dari atau berkaitan dengan:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>pelanggaran Pengguna terhadap Syarat ini;</li>
          <li>pelanggaran Pengguna terhadap peraturan perundang-undangan yang berlaku;</li>
          <li>
            pelanggaran Pengguna terhadap hak pihak ketiga, termasuk namun tidak
            terbatas pada hak atas keamanan sistem elektronik, hak kekayaan
            intelektual, dan hak privasi;
          </li>
          <li>
            penggunaan kredensial milik pihak lain oleh Pengguna tanpa otorisasi
            sah;
          </li>
          <li>
            akses tanpa hak yang dilakukan Pengguna terhadap perangkat MikroTik
            atau sistem elektronik milik pihak ketiga;
          </li>
          <li>
            tindak pidana yang dilakukan Pengguna dengan menggunakan Layanan
            sebagai sarana, termasuk namun tidak terbatas pada pelanggaran
            Undang-Undang Informasi dan Transaksi Elektronik, Undang-Undang
            Telekomunikasi, Kitab Undang-Undang Hukum Pidana, dan Undang-Undang
            Pelindungan Data Pribadi;
          </li>
          <li>
            klaim dari pihak ketiga (termasuk namun tidak terbatas pada pemilik
            sah perangkat, mantan pemberi kerja Pengguna, penyedia jasa
            internet, atau aparat penegak hukum) yang berkaitan dengan penggunaan
            Layanan oleh Pengguna.
          </li>
        </ol>
        <p className="mt-3">
          Kewajiban ganti rugi sebagaimana dimaksud dalam Pasal ini berlaku
          sepenuhnya, tanpa batasan nilai, dan tetap berlaku meskipun Akun
          Pengguna telah dihentikan atau Syarat ini telah berakhir.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">7. Pembatasan Tanggung Jawab Perusahaan</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Layanan disediakan dalam keadaan apa adanya (<em>as is</em>) dan
            sebagaimana tersedia (<em>as available</em>). Perusahaan tidak
            memberikan jaminan, baik tersurat maupun tersirat, atas ketersediaan,
            keandalan, akurasi, atau kesesuaian Layanan untuk tujuan tertentu.
          </li>
          <li>
            Sepanjang diperkenankan oleh hukum yang berlaku, Perusahaan tidak
            bertanggung jawab atas kerugian tidak langsung, kerugian konsekuensial,
            kehilangan keuntungan, kehilangan data, kerusakan reputasi, atau
            kerugian sejenis lainnya yang timbul dari penggunaan atau
            ketidakmampuan menggunakan Layanan.
          </li>
          <li>
            Total tanggung jawab Perusahaan kepada Pengguna untuk setiap dan
            seluruh tuntutan yang timbul dari atau berkaitan dengan Syarat ini
            atau Layanan, untuk alasan apa pun, dibatasi paling tinggi sebesar
            jumlah biaya yang dibayarkan Pengguna kepada Perusahaan dalam jangka
            waktu 12 (dua belas) bulan terakhir sebelum peristiwa yang menimbulkan
            tuntutan tersebut.
          </li>
          <li>
            Perusahaan tidak bertanggung jawab atas:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                tindakan atau kelalaian Pengguna, termasuk kesalahan dalam
                memasukkan perintah atau kredensial;
              </li>
              <li>
                gangguan, kerusakan, atau kehilangan konfigurasi pada perangkat
                MikroTik milik Pengguna yang ditimbulkan oleh perintah Pengguna
                sendiri atau oleh Agen AI berdasarkan instruksi Pengguna;
              </li>
              <li>
                interupsi layanan yang disebabkan oleh penyedia pihak ketiga,
                gangguan jaringan internet, pemadaman listrik, atau keadaan kahar
                (<em>force majeure</em>);
              </li>
              <li>
                kerugian akibat penyalahgunaan Akun atau kredensial oleh Pengguna
                atau pihak yang diberi akses oleh Pengguna.
              </li>
            </ul>
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">8. Hak Audit, Pemantauan, dan Pelaporan</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Perusahaan mencatat seluruh aktivitas administratif dan eksekusi
            perintah yang dilakukan melalui Layanan untuk keperluan audit,
            keamanan, dan kepatuhan hukum.
          </li>
          <li>
            Perusahaan berhak, atas pertimbangannya sendiri, untuk meninjau,
            menyelidiki, menangguhkan, atau menghentikan Akun Pengguna apabila
            terdapat indikasi pelanggaran terhadap Syarat ini atau peraturan
            perundang-undangan.
          </li>
          <li>
            Perusahaan akan bekerja sama dengan aparat penegak hukum dan otoritas
            yang berwenang dalam hal terdapat permintaan resmi yang sah,
            termasuk menyerahkan data dan catatan aktivitas Pengguna sebagaimana
            diperlukan oleh hukum.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">9. Penangguhan dan Pengakhiran</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Perusahaan berhak menangguhkan atau menghentikan Akun Pengguna secara
            seketika tanpa pemberitahuan terlebih dahulu apabila Pengguna
            melanggar Syarat ini, peraturan perundang-undangan, atau apabila
            Perusahaan menerima laporan kredibel terkait penyalahgunaan Layanan.
          </li>
          <li>
            Pengguna dapat menghentikan Akunnya kapan saja melalui pengaturan
            Akun atau dengan menghubungi Perusahaan.
          </li>
          <li>
            Pengakhiran Akun tidak menghapuskan kewajiban Pengguna yang telah
            timbul sebelum pengakhiran, termasuk kewajiban ganti rugi sebagaimana
            diatur dalam Pasal 6.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">10. Pelaporan Penyalahgunaan</h2>
        <p className="mt-3">
          Setiap pihak yang merasa hak-haknya dilanggar atau menemukan indikasi
          penyalahgunaan Layanan dapat melaporkannya melalui alamat surel{" "}
          <a href="mailto:abuse@mikroplay.com" className="text-blue-600 hover:text-blue-500">
            abuse@mikroplay.com
          </a>{" "}
          dengan menyertakan bukti yang memadai. Perusahaan akan menindaklanjuti
          setiap laporan kredibel paling lambat 1x24 (satu kali dua puluh empat)
          jam sejak diterimanya laporan.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">11. Perubahan Syarat</h2>
        <p className="mt-3">
          Perusahaan berhak mengubah, menambah, atau menghapus sebagian atau
          seluruh ketentuan dalam Syarat ini sewaktu-waktu. Perubahan akan
          diberlakukan sejak dipublikasikan pada halaman ini. Penggunaan Layanan
          oleh Pengguna setelah perubahan dipublikasikan merupakan persetujuan
          terhadap perubahan tersebut.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">12. Hukum yang Berlaku dan Penyelesaian Sengketa</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Syarat ini diatur dan ditafsirkan berdasarkan hukum Negara Republik
            Indonesia.
          </li>
          <li>
            Segala sengketa yang timbul dari atau berkaitan dengan Syarat ini
            akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat.
          </li>
          <li>
            Apabila penyelesaian secara musyawarah tidak tercapai dalam jangka
            waktu 30 (tiga puluh) hari kalender, sengketa akan diselesaikan
            melalui Pengadilan Negeri yang wilayah hukumnya meliputi kedudukan
            Perusahaan.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">13. Ketentuan Lain-Lain</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Apabila terdapat ketentuan dalam Syarat ini yang dinyatakan tidak
            sah atau tidak dapat diberlakukan, hal tersebut tidak akan
            mempengaruhi keabsahan dan keberlakuan ketentuan lainnya.
          </li>
          <li>
            Kegagalan atau keterlambatan Perusahaan dalam menggunakan haknya
            berdasarkan Syarat ini tidak dapat ditafsirkan sebagai pelepasan
            atas hak tersebut.
          </li>
          <li>
            Syarat ini, beserta Kebijakan Privasi dan dokumen-dokumen lain yang
            dirujuk di dalamnya, merupakan keseluruhan perjanjian antara
            Pengguna dan Perusahaan terkait penggunaan Layanan.
          </li>
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">14. Kontak</h2>
        <p className="mt-3">
          Pertanyaan, komentar, atau permintaan terkait Syarat ini dapat
          disampaikan kepada Perusahaan melalui:
        </p>
        <div className="mt-3 rounded-xl bg-gray-50 p-5 text-sm">
          <p><strong>PT. Repla Inti Media</strong></p>
          <p>Surel umum: <a href="mailto:halo@mikroplay.com" className="text-blue-600 hover:text-blue-500">halo@mikroplay.com</a></p>
          <p>Surel penyalahgunaan: <a href="mailto:abuse@mikroplay.com" className="text-blue-600 hover:text-blue-500">abuse@mikroplay.com</a></p>
          <p>Surel privasi: <a href="mailto:privasi@mikroplay.com" className="text-blue-600 hover:text-blue-500">privasi@mikroplay.com</a></p>
        </div>

        <div className="mt-16 border-t border-gray-100 pt-6 text-center text-sm text-gray-400">
          <p>
            Lihat juga{" "}
            <Link href="/kebijakan-privasi" className="text-blue-600 hover:text-blue-500">
              Kebijakan Privasi
            </Link>
            .
          </p>
          <p className="mt-2">© {new Date().getFullYear()} PT. Repla Inti Media. Hak cipta dilindungi.</p>
        </div>
      </article>
    </div>
  );
}
