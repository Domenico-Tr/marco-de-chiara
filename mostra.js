/* =====================================================================
   La galleria notturna
   Il sito è una galleria visitata di notte: al buio, con le luci delle
   sale sul fondo, la polvere che galleggia nei fasci di luce e una
   lanterna che segue il mouse o il dito. All'ingresso, sulla parete al
   buio, sono appese alcune opere che la luce scopre una alla volta; nella
   prima sala si cammina in 3D tra le opere. Un interruttore nella barra
   accende tutte le luci.
   Indice:
     1. Utilità
     2. Il muro dell'ingresso
     3. Le sale: le luci di ogni sala
     4. La lanterna, la polvere e l'interruttore
     5. La galleria in 3D
     6. I titoli giganti
     7. Avvio
===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Utilità
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const menoMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conMouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));

  // un solo ascoltatore dello scorrimento per tutto il file, una volta per fotogramma
  const alloScorrere = [];
  let scorrimentoInAttesa = false;
  function suScorrimento(fn) {
    alloScorrere.push(fn);
  }
  function scorri() {
    if (scorrimentoInAttesa) return;
    scorrimentoInAttesa = true;
    requestAnimationFrame(() => {
      scorrimentoInAttesa = false;
      alloScorrere.forEach((fn) => fn());
    });
  }

  /* ------------------------------------------------------------------
     2. Il muro dell'ingresso
     Sulla parete al buio dell'ingresso sono appese alcune opere di Marco.
     Si vedono appena: la lanterna (il mouse o il dito) le illumina una alla
     volta e sotto quella illuminata compare il cartellino. Muovendo la luce
     le opere si spostano un poco, quelle vicine più di quelle lontane, come
     su pareti a profondità diverse. Con il mouse un clic sull'opera la apre.
     È leggero: poche foto piccole e una sfumatura che segue la luce.
     ------------------------------------------------------------------ */
  // dove appendere le opere: [centro x %, alto y %, altezza massima vh, larghezza massima vw, profondità 1-3]
  const POSTI_LARGO = [
    [8, 10, 18, 12, 3],
    [26, 9, 23, 14, 2],
    [45, 12, 20, 13, 3],
    [63, 9, 30, 16, 1],
    [84, 14, 36, 18, 1],
    [96, 58, 22, 12, 3],
    [58, 76, 14, 10, 3],
  ];
  const POSTI_STRETTO = [
    [18, 9, 16, 30, 1],
    [52, 7, 12, 24, 3],
    [82, 12, 17, 28, 2],
    [47, 21, 8, 16, 3],
    [95, 44, 9, 20, 3],
  ];
  const Muro = { opere: [], piani: [], stretto: null };

  function operePerIlMuro(opere, quante) {
    const conFoto = opere.filter((o) => o.immagine);
    // prima i quadri, che al buio fanno più effetto quando si accendono
    const quadri = conFoto.filter((o) => o.categoria === "quadri");
    const altre = conFoto.filter((o) => o.categoria !== "quadri");
    return quadri.concat(altre).slice(0, quante);
  }

  function costruisciMuro() {
    const V = window.Vetrina;
    const muro = $("#ingresso-muro");
    if (!V || !muro) return;
    const stretto = window.innerWidth < 760;
    if (Muro.stretto === stretto) return;
    Muro.stretto = stretto;
    muro.replaceChildren();
    const posti = stretto ? POSTI_STRETTO : POSTI_LARGO;
    const lista = operePerIlMuro(V.opere || [], posti.length);
    if (!lista.length) return;
    const piani = [1, 2, 3].map((d) => {
      const p = document.createElement("div");
      p.className = `muro-piano muro-piano--${d}`;
      muro.append(p);
      return p;
    });
    lista.forEach((o, i) => {
      const [x, y, h, w, d] = posti[i];
      const f = document.createElement("figure");
      f.className = "muro-opera";
      f.style.cssText = `--x: ${x}%; --y: ${y}%; --h: ${h}vh; --w: ${w}vw; --i: ${i}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1; // solo decorazione: con la tastiera le stesse opere sono nella galleria
      btn.className = "muro-apri";
      const cornice = document.createElement("span");
      cornice.className = "muro-cornice";
      cornice.append(V.creaMedia(o, Math.round(stretto ? Math.max(200, window.innerHeight * 0.2) : Math.max(300, window.innerHeight * 0.38, window.innerWidth * 0.18)), true));
      btn.append(cornice);
      btn.addEventListener("click", () => V.apriScheda(lista, i, btn));
      const cartellino = document.createElement("figcaption");
      cartellino.className = "muro-cartellino";
      cartellino.innerHTML = `<em>${esc(String(o.titolo).trim())}</em>${o.anno ? `, ${esc(o.anno)}` : ""}`;
      f.append(btn, cartellino);
      piani[d - 1].append(f);
    });
    Muro.opere = $$(".muro-opera", muro);
    Muro.piani = piani;
    requestAnimationFrame(() => muro.classList.add("is-pronto"));
  }

  /* ------------------------------------------------------------------
     3. Le sale
     Ogni sala ha le sue luci (mai un colore pieno): quando una sala arriva
     al centro dello schermo, il suo nome va in <html data-sala="…"> e le
     luci sul fondo cambiano colore piano piano. I colori sono in
     css/style.css, blocco "GALLERIA NOTTURNA".
     ------------------------------------------------------------------ */
  const COLORE_BARRA = {
    ingresso: "#0A0B12",
    mostra: "#0E0B09",
    catalogo: "#0D0C0B",
    processo: "#090D10",
    eventi: "#100A0D",
    "su-misura": "#100B08",
    contatti: "#080D0A",
  };
  function preparaSale() {
    const sale = $$(".sala[data-sala]");
    if (!sale.length) return;
    const radice = document.documentElement;
    const meta = $('meta[name="theme-color"]');
    const imposta = (nome) => {
      if (radice.dataset.sala === nome) return;
      radice.dataset.sala = nome;
      if (meta && COLORE_BARRA[nome]) meta.setAttribute("content", COLORE_BARRA[nome]);
    };
    const aggiorna = () => {
      const y = window.innerHeight * 0.52;
      for (const s of sale) {
        const r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) {
          imposta(s.dataset.sala);
          return;
        }
      }
      if (sale[sale.length - 1].getBoundingClientRect().bottom <= y) imposta(sale[sale.length - 1].dataset.sala);
    };
    suScorrimento(aggiorna);
    window.addEventListener("resize", aggiorna);
    let fermo = 0;
    window.addEventListener("scroll", () => {
      clearTimeout(fermo);
      fermo = setTimeout(aggiorna, 160);
    }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(() => requestAnimationFrame(aggiorna)).observe(document.body);
    aggiorna();
    requestAnimationFrame(() => requestAnimationFrame(() => radice.classList.add("sale-pronte")));
  }

  /* ------------------------------------------------------------------
     4. La lanterna, la polvere e l'interruttore
     La lanterna segue il mouse (o il dito): intorno c'è buio, dove passa la
     luce le opere del muro si accendono e le lettere del nome e dei titoli
     si scaldano. All'arrivo, finché nessuno la muove, la luce passa da
     sola sulle opere; sul telefono riprende a vagare se non la tocchi.
     Nella luce galleggia la polvere. L'interruttore accende tutte le luci.
     ------------------------------------------------------------------ */
  const Lanterna = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };

  function preparaLanterna() {
    const luce = $(".lanterna");
    if (!luce || menoMovimento()) return;
    let tx = Lanterna.x;
    let ty = Lanterna.y;
    let ultimoTocco = -1e9;
    let mosso = false; // il visitatore ha già mosso la luce?
    let mouse = conMouse();
    let ciclo = 0;
    let ingressoVisibile = true;
    const ingresso = $(".ingresso");
    const buio = $(".ingresso-buio");
    const nome = $(".ingresso .nome");
    let lettere = [];
    let titoli = null; // [{ el, lettere }] creati da preparaTitoli
    const accesi = new Set();
    const AMPIEZZA = [26, 14, 6]; // quanto si spostano le pareti (vicina, media, lontana)
    const SCORRE = [0.1, 0.2, 0.3]; // quanto restano indietro scorrendo

    window.addEventListener(
      "pointermove",
      (e) => {
        mouse = e.pointerType === "mouse";
        tx = e.clientX;
        ty = e.clientY;
        mosso = true;
        if (!mouse) ultimoTocco = performance.now();
        avvia();
      },
      { passive: true }
    );
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse") return;
        tx = e.clientX;
        ty = e.clientY;
        mosso = true;
        ultimoTocco = performance.now();
        avvia();
      },
      { passive: true }
    );
    if (ingresso && "IntersectionObserver" in window) {
      new IntersectionObserver((v) => {
        ingressoVisibile = v[0].isIntersecting;
        avvia();
      }).observe(ingresso);
    }

    function fotogramma(ora) {
      ciclo = 0;
      if (document.hidden) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      // all'arrivo (e sul telefono quando nessuno la tocca) la luce passa da sola sulle opere
      const vaga = ingressoVisibile && (!mosso || (!mouse && ora - ultimoTocco > 2600));
      if (vaga) {
        const stretto = W < 760;
        tx = W * (0.52 + Math.sin(ora * 0.00042 - 1.3) * (stretto ? 0.32 : 0.36));
        ty = H * (stretto ? 0.18 + Math.sin(ora * 0.00067 + 0.4) * 0.08 : 0.3 + Math.sin(ora * 0.00071 + 0.4) * 0.12);
      }
      const k = vaga ? 0.05 : 0.16;
      Lanterna.x += (tx - Lanterna.x) * k;
      Lanterna.y += (ty - Lanterna.y) * k;
      const raggio = Math.max(W, H) * 0.3;
      // prima si misura tutto, poi si scrive: così il browser non ricalcola a ogni lettera
      const scrivi = [];
      const scalda = (lista) => {
        const misure = lista.map((l) => l.getBoundingClientRect());
        lista.forEach((l, i) => {
          const m = misure[i];
          const d = Math.hypot(m.left + m.width / 2 - Lanterna.x, m.top + m.height / 2 - Lanterna.y);
          scrivi.push([l, Math.max(0, 1 - d / raggio)]);
        });
      };
      let muroScritto = null;
      if (ingresso) {
        const r = ingresso.getBoundingClientRect();
        if (r.bottom > 0) {
          // il muro: le pareti si spostano un poco con la luce e restano indietro scorrendo
          const dx = Lanterna.x / W - 0.5;
          const dy = Lanterna.y / H - 0.5;
          const sy = Math.min(H, Math.max(0, -r.top));
          muroScritto = { r, dx, dy, sy, accese: Muro.opere.map((f) => f.getBoundingClientRect()) };
          if (nome && !lettere.length) lettere = $$(".lettera", nome);
          scalda(lettere);
        }
      }
      // i titoli delle sale vicini alla luce
      if (!titoli) {
        const t = $$(".titolo-sezione, .mostra-titolo").filter((el) => el.querySelector(".titolo-lettera"));
        if (t.length) titoli = t.map((el) => ({ el, lettere: $$(".titolo-lettera", el) }));
      }
      (titoli || []).forEach((t) => {
        const r = t.el.getBoundingClientRect();
        const vicino = r.bottom > -50 && r.top < H + 50 && Lanterna.y > r.top - raggio && Lanterna.y < r.bottom + raggio;
        if (vicino) {
          scalda(t.lettere);
          accesi.add(t);
        } else if (accesi.has(t)) {
          accesi.delete(t);
          t.lettere.forEach((l) => scrivi.push([l, 0]));
        }
      });

      // ora si scrive
      luce.style.setProperty("--lx", `${Lanterna.x.toFixed(1)}px`);
      luce.style.setProperty("--ly", `${Lanterna.y.toFixed(1)}px`);
      if (muroScritto) {
        const { r, dx, dy, sy, accese } = muroScritto;
        // solo sul velo di buio: messe sulla sezione, il browser ricalcolerebbe tutto quello che contiene
        if (buio) {
          buio.style.setProperty("--mx", `${(Lanterna.x - r.left).toFixed(1)}px`);
          buio.style.setProperty("--my", `${(Lanterna.y - r.top).toFixed(1)}px`);
        }
        Muro.piani.forEach((p, i) => {
          p.style.transform = `translate3d(${(-dx * AMPIEZZA[i]).toFixed(2)}px, ${(-dy * AMPIEZZA[i] * 0.6 + sy * SCORRE[i]).toFixed(2)}px, 0)`;
        });
        // l'opera sotto la luce si accende e mostra il cartellino
        Muro.opere.forEach((f, i) => {
          const m = accese[i];
          const fuoriX = Math.max(m.left - Lanterna.x, 0, Lanterna.x - m.right);
          const fuoriY = Math.max(m.top - Lanterna.y, 0, Lanterna.y - m.bottom);
          f.classList.toggle("is-accesa", Math.hypot(fuoriX, fuoriY) < 36);
        });
      }
      for (const [el, v] of scrivi) {
        // a scatti di 1/20: le lettere si ridisegnano solo quando la luce cambia davvero
        const testo = (Math.round(v * 20) / 20).toFixed(2);
        if (el._calda !== testo) {
          el._calda = testo;
          el.style.setProperty("--calda", testo);
        }
      }
      const fermo = Math.abs(tx - Lanterna.x) + Math.abs(ty - Lanterna.y) < 0.6;
      if (!fermo || vaga) ciclo = requestAnimationFrame(fotogramma);
    }
    function avvia() {
      if (!ciclo) ciclo = requestAnimationFrame(fotogramma);
    }
    suScorrimento(avvia);
    document.addEventListener("visibilitychange", avvia);
    avvia();
  }

  function preparaPolvere() {
    const tela = $("#polvere");
    if (!tela || menoMovimento()) return;
    const ctx = tela.getContext("2d");
    const quanti = conMouse() ? 70 : 26;
    let W = 0;
    let H = 0;
    const granelli = [];
    function dimensiona() {
      W = tela.width = window.innerWidth;
      H = tela.height = window.innerHeight;
    }
    dimensiona();
    window.addEventListener("resize", dimensiona);
    for (let i = 0; i < quanti; i++) {
      granelli.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.03 - Math.random() * 0.1,
        r: 0.5 + Math.random() * 1.6,
        a: 0.12 + Math.random() * 0.3,
        f: Math.random() * 6,
      });
    }
    let ultimo = 0;
    function fotogramma(ora) {
      requestAnimationFrame(fotogramma);
      if (document.hidden || ora - ultimo < 33) return; // circa 30 fotogrammi al secondo bastano
      ultimo = ora;
      ctx.clearRect(0, 0, W, H);
      const accese = document.documentElement.classList.contains("luci-accese");
      const raggio2 = Math.pow(Math.max(W, H) * 0.22, 2);
      for (const g of granelli) {
        g.f += 0.01;
        g.x += g.vx + Math.sin(g.f) * 0.08;
        g.y += g.vy;
        if (g.y < -5) { g.y = H + 5; g.x = Math.random() * W; }
        if (g.x < -5) g.x = W + 5;
        if (g.x > W + 5) g.x = -5;
        const d2 = (g.x - Lanterna.x) ** 2 + (g.y - Lanterna.y) ** 2;
        const luce = accese ? 0.4 : 0.16 + 2.8 * Math.exp(-d2 / raggio2);
        ctx.globalAlpha = Math.min(1, g.a * luce);
        ctx.fillStyle = "#FFE9C8";
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(fotogramma);
  }

  function preparaInterruttore() {
    const b = $("#interruttore");
    if (!b) return;
    const radice = document.documentElement;
    const testo = b.querySelector(".interruttore-testo");
    const imposta = (accese, salva) => {
      radice.classList.toggle("luci-accese", accese);
      b.setAttribute("aria-pressed", String(accese));
      testo.textContent = accese ? "Spegni le luci" : "Accendi le luci";
      document.dispatchEvent(new CustomEvent("luci-cambiate"));
      if (salva) {
        try {
          localStorage.setItem("luci-accese", accese ? "1" : "0");
        } catch (e) {
          /* il browser non salva: pazienza */
        }
      }
    };
    let iniziale = false;
    try {
      iniziale = localStorage.getItem("luci-accese") === "1";
    } catch (e) {
      iniziale = false;
    }
    imposta(iniziale, false);
    b.addEventListener("click", () => imposta(!radice.classList.contains("luci-accese"), true));
  }

  /* ------------------------------------------------------------------
     5. La galleria in 3D
     Una sala al buio: pavimento, soffitto, pareti e pannelli con le opere,
     disposti a zig-zag in profondità, ognuno con il suo faretto. Scorrendo
     la pagina si cammina in avanti (con un po' di inerzia, come un passo),
     col mouse ci si guarda intorno. Le opere lontane restano nell'ombra e
     si accendono avvicinandosi. Con "riduci movimento" diventa una fila
     di opere da sfogliare.
     ------------------------------------------------------------------ */
  function operePerLaMostra(opere) {
    const segnate = opere.filter((o) => o.inEvidenza && o.immagine);
    const lista = segnate.length >= 3 ? segnate : opere.filter((o) => o.immagine);
    return lista.slice(0, 12);
  }

  function costruisciGalleria() {
    const V = window.Vetrina;
    const mondo = $("#galleria-mondo");
    const pista = $("#mostra-pista");
    if (!V || !mondo || !pista) return;
    const tutte = V.opere || [];
    const lista = operePerLaMostra(tutte);
    if (!lista.length) {
      $("#mostra").hidden = true;
      return;
    }
    mondo.replaceChildren();
    // la sala (pavimento, pareti, soffitto, luci) è disegnata su una tela
    // grande quanto lo schermo, con la stessa prospettiva delle opere
    const palco = $("#galleria-palco");
    let tela = $(".galleria-sala", palco);
    if (!tela) {
      tela = document.createElement("canvas");
      tela.className = "galleria-sala";
      tela.setAttribute("aria-hidden", "true");
      palco.prepend(tela);
    }
    const pannelli = lista.map((o, i) => {
      const p = document.createElement("article");
      p.className = `galleria-pannello ${i % 2 ? "is-destra" : "is-sinistra"}`;
      p.innerHTML = '<span class="galleria-fascio" aria-hidden="true"></span><span class="galleria-alone" aria-hidden="true"></span>';
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opera-apri galleria-apri";
      btn.setAttribute("aria-label", `Guarda ${String(o.titolo).trim()} a schermo intero`);
      const cornice = document.createElement("span");
      cornice.className = "galleria-cornice";
      cornice.append(V.creaMedia(o, 640, true, true)); // la foto parte quando ci si avvicina
      btn.append(cornice);
      btn.addEventListener("click", () => V.apriScheda(lista, i, btn));
      const cartellino = document.createElement("div");
      cartellino.className = "galleria-cartellino";
      const dettagli = [o.tecnica, o.misure].filter(Boolean).map((x) => esc(String(x).trim())).join(" · ");
      cartellino.innerHTML =
        `<span class="galleria-numero" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>` +
        `<div class="galleria-testi"><p class="galleria-titolo-opera"><em>${esc(String(o.titolo).trim())}</em>${o.anno ? `, ${esc(o.anno)}` : ""}</p>` +
        (dettagli ? `<p class="galleria-dettagli">${dettagli}</p>` : "") +
        `</div><div class="reazioni">${V.visteHTML(o)}${V.bottonePiace(o)}</div>`;
      p.append(btn, cartellino);
      mondo.append(p);
      return p;
    });
    const fine = document.createElement("a");
    fine.className = "galleria-fine";
    fine.href = "#opere";
    fine.innerHTML = `<span class="galleria-fine-luce" aria-hidden="true"></span><span class="galleria-fine-testo">Tutte le ${tutte.length} opere</span><span class="galleria-fine-freccia" aria-hidden="true">→</span>`;
    mondo.append(fine);
    $("#mostra-totale").textContent = String(lista.length).padStart(2, "0");
    animaGalleria(pista, mondo, pannelli, fine, tela);
  }

  function animaGalleria(pista, mondo, pannelli, fine, tela) {
    const palco = $("#galleria-palco");
    const barra = $("#mostra-barra");
    const conta = $("#mostra-conta");
    const testa = $(".mostra-testa");
    const n = pannelli.length;
    const piatta = menoMovimento() || !(window.CSS && CSS.supports("transform-style", "preserve-3d"));
    pista.classList.toggle("is-piatta", piatta);
    // le foto delle opere partono solo quando servono
    const carica = (el, pigra) => {
      const img = el.querySelector("img[data-src]");
      if (!img) return;
      if (pigra) img.loading = "lazy";
      img.src = img.dataset.src;
      delete img.dataset.src;
    };
    if (piatta) {
      pannelli.forEach((el) => carica(el, true));
      if (testa) testa.classList.add("visibile");
      return;
    }
    pista.classList.add("is-3d");

    let G = {}; // la geometria della sala, ricalcolata quando cambia lo schermo
    let cam = 0; // quanto si è camminato (in pixel di profondità)
    let camMeta = 0;
    let guardaX = 0;
    let guardaY = 0;
    let mx = 0;
    let my = 0;
    let visibile = false;
    let ciclo = 0;

    function geometria() {
      const W = palco.clientWidth;
      const H = palco.clientHeight;
      const stretto = W < 760;
      const prospettiva = stretto ? 600 : 1000;
      const passo = stretto ? 820 : 1050;
      const primo = stretto ? 520 : 720;
      const largo = stretto ? W * 0.19 : Math.min(W * 0.25, 460);
      const altezza = stretto ? Math.min(H * 0.36, 320) : Math.min(H * 0.56, 520);
      const pavimentoY = altezza / 2 + (stretto ? 60 : 90);
      const soffittoY = -(altezza / 2 + (stretto ? 160 : 230));
      const profondita = primo + n * passo + 1400;
      const fineZ = primo + n * passo + 200;
      const camFine = fineZ - (stretto ? 560 : 780);
      G = { W, H, stretto, prospettiva, passo, primo, largo, altezza, pavimentoY, soffittoY, profondita, fineZ, camFine, k: 1 };
      palco.style.perspective = `${prospettiva}px`;
      mondo.style.setProperty("--altezza-opera", `${altezza.toFixed(0)}px`);

      // la tela della sala: un po' meno definita dello schermo (è luce morbida, e costa meno)
      const k = Math.min(1.25, window.devicePixelRatio || 1) * (stretto ? 0.75 : 0.6);
      tela.width = Math.max(1, Math.round(W * k));
      tela.height = Math.max(1, Math.round(H * k));
      G.k = tela.width / W;

      // i pannelli a zig-zag, girati verso il centro della sala
      pannelli.forEach((p, i) => {
        const destra = i % 2 === 1;
        const x = destra ? largo : -largo;
        const z = -(primo + i * passo);
        p.dataset.z = String(z);
        p.style.transform = `translate3d(${x.toFixed(1)}px, ${(-altezza * 0.08).toFixed(1)}px, ${z}px) rotateY(${destra ? -24 : 24}deg) translate(-50%, -50%)`;
      });
      fine.dataset.z = String(-fineZ);
      fine.style.transform = `translate3d(0, ${(-altezza * 0.05).toFixed(1)}px, ${-fineZ}px) translate(-50%, -50%)`;
      // la pista è lunga quanto il cammino (più un respiro all'inizio e alla fine)
      pista.style.height = `${Math.round(window.innerHeight * 1.35 + camFine * 0.72)}px`;
    }

    // Disegna la sala vista dalla posizione attuale: stessa matematica della
    // prospettiva CSS (rotateX, rotateY, poi il passo in avanti)
    const ctx = tela.getContext("2d");
    function disegnaSala(gradiX, gradiY) {
      const { W, H, prospettiva: P, largo, pavimentoY: fy, soffittoY: sy, fineZ, passo, primo } = G;
      const accese = document.documentElement.classList.contains("luci-accese");
      const lum = accese ? 1.7 : 1;
      const ox = W / 2;
      const oy = H * 0.47;
      const ax = (gradiX * Math.PI) / 180;
      const ay = (gradiY * Math.PI) / 180;
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), syy = Math.sin(ay);
      const pr = (x, y, z) => {
        z += cam;
        const x1 = x * cy + z * syy;
        const z1 = -x * syy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const d = P - z2;
        if (d < 30) return null;
        const f = P / d;
        return [ox + x1 * f, oy + y1 * f, f];
      };
      const nebbia = (z) => limita(1 - (-(z + cam) - P * 0.6) / (passo * 5.5), 0.12, 1);
      const X = largo * 2.4;
      const zV = P * 0.7 - cam;
      const zL = -(fineZ + 30);
      const poligono = (punti) => {
        const q = punti.map((v) => pr(v[0], v[1], v[2]));
        if (q.some((v) => !v)) return null;
        ctx.beginPath();
        ctx.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
        ctx.closePath();
        return q;
      };
      const lineare = (a, b, stops) => {
        const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        stops.forEach(([t, c]) => g.addColorStop(t, c));
        return g;
      };
      // una macchia di luce ellittica, larga rx e alta ry sullo schermo
      const macchia = (c, rx, ry, colore, alfa) => {
        if (!c || rx < 0.5 || ry < 0.5 || alfa <= 0.003) return;
        ctx.save();
        ctx.translate(c[0], c[1]);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, `rgba(${colore}, ${alfa})`);
        g.addColorStop(0.45, `rgba(${colore}, ${alfa * 0.45})`);
        g.addColorStop(1, `rgba(${colore}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      };
      const tono = (r, g, b, f = 1) => `rgb(${Math.min(255, r * lum * f) | 0}, ${Math.min(255, g * lum * f) | 0}, ${Math.min(255, b * lum * f) | 0})`;

      ctx.setTransform(G.k, 0, 0, G.k, 0, 0);
      ctx.fillStyle = "#060608";
      ctx.fillRect(0, 0, W, H);

      // il soffitto, con i binari delle luci
      let q = poligono([[-X, sy, zV], [X, sy, zV], [X, sy, zL], [-X, sy, zL]]);
      if (q) {
        ctx.fillStyle = lineare(q[0], q[3], [[0, tono(16, 16, 20)], [1, tono(5, 5, 6)]]);
        ctx.fill();
      }
      // il pavimento: cemento lucido, più chiaro vicino a noi
      q = poligono([[-X, fy, zV], [X, fy, zV], [X, fy, zL], [-X, fy, zL]]);
      if (q) {
        const vicino = [(q[0][0] + q[1][0]) / 2, Math.min(H * 1.4, (q[0][1] + q[1][1]) / 2)];
        const lontano = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
        ctx.fillStyle = lineare(vicino, lontano, [[0, tono(38, 35, 37)], [0.5, tono(17, 16, 18)], [1, tono(6, 6, 7)]]);
        ctx.fill();
      }
      // le pareti d'intonaco
      [-X, X].forEach((xp) => {
        const w = poligono([[xp, sy, zV], [xp, fy, zV], [xp, fy, zL], [xp, sy, zL]]);
        if (!w) return;
        const vicino = [(w[0][0] + w[1][0]) / 2, (w[0][1] + w[1][1]) / 2];
        const lontano = [(w[2][0] + w[3][0]) / 2, (w[2][1] + w[3][1]) / 2];
        ctx.fillStyle = lineare(vicino, lontano, [[0, tono(36, 33, 36)], [0.5, tono(18, 17, 20)], [1, tono(7, 7, 9)]]);
        ctx.fill();
      });
      // la parete di fondo
      q = poligono([[-X, sy, zL], [X, sy, zL], [X, fy, zL], [-X, fy, zL]]);
      if (q) {
        ctx.fillStyle = tono(10, 10, 12);
        ctx.fill();
        macchia(pr(0, sy * 0.2, zL + 5), (q[1][0] - q[0][0]) * 0.45, (q[2][1] - q[1][1]) * 0.55, "255, 214, 160", 0.12 * lum);
      }
      // le luci di ogni opera: la pozza sul pavimento, il faretto sul soffitto,
      // la luce che lava la parete dal suo lato
      const hParete = fy - sy;
      ctx.globalCompositeOperation = "lighter";
      pannelli.forEach((el, i) => {
        if (el.style.visibility === "hidden" && Number(el.dataset.z) + cam > 0) return;
        const xi = i % 2 ? largo : -largo;
        const zi = -(primo + i * passo);
        const n = nebbia(zi) * lum;
        // pozza di luce sul pavimento, davanti all'opera
        const c = pr(xi, fy, zi + 120);
        const lato = pr(xi + largo * 1.1, fy, zi + 120);
        const avanti = pr(xi, fy, zi + 120 + passo * 0.32);
        const dietro = pr(xi, fy, zi + 120 - passo * 0.32);
        if (c && lato && avanti && dietro) macchia(c, Math.abs(lato[0] - c[0]), Math.abs(avanti[1] - dietro[1]) / 2, "255, 210, 150", 0.26 * n);
        // il riflesso dell'opera sul pavimento lucido
        const r0 = pr(xi, fy, zi + 30);
        const r1 = pr(xi + largo * 0.35, fy, zi + 30);
        const r2 = pr(xi, fy, zi + 30 + passo * 0.5);
        if (r0 && r1 && r2) macchia([r0[0], (r0[1] + r2[1]) / 2], Math.abs(r1[0] - r0[0]), Math.abs(r2[1] - r0[1]) / 2, "255, 228, 196", 0.1 * n);
        // la parete dal suo lato
        const xp = i % 2 ? X : -X;
        const cw = pr(xp, sy + hParete * 0.32, zi);
        const wa = pr(xp, sy + hParete * 0.32, zi + passo * 0.3);
        const wd = pr(xp, sy + hParete * 0.32, zi - passo * 0.3);
        const wt = pr(xp, sy, zi);
        const wb = pr(xp, sy + hParete * 0.8, zi);
        if (cw && wa && wd && wt && wb) macchia(cw, Math.abs(wa[0] - wd[0]) / 2, Math.abs(wb[1] - wt[1]) / 2, "255, 206, 150", 0.14 * n);
        // il faretto sul soffitto
        const f = pr(xi, sy, zi + 160);
        if (f) {
          macchia(f, 70 * f[2], 26 * f[2], "255, 226, 180", 0.22 * n);
          macchia(f, 9 * f[2], 4 * f[2], "255, 246, 228", 0.95 * nebbia(zi));
        }
      });
      // le strisce di luce lungo il battiscopa e i binari sul soffitto
      const striscia = (a, b, colore, alfa, spessore) => {
        const p1 = pr(a[0], a[1], a[2]);
        const p2 = pr(b[0], b[1], b[2]);
        if (!p1 || !p2) return;
        const g = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
        g.addColorStop(0, `rgba(${colore}, ${alfa})`);
        g.addColorStop(1, `rgba(${colore}, 0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = spessore;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      };
      [-X, X].forEach((xp) => striscia([xp, fy - 2, zV], [xp, fy - 2, zL], "255, 200, 140", 0.5 * lum, 2.4));
      [-largo, largo].forEach((xp) => striscia([xp, sy, zV], [xp, sy, zL], "236, 230, 218", 0.12 * lum, 1.5));
      ctx.globalCompositeOperation = "source-over";
    }

    function avanzamento() {
      const r = pista.getBoundingClientRect();
      const corsa = pista.offsetHeight - window.innerHeight;
      return limita((-r.top - window.innerHeight * 0.15) / Math.max(1, corsa - window.innerHeight * 0.2), 0, 1);
    }

    function fotogramma() {
      ciclo = 0;
      if (!visibile) return;
      const p = avanzamento();
      camMeta = p * G.camFine;
      cam += (camMeta - cam) * 0.09; // il passo: si arriva con un po' di inerzia
      guardaX += (mx - guardaX) * 0.06;
      guardaY += (my - guardaY) * 0.06;
      const gradiX = guardaY * 4;
      const gradiY = guardaX * 9;
      mondo.style.transform = `rotateX(${gradiX.toFixed(3)}deg) rotateY(${gradiY.toFixed(3)}deg) translate3d(0, 0, ${cam.toFixed(1)}px)`;
      // ogni opera: nell'ombra da lontano, accesa da vicino, svanisce quando la superi
      let vicina = 0;
      let minimo = Infinity;
      pannelli.forEach((el, i) => {
        const rel = Number(el.dataset.z) + cam; // distanza davanti a noi (negativa)
        const lontano = -rel;
        if (Math.abs(lontano - G.prospettiva * 0.3) < minimo) {
          minimo = Math.abs(lontano - G.prospettiva * 0.3);
          vicina = i;
        }
        if (lontano < G.passo * 4.2 || i < 2) carica(el);
        const ombra = limita((lontano - G.passo) / (G.passo * 3), 0, 1);
        const passata = limita((rel + G.prospettiva * 0.02) / (G.prospettiva * 0.3), 0, 1);
        el.style.setProperty("--ombra", ombra.toFixed(3));
        el.style.opacity = (1 - passata).toFixed(3);
        el.style.visibility = passata >= 1 || lontano > G.profondita ? "hidden" : "visible";
        el.classList.toggle("is-vicina", lontano < G.passo * 1.2 && passata < 0.5);
      });
      const relFine = Number(fine.dataset.z) + cam;
      fine.style.setProperty("--ombra", limita((-relFine - G.passo) / (G.passo * 2.4), 0, 1).toFixed(3));
      disegnaSala(gradiX, gradiY);
      conta.textContent = String(vicina + 1).padStart(2, "0");
      barra.style.transform = `scaleX(${(cam / G.camFine).toFixed(4)})`;
      palco.style.setProperty("--nebbia", (1 - Math.min(1, cam / G.camFine) ** 1.5).toFixed(3));
      if (testa && !testa.classList.contains("visibile") && pista.getBoundingClientRect().top < window.innerHeight * 0.6) testa.classList.add("visibile");
      if (testa) testa.classList.toggle("in-cammino", cam > G.passo * 0.35);
      // si continua finché il passo o lo sguardo non si sono fermati
      if (Math.abs(camMeta - cam) > 0.5 || Math.abs(mx - guardaX) > 0.002 || Math.abs(my - guardaY) > 0.002) {
        ciclo = requestAnimationFrame(fotogramma);
      }
    }
    function avvia() {
      if (!ciclo && visibile) ciclo = requestAnimationFrame(fotogramma);
    }

    palco.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        const r = palco.getBoundingClientRect();
        mx = limita((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
        my = limita((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
        avvia();
      },
      { passive: true }
    );
    palco.addEventListener("pointerleave", () => {
      mx = 0;
      my = 0;
      avvia();
    });
    // con la tastiera: l'opera che riceve il fuoco viene portata davanti
    mondo.addEventListener("focusin", (e) => {
      const el = e.target.closest(".galleria-pannello, .galleria-fine");
      if (!el) return;
      const voluto = limita((-Number(el.dataset.z) - G.prospettiva * 1.2) / G.camFine, 0, 1);
      const corsa = pista.offsetHeight - window.innerHeight;
      const y = pista.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.15 + voluto * (corsa - window.innerHeight * 0.2);
      window.scrollTo({ top: y, behavior: "auto" });
      cam = voluto * G.camFine;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((v) => {
        visibile = v[0].isIntersecting;
        avvia();
      }).observe(pista);
    } else visibile = true;
    suScorrimento(avvia);
    document.addEventListener("luci-cambiate", () => {
      if (!ciclo && visibile) ciclo = requestAnimationFrame(fotogramma);
    });
    let ritardo = 0;
    window.addEventListener("resize", () => {
      clearTimeout(ritardo);
      ritardo = setTimeout(() => {
        geometria();
        avvia();
      }, 150);
    });
    geometria();
    cam = avanzamento() * G.camFine;
    avvia();
  }

  /* ------------------------------------------------------------------
     6. I titoli giganti
     Ogni lettera sale da sotto una linea quando la sala entra nello
     schermo; mentre scorri, il titolo scivola piano di lato.
     ------------------------------------------------------------------ */
  function preparaTitoli() {
    const titoli = $$(".titolo-sezione, .mostra-titolo");
    titoli.forEach((t) => {
      if (t.dataset.diviso) return;
      t.dataset.diviso = "1";
      const testo = t.textContent.trim();
      let i = 0;
      const parole = testo.split(/\s+/).map((p) => {
        const lettere = [...p].map((ch) => `<span class="titolo-lettera" style="--i:${i++}">${esc(ch)}</span>`).join("");
        i++;
        return `<span class="titolo-parola">${lettere}</span>`;
      });
      t.innerHTML = `<span class="visually-hidden">${esc(testo)}</span><span class="titolo-lettere" aria-hidden="true">${parole.join(" ")}</span>`;
    });
    if (menoMovimento()) {
      const testa = $(".mostra-testa");
      if (testa) testa.classList.add("visibile");
      return;
    }
    const scivola = () => {
      const h = window.innerHeight;
      titoli.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.bottom < -100 || r.top > h + 100) return;
        const p = (r.top + r.height / 2) / h;
        t.style.setProperty("--deriva", `${((p - 0.5) * 7).toFixed(2)}vw`);
      });
    };
    suScorrimento(scivola);
    scivola();
  }

  /* ------------------------------------------------------------------
     7. Avvio
     ------------------------------------------------------------------ */
  function prepara() {
    document.documentElement.classList.add("galleria-notturna");
    preparaInterruttore();
    preparaSale();
    preparaLanterna();
    preparaPolvere();
    preparaTitoli();
    window.addEventListener("scroll", scorri, { passive: true });
    const conContenuti = () => {
      costruisciMuro();
      costruisciGalleria();
      let ritardo = 0;
      window.addEventListener("resize", () => {
        clearTimeout(ritardo);
        ritardo = setTimeout(costruisciMuro, 200);
      });
    };
    if (window.Vetrina && window.Vetrina.opere) conContenuti();
    else document.addEventListener("vetrina:pronta", conContenuti, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepara);
  else prepara();
})();
