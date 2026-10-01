"use client";

import { useState, useEffect } from "react";
import { Modal, Field, inp } from "@/components/Modal";
import { unduhPDFdariHTML } from "@/lib/pdf";
import { RATE_CATEGORIES, rateDefault } from "@/lib/rates";
import { JABATAN_ROLE, blokTtd, statusTtd } from "@/lib/ttd";

const HOTEL = {
  nama: "Aston Cirebon Hotel & Convention Center",
  namaCap: "ASTON CIREBON HOTEL & CONVENTION CENTER",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
  telp: "(0231) 8298000",
  email: "info@astoncirebon.com",
  web: "www.AstonCirebon.com",
};



// Paket & harga (bisa diubah). Coffee break 150k, Lunch/Dinner 250k.
const PAKET = [
  { nama: "Coffee Break Package", harga: 150000 },
  { nama: "Lunch Package", harga: 250000 },
  { nama: "Dinner Package", harga: 250000 },
  { nama: "Half Day Meeting", harga: 300000 },
  { nama: "Full Day Meeting", harga: 450000 },
  { nama: "Fullboard Meeting", harga: 600000 },
  { nama: "Residential Twin", harga: 1500000 },
  { nama: "Residential Single", harga: 1800000 },
];

const BENEFIT_DEFAULT = [
  "Sarapan untuk 2 orang",
  "Welcome Drink dan wet towel pada saat kedatangan",
  "Dua botol air mineral setiap hari di dalam kamar",
  "Fasilitas pembuat kopi dan teh",
  "Akses internet di kamar dan seluruh area hotel",
  "Free Shuttle menuju Mall dan stasiun kereta",
];

// ====== Jenis Perjanjian (mengikuti jenis Offering Letter) ======
const JENIS_CL = [
  { key: "Meeting", label: "Meeting / Kamar" },
  { key: "Wedding", label: "Wedding" },
  { key: "Graduation", label: "Graduation" },
];
const ADDON_DEFAULT = [
  "Mic Rp 300.000,-/mic",
  "Screen Projector Rp 1.500.000,-",
  "Internet 50 mbps Rp 10.000.000,-/meeting",
  "Flip Chart Rp 200.000,-",
  "Videotron Onyx Room (6 x 2.5 m) Rp 500.000,-/m",
  "Videotron Sapphire Grand Ballroom (8 x 4 m) Rp 500.000,-/m",
];

// Isi Offering Letter tersimpan -> isi Perjanjian (nomor, tanggal & tanda tangan tidak ikut).
const KOLOM_DARI_OL = ["rateCat", "rates", "sapaan", "namaTamu", "instansi", "kota", "noHP", "tglKamar", "jumlahKamar", "namaAcara", "jumlahPeserta", "rangkaian", "estimasi", "pakets", "weddings"];
function dariOL(d) {
  const n = { jenisCL: JENIS_CL.some((j) => j.key === d.jenisOL) ? d.jenisOL : "Meeting" };
  KOLOM_DARI_OL.forEach((k) => { if (d[k] !== undefined && d[k] !== null) n[k] = d[k]; });
  return n;
}

const BANK = { no: "134.050.888.8889", nama: "MULIA PUTRI LESTARI", bank: "Bank Mandiri Cabang Cirebon" };

