"use client";

export function muatHtml2pdf() {
  return new Promise((res, rej) => {
    if (typeof window !== "undefined" && window.html2pdf) return res();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("gagal memuat html2pdf"));
    document.body.appendChild(s);
  });
}

// Unduh HTML sebagai PDF. Jika pustaka gagal dimuat, fallback ke print window.
export async function unduhPDFdariHTML(html, filename) {
  try {
    await muatHtml2pdf();
    const cont = document.createElement("div");
    cont.style.width = "200mm";
    cont.style.background = "#fff";
    cont.innerHTML = html;
    document.body.appendChild(cont);
    await window.html2pdf().set({
      margin: 8,
      filename: filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).from(cont).save();
    document.body.removeChild(cont);
    return true;
  } catch (e) {
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write("<html><head><title>" + filename + "</title></head><body>" + html + "<scr" + "ipt>window.onload=function(){window.print()}</scr" + "ipt></body></html>");
      w.document.close();
      return true;
    }
    alert("Gagal membuat PDF. Izinkan popup atau cek koneksi internet.");
    return false;
  }
}
