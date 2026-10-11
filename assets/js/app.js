(function () {
  // impede que o site seja exibido dentro de um quadro de outro site (clickjacking)
  if (window.top !== window.self && /github\.io$/.test(location.hostname)) { try { window.top.location = window.self.location.href; } catch (err) { document.documentElement.hidden = true; } }
  var WA = "5511951399929";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var waUrl = function (text) { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text); };
  var easeIO = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

  document.querySelectorAll(".wa-link").forEach(function (a) {
    var mode = a.getAttribute("data-mode");
    a.href = waUrl(mode ? "Olá! Quero um orçamento na modalidade " + mode + "." : "Olá! Vim pelo site e quero um orçamento para consertar meu celular.");
  });

  /* ---- abertura ---- */
  var introMs = reduce ? 0 : 2100;
  var count = document.getElementById("introCount"), label = document.getElementById("introLabel");
  if (count && !reduce) {
    var labels = ["Calibrando bancada", "Carregando peças", "Pronto"];
    var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, Math.max(0, (now - t0 - 120) / 850));
      var v = Math.round(easeIO(p) * 100);
      count.textContent = String(v).padStart(3, "0");
      label.textContent = labels[v >= 100 ? 2 : v > 55 ? 1 : 0];
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  setTimeout(function () { document.body.classList.remove("lock"); }, reduce ? 0 : 1300);
  setTimeout(function () { document.documentElement.classList.add("intro-done"); }, introMs);

  /* ---- texto embaralhado ---- */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/";
  function scramble(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = "1";
    var final = el.textContent, len = final.length, start = performance.now(), dur = 700;
    (function f(now) {
      var p = Math.min(1, (now - start) / dur), out = "";
      for (var i = 0; i < len; i++) {
        var c = final[i];
        out += (c === " " || i / len < easeIO(p)) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(f); else el.textContent = final;
    })(start);
  }

  /* ---- contadores ---- */
  function countUp(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = "1";
    var to = +el.dataset.count, from = to === 0 ? 99 : 0, start = performance.now(), dur = 1400;
    (function f(now) {
      var p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(from + (to - from) * easeIO(p));
      if (p < 1) requestAnimationFrame(f);
    })(start);
  }

  /* ---- revelação por rolagem ---- */
  var revealEls = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduce) {
    var vh = window.innerHeight;
    // só esconde o que começa fora da tela: o primeiro quadro fica sempre completo
    revealEls.forEach(function (el) { if (el.getBoundingClientRect().top > vh * .92) el.classList.add("pre"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = el.parentElement ? [].slice.call(el.parentElement.children).filter(function (c) { return c.classList.contains("reveal"); }) : [];
        el.style.setProperty("--stagger", Math.max(0, sibs.indexOf(el)) * 90 + "ms");
        el.classList.add("in");
        el.querySelectorAll("[data-scramble]").forEach(scramble);
        el.querySelectorAll("[data-count]").forEach(countUp);
        el.querySelectorAll(".timeline").forEach(function (t) { t.classList.add("in"); });
        io.unobserve(el);
      });
    }, { threshold: .15, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    document.documentElement.classList.add("no-io");
  }
  setTimeout(function () { document.querySelectorAll(".hero [data-scramble]").forEach(scramble); }, Math.max(0, introMs - 600));

  /* ---- topo, progresso e pílula do menu ---- */
  var top = document.getElementById("top"), bar = document.getElementById("progress");
  var onScroll = function () {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    top.classList.toggle("scrolled", y > 16);
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  var nav = document.getElementById("nav"), pill = document.getElementById("navPill");
  nav.querySelectorAll("a:not(.btn)").forEach(function (a) {
    a.addEventListener("mouseenter", function () {
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
      pill.style.opacity = 1;
    });
  });
  nav.addEventListener("mouseleave", function () { pill.style.opacity = 0; });

  /* ---- interações de ponteiro ---- */
  if (fine && !reduce) {
    var hero = document.getElementById("hero"), tilt = document.getElementById("tilt"), stage = document.getElementById("stage");
    hero.addEventListener("pointermove", function (e) {
      var hr = hero.getBoundingClientRect();
      hero.style.setProperty("--hx", (e.clientX - hr.left) + "px");
      hero.style.setProperty("--hy", (e.clientY - hr.top) + "px");
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
      tilt.style.setProperty("--rx", (-y * 16).toFixed(2) + "deg");
      tilt.style.setProperty("--ry", (x * 16).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", function () { tilt.style.removeProperty("--rx"); tilt.style.removeProperty("--ry"); });

    document.querySelectorAll(".spot").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
        if (el.classList.contains("tilt-card")) {
          el.style.setProperty("--ty", (((e.clientX - r.left) / r.width - .5) * 5).toFixed(2) + "deg");
          el.style.setProperty("--tx", (-((e.clientY - r.top) / r.height - .5) * 5).toFixed(2) + "deg");
        }
      });
      el.addEventListener("pointerleave", function () { el.style.removeProperty("--tx"); el.style.removeProperty("--ty"); });
    });

    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * .18, y = (e.clientY - (r.top + r.height / 2)) * .3;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- malha de ondas do herói ---- */
  var cv = document.getElementById("waves");
  if (cv && cv.getContext && !reduce) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1, running = true, mx = 0;
    var resize = function () { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) { mx = (e.clientX / window.innerWidth - .5); }, { passive: true });
    var COLS = W < 600 ? 28 : 46, ROWS = 20, lastDraw = 0;
    var draw = function (t) {
      if (!running) return;
      if (t - lastDraw < 33) { requestAnimationFrame(draw); return; }
      lastDraw = t;
      t *= .00045;
      ctx.clearRect(0, 0, W, H);
      var horizon = H * .52, f = H * .9;
      for (var j = 0; j < ROWS; j++) {
        var z = 1 + j * .32;
        for (var i = 0; i < COLS; i++) {
          var x = (i / (COLS - 1) - .5) * 9 + mx * .6;
          var y = Math.sin(x * 1.1 + t * 2.2) * .22 + Math.cos(z * 1.3 - t * 2.6) * .2 + Math.sin((x + z) * .7 + t) * .12;
          var sx = W * .5 + (x * f) / z, sy = horizon + ((1.25 + y) * f) / z * .55;
          if (sx < -4 || sx > W + 4 || sy > H + 4) continue;
          var a = Math.max(0, .62 - j / ROWS * .62) * (.55 + y);
          if (a <= 0) continue;
          ctx.fillStyle = "rgba(94,211,174," + a.toFixed(3) + ")";
          var s = Math.max(.6, 2.2 / z);
          ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { var v = en[0].isIntersecting; var was = running; running = v; if (v && !was) requestAnimationFrame(draw); }).observe(cv);
    }
  }

  /* ---- ordem de serviço ao vivo ---- */
  var steps = document.querySelectorAll("#track i"), stepLabels = document.querySelectorAll("#trackLabels span"), status = document.getElementById("ticketStatus");
  var statusText = ["Pedido recebido", "Técnico a caminho", "Reparo em andamento", "Teste com o cliente", "Entregue e testado"];
  var step = 0;
  var setStep = function (n) {
    steps.forEach(function (s, k) { s.classList.toggle("on", k <= n); });
    stepLabels.forEach(function (s, k) { s.classList.toggle("on", k === n); });
    status.textContent = statusText[n];
  };
  if (reduce) setStep(4); else setInterval(function () { step = (step + 1) % 5; setStep(step); }, 1800);

  /* ---- orçamento → WhatsApp ---- */
  var form = document.getElementById("quoteForm"), bubble = document.getElementById("bubble"), send = document.getElementById("sendWa");
  var val = function (n) { var el = form.elements[n]; return el ? String(el.value || "").trim() : ""; };
  var build = function () {
    var lines = ["Olá! Vim pelo site e quero um orçamento."];
    var nome = val("nome"); if (nome) lines.push("Nome: " + nome);
    lines.push("Celular: " + (val("modelo") || "(modelo a informar)"));
    lines.push("Problema: " + val("problema"));
    lines.push("Atendimento: " + val("modo"));
    var b = val("bairro"); if (b) lines.push("Bairro/CEP: " + b);
    var o = val("obs"); if (o) lines.push("Detalhes: " + o);
    return lines.join("\n");
  };
  var render = function () {
    var msg = build();
    bubble.textContent = msg; send.href = waUrl(msg);
    bubble.classList.remove("pulse"); void bubble.offsetWidth; bubble.classList.add("pulse");
  };
  form.addEventListener("input", render); form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); send.click(); });
  render();

  /* ---- gaveta de orçamento ---- */
  var drawer = document.getElementById("drawer"), panel = drawer.querySelector(".drawer-panel"), lastFocus = null, closeT;
  var openQuote = function (opts) {
    clearTimeout(closeT);
    lastFocus = document.activeElement;
    if (opts.problem) { var pr = document.getElementById(opts.problem); if (pr) pr.checked = true; }
    if (opts.mode) { var md = document.getElementById(opts.mode); if (md) md.checked = true; }
    render();
    drawer.hidden = false;
    document.body.classList.add("lock-d");
    document.documentElement.classList.add("drawer-open");
    requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.add("open"); }); });
    setTimeout(function () { var f = document.getElementById(fine ? "f-modelo" : "dr-title"); if (f) { if (!fine) f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); } }, 320);
  };
  var closeQuote = function () {
    drawer.classList.remove("open");
    document.body.classList.remove("lock-d");
    document.documentElement.classList.remove("drawer-open");
    closeT = setTimeout(function () { drawer.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  document.querySelectorAll(".open-quote").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); openQuote({ problem: el.dataset.problem, mode: el.dataset.mode }); });
  });
  drawer.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeQuote); });
  document.addEventListener("keydown", function (e) {
    if (drawer.hidden) return;
    if (e.key === "Escape") { closeQuote(); return; }
    if (e.key === "Tab") {
      var f = [].slice.call(panel.querySelectorAll("a[href], button, input, textarea")).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  var copyBtn = document.getElementById("copyBtn"), num = document.getElementById("waNum");
  copyBtn.addEventListener("click", function () {
    var done = function () { copyBtn.textContent = "Copiado"; setTimeout(function () { copyBtn.textContent = "Copiar número"; }, 1800); };
    var fallback = function () { var r = document.createRange(); r.selectNodeContents(num); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = "Selecionado"; };
    try { navigator.clipboard.writeText("11951399929").then(done, fallback); } catch (err) { fallback(); }
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