const rp = (n) => "Rp " + (Number(String(n).replace(/[^\d]/g, "")) || 0).toLocaleString("id-ID") + ",-";
const angka = (n) => Number(String(n).replace(/[^\d]/g, "")) || 0;
const hariIni = () => new Date().toISOString().slice(0, 10);
const tglID = (s) => { if (!s) return "________"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

function pasalList(g) {
  return [
    ["KEBIJAKAN HOTEL",
      "<b>Kebijakan Pembatalan</b><br>Dalam hal pembatalan, pemberitahuan tertulis harus telah diterima hotel paling lama 90 hari sebelum pelaksanaan kegiatan. Deposit akan hangus apabila Bapak/Ibu melakukan pembatalan. Apabila pembatalan dilakukan kurang dari 90 hari sebelum pelaksanaan kegiatan maka akan dikenakan 100% biaya pembatalan.<br><br><b>Ketidakhadiran (No-Show)</b><br>Dalam hal ketidakhadiran tamu atau no-show, hotel berhak mengenakan biaya penuh terhadap seluruh kamar dan jumlah malam yang telah direservasi.<br><br><b>Pengurangan Jumlah Kamar</b><br>• Pengurangan jumlah kamar dalam kurun waktu 30 dan 7 hari sebelum tanggal kedatangan, pengurangan sebesar 5% dari total masa menginap dapat diizinkan tanpa dikenakan biaya.<br>• Pengurangan jumlah kamar dalam kurun waktu kurang dari 7 hari sebelum tanggal kedatangan akan dikenakan biaya penalty 100% sesuai dengan jumlah kamar dan masa menginap yang dibatalkan."],
    ["DAFTAR KAMAR (ROOMING LIST)",
      "Untuk kelancaran pembagian kamar dimohon mengirimkan daftar kamar atau rooming list paling lambat 2 hari sebelum tanggal kedatangan tamu."],
    ["DEKORASI",
      "Klien setuju bahwa tidak ada bendera, banner, poster, gambar, tanda tangan, logo perusahaan dan lain-lain yang akan dipasang di area umum tanpa persetujuan hotel. Setiap bahan dekorasi yang disetujui harus mematuhi peraturan perlindungan kebakaran dan hotel berhak meminta sertifikat resmi untuk itu. Hotel berhak membebankan biaya atas segala kerusakan yang diakibatkan oleh dekorasi klien."],
    ["BARANG BERBAHAYA",
      "Open flame (lampu lantern, lilin, obor, dll), sparklers, fireworks, pyrotechnics, bahan kimia berbahaya, glitter, confetti, pasir dan segala zat yang menghasilkan sampah/puing dilarang keras di lokasi hotel. Pelanggaran dapat mengakibatkan pembatalan acara, tindakan hukum, dan biaya pembersihan/kerusakan."],
    ["DEPOSIT & PEMBAYARAN",
      "• Biaya kamar akan secara otomatis ditagihkan ke dalam Group Master Account. Biaya tambahan yang dikonsumsi tamu akan dibebankan sebelum meninggalkan hotel.<br>• Hotel berhak meminta tambahan deposit apabila terdapat penambahan jumlah peserta.<br>• Pembayaran DP 50% paling lambat tanggal <b>" + tglID(g.dpDate) + "</b>.<br>• Pelunasan pembayaran paling lambat <b>" + tglID(g.pelunasanDate) + "</b> sebelum kegiatan.<br><br>Pembayaran menggunakan cash atau bank transfer ke:<br>Account Number : <b>" + BANK.no + "</b><br>Account Name : <b>" + BANK.nama + "</b><br>Bank : <b>" + BANK.bank + "</b><br><br>Setelah transfer, mohon kirimkan salinan bukti transfer kepada pihak hotel melalui email. Pembayaran ke rekening lain tidak akan diterima sebagai bukti pembayaran."],
    ["FASILITAS KREDIT",
      "Fasilitas kredit dapat diberikan kepada perusahaan yang memenuhi syarat setelah sukses melakukan aplikasi. Pihak hotel membutuhkan setidaknya 14 hari kerja untuk memproses aplikasi. Fasilitas kredit tidak berlaku untuk tamu individual."],
    ["JATUH TEMPO",
      "Apabila Bapak/Ibu ingin melakukan reservasi, silakan melakukan konfirmasi dengan menandatangani kontrak ini sebelum <b>" + tglID(g.jatuhTempoDate) + "</b>. Harga yang tercantum berlaku hingga tanggal jatuh tempo tersebut, dan apabila melewati tanggal tersebut hotel berhak melakukan revisi harga."],
    ["KONDISI DARURAT",
      "Kontrak ini akan berakhir tanpa menimbulkan kewajiban kepada masing-masing pihak apabila terdapat keadaan di luar kekuasaan kedua belah pihak, termasuk namun tidak terbatas pada tindakan Tuhan, peraturan pemerintah, kebakaran, banjir, ledakan, perang, bencana, kekacauan sipil, pembatasan transportasi, peringatan kesehatan/epidemi, dan sebab lain yang wajar di luar kendali."],
    ["KEAMANAN",
      "Penyelenggara Acara bertanggung jawab penuh atas keamanan peralatan, perlengkapan, maupun barang berharga selama berada di hotel. Setiap barang yang dikirim ke hotel harus ditandai dan ditujukan kepada \"Sales Marketing\" dengan menyatakan nama acara. Penyelenggara harus mengatur asuransi dan/atau keamanan sendiri."],
    ["KERUGIAN & KERUSAKAN",
      "Penyelenggara Acara beserta seluruh kontraktor, pemasok, dan karyawannya harus menjaga dan tidak melakukan tindakan yang menyebabkan kerusakan pada ruang acara atau properti hotel, dan wajib membayar setiap kerusakan yang terjadi akibat kelalaian."],
    ["HUKUM & REGULASI",
      "Penyelenggara tidak mengizinkan kegiatan ilegal atau yang melanggar hukum. Minuman keras yang dibawa ke hotel dikenakan biaya corkage sesuai kebijakan hotel. Merokok dilarang di seluruh outlet, ruang rapat, maupun ruang publik hotel."],
    ["LISENSI",
      "Klien sepenuhnya bertanggung jawab untuk mendapatkan lisensi/izin yang diperlukan untuk menampilkan karya hak cipta (musik, audio, video, karya seni, dll) yang digunakan Grup di hotel."],
    ["KERAHASIAAN",
      "Semua rincian pada perjanjian bersifat rahasia dan tidak boleh ditunjukkan kepada pihak ketiga atau dipublikasikan tanpa persetujuan khusus dari pihak hotel."],
    ["GANTI RUGI",
      "Klien setuju untuk mengganti rugi hotel dan penyedianya dari segala kewajiban, kerugian, klaim, tuntutan, kerusakan, dan biaya (termasuk biaya legal) yang disebabkan oleh pelanggaran terhadap ketentuan dalam perjanjian ini."],
    ["KETIDAKBERDAYAAN KINERJA",
      "Perjanjian ini akan berakhir tanpa kewajiban apabila kinerja substansial salah satu pihak tertunda/terhambat oleh sebab di luar kendali yang wajar. Pengakhiran dilakukan melalui pemberitahuan tertulis dan tidak lebih dari sepuluh (10) hari setelah mempelajari dasar tersebut."],
    ["EKSEKUSI YANG TEPAT",
      "Perjanjian ini menggantikan semua perjanjian, proposal, dan komunikasi sebelumnya, dan hanya dapat diubah secara tertulis melalui persetujuan bersama. Perjanjian ini tidak berlaku sampai dieksekusi oleh individu yang berwenang dari klien dan hotel."],
    ["FLUKTUASI PAJAK",
      "Apabila di kemudian hari terjadi perubahan nilai pajak dan/atau retribusi, hotel berhak mengumpulkan pajak/retribusi tersebut dari Penyelenggara Acara atas nama kewenangan Pemerintah dengan pemberitahuan terlebih dahulu."],
    ["KELALAIAN",
      "Apabila Penyelenggara Acara gagal melakukan pembayaran atau tidak mematuhi persyaratan, maka Hotel dapat mengakhiri kontrak ini."],
    ["TANDA TANGAN",
      "Silakan tandatangani semua lembar kontrak ini apabila telah disetujui dan dikirim kembali kepada " + HOTEL.nama + ". Setelah kontrak ditandatangani maka kesepakatan yang mengikat dianggap telah dikonfirmasi dan pasti."],
  ];
}

// ====== Pasal untuk Perjanjian Wedding & Graduation (mengikuti format surat perjanjian hotel) ======
function pasalAcara(g, wed) {
  const H = "<b>Aston Cirebon Hotel and Convention Center</b>";
  const acara = esc(g.namaAcara || g.instansi);
  const tempat = esc((g.rangkaian[0] || {}).tempat) || "________";
  const noShow = "Dalam hal ketidakhadiran tamu atau <i>no-show</i>, hotel berhak mengenakan biaya penuh terhadap seluruh kamar dan jumlah malam yang telah direservasi.";
  const dekorasi = ["DEKORASI",
    "Klien setuju bahwa tidak ada bendera, banner, poster, gambar, tanda tangan, logo perusahaan dan lain-lain yang akan dipasang dan ditunjukkan di setiap area umum termasuk di pintu masuk gedung, lobi, tempat makanan dan minuman, lantai tamu, fasilitas rekreasi dan lain-lain. Jika ada klien yang meminta dekorasi di gedung hotel (baik di dalam maupun di luar bangunan hotel), sebelumnya harus meminta persetujuan hotel. Persetujuan meliputi kebijaksanaan dari hotel, dan klien akan mengganti rugi pihak hotel dari segala tanggung jawab keuangan yang terjadi jika ada dekorasi yang tidak disetujui. Setiap bahan dekorasi yang disetujui harus mematuhi peraturan perlindungan kebakaran dan hotel berhak meminta sebuah sertifikat resmi untuk itu. Hotel berhak membebankan biaya atas segala kerusakan yang diakibatkan oleh dekorasi klien."];
  const berbahaya = ["BARANG BERBAHAYA",
    "Open flame (segala sesuatu yang berhubungan dengan api, seperti lampu lantern, lilin, obor, dan lain-lain), sparklers (kembang api besar), fireworks (kembang api), pyrotechnics (kembang api yang bervariasi), bahan kimia berbahaya, glitter, " + (wed ? "" : "confetti (kertas kecil berwarna yang biasanya ditaburi ke atas saat perayaan pernikahan, ulang tahun dan lain-lain), ") + "pasir dan segala zat yang menghasilkan sampah atau puing-puing dilarang keras di lokasi hotel (di dalam dan di luar ruangan). Pelanggaran dapat mengakibatkan acara terganggu dan pembatalan acara, tindakan hukum oleh hotel dan dikenakan biaya pembersihan / kerusakan."];
  const deposit = ["DEPOSIT &amp; PEMBAYARAN",
    "<ul><li>Biaya kamar akan secara otomatis ditagihkan ke dalam <i>Group Master Account</i>. Biaya tambahan yang dikonsumsi oleh tamu (misalnya minibar, telepon, laundry,…) akan ditambahkan kepada masing-masing tamu dan pembayaran dilakukan sebelum meninggalkan hotel. Apabila terdapat biaya tambahan yang belum terbayarkan setelah tamu meninggalkan hotel maka akan ditambahkan ke dalam <i>Group Master Account</i> dan ditagihkan kepada Panitia.</li>"
    + "<li>Masing-masing tamu yang menginap harus memberikan jaminan atau deposit untuk pembayaran tambahan biaya personal.</li>"
    + "<li>Hotel berhak meminta tambahan deposit apabila terdapat penambahan jumlah peserta atau penambahan lainnya.</li>"
    + (wed
      ? "<li>Pelunasan harus dilakukan paling lambat pada 30 hari sebelum acara yaitu tanggal <b>" + tglID(g.pelunasanDate) + "</b>.</li>"
      : "<li>Untuk jaminan reservasi kami membutuhkan deposit paling lambat <b>" + tglID(g.dpDate) + "</b>.</li><li>Seluruh pembayaran harus dilakukan paling lambat <b>" + tglID(g.pelunasanDate) + "</b>.</li>")
    + "</ul>Apabila pembayaran dilakukan melalui transfer bank harus dilakukan sebelum tanggal jatuh tempo seperti yang disebutkan sebelumnya. Apabila terjadi pembatalan" + (wed ? " atau hotel belum menerima pelunasan pembayaran sesuai dengan ketentuan yang telah disepakati" : "") + " maka deposit tidak dapat dikembalikan dan akan digunakan untuk pembayaran yang diakibatkan oleh pembatalan tersebut.<br><br>"
    + "Pembayaran menggunakan " + (wed ? "<i>cash</i> atau " : "") + "bank transfer ke:<br>Nomor Rekening : <b>" + BANK.no + "</b><br>Atas Nama : <b>" + BANK.nama + "</b><br>Bank : <b>" + BANK.bank + "</b><br><br>"
    + (wed ? "Salinan bank transfer dapat dikirimkan kepada " + H + " melalui email " + HOTEL.email + ".<br>" : "")
    + "<i>Setelah klien men-transfer pembayaran, klien diminta untuk mengirimkan salinan bukti transfer kepada pihak " + H + " melalui email. Pembayaran apa pun yang dilakukan ke mana pun atau siapapun kecuali ke rekening bank ini tidak akan diterima sebagai bukti pembayaran."
    + (wed ? "" : "<br><br>Kegagalan pembayaran oleh klien dapat menyebabkan penghentian perjanjian secara langsung tanpa melibatkan hotel maupun penyedia.") + "</i>"];
  const jatuhTempo = ["JATUH TEMPO",
    "Saat ini kami belum melakukan reservasi " + (wed ? "kamar maupun tempat" : "ruang meeting") + " untuk group tersebut di atas. Apabila Bapak/Ibu ingin melakukan reservasi silakan melakukan konfirmasi dengan menandatangani kontrak ini sebelum <b>" + tglID(g.jatuhTempoDate) + "</b>. Setelah hotel menerima kontrak yang telah ditandatangani, Bapak/Ibu akan menerima salinan kontrak yang telah ditandatangani oleh pihak " + H + ". Harga yang tercantum dalam kontrak ini berlaku hingga tanggal jatuh tempo yang disebutkan sebelumnya dan apabila melewati tanggal jatuh tempo hotel berhak melakukan revisi harga. Apabila kamar hotel telah terjual penuh pada periode yang disebutkan dalam kontrak ini maka hotel tidak akan mengenakan biaya terhadap kamar yang terjual pada masa tersebut."];
  const darurat = ["KONDISI DARURAT",
    "Kontrak ini akan berakhir tanpa menimbulkan kewajiban kepada masing-masing pihak apabila terdapat pekerjaan yang tertunda, terhambat atau terhalang yang disebabkan oleh hal-hal di luar kekuasaan kedua belah pihak. Termasuk dan tidak terbatas pada tindakan Tuhan, peraturan atau perintah atau otoritas pemerintah, kebakaran, banjir atau ledakan, perang, bencana, kekacauan sipil, pembatasan sarana transportasi, peringatan kesehatan regional atau epidemi, risiko tinggi serangan teroris, ilegal atau tidak memungkinkan untuk menyediakan fasilitas layanan, terjualnya hotel, keterlambatan dalam konstruksi yang diperlukan dan penting atau renovasi hotel, penangkapan atau penahanan dalam proses hukum, pemogokan, larangan bekerja, penghentian kerja, hambatan lain dari tenaga kerja, baik sebagian atau umum, dari sebab apapun."];
  const keamanan = ["KEAMANAN",
    "Penyelenggara Acara menyatakan bahwa " + H + " tidak dapat bertanggung jawab untuk menjaga keamanan dari peralatan, perlengkapan maupun barang berharga lainnya selama berada di hotel. Dengan demikian, Penyelenggara Acara menyatakan bahwa Penyelenggara Acara bertanggung jawab sepenuhnya terhadap keamanan setiap peralatan, perlengkapan maupun barang berharga lainnya tersebut dan bertanggung jawab terhadap kerugian yang ditimbulkan.<br><br>"
    + "Setiap bahan atau peralatan yang dikirim terlebih dahulu ke hotel harus ditandai dan ditujukan kepada \"Sales Marketing\" dengan menyatakan nama acara. Hotel tidak bertanggung jawab terhadap kerusakan atau kerugian harta benda yang berada di hotel baik sebelum, selama atau setelah acara tanpa serah terima yang tepat.<br><br>"
    + "Penyelenggara Acara harus mengatur asuransi dan / atau keamanan. Penyelenggara Acara harus mengeluarkan semua peralatan/perlengkapan acara dari lokasi hotel dalam jangka waktu yang disepakati bersama. Hotel berhak membuang barang yang masih tersisa di area hotel setelah jangka waktu tersebut."];
  const kerusakan = ["KERUGIAN &amp; KERUSAKAN",
    "Penyelenggara Acara dan semua Kontraktor, Pemasok dan Karyawannya harus menjaga dan tidak dibenarkan melakukan tindakan yang dapat menyebabkan kerusakan atau mengizinkan perbuatan yang menimbulkan kerusakan pada ruang acara atau bagian yang ada di dalamnya termasuk furnitur, perlengkapan, peralatan atau properti lainnya dan harus membayar setiap kerusakan (termasuk kerusakan akibat kecelakaan) yang disebabkan oleh tindakan apapun karena kelalaian dari Penyelenggara, Tim-nya, agen atau peserta yang menghadiri kegiatan tersebut.<br><br>"
    + "Hotel berhak meminta Penyelenggara Acara untuk memberikan deposit sebelum pelaksanaan acara untuk perbaikan properti yang rusak sebesar <b>Rp 5.000.000 untuk seluruh Ballroom</b> dan akan dikembalikan setelah acara selesai dan diperiksa oleh perwakilan hotel."];
  const hukumAwal = "Penyelenggara tidak memberikan izin kepada karyawannya, agen maupun peserta kegiatan untuk melakukan kegiatan ilegal, berbau mengganggu atau menyinggung atau melanggar undang-undang, perintah, peraturan atau ketentuan lain yang memiliki kekuatan hukum termasuk tetapi tidak terbatas pada lisensi minuman keras dan peraturan mengenai penggunaan api.<br>";
  const hukumAkhir = "Berdasarkan peraturan pemerintah bahwa merokok dilarang di mana saja dalam salah satu outlet hotel atau ruang rapat maupun ruang publik.";
  const hukum = ["HUKUM &amp; REGULASI", hukumAwal
    + (wed ? "" : "Penyelenggara Acara memahami bahwa semua minuman keras yang disediakan oleh hotel adalah sah melalui jalur hukum dengan cap atau materai sah pemerintah di setiap botol. Hotel tidak bertanggung jawab atas setiap minuman keras yang dibawa oleh Penyelenggara Acara maupun Peserta. Setiap minuman keras yang dibawa ke dalam hotel dikenakan biaya <i>corkage</i> sebagai kebijakan hotel. Layanan minuman beralkohol dapat ditolak untuk tamu yang mabuk atau di bawah usia.<br>")
    + hukumAkhir];
  const rahasia = ["KERAHASIAAN",
    "Semua rincian pada perjanjian bersifat rahasia dan tidak boleh ditunjukkan kepada pihak ketiga atau dipublikasikan pada saluran publik apapun termasuk website, media cetak dan lain-lain tanpa persetujuan khusus dengan pihak hotel sebelumnya."];
  const gantiRugi = ["GANTI RUGI",
    "Klien setuju untuk mengganti rugi hotel dan penyedianya, perusahaan induk mereka, anak perusahaan, afiliasi, pejabat, eksekutif, direktur, perwakilan, karyawan, agen dan lain-lain dari segala kewajiban, kerugian, klaim, perselisihan, tuntutan, kerusakan, biaya (termasuk biaya legal) dan lain-lain yang disebabkan oleh pelanggaran terhadap salah satu ketentuan yang ditetapkan dalam perjanjian ini."];
  const kinerja = ["KETIDAKBERDAYAAN KINERJA",
    "Perjanjian ini akan berakhir tanpa kewajiban kepada salah satu pihak jika kinerja substansial dari kewajiban salah satu pihak tertunda, terhambat atau dicegah oleh sebab apa pun yang secara wajar di luar kendali pihak tersebut. Penyebab tersebut termasuk, tetapi tidak terbatas pada Kuasa Tuhan, peraturan atau perintah / otoritas pemerintah, kebakaran, banjir, ledakan, perang, bencana, kekacauan sipil, pembatasan fasilitas transportasi, peringatan kesehatan regional atau epidemi, risiko tinggi serangan teroris regional atau keadaan darurat lainnya (membuatnya tidak disarankan, ilegal atau tidak mungkin untuk menyediakan fasilitas atau layanan untuk mengadakan fungsi apapun), penjualan hotel, keterlambatan yang diperlukan dan konstruksi esensial atau renovasi hotel, penangkapan atau penyitaan dalam proses hukum, mogok kerja, larangan bekerja, penghentian kerja, pengekangan tenaga kerja lainnya (baik sebagian atau umum) dari penyebab apa pun.<br><br>"
    + "Perjanjian ini dapat diakhiri untuk satu atau alasan yang lebih dengan pemberitahuan tertulis dari satu pihak ke pihak lain tanpa pertanggungjawaban. Kemampuan untuk mengakhiri perjanjian ini tanpa pertanggungjawaban sesuai dengan paragraf ini dikondisikan pada saat penyampaian pemberitahuan tertulis kepada pihak lain yang menetapkan dasar untuk penghentian sesegera mungkin secara beralasan, tetapi tidak lebih dari sepuluh (10) hari setelah mempelajari dasar tersebut."];
  const eksekusi = [wed ? "EKSEKUSI" : "EKSEKUSI YANG TEPAT",
    "Perjanjian ini menggantikan semua perjanjian, proposal, baik lisan dan negosiasi tertulis, representasi, komitmen dan komunikasi lainnya antara hotel, penyedia dan klien, dan hanya dapat ditambahkan atau diubah secara tertulis melalui perjanjian bersama dan ditandatangani oleh hotel dan klien. Klien menyetujui bahwa setiap perubahan di perusahaan mereka atau struktur kepemilikan perusahaan baik penggabungan, pengambilalihan atau jika tidak akan dibatalkan, dimodifikasi, atau dengan cara mengurangi kewajiban berdasarkan perjanjian ini dan bahwa perjanjian ini akan tetap berlaku sepenuhnya dan berhubungan dengan klien dan entitas penggantinya.<br><br>"
    + "Perjanjian ini tidak berlaku sampai dieksekusi oleh individu yang berwenang baik dari klien dan hotel. Yang bertanda tangan di bawah ini menyetujui dan menjamin bahwa mereka berwenang untuk menandatangani dan masuk ke dalam perjanjian ini atas nama pihak yang mereka tandatangani."];
  const kelalaian = ["KELALAIAN",
    "Apabila Penyelenggara Acara gagal melakukan pembayaran atau tidak mematuhi persyaratan maka Hotel dapat mengakhiri kontrak ini."];
  const ttd = ["TANDA TANGAN",
    "Silakan tandatangani semua lembar kontrak ini apabila telah disetujui dan dikirim kembali kepada " + H + ". Setelah kontrak ditandatangani maka kesepakatan yang mengikat dan pengaturan yang disebutkan dalam kontrak ini dianggap telah dikonfirmasi dan pasti."];

  if (wed) {
    return [
      ["KEBIJAKAN HOTEL",
        "<b>CHECK-IN: 14.00 waktu setempat<br>CHECK OUT: 12.00 waktu setempat</b><br>Apabila jam kedatangan tamu sebelum pukul 14.00 waktu setempat maka konfirmasi ketersediaan kamar akan dilakukan tergantung pada ketersediaan kamar. Apabila hotel dalam keadaan penuh, kami tidak dapat menjamin ketersediaan kamar untuk jam kedatangan yang lebih awal dari ketentuan jam check in hotel. <b><i>Late check out</i></b> hingga pukul 18.00 waktu setempat akan dikenakan biaya 50% dari harga kontrak dan apabila melebihi pukul 18.00 akan dikenakan biaya 100% dari harga kontrak.<br><br>"
        + "<b>Ketidakhadiran <i>(No-Show)</i></b><br>" + noShow + "<br>Setelah penandatanganan kontrak : Booking Fee bersifat <i>non-refundable</i><br>Dalam 60 hari kedatangan : 50% of total cost<br>Dalam 30 hari kedatangan : 100% of total cost<br><br>"
        + "<b><i>Force Majeure</i></b> – Dalam keadaan <i>force majeure</i>, musibah, kerusuhan, perang, pandemi (penyakit menular secara global), tidak ada biaya pembatalan dan tidak ada tuntutan dari kedua belah pihak."],
      ["MENU",
        "Konfirmasi menu paling lambat dilakukan 1 minggu sebelum pelaksanaan acara atau pemilihan menu akan dilakukan oleh hotel." + (String(g.menu || "").trim() ? "<br><br>" + esc(g.menu) : "")],
      ["MAKANAN DAN MINUMAN",
        "<b>Alergi</b><br>Klien harus menginformasikan kepada pihak hotel sebelumnya jika ada tamu yang memiliki alergi nutrisi dan harus memberitahukan nama lengkap tamu. Jika tidak, hotel tidak bertanggung jawab untuk mengganti kerugian untuk setiap klaim mengenai alergi makanan dan implikasi yang terkait.<br><b>Makanan dan Minuman di luar Hotel</b><br>Dilarang untuk membawa minuman dan makanan dari luar ke hotel."],
      dekorasi, berbahaya, deposit, jatuhTempo, darurat, keamanan, kerusakan,
      ["KEBIJAKAN LOADING BARANG",
        "Sehubungan dengan acara <b><i>" + acara + "</i></b>, pada tanggal <b>" + tglID(g.tglKamar) + "</b> di <b>" + tempat + "</b>, untuk waktu loading memasukkan barang-barang berupa perlengkapan hiburan atau perlengkapan kebutuhan acara, dapat dilakukan pada tanggal <b>" + tglID(g.loadingTgl) + "</b> pukul <b>" + (esc(g.loadingJam) || "________") + "</b>. Selain itu untuk pembongkaran perlengkapan harus segera dilakukan langsung setelah selesainya acara pada tanggal <b>" + tglID(g.tglKamar) + "</b>."],
      hukum, rahasia, gantiRugi, kinerja, eksekusi, kelalaian, ttd,
    ];
  }
  return [
    ["KEBIJAKAN PEMBATALAN",
      "Dalam hal pembatalan, pemberitahuan tertulis harus telah diterima hotel paling lama 90 hari sebelum pelaksanaan kegiatan. Deposit akan hangus apabila Bapak/Ibu melakukan pembatalan. Apabila pembatalan dilakukan kurang dari 90 hari sebelum pelaksanaan kegiatan maka akan dikenakan 100% biaya pembatalan."],
    ["KETIDAKHADIRAN <i>(No-Show)</i>", noShow],
    dekorasi, berbahaya, deposit,
    ["FASILITAS KREDIT",
      "Fasilitas kredit dapat diberikan kepada perusahaan yang memenuhi syarat setelah sukses melakukan aplikasi. Pihak hotel membutuhkan setidaknya 14 hari kerja untuk memproses aplikasi sebelum tamu datang, agar mengefektifkan proses aplikasi. Hasil persetujuan aplikasi sesuai dengan kebijakan hotel dan tidak menutup kemungkinan akan terjadi sebuah penolakan tanpa penjelasan. Hanya klien yang akan menggunakan hotel lebih dari sekali yang dapat mengajukan, jika tidak aplikasi akan ditolak. Saat disetujui, kredit yang diperpanjang tidak bisa melebihi dari batas yang telah ditentukan. Fasilitas kredit tidak bisa diberlakukan untuk tamu individual."],
    jatuhTempo, darurat, keamanan, kerusakan, hukum,
    ["LISENSI",
      "Klien sepenuhnya bertanggung jawab untuk mendapatkan lisensi atau izin yang diperlukan untuk melakukan, menyiarkan, mengirim, atau menampilkan karya hak cipta apa pun (termasuk, tanpa batasan, musik, audio, atau rekaman video, karya seni, dan lain-lain) yang dapat digunakan Grup atau diminta untuk digunakan di hotel."],
    rahasia, gantiRugi, kinerja, eksekusi,
    ["FLUKTUASI PAJAK",
      "Apabila di kemudian hari terjadi perubahan nilai pajak dan atau retribusi selama masa kontrak ini dan mengharuskan hotel membayar pajak/retribusi tersebut maka hotel berhak mengumpulkan pajak/retribusi tersebut dari Penyelenggara Acara atau tamu atas nama kewenangan Pemerintah dengan pemberitahuan terlebih dahulu.<br><br>Hal ini secara khusus disepakati bahwa dengan menandatangani perjanjian ini tidak ada pembebasan diberikan kepada Penyelenggara Acara terhadap pembayaran perubahan pajak dan/atau retribusi yang dikenakan oleh Pemerintah."],
    kelalaian, ttd,
  ];
}

const CSS_ACARA = `
  .doc { font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#111; line-height:1.5; }
  .doc .logo { text-align:center; margin-bottom:10px; }
  .doc .logo img { height:46px; display:block; margin:0 auto; }
  .doc b { color:#000; }
  .doc .sec { font-weight:bold; margin:12px 0 4px; }
  .doc .italb { font-weight:bold; font-style:italic; }
  .doc ul { margin:4px 0 4px 18px; padding:0; }
  .doc p { margin:6px 0; }
  .doc table { width:100%; border-collapse:collapse; margin:8px 0; page-break-inside:avoid; }
  .doc th, .doc td { border:1px solid #111; padding:5px 7px; text-align:left; vertical-align:top; font-size:10px; }
  .doc th { text-align:center; }
  .doc td.c { text-align:center; } .doc td.r { text-align:right; }
  .doc .total td { font-weight:bold; }
  .doc .pasal { margin:10px 0; }
  .doc .ptitle { font-weight:bold; }
  .doc .pbody { text-align:justify; }
  .doc .polos td { border:0; padding:1px 6px 1px 0; font-size:11px; }
  .doc .sign { page-break-inside:avoid; }
  .doc .sign td { border:0; padding:2px 6px; vertical-align:bottom; font-size:11px; }
  .doc .galeri { table-layout:fixed; }
  .doc .galeri td { border:0; padding:0 3px; width:33.33%; }
  .doc .galeri img { width:100%; height:auto; display:block; }
  .doc .paket td { width:50%; font-size:10.5px; }
`;

function inisial(nama) { return String(nama || "").trim().split(/\s+/).map((w) => w[0] || "").join("").toUpperCase().slice(0, 4); }
function buildNoDok(code, nomor, tgl, kode) {
  const d = tgl ? new Date(tgl) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${code}/${nomor || "___"}/${dd}/${mm}/${yy}/SM/ACHCC/${String(kode || "").toUpperCase()}`;
}

// Dropdown nama karyawan (anti salah ketik). Nama lama yang tidak ada di daftar tetap dipertahankan.
function PilihNama({ karyawan, value, img, onPilih }) {
  const st = statusTtd(value, img, karyawan);
  return (
    <>
      <select className={inp} value={value || ""} onChange={(e) => onPilih(e.target.value)}>
        <option value="">— pilih nama —</option>
        {value && !karyawan.some((k) => k.Nama === value) && <option value={value}>{value}</option>}
        {karyawan.map((k) => (
          <option key={k.Nama} value={k.Nama}>{k.Nama}{k.Kode ? " (" + k.Kode + ")" : ""}</option>
        ))}
      </select>
      <p className={"text-xs mt-1 " + st.warna}>{st.teks}</p>
    </>
  );
}

export default function ConfirmationLetter({ lead, user, onClose }) {
  const [g, setG] = useState({
    clNo: "",
    nomor: "",
    jenisCL: "Meeting",
    pakets: [],
    weddings: [],
    paketPilihan: "",
    addon: ADDON_DEFAULT.join("\n"),
    dpNominal: "",
    menu: "",
    loadingTgl: "",
    loadingJam: "23.00 WIB",
    kodeSales: user?.kode || inisial(user?.nama),
    rateCat: RATE_CATEGORIES[0],
    rates: rateDefault(),
    benefit: BENEFIT_DEFAULT.join("\n"),
    tglSurat: hariIni(),
    sapaan: "Bapak/Ibu",
    namaTamu: lead.Nama || "",
    instansi: lead.Instansi || "",
    kota: "",
    noHP: lead.NoHP || "",
    tglKamar: lead.TanggalEvent || "",
    jumlahKamar: lead.JumlahKamar || "",
    namaAcara: lead.Instansi || lead.JenisEvent || "",
    jumlahPeserta: lead.JumlahPax || "",
    rangkaian: [{ hari: lead.TanggalEvent || "", waktu: "", acara: "", tempat: "", setup: "", jumlah: lead.JumlahPax || "" }],
    estimasi: [{ deskripsi: "Residential Twin", jumlah: "", harga: "1500000" }],
    dpDate: "", pelunasanDate: "", jatuhTempoDate: "",
    prepBy: user?.nama || "", prepTitle: "Sales Person", prepImg: "",
    leaderNama: "", leaderTitle: "Sales Leader", leaderImg: "",
    gmNama: "", gmTitle: "General Manager", gmImg: "",
  });

  // Daftar karyawan aktif — untuk dropdown tanda tangan (anti salah ketik + autofill jabatan)
  const [karyawan, setKaryawan] = useState([]);
  useEffect(() => {
    fetch("/api/karyawan", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => { if (r.status === "ok") setKaryawan(r.data || []); })
      .catch(() => {});
  }, []);

  // Pilih nama dari dropdown -> nama, jabatan, dan gambar tanda tangan terisi otomatis
  function pilihTtd(namaKey, titleKey, imgKey, nama, jabatanTetap) {
    const k = karyawan.find((x) => x.Nama === nama);
    const jab = jabatanTetap || JABATAN_ROLE[String(k?.Role || "").toLowerCase()] || "";
    setG((s) => ({
      ...s,
      [namaKey]: nama,
      [titleKey]: nama && jab ? jab : s[titleKey],
      [imgKey]: nama ? (k?.Ttd || "") : "",
    }));
  }

  // Gambar TTD selalu diturunkan dari nama + daftar karyawan, jadi tetap benar
  // setelah memuat draft tersimpan maupun setelah ganti nama penandatangan.
  useEffect(() => {
    if (!karyawan.length) return;
    const cari = (nama) => karyawan.find((x) => x.Nama === nama)?.Ttd || "";
    setG((s) => {
      const p = cari(s.prepBy), l = cari(s.leaderNama), gm = cari(s.gmNama);
      if (s.prepImg === p && s.leaderImg === l && s.gmImg === gm) return s;
      return { ...s, prepImg: p, leaderImg: l, gmImg: gm };
    });
  }, [karyawan, g.prepBy, g.leaderNama, g.gmNama]);

  const set = (k, v) => setG((s) => ({ ...s, [k]: v }));
  const setRow = (arr, i, k, v) => setG((s) => ({ ...s, [arr]: s[arr].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (arr, kosong) => setG((s) => ({ ...s, [arr]: [...s[arr], kosong] }));
  const delRow = (arr, i) => setG((s) => ({ ...s, [arr]: s[arr].filter((_, j) => j !== i) }));
  const setRate = (i, kol, v) => setG((s) => ({ ...s, rates: { ...s.rates, [s.rateCat]: s.rates[s.rateCat].map((r, j) => (j === i ? [r[0], kol === "wd" ? v : r[1], kol === "we" ? v : r[2]] : r)) } }));
  const tambahPaket = (nama) => { const p = PAKET.find((x) => x.nama === nama); if (p) setG((s) => ({ ...s, estimasi: [...s.estimasi, { deskripsi: p.nama, jumlah: "", harga: String(p.harga) }] })); };
  // Graduation menghitung per hari (Harga x Jumlah Hari x Kuantitas); jenis lain Harga x Jumlah.
  const totalBaris = (r) => angka(r.jumlah) * angka(r.harga) * (g.jenisCL === "Graduation" ? angka(r.hari) || 1 : 1);
  const grandTotal = g.estimasi.reduce((t, r) => t + totalBaris(r), 0);
  const clNo = buildNoDok("CL", g.nomor, g.tglSurat, g.kodeSales);

  useEffect(() => {
    const th = new Date(g.tglSurat || hariIni()).getFullYear();
    fetch(`/api/docnum?kode=CL&tahun=${th}`, { cache: "no-store" })
      .then((r) => r.json()).then((r) => { if (r.status === "ok" && !g.nomor) set("nomor", String(r.next)); })
      .catch(() => {});
  }, []); // eslint-disable-line

  // Perjanjian Wedding & Graduation — susunan mengikuti surat perjanjian hotel untuk acara.
  function buildAcara() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const wed = g.jenisCL === "Wedding";
    const acara = esc(g.namaAcara || g.instansi) || "-";
    const r0 = g.rangkaian[0] || {};
    const tglAcara = g.tglKamar ? tglID(g.tglKamar) : "-";
    const li = (t) => String(t || "").split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x)}</li>`).join("");
    const galeri = (p) => `<table class="galeri"><tr>${[1, 2, 3].map((i) => `<td><img src="${origin}/img/${p}-${i}.jpg"/></td>`).join("")}</tr></table>`;
    const baris = (k, v) => `<tr><td width="28%"><b>${k}</b></td><td>: ${v}</td></tr>`;

    const rangkaianRows = g.rangkaian.map((r) =>
      `<tr><td class="c">${esc(tglID(r.hari))}</td><td class="c">${esc(r.waktu)}</td><td class="c">${esc(r.acara)}</td><td class="c">${esc(r.tempat)}</td><td class="c">${esc(r.setup)}</td><td class="c">${esc(r.jumlah)}</td></tr>`).join("");

    // Tabel biaya + DP & sisa pembayaran
    const dp = angka(g.dpNominal);
    const kol = wed ? 4 : 5;
    const biayaRows = g.estimasi.map((r) => {
      const qty = angka(r.jumlah).toLocaleString("id-ID") + " " + esc(r.satuan || "pax");
      return `<tr><td class="c">${tglAcara}</td><td class="c">${esc(r.deskripsi)}</td><td class="c">${rp(r.harga)}</td>${wed ? "" : `<td class="c">${angka(r.hari) || 1}</td>`}<td class="c">${qty}</td><td class="r">${rp(totalBaris(r))}</td></tr>`;
    }).join("");
    const biaya = `<div class="sec">${wed ? "Perkiraan Biaya" : "Biaya"}</div>
<table>
  <tr>${wed ? "<th>Tanggal</th><th>Jenis</th><th>Harga</th><th>Jumlah Orang / Kamar</th><th>Sub Total</th>" : "<th>Periode</th><th>Jenis</th><th>Harga</th><th>Jumlah Hari</th><th>Kuantitas</th><th>Total</th>"}</tr>
  ${biayaRows}
  <tr class="total"><td colspan="${kol}" class="c">Total</td><td class="r">${rp(grandTotal)}</td></tr>
  ${dp ? `<tr class="total"><td colspan="${kol}" class="c">DP</td><td class="r">${rp(dp)}</td></tr>
  <tr class="total"><td colspan="${kol}" class="c">Sisa Pembayaran</td><td class="r">${rp(Math.max(grandTotal - dp, 0))}</td></tr>` : ""}
</table>
<p><i><b>Catatan: Harga tersebut di atas sudah termasuk 21% pajak &amp; pelayanan dan hotel tidak memberikan komisi</b></i></p>`;

    // Paket: Wedding dalam kotak berdampingan, Graduation daftar paket + ADD ON
    let paket = "";
    if (wed) {
      const ws = g.weddings || [];
      const sel = (w, lebar) => `<td${lebar ? ' colspan="2"' : ""}><b>${esc(w.key)} Package:</b><br>Harga: ${rp(w.harga)} Nett untuk ${esc(w.persons)} Orang<br><b>Termasuk :</b><ul>${li(w.benefit)}</ul></td>`;
      let rows = "";
      for (let i = 0; i < ws.length; i += 2) rows += `<tr>${sel(ws[i], !ws[i + 1])}${ws[i + 1] ? sel(ws[i + 1]) : ""}</tr>`;
      const tambah = ws.filter((w) => angka(w.add)).map((w) => `<li>${esc(w.key)} Package ${rp(w.add)} Nett/Orang</li>`).join("");
      paket = ws.length ? `<div class="sec">Susunan Acara</div>
<table class="paket">
  <tr><th colspan="2">Aston Cirebon Hotel and Convention Center</th></tr>
  ${rows}
  ${tambah ? `<tr><td colspan="2"><b>Penambahan pesanan:</b><ul>${tambah}</ul></td></tr>` : ""}
</table>` : "";
    } else {
      paket = (g.pakets || []).map((p) => `<div class="sec">${esc(p.nama).toUpperCase()}</div>
<div><b>${rp(p.harga)} Nett/Person/Day</b></div>
${angka(p.hargaSpesial) ? `<div><b>Special Price ${rp(p.hargaSpesial)} Nett/Person/Day</b></div>` : ""}
<div>Termasuk:</div><ul>${li(p.benefit)}</ul>`).join("")
        + (String(g.addon || "").trim() ? `<div class="sec">ADD ON</div><ul>${li(g.addon)}</ul>` : "");
    }

    const kamar = wed ? `<div class="sec">KAMAR</div>
<table class="polos">
  ${baris("Tanggal", g.tglKamar ? tglID(g.tglKamar) : "tba")}
  ${baris("Jumlah Kamar", angka(g.jumlahKamar) ? angka(g.jumlahKamar) + " Kamar" : "tba")}
</table>
<div class="sec">Harga Kamar dengan Breakfast — ${esc(g.rateCat)}</div>
<table>
  <tr><th>ROOM TYPE</th><th>WEEKDAYS RATE</th><th>WEEKEND RATE</th></tr>
  ${(g.rates[g.rateCat] || []).map((r) => `<tr><td>${r[0]}</td><td class="c">${rp(r[1])}</td><td class="c">${rp(r[2])}</td></tr>`).join("")}
</table>
<div class="sec">Harga Kamar Sudah Termasuk:</div>
<ul>${li(g.benefit)}</ul>
<div class="sec">Kebijakan <i>Extra Bed</i> dan Anak Dibawah Umur</div>
<p>Penggunaan <i>Extra Bed</i> dikenakan biaya Rp 400.000 per malam sudah termasuk sarapan. Gratis sarapan untuk anak di bawah 6 tahun dan dikenakan Rp 100.000 untuk usia kurang dari 12 tahun. Penambahan sarapan di luar paket kamar dikenakan biaya Rp 180.000 per orang.</p>` : "";

    const detail = `<div class="sec">DETAIL KEGIATAN</div>
<table class="polos">
  ${baris("Nama Kegiatan", `<b><i>${acara}</i></b>`)}
  ${wed
    ? baris("Paket Wedding", esc(g.paketPilihan || (g.weddings[0] ? g.weddings[0].key + " Package" : "")) || "-")
      + baris("Hari/Tanggal", tglAcara)
      + baris("Jumlah Tamu", angka(g.jumlahPeserta) ? angka(g.jumlahPeserta) + " Pax" : "-")
      + baris("Tempat", esc(r0.tempat) || "-")
    : baris("Jumlah Peserta", angka(g.jumlahPeserta) ? angka(g.jumlahPeserta) + " Pax" : "-")
      + baris("Tempat Kegiatan", esc(r0.tempat) || "-")
      + baris("Set Up", esc(r0.setup) || "-")}
</table>
${galeri(wed ? "wedding" : "wisuda")}
${wed ? "" : '<div class="sec">Event Arrangement</div>'}
<table>
  <tr>${wed ? "<th>Hari / Tanggal</th><th>Waktu</th><th>Kegiatan</th><th>Tempat</th><th>Set Up</th><th>Jumlah Peserta</th>" : "<th>Tanggal</th><th>Waktu</th><th>Nama Acara</th><th>Venue</th><th>Set Up</th><th>Pax</th>"}</tr>
  ${rangkaianRows}
</table>
${wed ? "" : "<p><i>*Hotel berhak merubah Ruang Rapat sewaktu-waktu sesuai dengan ketersediaan ruangan selama kapasitas ruangan tersebut dapat mengakomodir jumlah peserta.</i></p>"}`;

    // Graduation: pasal bernomor mulai dari 2 (seperti surat aslinya); Wedding tanpa nomor.
    const pasalRows = pasalAcara(g, wed).map((p, i) =>
      `<div class="pasal"><div class="ptitle">${wed ? "" : i + 2 + ". "}${p[0]}</div><div class="pbody">${p[1]}</div></div>`).join("");

    const tglTtd = `<div>Tanggal : ${tglID(g.tglSurat)}</div>`;
    const pembuka = wed
      ? `Terima kasih atas kesempatan yang diberikan kepada kami untuk berpartisipasi dalam menyukseskan acara <b><i>${acara}</i></b> pada ${tglAcara}. Melanjutkan percakapan, bersama ini kami sampaikan konfirmasi acara tersebut:`
      : `Terima kasih atas kesempatan yang diberikan kepada kami untuk berpartisipasi dalam menyukseskan kegiatan <b><i>${acara}</i></b>. Melanjutkan percakapan mengenai harga ${esc((g.pakets[0] || {}).nama || "paket graduation")}, bersama ini kami sampaikan konfirmasi acara tersebut:`;

    return `<div class="doc">
<style>${CSS_ACARA}</style>
<div class="logo"><img src="${origin}/aston-logo.png" onerror="this.style.display='none'"/></div>
<div><b>Cirebon, ${tglID(g.tglSurat)}</b></div>
<br>
<div><b>${esc(clNo)}</b></div>
<br>
<div><b>${esc(g.namaTamu) || "-"}</b></div>
${g.instansi ? "<div><b>" + esc(g.instansi) + "</b></div>" : ""}
${g.kota ? "<div><b>" + esc(g.kota) + "</b></div>" : ""}
${g.noHP ? "<div><b>" + esc(g.noHP) + "</b></div>" : ""}
<br>
<div class="italb">Perihal: Perjanjian/${acara}/${tglAcara}</div>
<p>Dengan hormat,</p>
<div class="italb">Salam hangat dari Aston Cirebon Hotel and Convention Center</div>
<p style="text-align:justify">${pembuka}</p>

${kamar}
${detail}
${paket}
${biaya}

${pasalRows}

<div class="sign">
<p>Ditandatangani untuk <b>Aston Cirebon Hotel and Convention Center</b></p>
<table class="sign">
  <tr><td width="33%">Disiapkan oleh,</td><td width="33%">Mengetahui,</td><td width="34%">Mengetahui,</td></tr>
  <tr>
    <td>${blokTtd(g.prepImg, g.prepBy, g.prepTitle, "", esc, 44)}${tglTtd}</td>
    <td>${blokTtd(g.leaderImg, g.leaderNama, g.leaderTitle, "", esc, 44)}${tglTtd}</td>
    <td>${blokTtd(g.gmImg, g.gmNama, g.gmTitle, "", esc, 44)}${tglTtd}</td>
  </tr>
</table>
<br>
<div>Ditandatangani untuk <b><i>${acara}</i></b></div>
<table class="sign" style="width:60%">
  <tr><td width="35%">Nama</td><td>:</td></tr>
  ${wed ? "" : "<tr><td>Jabatan</td><td>:</td></tr>"}
  <tr><td>Tanggal</td><td>:</td></tr>
  <tr><td>Tanda Tangan</td><td>:</td></tr>
</table>
</div>
</div>`;
  }

  function build() {
    if (g.jenisCL !== "Meeting") return buildAcara();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rateRows = (g.rates[g.rateCat] || []).map((r) =>
      `<tr><td>${r[0]}</td><td class="c">${rp(r[1])}</td><td class="c">${rp(r[2])}</td></tr>`).join("");
    const inclList = String(g.benefit || "").split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x)}</li>`).join("");
    const rangkaianRows = g.rangkaian.map((r) =>
      `<tr><td>${esc(tglID(r.hari))}</td><td>${esc(r.waktu)}</td><td>${esc(r.acara)}</td><td>${esc(r.tempat)}</td><td>${esc(r.setup)}</td><td class="c">${esc(r.jumlah)}</td></tr>`).join("");
    const estRows = g.estimasi.map((r, i) => {
      const tot = angka(r.jumlah) * angka(r.harga);
      return `<tr><td class="c">${i + 1}</td><td>${esc(r.deskripsi)}</td><td class="r">${angka(r.jumlah).toLocaleString("id-ID")}</td><td class="r">${angka(r.harga).toLocaleString("id-ID")}</td><td class="r">${tot.toLocaleString("id-ID")}</td></tr>`;
    }).join("");
    const pasalRows = pasalList(g).map((p, i) =>
      `<div class="pasal"><div class="ptitle">${i + 3}. ${p[0]}</div><div class="pbody">${p[1]}</div></div>`).join("");


    return `<div class="doc">
