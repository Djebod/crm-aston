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
export async function unduhPDFdariHTML(html, filename, footerText) {
  try {
    await muatHtml2pdf();
    const cont = document.createElement("div");
    cont.style.width = "190mm";
    cont.style.background = "#fff";
    cont.innerHTML = html;
    document.body.appendChild(cont);
    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);
    const worker = window.html2pdf().set({
      margin: [10, 10, 16, 10],
      filename: filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).from(cont).toPdf();
    const pdf = await worker.get("pdf");
    const total = pdf.internal.getNumberOfPages();
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(203, 213, 225);
      pdf.line(10, h - 11, w - 10, h - 11);
      pdf.setFontSize(7);
      pdf.setTextColor(110, 120, 135);
      if (footerText) pdf.text(String(footerText), w / 2, h - 6, { align: "center", maxWidth: w - 24 });
      pdf.text("Hal. " + i + " / " + total, w - 10, h - 6, { align: "right" });
    }
    await worker.save();
    document.body.removeChild(cont);
    window.scrollTo(0, prevScroll);
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
