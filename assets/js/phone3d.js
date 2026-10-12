// Carrega o celular 3D só depois que a página abriu e a pessoa parou de rolar,
// para não travar a abertura. O código-fonte do 3D está em src/phone3d.js (npm run build).
let lastInput = 0;
["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true, capture: true }));
const whenStill = () => new Promise((r) => {
  const step = () => {
    if (performance.now() - lastInput < 300) { setTimeout(step, 150); return; }
    if (window.requestIdleCallback) requestIdleCallback(() => r(), { timeout: 500 }); else setTimeout(r, 16);
  };
  step();
});
const fail = (err) => { console.error(err); document.getElementById("stage")?.classList.add("no-gl"); };
const kick = () => {
  // espera a abertura e a entrada do título terminarem; a imagem estática segura a cena até lá
  const wait = document.documentElement.classList.contains("no-intro") ? 700 : 2000;
  setTimeout(async () => {
    await whenStill();
    try { const m = await import("./phone3d.bundle.js"); await m.main(); } catch (err) { fail(err); }
  }, wait);
};
if (document.readyState === "complete") kick(); else addEventListener("load", kick, { once: true });