<style>
  .doc { font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#111; line-height:1.5; }
  .doc .logo { text-align:center; margin-bottom:10px; }
  .doc .logo img { height:46px; display:block; margin:0 auto; }
  .doc b { color:#000; }
  .doc .sec { font-weight:bold; margin:12px 0 4px; }
  .doc .italb { font-weight:bold; font-style:italic; }
  .doc ul { margin:4px 0 4px 18px; padding:0; }
  .doc p { margin:6px 0; }
  .doc table { width:100%; border-collapse:collapse; margin:8px 0; page-break-inside:avoid; }
  .doc th, .doc td { border:1px solid #94a3b8; padding:5px 7px; text-align:left; vertical-align:top; font-size:10px; }
  .doc th { background:#f1f5f9; text-align:center; }
  .doc td.c { text-align:center; } .doc td.r { text-align:right; }
  .doc .rate-title td { text-align:center; font-weight:bold; background:#eef2f8; }
  .doc .total td { font-weight:bold; background:#fdf6e9; }
  .doc .pasal { margin:8px 0; page-break-inside:avoid; }
  .doc .ptitle { font-weight:bold; }
  .doc .pb { page-break-before: always; }
  .doc .sign { page-break-inside:avoid; }
  .doc .foot { text-align:center; font-size:8px; color:#666; border-top:1px solid #bbb; padding-top:6px; margin-top:28px; }
  .doc .foot .web { color:#2563eb; }
  .doc .sign td { border:0; padding:2px 6px; vertical-align:bottom; }
</style>

<div class="logo"><img src="${origin}/aston-logo.png" onerror="this.style.display='none'"/></div>
<div><b>Cirebon, ${tglID(g.tglSurat)}</b></div>
<div><b>${esc(clNo)}</b></div>
<br>
<div><b>${esc(g.namaTamu) || "-"}</b></div>
${g.instansi ? "<div><b>" + esc(g.instansi) + "</b></div>" : ""}
${g.kota ? "<div><b>" + esc(g.kota) + "</b></div>" : ""}
${g.noHP ? "<div><b>No HP : " + esc(g.noHP) + "</b></div>" : ""}
<br>
<div class="italb">Perihal: Perjanjian/${esc(g.instansi || g.namaAcara)}/${g.tglKamar ? tglID(g.tglKamar) : ""}</div>
<p>Dengan hormat,</p>
<div class="italb">Salam hangat dari ${HOTEL.nama}.</div>
<p>Terima kasih telah memilih <b>${HOTEL.nama}</b> sebagai tempat akomodasi <b>${esc(g.instansi || g.namaAcara)}</b>. Melanjutkan percakapan mengenai harga kamar dan paket meeting, bersama ini kami sampaikan konfirmasi acara tersebut:</p>

<div class="sec">1. KAMAR — ${esc(g.rateCat)}</div>
<div>Tanggal &nbsp;: ${g.tglKamar ? tglID(g.tglKamar) : "-"}</div>
<div>Jumlah Kamar &nbsp;: ${angka(g.jumlahKamar) || "-"} Kamar</div>
<table>
  <tr class="rate-title"><td colspan="3">${HOTEL.namaCap} — ${esc(g.rateCat)}</td></tr>
  <tr><th>ROOM TYPE</th><th>WEEKDAYS RATE</th><th>WEEKEND RATE</th></tr>
  ${rateRows}
</table>
<div class="sec">Harga Kamar Sudah Termasuk:</div>
<ul>${inclList}</ul>
<p>Penggunaan Extra Bed dikenakan biaya Rp 400.000 per malam sudah termasuk sarapan. Penambahan sarapan di luar paket kamar dikenakan biaya Rp 180.000 per orang.</p>

<div class="sec">2. KEBUTUHAN ACARA</div>
<div>Nama Acara &nbsp;: <b>${esc(g.namaAcara) || "-"}</b></div>
<div>Jumlah Peserta &nbsp;: ${angka(g.jumlahPeserta) ? angka(g.jumlahPeserta) + " Orang" : "-"}</div>
<div class="sec">Rangkaian Acara:</div>
<table>
  <tr><th>Hari/Tanggal</th><th>Waktu</th><th>Acara</th><th>Tempat</th><th>Set up</th><th>Jumlah Peserta</th></tr>
  ${rangkaianRows}
</table>

<div class="sec">ESTIMASI BIAYA</div>
<table>
  <tr><th>No</th><th>Deskripsi</th><th>Jumlah</th><th>Harga</th><th>Total</th></tr>
  ${estRows}
  <tr class="total"><td colspan="4" class="r">Grand Total</td><td class="r">${grandTotal.toLocaleString("id-ID")}</td></tr>
</table>
<p><i><b>Catatan: Harga tersebut di atas sudah termasuk 21% pajak &amp; pelayanan dan hotel tidak memberikan komisi.</b></i></p>

${pasalRows}

<table class="sign" style="margin-top:20px">
  <tr><td>Ditandatangani untuk <b>${HOTEL.nama}</b></td></tr>
</table>
<table class="sign">
  <tr><td width="33%">Prepared by,</td><td width="33%">Acknowledge by,</td><td width="34%">Approved by,</td></tr>
  <tr>
    <td>${blokTtd(g.prepImg, g.prepBy, g.prepTitle, "", esc, 44)}</td>
    <td>${blokTtd(g.leaderImg, g.leaderNama, g.leaderTitle, "", esc, 44)}</td>
    <td>${blokTtd(g.gmImg, g.gmNama, g.gmTitle, "", esc, 44)}</td>
  </tr>
</table>
<br>
<div>Ditandatangani untuk <b>${esc(g.instansi || g.namaAcara)}</b></div>
<table class="sign" style="width:60%">
  <tr><td width="35%">Nama</td><td>: ______________________</td></tr>
  <tr><td>Jabatan</td><td>: ______________________</td></tr>
  <tr><td>Tanggal</td><td>: ______________________</td></tr>
  <tr><td>Tanda Tangan</td><td>: ______________________</td></tr>
</table>
</div>`;
  }

  // ===== Draft tersimpan (bisa dibuka & diedit lagi) =====
  const [docId, setDocId] = useState("");
  const [infoSimpan, setInfoSimpan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [adaDraft, setAdaDraft] = useState(false);

  useEffect(() => {
    if (!lead?.ID) return;
    fetch(`/api/dokumen?leadId=${encodeURIComponent(lead.ID)}&jenis=CL`, { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        const row = r.status === "ok" && (r.data || [])[0];
        // Belum ada draft Perjanjian -> isi awal diambil dari Offering Letter lead ini.
        if (!row) { ambilDariOL(true); return; }
        let d = {};
        try { d = JSON.parse(row.data || "{}"); } catch (e) { return; }
        setDocId(row.id);
        setAdaDraft(true);
        setG((s) => ({ ...s, ...d, prepImg: "", leaderImg: "", gmImg: "" }));
        setInfoSimpan("Draft tersimpan dimuat (terakhir disimpan " + (row.updated_at || "-") + ").");
      })
      .catch(() => {});
  }, [lead?.ID]); // eslint-disable-line

  // Ambil isi Offering Letter tersimpan milik lead ini (jenis, penerima, kamar, rangkaian, paket, estimasi).
  const [infoOL, setInfoOL] = useState("");
  async function ambilDariOL(diam) {
    if (!lead?.ID) { if (!diam) setInfoOL("Dokumen ini tidak terhubung ke lead."); return; }
    try {
      const r = await fetch(`/api/dokumen?leadId=${encodeURIComponent(lead.ID)}&jenis=OL`, { cache: "no-store" }).then((x) => x.json());
      const row = r.status === "ok" && (r.data || [])[0];
      if (!row) { if (!diam) setInfoOL("Belum ada Offering Letter tersimpan untuk lead ini. Simpan dulu Offering Letter-nya."); return; }
      const d = JSON.parse(row.data || "{}");
      setG((s) => ({ ...s, ...dariOL(d) }));
      setInfoOL("✓ Isi diambil dari Offering Letter " + (row.no_dok || "") + ".");
    } catch (e) {
      if (!diam) setInfoOL("Gagal mengambil Offering Letter.");
    }
  }

  async function simpanDraft(diam) {
    if (!lead?.ID) { setInfoSimpan("Dokumen ini tidak terhubung ke lead, jadi tidak bisa disimpan."); return; }
    if (!diam) setMenyimpan(true);
    try {
      // Gambar TTD tidak ikut disimpan — diambil ulang dari nama saat dibuka.
      const { prepImg, leaderImg, gmImg, ...bersih } = g;
      const res = await fetch("/api/dokumen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simpan", id: docId, jenis: "CL", noDok: clNo, leadId: lead.ID,
          judul: g.namaAcara || g.instansi || lead.Nama || "", company: g.instansi || "",
          data: JSON.stringify(bersih), oleh: user?.nama || user?.email || "",
        }),
      });
      const d = await res.json();
      if (d.status === "ok") {
        if (d.id) setDocId(d.id);
        setAdaDraft(true);
        setInfoSimpan("✓ Tersimpan. Lain kali dibuka lagi, isinya sudah ada.");
      } else setInfoSimpan("Gagal menyimpan: " + (d.message || ""));
    } catch (e) {
      setInfoSimpan("Tidak bisa terhubung ke server.");
    } finally { setMenyimpan(false); }
  }

  const [busy, setBusy] = useState(false);
  async function unduh() {
    setBusy(true);
    await unduhPDFdariHTML(build(), "CL-" + (clNo || "letter").replace(/[^\w-]/g, "_") + ".pdf", HOTEL.alamat + " · " + HOTEL.telp + " · " + HOTEL.web, { paraf: g.jenisCL !== "Meeting" });
    try {
      const th = new Date(g.tglSurat || hariIni()).getFullYear();
      await fetch("/api/docnum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: "CL", tahun: th, nomor: angka(g.nomor) }) });
    } catch (e) {}
    await simpanDraft(true); // unduh sekalian menyimpan draft
    setBusy(false);
  }

  return (
    <Modal title="Buat Confirmation Letter / Perjanjian" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-slate-700 mb-1">Jenis Perjanjian</div>
          <div className="grid grid-cols-3 gap-2">
            {JENIS_CL.map((t) => (
              <button key={t.key} type="button" onClick={() => set("jenisCL", t.key)}
                className={"rounded-lg border px-3 py-2.5 text-sm font-semibold transition " + (g.jenisCL === t.key ? "border-[#12263a] bg-[#12263a] text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={() => { if (window.confirm("Isi Perjanjian akan ditimpa dengan isi Offering Letter tersimpan. Lanjutkan?")) ambilDariOL(false); }}
              className="text-xs font-semibold text-[#12263a] border border-[#c8962c] rounded-md px-3 py-1.5 hover:bg-[#fdf6e9]">
              ⟳ Ambil isi dari Offering Letter
            </button>
            {infoOL && <span className="text-xs text-slate-500">{infoOL}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nomor"><input className={inp} inputMode="numeric" value={g.nomor} onChange={(e) => set("nomor", e.target.value.replace(/[^\d]/g, ""))} placeholder="158" /></Field>
          <Field label="Tanggal Surat"><input type="date" className={inp} value={g.tglSurat} onChange={(e) => set("tglSurat", e.target.value)} /></Field>
          <Field label="Kode Sales"><input className={inp} value={g.kodeSales} onChange={(e) => set("kodeSales", e.target.value.toUpperCase())} placeholder="AS" /></Field>
          <Field label="No. CL (otomatis)"><input className={inp + " bg-slate-100 font-semibold"} value={clNo} readOnly /></Field>
        </div>

        {/* Perjanjian Graduation tidak memuat bagian kamar */}
        {g.jenisCL !== "Graduation" && (<>
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">HARGA KAMAR (Weekday / Weekend)</span>
            <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white" value={g.rateCat} onChange={(e) => set("rateCat", e.target.value)}>
              {RATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-1 text-[11px] text-slate-400 font-semibold px-1">
              <span className="col-span-6">Room Type</span><span className="col-span-3 text-center">Weekday</span><span className="col-span-3 text-center">Weekend</span>
            </div>
            {(g.rates[g.rateCat] || []).map((r, i) => (
              <div key={r[0]} className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-6 text-xs text-[#12263a]">{r[0]}</span>
                <input className={inp + " !py-1.5 text-xs col-span-3"} inputMode="numeric" value={r[1] ? angka(r[1]).toLocaleString("id-ID") : ""} onChange={(e) => setRate(i, "wd", e.target.value.replace(/[^\d]/g, ""))} />
                <input className={inp + " !py-1.5 text-xs col-span-3"} inputMode="numeric" value={r[2] ? angka(r[2]).toLocaleString("id-ID") : ""} onChange={(e) => setRate(i, "we", e.target.value.replace(/[^\d]/g, ""))} />
              </div>
            ))}
          </div>
        </div>

        <Field label="Benefit / Harga Kamar Sudah Termasuk (satu benefit per baris)">
          <textarea className={inp + " h-24 resize-none text-sm"} value={g.benefit} onChange={(e) => set("benefit", e.target.value)} />
        </Field>
        </>)}
        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">PENERIMA</div>
          <Field label="Nama"><input className={inp} value={g.namaTamu} onChange={(e) => set("namaTamu", e.target.value)} /></Field>
          <Field label="Instansi"><input className={inp} value={g.instansi} onChange={(e) => set("instansi", e.target.value)} /></Field>
          <Field label="Kota"><input className={inp} value={g.kota} onChange={(e) => set("kota", e.target.value)} placeholder="Jakarta" /></Field>
          <Field label="No HP"><input className={inp} value={g.noHP} onChange={(e) => set("noHP", e.target.value)} /></Field>
        </div>
        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">KAMAR & ACARA</div>
          <Field label="Tanggal Kamar/Acara"><input type="date" className={inp} value={g.tglKamar} onChange={(e) => set("tglKamar", e.target.value)} /></Field>
          <Field label="Jumlah Kamar"><input className={inp} inputMode="numeric" value={g.jumlahKamar} onChange={(e) => set("jumlahKamar", e.target.value.replace(/[^\d]/g, ""))} /></Field>
          <Field label="Nama Acara"><input className={inp} value={g.namaAcara} onChange={(e) => set("namaAcara", e.target.value)} /></Field>
          <Field label="Jumlah Peserta"><input className={inp} inputMode="numeric" value={g.jumlahPeserta} onChange={(e) => set("jumlahPeserta", e.target.value.replace(/[^\d]/g, ""))} /></Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-500">RANGKAIAN ACARA</span>
            <button onClick={() => addRow("rangkaian", { hari: "", waktu: "", acara: "", tempat: "", setup: "", jumlah: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button></div>
          {g.rangkaian.map((r, i) => (
            <div key={i} className="grid grid-cols-6 gap-1 mb-1">
              <input type="date" className={inp + " !py-1.5 text-xs"} value={r.hari} onChange={(e) => setRow("rangkaian", i, "hari", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Waktu" value={r.waktu} onChange={(e) => setRow("rangkaian", i, "waktu", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Acara" value={r.acara} onChange={(e) => setRow("rangkaian", i, "acara", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Tempat" value={r.tempat} onChange={(e) => setRow("rangkaian", i, "tempat", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Set up" value={r.setup} onChange={(e) => setRow("rangkaian", i, "setup", e.target.value)} />
              <div className="flex gap-1"><input className={inp + " !py-1.5 text-xs"} placeholder="Jml" value={r.jumlah} onChange={(e) => setRow("rangkaian", i, "jumlah", e.target.value)} />{g.rangkaian.length > 1 && <button onClick={() => delRow("rangkaian", i)} className="text-rose-600 text-xs">✕</button>}</div>
            </div>
          ))}
        </div>

        {/* Paket yang disepakati — isinya dari Offering Letter, tetap bisa diedit */}
        {g.jenisCL === "Wedding" && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">WEDDING PACKAGE</span>
            <button onClick={() => addRow("weddings", { key: "", harga: "", persons: "", add: "", benefit: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Tambah Paket</button>
          </div>
          {(g.weddings || []).length === 0 && <p className="text-xs text-slate-400">Belum ada paket. Ambil dari Offering Letter atau tambah manual.</p>}
          {(g.weddings || []).map((w, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-2 space-y-2 bg-slate-50/40">
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3"><Field label={"Venue & Tier " + (i + 1)}><input className={inp} value={w.key} onChange={(e) => setRow("weddings", i, "key", e.target.value)} placeholder="Sapphire Grand Ballroom — Gold" /></Field></div>
                <Field label="Harga (Rp)"><input className={inp} inputMode="numeric" value={w.harga ? angka(w.harga).toLocaleString("id-ID") : ""} onChange={(e) => setRow("weddings", i, "harga", e.target.value.replace(/[^\d]/g, ""))} /></Field>
                <Field label="Orang"><input className={inp} inputMode="numeric" value={w.persons} onChange={(e) => setRow("weddings", i, "persons", e.target.value.replace(/[^\d]/g, ""))} /></Field>
                <Field label="Add/Org"><input className={inp} inputMode="numeric" value={w.add ? angka(w.add).toLocaleString("id-ID") : ""} onChange={(e) => setRow("weddings", i, "add", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              </div>
              <Field label="Benefit (satu per baris, bisa diedit)"><textarea className={inp + " h-32 resize-none text-sm"} value={w.benefit} onChange={(e) => setRow("weddings", i, "benefit", e.target.value)} /></Field>
              <button onClick={() => delRow("weddings", i)} className="text-xs text-rose-600 font-semibold">✕ Hapus paket ini</button>
            </div>
          ))}
          <Field label="Paket yang dipilih (tampil di Detail Kegiatan)"><input className={inp} value={g.paketPilihan} onChange={(e) => set("paketPilihan", e.target.value)} placeholder={g.weddings[0] ? g.weddings[0].key + " Package" : "Sapphire Grand Ballroom Platinum Package"} /></Field>
          <Field label="Menu (opsional, tulis apa adanya per baris)"><textarea className={inp + " h-28 resize-none text-sm"} value={g.menu} onChange={(e) => set("menu", e.target.value)} placeholder={"Appetizer\nLumpia Hongkong (700)\n\nMain Menu (700)\nSteamed Rice"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loading barang — tanggal"><input type="date" className={inp} value={g.loadingTgl} onChange={(e) => set("loadingTgl", e.target.value)} /></Field>
            <Field label="Loading barang — jam"><input className={inp} value={g.loadingJam} onChange={(e) => set("loadingJam", e.target.value)} placeholder="23.00 WIB" /></Field>
          </div>
        </div>
        )}
        {g.jenisCL === "Graduation" && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PAKET GRADUATION</span>
            <button onClick={() => addRow("pakets", { nama: "", harga: "", benefit: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Tambah Paket</button>
          </div>
          {(g.pakets || []).length === 0 && <p className="text-xs text-slate-400">Belum ada paket. Ambil dari Offering Letter atau tambah manual.</p>}
          {(g.pakets || []).map((p, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-2 space-y-2 bg-slate-50/40">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2"><Field label={"Paket " + (i + 1)}><input className={inp} value={p.nama} onChange={(e) => setRow("pakets", i, "nama", e.target.value)} placeholder="Graduation Package" /></Field></div>
                <Field label="Harga/Orang (Rp)"><input className={inp} inputMode="numeric" value={p.harga ? angka(p.harga).toLocaleString("id-ID") : ""} onChange={(e) => setRow("pakets", i, "harga", e.target.value.replace(/[^\d]/g, ""))} /></Field>
                <Field label="Special Price (opsional)"><input className={inp} inputMode="numeric" value={p.hargaSpesial ? angka(p.hargaSpesial).toLocaleString("id-ID") : ""} onChange={(e) => setRow("pakets", i, "hargaSpesial", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              </div>
              <Field label="Termasuk (satu per baris, bisa diedit)"><textarea className={inp + " h-24 resize-none text-sm"} value={p.benefit} onChange={(e) => setRow("pakets", i, "benefit", e.target.value)} /></Field>
              <button onClick={() => delRow("pakets", i)} className="text-xs text-rose-600 font-semibold">✕ Hapus paket ini</button>
            </div>
          ))}
          <Field label="ADD ON (satu per baris, kosongkan bila tidak perlu)"><textarea className={inp + " h-28 resize-none text-sm"} value={g.addon} onChange={(e) => set("addon", e.target.value)} /></Field>
        </div>
        )}

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2 gap-2"><span className="text-xs font-semibold text-slate-500">ESTIMASI BIAYA</span>
            <div className="flex gap-1">
              <select className="border border-slate-300 rounded px-2 py-1 text-xs bg-white" value="" onChange={(e) => { if (e.target.value) tambahPaket(e.target.value); e.target.value = ""; }}>
                <option value="">+ Tambah paket…</option>
                {PAKET.map((p) => <option key={p.nama} value={p.nama}>{p.nama} — {angka(p.harga).toLocaleString("id-ID")}</option>)}
              </select>
              <button onClick={() => addRow("estimasi", { deskripsi: "", jumlah: "", harga: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button>
            </div></div>
          {g.estimasi.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 mb-1 items-center">
              <input className={inp + " !py-1.5 text-xs " + (g.jenisCL === "Meeting" ? "col-span-5" : g.jenisCL === "Wedding" ? "col-span-4" : "col-span-3")} placeholder="Deskripsi" value={r.deskripsi} onChange={(e) => setRow("estimasi", i, "deskripsi", e.target.value)} />
              {g.jenisCL === "Graduation" && <input className={inp + " !py-1.5 text-xs col-span-1"} placeholder="Hari" inputMode="numeric" value={r.hari || ""} onChange={(e) => setRow("estimasi", i, "hari", e.target.value.replace(/[^\d]/g, ""))} />}
              <input className={inp + " !py-1.5 text-xs col-span-2"} placeholder="Jml" inputMode="numeric" value={r.jumlah} onChange={(e) => setRow("estimasi", i, "jumlah", e.target.value.replace(/[^\d]/g, ""))} />
              {g.jenisCL !== "Meeting" && <input className={inp + " !py-1.5 text-xs col-span-2"} placeholder="Satuan (pax)" value={r.satuan || ""} onChange={(e) => setRow("estimasi", i, "satuan", e.target.value)} />}
              <input className={inp + " !py-1.5 text-xs " + (g.jenisCL === "Meeting" ? "col-span-3" : "col-span-2")} placeholder="Harga" inputMode="numeric" value={r.harga ? angka(r.harga).toLocaleString("id-ID") : ""} onChange={(e) => setRow("estimasi", i, "harga", e.target.value.replace(/[^\d]/g, ""))} />
              <div className="col-span-2 text-right text-xs text-slate-500">{totalBaris(r).toLocaleString("id-ID")}{g.estimasi.length > 1 && <button onClick={() => delRow("estimasi", i)} className="text-rose-600 ml-1">✕</button>}</div>
            </div>
          ))}
          <div className="text-right text-sm font-bold text-[#12263a] mt-1">Grand Total: Rp {grandTotal.toLocaleString("id-ID")}</div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-3">
          <div className="col-span-3 text-xs font-semibold text-slate-500">TANGGAL PENTING</div>
          {g.jenisCL !== "Meeting" && (
            <div className="col-span-3"><Field label="Nominal DP yang sudah/akan dibayar (Rp) — sisa pembayaran dihitung otomatis"><input className={inp} inputMode="numeric" value={g.dpNominal ? angka(g.dpNominal).toLocaleString("id-ID") : ""} onChange={(e) => set("dpNominal", e.target.value.replace(/[^\d]/g, ""))} /></Field></div>
          )}
          {g.jenisCL !== "Wedding" && <Field label={g.jenisCL === "Meeting" ? "DP 50% s.d." : "Deposit s.d."}><input type="date" className={inp} value={g.dpDate} onChange={(e) => set("dpDate", e.target.value)} /></Field>}
          <Field label="Pelunasan s.d."><input type="date" className={inp} value={g.pelunasanDate} onChange={(e) => set("pelunasanDate", e.target.value)} /></Field>
          <Field label="Jatuh Tempo TTD"><input type="date" className={inp} value={g.jatuhTempoDate} onChange={(e) => set("jatuhTempoDate", e.target.value)} /></Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">TANDA TANGAN (pilih nama &rarr; jabatan terisi otomatis)</div>

          <Field label="Prepared by — Sales">
            <PilihNama karyawan={karyawan} value={g.prepBy} img={g.prepImg} onPilih={(n) => pilihTtd("prepBy", "prepTitle", "prepImg", n)} />
          </Field>
          <Field label="Jabatan"><input className={inp} value={g.prepTitle} onChange={(e) => set("prepTitle", e.target.value)} /></Field>

          <Field label="Acknowledge by — Sales Leader">
            <PilihNama karyawan={karyawan} value={g.leaderNama} img={g.leaderImg} onPilih={(n) => pilihTtd("leaderNama", "leaderTitle", "leaderImg", n, "Sales Leader")} />
          </Field>
          <Field label="Jabatan"><input className={inp} value={g.leaderTitle} onChange={(e) => set("leaderTitle", e.target.value)} /></Field>

          <Field label="Approved by — General Manager">
            <PilihNama karyawan={karyawan} value={g.gmNama} img={g.gmImg} onPilih={(n) => pilihTtd("gmNama", "gmTitle", "gmImg", n, "General Manager")} />
          </Field>
          <Field label="Jabatan GM"><input className={inp} value={g.gmTitle} onChange={(e) => set("gmTitle", e.target.value)} /></Field>
        </div>
      </div>

      {infoSimpan && <p className="text-xs text-slate-500 mt-4">{infoSimpan}</p>}
      <div className="flex gap-2 mt-2">
        <button onClick={onClose} className="border border-slate-300 rounded-lg py-2.5 px-4 font-medium hover:bg-slate-50">Tutup</button>
        <button onClick={() => simpanDraft(false)} disabled={menyimpan} className="flex-1 border border-[#12263a] text-[#12263a] font-semibold rounded-lg py-2.5 hover:bg-slate-50 disabled:opacity-60">
          {menyimpan ? "Menyimpan…" : adaDraft ? "💾 Simpan perubahan" : "💾 Simpan"}
        </button>
        <button onClick={unduh} disabled={busy} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{busy ? "Membuat PDF…" : "⬇ Download PDF"}</button>
      </div>
    </Modal>
  );
}
