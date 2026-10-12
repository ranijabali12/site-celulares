import * as THREE from "three";

// cede a vez ao navegador entre etapas pesadas: a página continua respondendo ao toque e à rolagem
// e espera o usuário parar de rolar ou tocar na tela antes de continuar
let lastInput = 0;
["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true, capture: true }));
const pause = () => new Promise((r) => {
  const step = () => {
    if (performance.now() - lastInput < 300) { setTimeout(step, 150); return; }
    if (window.requestIdleCallback) requestIdleCallback(() => r(), { timeout: 200 });
    else setTimeout(r, 16);
  };
  step();
});

export async function main() {
  await pause();
  const canvas = document.getElementById("phone3d");
  const stage = document.getElementById("stage");
  const hero = document.getElementById("hero");
  const phaseText = document.getElementById("phaseText");
  if (!canvas || !stage) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = innerWidth < 700;
  // aparelhos mais fracos (celulares) recebem texturas menores e materiais mais simples
  const lite = small || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: lite ? "default" : "high-performance" });
  } catch (err) { stage.classList.add("no-gl"); return; }
  if (!renderer.getContext()) { stage.classList.add("no-gl"); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  let dead = false;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); dead = true; canvas.classList.remove("ready"); stage.classList.add("no-gl"); }, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  await pause();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 10, 3000);

  // estúdio escuro com softboxes: reflexos de foto de produto
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(120, 120, 120), new THREE.MeshBasicMaterial({ color: 0x0c0f0e, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, k, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(70, 12, 0, 52, 12, 4.2, 0xffffff);
  panel(14, 80, -52, 4, 18, 2.6, 0xffffff);
  panel(10, 80, 52, -4, -14, 1.8, 0xe4f6ee);
  panel(46, 22, 14, -18, 54, 0.55, 0xffffff);
  panel(30, 30, -6, 6, -56, 0.7, 0x5ed3ae);
  panel(30, 8, -20, -50, -10, 1.4, 0xe8a24e);
  scene.environment = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  await pause();

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-220, 320, 420); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ed3ae, 2.0); rim.position.set(320, 80, -300); scene.add(rim);
  const warm = new THREE.DirectionalLight(0xe8a24e, 0.9); warm.position.set(-320, -220, -120); scene.add(warm);

  /* ---------- medidas (mm) ---------- */
  const W = 70.6, H = 146.6, D = 8.25, R = 11.2;

  const rr = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return s;
  };
  const slab = (w, h, r, depth, bevel, segs) => {
    const g = new THREE.ExtrudeGeometry(rr(w - 2 * bevel, h - 2 * bevel, r - bevel), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: lite ? 24 : 36 });
    g.center();
    return g;
  };
  const remapUV = (g) => {
    g.computeBoundingBox();
    const b = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
    const bw = b.max.x - b.min.x, bh = b.max.y - b.min.y;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / bw, (p.getY(i) - b.min.y) / bh);
    uv.needsUpdate = true;
    return g;
  };
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); return t; };
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* ---------- materiais do corpo ---------- */
  const titanium = lite
    ? new THREE.MeshStandardMaterial({ color: 0x8f8b84, metalness: 1, roughness: 0.32 })
    : new THREE.MeshPhysicalMaterial({ color: 0x8f8b84, metalness: 1, roughness: 0.34, clearcoat: 0.25, clearcoatRoughness: 0.3, anisotropy: 0.6, anisotropyRotation: Math.PI / 2 });
  const polished = new THREE.MeshStandardMaterial({ color: 0x9a968f, metalness: 1, roughness: 0.16 });
  const ringMat = polished.clone(); ringMat.side = THREE.DoubleSide;
  const darkPart = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.7 });
  const antenna = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 0.55, metalness: 0.2 });
  const pureBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });

  // traseira: vidro fosco com logotipo brilhante (mapa de rugosidade)
  const bw = lite ? 384 : 512, bh = Math.round(bw * (H - 2.3) / (W - 2.3));
  const backC = document.createElement("canvas"); backC.width = bw; backC.height = bh;
  {
    const g = backC.getContext("2d");
    const img = g.createImageData(bw, bh);
    for (let i = 0; i < img.data.length; i += 4) { const v = 150 + (Math.random() * 18 - 9); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.save(); g.translate(bw / 2, bh * 0.46); g.scale(-1, 1);
    const k = bw / (W - 2.3) * 0.62;
    g.strokeStyle = "rgb(24,24,24)"; g.lineWidth = 1.8 * k; g.lineCap = "round";
    g.beginPath(); g.roundRect(-5 * k, -10 * k, 10 * k, 20 * k, 2.9 * k); g.stroke();
    g.beginPath(); g.arc(1 * k, 4 * k, 12.5 * k, Math.PI * 1.02, Math.PI * 1.72); g.stroke();
    g.fillStyle = "rgb(24,24,24)"; g.beginPath(); g.arc(10.5 * k, -9.5 * k, 2.3 * k, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const backGlass = new THREE.MeshStandardMaterial({ color: 0x8b877f, metalness: 0.05, roughness: 1, roughnessMap: tex(backC, false) });
  const plateauGlass = new THREE.MeshStandardMaterial({ color: 0x86827b, metalness: 0.1, roughness: 0.1 });

  await pause();

  /* ---------- tela trincada: imagem pronta, decodificada fora da thread principal ---------- */
  const crackImg = new Image();
  crackImg.decoding = "async";
  crackImg.src = "assets/img/cracks.webp";
  try { await crackImg.decode(); } catch (err) {}
  const crackT = new THREE.Texture(crackImg);
  crackT.colorSpace = THREE.SRGBColorSpace; crackT.anisotropy = Math.min(8, maxAniso); crackT.needsUpdate = true;
  // a mesma textura serve de cor, rugosidade e relevo: um único envio para a placa de vídeo
  const crackedMat = lite
    ? new THREE.MeshStandardMaterial({ color: 0xd9dedc, map: crackT, roughness: 1, roughnessMap: crackT, metalness: 0, transparent: true, opacity: 1 })
    : new THREE.MeshPhysicalMaterial({
      color: 0xd9dedc, map: crackT, roughness: 1, roughnessMap: crackT,
      bumpMap: crackT, bumpScale: 0.9, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1, transparent: true, opacity: 1
    });
  await pause();

  /* ---------- tela nova: vidro liso com conteúdo luminoso ---------- */
  const EW = 600, EH = Math.round(EW * (H - 2.3) / (W - 2.3)), PX = EW / (W - 2.3);
  const emC = document.createElement("canvas"); emC.width = EW; emC.height = EH;
  const ectx = emC.getContext("2d"); const emT = tex(emC);
  const newMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.03, metalness: 0, emissive: 0xffffff, emissiveMap: emT, emissiveIntensity: 0, transparent: true, opacity: 1 });

  const bez = 2.0 * PX, dr = 8.6 * PX;
  const displayClip = () => { ectx.beginPath(); ectx.roundRect(bez, bez, EW - 2 * bez, EH - 2 * bez, dr); ectx.clip(); };
  const wall = document.createElement("canvas"); wall.width = EW; wall.height = EH;
  {
    const g = wall.getContext("2d");
    g.fillStyle = "#04070a"; g.fillRect(0, 0, EW, EH);
    const blob = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, EW, EH); };
    blob(EW * .15, EH * .92, EW * 1.0, "rgba(46,170,135,.85)");
    blob(EW * .95, EH * .62, EW * .8, "rgba(214,140,60,.6)");
    blob(EW * .45, EH * .05, EW * .9, "rgba(40,80,120,.7)");
    blob(EW * .6, EH * .4, EW * .5, "rgba(10,20,30,.6)");
  }
  const fmtTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = () => { const s = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return s.charAt(0).toUpperCase() + s.slice(1); };
  const ACC = "94,211,174";
  const drawScreen = (mode, t) => {
    ectx.save();
    ectx.fillStyle = "#000"; ectx.fillRect(0, 0, EW, EH);
    if (mode === "boot") {
      const a = Math.sin(Math.min(1, t) * Math.PI);
      ectx.translate(EW / 2, EH / 2); ectx.scale(.9 + .1 * t, .9 + .1 * t);
      ectx.strokeStyle = `rgba(245,248,247,${a})`; ectx.lineWidth = 9; ectx.lineCap = "round";
      ectx.beginPath(); ectx.roundRect(-30, -60, 60, 120, 17); ectx.stroke();
      ectx.beginPath(); ectx.arc(5, 22, 68, Math.PI * 1.02, Math.PI * 1.72); ectx.stroke();
    } else if (mode === "on") {
      displayClip();
      ectx.drawImage(wall, 0, 0);
      ectx.textAlign = "center"; ectx.fillStyle = "rgba(240,244,242,.9)";
      ectx.font = '500 30px "Geist", sans-serif'; ectx.fillText(fmtDate(), EW / 2, 170);
      ectx.fillStyle = "#f4f7f5"; ectx.font = '600 196px "Bricolage Grotesque", sans-serif'; ectx.fillText(fmtTime(), EW / 2, 350);
      const py = EH - 300, pw = 360;
      ectx.fillStyle = "rgba(5,10,8,.55)"; ectx.beginPath(); ectx.roundRect(EW / 2 - pw / 2, py, pw, 64, 32); ectx.fill();
      ectx.strokeStyle = `rgba(${ACC},.6)`; ectx.lineWidth = 2; ectx.stroke();
      ectx.fillStyle = `rgb(${ACC})`; ectx.beginPath(); ectx.arc(EW / 2 - pw / 2 + 38, py + 32, 13, 0, Math.PI * 2); ectx.fill();
      ectx.strokeStyle = "#04120d"; ectx.lineWidth = 3.5; ectx.beginPath(); ectx.moveTo(EW / 2 - pw / 2 + 32, py + 32); ectx.lineTo(EW / 2 - pw / 2 + 37, py + 37); ectx.lineTo(EW / 2 - pw / 2 + 45, py + 27); ectx.stroke();
      ectx.fillStyle = "#eef3f1"; ectx.font = '500 26px "Geist", sans-serif'; ectx.textAlign = "left"; ectx.fillText("Tela nova instalada", EW / 2 - pw / 2 + 64, py + 41);
      ectx.textAlign = "center"; ectx.fillStyle = "rgba(232,238,235,.65)"; ectx.font = '500 18px "Geist Mono", monospace'; ectx.fillText("GARANTIA ATIVA · 90 DIAS", EW / 2, py + 112);
      ectx.fillStyle = "rgba(240,244,242,.8)"; ectx.beginPath(); ectx.roundRect(EW / 2 - 70, EH - bez - 36, 140, 9, 5); ectx.fill();
      ectx.fillStyle = "#000"; ectx.beginPath(); ectx.roundRect(EW / 2 - 9.5 * PX, bez + 2.2 * PX, 19 * PX, 5.6 * PX, 2.8 * PX); ectx.fill();
    }
    ectx.restore();
    emT.needsUpdate = true;
  };

  await pause();

  /* ---------- interior visto com a tela aberta ---------- */
  const inC = document.createElement("canvas"); inC.width = lite ? 384 : 512; inC.height = Math.round(inC.width * (H - 3.2) / (W - 3.2));
  {
    const g = inC.getContext("2d"), w = inC.width, h = inC.height;
    g.fillStyle = "#2a2d2f"; g.fillRect(0, 0, w, h);
    const metal = (x, y, ww, hh, r, c1, c2) => { const gr = g.createLinearGradient(x, y, x + ww, y + hh); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, ww, hh, r); g.fill(); };
    metal(w * .07, h * .3, w * .86, h * .6, 18, "#3a3e40", "#24272a");
    g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(w * .14, h * .36, w * .5, 6); g.fillRect(w * .14, h * .385, w * .34, 6);
    metal(w * .06, h * .03, w * .88, h * .24, 12, "#14201b", "#0c1411");
    metal(w * .12, h * .06, w * .3, h * .12, 6, "#8d9296", "#5d6266");
    metal(w * .5, h * .07, w * .2, h * .08, 4, "#1b1d1f", "#101213");
    metal(w * .74, h * .08, w * .14, h * .14, 4, "#7e8387", "#55595d");
    g.fillStyle = "#b07a3a"; g.fillRect(w * .86, h * .26, w * .07, h * .14); g.fillRect(w * .86, h * .5, w * .07, h * .08);
    g.fillStyle = "#1a1a1a"; g.fillRect(w * .87, h * .27, w * .05, h * .04); g.fillRect(w * .87, h * .51, w * .05, h * .03);
    g.fillStyle = "#9aa0a4";
    [[.05, .02], [.95, .02], [.05, .97], [.95, .97], [.5, .28], [.08, .5], [.92, .7]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, 6, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#151515"; g.beginPath(); g.roundRect(w * .42, h * .005, w * .16, h * .02, 6); g.fill();
  }
  const innerMat = new THREE.MeshStandardMaterial({ map: tex(inC), metalness: 0.45, roughness: 0.55 });

  await pause();

  /* ---------- montagem ---------- */
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(slab(W, H, R, D - 2.2, 1.1, 10), titanium));

  const inner = new THREE.Mesh(remapUV(new THREE.ShapeGeometry(rr(W - 3.2, H - 3.2, R - 1.6), 32)), innerMat);
  inner.position.z = D / 2 + 0.03; phone.add(inner);

  const frontG = remapUV(slab(W - 2.3, H - 2.3, R - 1.15, 0.15, 0.35, 6));
  const hingeX = (W - 2.3) / 2;
  const makePanel = (mat) => {
    const hinge = new THREE.Group(); hinge.position.set(hingeX, 0, D / 2 - 0.12);
    const m = new THREE.Mesh(frontG, mat); m.position.x = -hingeX; hinge.add(m);
    phone.add(hinge); return hinge;
  };
  await pause();
  const crackedPanel = makePanel(crackedMat);
  const newPanel = makePanel(newMat); newPanel.visible = false;

  const back = new THREE.Mesh(remapUV(slab(W - 2.3, H - 2.3, R - 1.15, 0.1, 0.25, 5)), backGlass);
  back.position.z = -D / 2 + 0.08; phone.add(back);

  const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 9, 4, 12), darkPart);
  ear.rotation.z = Math.PI / 2; ear.position.set(0, H / 2 - 0.5, D / 2 - 0.3); phone.add(ear);

  await pause();

  // módulo de câmera
  const cam = new THREE.Group();
  const pcx = 12.6, pcy = 50.6, backTop = -D / 2 - 0.27, pTop = backTop - 1.8;
  const plateau = new THREE.Mesh(slab(37.5, 37.5, 9.2, 0.5, 0.65, 6), plateauGlass);
  plateau.position.set(pcx, pcy, backTop - 0.9); cam.add(plateau);
  const lensDisk = new THREE.CircleGeometry(7.0, 72);
  const addLens = (x, y) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.75, 2.4, 72, 1, true), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y, pTop - 0.6); cam.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(6.95, 0.55, 16, 72), polished);
    lip.position.set(x, y, pTop - 1.95); cam.add(lip);
    const glass = new THREE.Mesh(lensDisk, pureBlack);
    glass.rotation.y = Math.PI; glass.position.set(x, y, pTop - 1.75); cam.add(glass);
  };
  addLens(pcx + 8.7, pcy + 8.7); addLens(pcx + 8.7, pcy - 8.7); addLens(pcx - 8.4, pcy);
  const flashMat = new THREE.MeshStandardMaterial({ color: 0xefe6cc, roughness: 0.3, emissive: 0xfff3d6, emissiveIntensity: 0 });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.6, 40), flashMat);
  flash.rotation.x = Math.PI / 2; flash.position.set(pcx - 8.4, pcy + 12.5, pTop - 0.2); cam.add(flash);
  const lidar = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.6, 40), pureBlack);
  lidar.rotation.x = Math.PI / 2; lidar.position.set(pcx - 8.4, pcy - 12.5, pTop - 0.2); cam.add(lidar);
  const mic = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), darkPart);
  mic.rotation.y = Math.PI; mic.position.set(pcx - 1.2, pcy + 15.5, pTop - 0.02); cam.add(mic);
  phone.add(cam);

  await pause();
  const button = (x, y, len) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(1.45, len, 6, 20), polished);
    b.scale.set(0.5, 1, 1); b.position.set(x, y, 0); phone.add(b);
  };
  button(-W / 2 - 0.15, 42, 4.5); button(-W / 2 - 0.15, 29, 9); button(-W / 2 - 0.15, 16, 9); button(W / 2 + 0.15, 22, 15);
  [[W / 2, 52], [W / 2, -50], [-W / 2, -46], [-W / 2, 56]].forEach(([x, y]) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, D - 2.6), antenna); a.position.set(x - Math.sign(x) * 0.18, y, 0); phone.add(a);
  });
  [[-18, H / 2], [18, -H / 2]].forEach(([x, y]) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, D - 2.6), antenna); a.position.set(x, y - Math.sign(y) * 0.18, 0); phone.add(a);
  });
  const port = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 6.2, 6, 16), darkPart);
  port.rotation.z = Math.PI / 2; port.position.set(0, -H / 2 + 1.15, 0); phone.add(port);
  const holeG = new THREE.CylinderGeometry(0.42, 0.42, 1, 12);
  for (let i = 0; i < 6; i++) [1, -1].forEach((sd) => { const h = new THREE.Mesh(holeG, darkPart); h.position.set(sd * (9 + i * 1.7), -H / 2 + 0.35, 0); phone.add(h); });

  const pivot = new THREE.Group(); pivot.add(phone); scene.add(pivot);

  /* ---------- roteiro do conserto ---------- */
  const SPEED = Math.PI * 2 / 14, FRONT = -0.42, TAU = Math.PI * 2;
  const LABEL = {
    broken: "Tela <b>trincada</b>", align: "Posicionando <b>na bancada</b>", open: "Abrindo <b>a tela</b>",
    inspect: "Conferindo <b>conectores</b>", install: "Instalando <b>tela nova</b>", boot: "Ligando <b>o aparelho</b>", on: "Reparo <b>concluído</b>"
  };
  const DUR = { open: 1700, inspect: 900, install: 1700, boot: 1100 };
  // relógio próprio: só anda enquanto a animação está rodando (sem saltos ao voltar para a aba)
  let clock = 0;
  let phase = "broken", phaseStart = 0;
  let spin = FRONT, vel = SPEED, mode = "spin", alignFrom = 0, alignTo = 0, alignDur = 1, calm = 1;
  const setPhase = (p, now) => {
    phase = p; phaseStart = now; stage.setAttribute("data-phase", p);
    if (phaseText) { phaseText.innerHTML = LABEL[p]; phaseText.classList.remove("swap"); void phaseText.offsetWidth; phaseText.classList.add("swap"); }
  };
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;

  const resetPanels = () => {
    crackedPanel.visible = true; crackedPanel.rotation.set(0, 0, 0); crackedPanel.position.set(hingeX, 0, D / 2 - 0.12); crackedMat.opacity = 1;
    newPanel.visible = false; newMat.emissiveIntensity = 0;
  };

  const director = (now) => {
    const e = now - phaseStart;
    if (phase === "broken") {
      if (e > 4200) {
        const to = FRONT + TAU * Math.ceil((spin - FRONT + 0.7) / TAU);
        const dist = to - spin;
        if (dist < 1.1) { mode = "align"; alignFrom = spin; alignTo = to; alignDur = 2 * dist / SPEED * 1000; setPhase("align", now); }
      }
    } else if (phase === "align") {
      if (mode === "hold") setPhase("open", now);
    } else if (phase === "open") {
      const t = Math.min(1, e / DUR.open);
      // a tela gira na dobradiça da direita (como num reparo real) e sai de cena
      const a = easeOut(Math.min(1, t / 0.6));
      crackedPanel.rotation.y = a * 1.95;
      crackedPanel.position.z = D / 2 - 0.12 + a * 1.2;
      const out = Math.max(0, (t - 0.55) / 0.45);
      crackedPanel.position.x = hingeX + easeIn(out) * 70;
      crackedMat.opacity = 1 - out;
      if (t >= 1) { crackedPanel.visible = false; setPhase("inspect", now); }
    } else if (phase === "inspect") {
      if (e >= DUR.inspect) { newPanel.visible = true; newMat.opacity = 0; setPhase("install", now); }
    } else if (phase === "install") {
      const t = Math.min(1, e / DUR.install);
      const inn = Math.min(1, t / 0.4);
      newPanel.position.set(hingeX + (1 - easeOut(inn)) * 70, 0, D / 2 - 0.12 + 1.2);
      newMat.opacity = easeOut(inn);
      const c = ease(Math.max(0, (t - 0.35) / 0.65));
      newPanel.rotation.y = 1.95 * (1 - c);
      newPanel.position.z = D / 2 - 0.12 + 1.2 * (1 - c) - Math.sin(Math.min(1, Math.max(0, (t - 0.9) / 0.1)) * Math.PI) * 0.15;
      if (t >= 1) { newPanel.rotation.y = 0; newPanel.position.set(hingeX, 0, D / 2 - 0.12); newMat.opacity = 1; setPhase("boot", now); }
    } else if (phase === "boot") {
      const t = Math.min(1, e / DUR.boot);
      newMat.emissiveIntensity = 1.1; drawScreen("boot", t);
      if (t >= 1) { drawScreen("on", 0); setPhase("on", now); }
    } else if (phase === "on") {
      newMat.emissiveIntensity = Math.min(1.15, e / 500 * 1.15);
      if (e > 1400 && mode === "hold") { mode = "spin"; vel = 0; }
      if (e > 60000 / 60 && fmtTime() !== lastMinute) { lastMinute = fmtTime(); drawScreen("on", 1); }
      // volta ao início quando a frente estiver de costas para a câmera
      if (e > 6500 && Math.cos(spin) < -0.6) { resetPanels(); setPhase("broken", now); }
    }
  };
  let lastMinute = fmtTime();

  /* ---------- enquadramento ---------- */
  const fit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((146.6 / 0.72) / k, (W * 2.56) / (k * camera.aspect));
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  };
  await pause();
  fit(); new ResizeObserver(fit).observe(stage);
  await pause();

  let tx = 0, ty = 0, cx = 0, cy = 0;
  if (hero && matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => { const r = stage.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5); });
    hero.addEventListener("pointerleave", () => { tx = ty = 0; });
  }

  let visible = true, running = false, last = 0, nextFlash = 4000;
  const frame = (t) => {
    if (dead || !visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    clock += dt * 1000;
    const now = clock, s = now / 1000;
    if (mode === "spin") { vel += (SPEED - vel) * Math.min(1, dt * 1.2); spin += vel * dt; }
    else if (mode === "align") { const t = Math.min(1, (now - phaseStart) / alignDur); spin = alignFrom + (alignTo - alignFrom) * (1 - (1 - t) * (1 - t)); if (t >= 1) mode = "hold"; }
    director(now);
    cx += (tx - cx) * Math.min(1, dt * 4); cy += (ty - cy) * Math.min(1, dt * 4);
    calm += ((mode === "spin" ? 1 : 0.35) - calm) * Math.min(1, dt * 2.5);
    pivot.rotation.set(0.14 + Math.sin(s * .55) * .06 * calm + cy * .3, cx * .45, (Math.sin(s * .37) * .05 - .04) * calm);
    phone.rotation.y = spin;
    pivot.position.y = Math.sin(s * .9) * 2.4 * calm;
    if (now > nextFlash) { const f = now - nextFlash; flashMat.emissiveIntensity = f < 160 ? 4 * Math.sin(f / 160 * Math.PI) : 0; if (f > 160) nextFlash = now + 5200 + Math.random() * 3000; }
    renderer.render(scene, camera);
    if (!canvas.classList.contains("ready")) canvas.classList.add("ready");
    requestAnimationFrame(frame);
  };
  let armed = false;
  const start = () => { if (!armed || running || reduce || dead) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); }, { rootMargin: "80px" }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });

  // prepara shaders e texturas antes do primeiro quadro, um por vez, sem travar a página
  await pause();
  newPanel.visible = true;
  if (renderer.extensions.has("KHR_parallel_shader_compile")) {
    // a placa de vídeo compila em segundo plano, sem bloquear a página
    try { await renderer.compileAsync(scene, camera); } catch (err) {}
  } else {
    const mats = new Set();
    scene.traverse((o) => { if (o.isMesh) mats.add(o.material); });
    const probe = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    const probeScene = new THREE.Scene(); probeScene.add(probe);
    for (const m of mats) {
      probe.material = m;
      try { renderer.compile(probeScene, camera, scene); } catch (err) {}
      await pause();
    }
  }
  newPanel.visible = false;
  for (const t of [crackT, newMat.emissiveMap, innerMat.map, backGlass.roughnessMap]) {
    if (t) { renderer.initTexture(t); await pause(); }
  }
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (err) {} }

  setPhase("broken", 0);
  await pause();
  armed = true;
  if (reduce) { phone.rotation.y = FRONT; pivot.rotation.set(0.14, 0, -0.04); renderer.render(scene, camera); canvas.classList.add("ready"); return; }
  start();
}
