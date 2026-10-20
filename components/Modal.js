"use client";

export const inp =
  "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#c8962c] bg-white";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1 text-slate-700">{label}</span>
      {children}
    </label>
  );
}

// wide = true -> modal lebih lebar (untuk konten tabel/dokumen)
export function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={"bg-white w-full rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto " + (wide ? "sm:max-w-3xl" : "sm:max-w-2xl")}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h2 className="font-bold text-[#12263a]">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
