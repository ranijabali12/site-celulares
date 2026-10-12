// roda antes da página aparecer: pula a abertura em visitas repetidas na mesma sessão
try { if (sessionStorage.getItem("rr-intro")) document.documentElement.classList.add("no-intro", "intro-done"); } catch (err) {}
