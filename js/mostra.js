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
  // Sul telefono la barra degli indirizzi entra ed esce mentre scorri e
  // cambia l'altezza della finestra: le misure si rifanno solo se cambia la
  // larghezza (o l'altezza di molto, girando il telefono), altrimenti la
  // pagina farebbe uno scatto ogni volta.
  function suRidimensiona(fn, ritardo = 150) {
    let w = window.innerWidth;
    let h = window.innerHeight;
    let t = 0;
    window.addEventListener("resize", () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (nw === w && Math.abs(nh - h) < 160) return;
      w = nw;
      h = nh;
      clearTimeout(t);
      t = setTimeout(fn, ritardo);
    });
  }

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
      f.style.cssText = `--x: ${x}%; --y: ${y}%; --h: ${h}vh; --w: ${w}vw; --i: ${i}; --storto: ${((Math.random() - 0.5) * 3).toFixed(2)}deg`;
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
    const coloreBarra = () => {
      if (!meta) return;
      const nome = radice.dataset.sala;
      if (radice.classList.contains("luci-accese")) meta.setAttribute("content", "#F1ECE3");
      else if (COLORE_BARRA[nome]) meta.setAttribute("content", COLORE_BARRA[nome]);
    };
    // le luci della sala: il nuovo colore si accende su uno strato sopra il vecchio
    const strati = $$(".luci-strato");
    let attivo = 0;
    let ultime = "";
    let spegni = 0;
    const luciSala = (subito) => {
      if (strati.length < 2) return;
      const cs = getComputedStyle(radice);
      const c = ["--luce-a", "--luce-b", "--luce-c"].map((n) => cs.getPropertyValue(n).trim());
      const chiave = c.join("|");
      if (chiave === ultime) return;
      if (!ultime) {
        // la prima volta: i colori fissati sullo strato acceso, senza dissolvenza
        ultime = chiave;
        strati[attivo].style.setProperty("--la", c[0]);
        strati[attivo].style.setProperty("--lb", c[1]);
        strati[attivo].style.setProperty("--lc", c[2]);
        return;
      }
      ultime = chiave;
      const vecchio = strati[attivo];
      const nuovo = strati[1 - attivo];
      clearTimeout(spegni);
      if (subito || menoMovimento()) {
        [vecchio, nuovo].forEach((x) => x.classList.add("subito"));
        nuovo.style.setProperty("--la", c[0]);
        nuovo.style.setProperty("--lb", c[1]);
        nuovo.style.setProperty("--lc", c[2]);
        nuovo.classList.add("is-acceso", "is-sopra");
        vecchio.classList.remove("is-acceso", "is-sopra");
        void nuovo.offsetWidth;
        [vecchio, nuovo].forEach((x) => x.classList.remove("subito"));
      } else {
        nuovo.classList.add("subito");
        nuovo.classList.remove("is-acceso");
        nuovo.style.setProperty("--la", c[0]);
        nuovo.style.setProperty("--lb", c[1]);
        nuovo.style.setProperty("--lc", c[2]);
        nuovo.classList.add("is-sopra");
        vecchio.classList.remove("is-sopra");
        void nuovo.offsetWidth;
        nuovo.classList.remove("subito");
        nuovo.classList.add("is-acceso");
        // il vecchio si spegne quando il nuovo è acceso del tutto (sotto non si vede)
        spegni = setTimeout(() => vecchio.classList.remove("is-acceso"), 1400);
      }
      attivo = 1 - attivo;
    };
    const imposta = (nome) => {
      if (radice.dataset.sala === nome) return;
      radice.dataset.sala = nome;
      coloreBarra();
      luciSala(false);
    };
    document.addEventListener("luci-cambiate", () => {
      coloreBarra();
      luciSala(true);
    });
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
        // sul telefono, fuori dall'ingresso la lanterna si spegne (il dito scorre, non illumina)
        document.documentElement.classList.toggle("fuori-ingresso", !ingressoVisibile);
        avvia();
      }).observe(ingresso);
    }
    const conIlMouse = conMouse();
    const avvio = performance.now();
    // dove stanno le lettere del nome, rispetto all'ingresso: si misura poche volte
    let centri = null;
    let misurateA = 0;
    suRidimensiona(() => (centri = null), 60);

    let dispari = false;
    function fotogramma(ora) {
      ciclo = 0;
      if (document.hidden) return;
      // sul telefono basta mezzo ritmo (30 volte al secondo): la luce si muove piano
      if (!conIlMouse) {
        dispari = !dispari;
        if (dispari) {
          ciclo = requestAnimationFrame(fotogramma);
          return;
        }
      }
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
          if (lettere.length && (!centri || (ora - avvio < 3200 && ora - misurateA > 400))) {
            centri = lettere.map((l) => {
              const m = l.getBoundingClientRect();
              return [m.left + m.width / 2 - r.left, m.top + m.height / 2 - r.top];
            });
            misurateA = ora;
          }
          if (centri) {
            lettere.forEach((l, i) => {
              const d = Math.hypot(r.left + centri[i][0] - Lanterna.x, r.top + centri[i][1] - Lanterna.y);
              scrivi.push([l, Math.max(0, 1 - d / raggio)]);
            });
          }
        }
      }
      // i titoli delle sale vicini alla luce (solo col mouse: sul telefono scorrerebbe a scatti)
      if (!titoli && conIlMouse) {
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
    suRidimensiona(dimensiona, 50);
    // sul telefono la polvere vola solo all'ingresso: altrove il telefono risparmia le forze
    let attiva = true;
    let inCorso = true;
    const ingresso = $(".ingresso");
    if (!conMouse() && ingresso && "IntersectionObserver" in window) {
      new IntersectionObserver((v) => {
        attiva = v[0].isIntersecting;
        tela.style.opacity = attiva ? "" : "0";
        if (attiva && !inCorso) {
          inCorso = true;
          requestAnimationFrame(fotogramma);
        }
      }).observe(ingresso);
    }
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
      if (!attiva) {
        inCorso = false;
        ctx.clearRect(0, 0, W, H);
        return;
      }
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
        const luce = accese ? 0.75 : 0.16 + 2.8 * Math.exp(-d2 / raggio2);
        ctx.globalAlpha = Math.min(1, g.a * luce);
        ctx.fillStyle = accese ? "#C08A2E" : "#FFE9C8";
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(fotogramma);
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
    const vista = $(".mostra-vista", pista);
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
      G.vistaH = vista.clientHeight || window.innerHeight;
      pista.style.height = `${Math.round(G.vistaH * 1.35 + camFine * 0.72)}px`;
    }

    // Disegna la sala vista dalla posizione attuale: stessa matematica della
    // prospettiva CSS (rotateX, rotateY, poi il passo in avanti)
    const ctx = tela.getContext("2d");
    function disegnaSala(gradiX, gradiY) {
      const { W, H, prospettiva: P, largo, pavimentoY: fy, soffittoY: sy, fineZ, passo, primo } = G;
      const accese = document.documentElement.classList.contains("luci-accese");
      const lum = 1;
      // con le luci accese la sala diventa bianca, di giorno: pavimento di rovere chiaro, lucernari
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
      ctx.fillStyle = accese ? "#E4DED3" : "#060608";
      ctx.fillRect(0, 0, W, H);

      // il soffitto, con i binari delle luci
      let q = poligono([[-X, sy, zV], [X, sy, zV], [X, sy, zL], [-X, sy, zL]]);
      if (q) {
        ctx.fillStyle = lineare(q[0], q[3], accese ? [[0, "#FAF8F3"], [1, "#DDD7CC"]] : [[0, tono(16, 16, 20)], [1, tono(5, 5, 6)]]);
        ctx.fill();
      }
      // il pavimento: cemento lucido, più chiaro vicino a noi
      q = poligono([[-X, fy, zV], [X, fy, zV], [X, fy, zL], [-X, fy, zL]]);
      if (q) {
        const vicino = [(q[0][0] + q[1][0]) / 2, Math.min(H * 1.4, (q[0][1] + q[1][1]) / 2)];
        const lontano = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
        ctx.fillStyle = lineare(vicino, lontano, accese ? [[0, "#C9B79A"], [0.5, "#D6C8B1"], [1, "#E3DACB"]] : [[0, tono(38, 35, 37)], [0.5, tono(17, 16, 18)], [1, tono(6, 6, 7)]]);
        ctx.fill();
      }
      // le pareti d'intonaco
      [-X, X].forEach((xp) => {
        const w = poligono([[xp, sy, zV], [xp, fy, zV], [xp, fy, zL], [xp, sy, zL]]);
        if (!w) return;
        const vicino = [(w[0][0] + w[1][0]) / 2, (w[0][1] + w[1][1]) / 2];
        const lontano = [(w[2][0] + w[3][0]) / 2, (w[2][1] + w[3][1]) / 2];
        ctx.fillStyle = lineare(vicino, lontano, accese ? [[0, "#F4F0E9"], [0.5, "#EAE4DA"], [1, "#DDD7CC"]] : [[0, tono(36, 33, 36)], [0.5, tono(18, 17, 20)], [1, tono(7, 7, 9)]]);
        ctx.fill();
      });
      // la parete di fondo
      q = poligono([[-X, sy, zL], [X, sy, zL], [X, fy, zL], [-X, fy, zL]]);
      if (q) {
        ctx.fillStyle = accese ? "#EDE8DF" : tono(10, 10, 12);
        ctx.fill();
        macchia(pr(0, sy * 0.2, zL + 5), (q[1][0] - q[0][0]) * 0.45, (q[2][1] - q[1][1]) * 0.55, "255, 214, 160", 0.12 * lum);
      }
      // le luci di ogni opera: la pozza sul pavimento, il faretto sul soffitto,
      // la luce che lava la parete dal suo lato
      const hParete = fy - sy;
      ctx.globalCompositeOperation = accese ? "source-over" : "lighter";
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
        if (c && lato && avanti && dietro) macchia(c, Math.abs(lato[0] - c[0]), Math.abs(avanti[1] - dietro[1]) / 2, accese ? "255, 252, 244" : "255, 210, 150", accese ? 0.45 * n : 0.26 * n);
        // il riflesso dell'opera sul pavimento lucido
        const r0 = pr(xi, fy, zi + 30);
        const r1 = pr(xi + largo * 0.35, fy, zi + 30);
        const r2 = pr(xi, fy, zi + 30 + passo * 0.5);
        if (r0 && r1 && r2) macchia([r0[0], (r0[1] + r2[1]) / 2], Math.abs(r1[0] - r0[0]), Math.abs(r2[1] - r0[1]) / 2, accese ? "90, 70, 45" : "255, 228, 196", accese ? 0.14 * n : 0.1 * n);
        // la parete dal suo lato
        const xp = i % 2 ? X : -X;
        const cw = pr(xp, sy + hParete * 0.32, zi);
        const wa = pr(xp, sy + hParete * 0.32, zi + passo * 0.3);
        const wd = pr(xp, sy + hParete * 0.32, zi - passo * 0.3);
        const wt = pr(xp, sy, zi);
        const wb = pr(xp, sy + hParete * 0.8, zi);
        if (cw && wa && wd && wt && wb) macchia(cw, Math.abs(wa[0] - wd[0]) / 2, Math.abs(wb[1] - wt[1]) / 2, accese ? "255, 236, 200" : "255, 206, 150", accese ? 0.3 * n : 0.14 * n);
        // il faretto sul soffitto
        const f = pr(xi, sy, zi + 160);
        if (f) {
          if (accese) {
            // un lucernario: un rettangolo di cielo chiaro nel soffitto
            macchia(f, 90 * f[2], 22 * f[2], "255, 255, 255", 0.85 * nebbia(zi));
          } else {
            macchia(f, 70 * f[2], 26 * f[2], "255, 226, 180", 0.22 * n);
            macchia(f, 9 * f[2], 4 * f[2], "255, 246, 228", 0.95 * nebbia(zi));
          }
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
      [-X, X].forEach((xp) => striscia([xp, fy - 2, zV], [xp, fy - 2, zL], accese ? "120, 100, 75" : "255, 200, 140", accese ? 0.35 : 0.5 * lum, 2.4));
      [-largo, largo].forEach((xp) => striscia([xp, sy, zV], [xp, sy, zL], "236, 230, 218", 0.12 * lum, 1.5));
      ctx.globalCompositeOperation = "source-over";
    }

    function avanzamento() {
      const r = pista.getBoundingClientRect();
      const h = G.vistaH;
      const corsa = pista.offsetHeight - h;
      return limita((-r.top - h * 0.15) / Math.max(1, corsa - h * 0.2), 0, 1);
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
      const h = G.vistaH;
      const corsa = pista.offsetHeight - h;
      const y = pista.getBoundingClientRect().top + window.scrollY + h * 0.15 + voluto * (corsa - h * 0.2);
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
    suRidimensiona(() => {
      geometria();
      avvia();
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
    if (!conMouse()) return; // sul telefono i titoli restano fermi: lo scorrimento è più fluido
    const scivola = () => {
      const h = window.innerHeight;
      const misure = titoli.map((t) => t.getBoundingClientRect());
      titoli.forEach((t, i) => {
        const r = misure[i];
        if (r.bottom < -100 || r.top > h + 100) return;
        const p = (r.top + r.height / 2) / h;
        t.style.setProperty("--deriva", `${((p - 0.5) * 7).toFixed(2)}vw`);
      });
    };
    suScorrimento(scivola);
    scivola();
  }

  /* ------------------------------------------------------------------
     6b. La cordicella della luce
     In alto a destra pende una cordicella: si tira giù (o si tocca, o si
     preme L) per accendere le luci. Accese, la galleria diventa chiara,
     di giorno: la luce si allarga a cerchio partendo dalla cordicella
     (dove il browser lo permette), con un piccolo sfarfallio prima.
     ------------------------------------------------------------------ */
  function preparaInterruttore() {
    const b = $("#interruttore");
    if (!b) return;
    const radice = document.documentElement;
    const testo = b.querySelector(".interruttore-testo");
    const appesa = b.querySelector(".cordicella-appesa");
    const pomello = b.querySelector(".cordicella-pomello");
    const applica = (accese) => {
      radice.classList.toggle("luci-accese", accese);
      b.setAttribute("aria-pressed", String(accese));
      testo.textContent = accese ? "Spegni le luci" : "Accendi le luci";
      document.dispatchEvent(new CustomEvent("luci-cambiate"));
    };
    const salva = (accese) => {
      try {
        localStorage.setItem("luci-accese", accese ? "1" : "0");
      } catch (e) {
        /* il browser non salva: pazienza */
      }
    };
    let iniziale = false;
    try {
      iniziale = localStorage.getItem("luci-accese") === "1";
    } catch (e) {
      iniziale = false;
    }
    applica(iniziale);

    // la cordicella ha un po' di fisica: si allunga quando la tiri e dondola
    let ang = 0;
    let vAng = 0;
    let tiro = 0;
    let vTiro = 0;
    let ciclo = 0;
    let presa = null;
    function passo() {
      ciclo = 0;
      if (!presa) {
        vTiro += -tiro * 0.2;
        vTiro *= 0.7;
        tiro += vTiro;
        vAng += -ang * 0.045;
        vAng *= 0.94;
        ang += vAng;
      }
      appesa.style.setProperty("--tiro", `${Math.max(-6, tiro).toFixed(1)}px`);
      appesa.style.setProperty("--ang", `${ang.toFixed(2)}deg`);
      if (presa || Math.abs(tiro) > 0.2 || Math.abs(vTiro) > 0.2 || Math.abs(ang) > 0.05 || Math.abs(vAng) > 0.05) {
        ciclo = requestAnimationFrame(passo);
      }
    }
    const muovi = () => {
      if (!ciclo) ciclo = requestAnimationFrame(passo);
    };
    const strattone = () => {
      vTiro = 10;
      vAng += (Math.random() - 0.5) * 3;
      muovi();
    };

    // il lampo di luce che si spegne piano dopo l'accensione
    const lampo = $(".lampo");
    function bagliore(x, y) {
      if (!lampo || !lampo.animate || menoMovimento()) return;
      lampo.style.setProperty("--x", `${x}px`);
      lampo.style.setProperty("--y", `${y}px`);
      lampo.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 1100, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
    }

    let inCorso = false;
    function accendi(accese) {
      if (inCorso) return;
      salva(accese);
      const r = pomello.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2);
      const y = Math.round(r.top + r.height / 2);
      if (menoMovimento() || !document.startViewTransition) {
        applica(accese);
        if (accese) bagliore(x, y);
        return;
      }
      inCorso = true;
      const parti = () => {
        let t;
        try {
          t = document.startViewTransition(() => applica(accese));
        } catch (e) {
          applica(accese);
          inCorso = false;
          return;
        }
        t.ready
          .then(() => {
            const R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            radice.animate(
              { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${Math.ceil(R)}px at ${x}px ${y}px)`] },
              { duration: accese ? 1150 : 850, easing: "cubic-bezier(0.7, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
            );
          })
          .catch(() => {});
        t.finished
          .then(() => {
            if (accese) bagliore(x, y);
          })
          .catch(() => {})
          .finally(() => {
            inCorso = false;
          });
      };
      if (accese) {
        // la lampadina sfarfalla un attimo prima di accendersi
        b.classList.add("sfarfalla");
        setTimeout(() => {
          b.classList.remove("sfarfalla");
          parti();
        }, 420);
      } else parti();
    }
    const cambia = () => accendi(!radice.classList.contains("luci-accese"));

    // col mouse sopra dondola un poco
    b.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || menoMovimento()) return;
      vAng += (Math.random() > 0.5 ? 1 : -1) * 1.4;
      muovi();
    });
    // si può tirare davvero: giù di almeno 2 cm e si accende
    b.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      presa = { x0: e.clientX, y0: e.clientY, mossa: false };
      try {
        b.setPointerCapture(e.pointerId);
      } catch (err) {
        /* niente */
      }
      muovi();
    });
    b.addEventListener("pointermove", (e) => {
      if (!presa) return;
      const dy = e.clientY - presa.y0;
      const dx = e.clientX - presa.x0;
      if (Math.abs(dy) > 5 || Math.abs(dx) > 5) presa.mossa = true;
      tiro = limita(dy * 0.85, -4, 80);
      ang = limita(-dx * 0.3, -28, 28);
    });
    const lascia = () => {
      if (!presa) return;
      const p = presa;
      presa = null;
      if (p.mossa) {
        b._senzaClic = true;
        setTimeout(() => (b._senzaClic = false), 350);
        if (tiro > 24) cambia();
        vTiro = 0;
      }
      muovi();
    };
    b.addEventListener("pointerup", lascia);
    b.addEventListener("pointercancel", lascia);
    b.addEventListener("click", () => {
      if (b._senzaClic) return; // l'ha già tirata col dito o col mouse
      strattone();
      cambia();
    });
    // il tasto L accende e spegne
    document.addEventListener("keydown", (e) => {
      if (e.key !== "l" && e.key !== "L") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector("dialog[open]")) return;
      strattone();
      cambia();
    });
  }

  /* ------------------------------------------------------------------
     6c. L'audioguida e la pianta
     La capsula in basso segna la sala in cui sei con una luce che
     scivola; passando col mouse la luce segue la voce. Sul telefono
     mostra solo la sala e il pulsante "Pianta", che apre la pianta della
     galleria dal basso (si chiude anche trascinandola giù, o con Esc).
     ------------------------------------------------------------------ */
  function preparaGuida() {
    const guida = $("#guida");
    if (!guida) return;
    const radice = document.documentElement;
    const voci = $$(".guida-voce", guida);
    const lista = $(".guida-lista", guida);
    const luce = $(".guida-luce", guida);
    const quiN = $("#guida-qui-n");
    const quiNome = $("#guida-qui-nome");
    const barra = $("#guida-progresso");
    let indicata = null;

    const vocePer = (sala) => voci.find((v) => v.dataset.sala === sala) || voci[0];
    const corrente = () => vocePer(radice.dataset.sala);
    function sposta() {
      const v = indicata || corrente();
      voci.forEach((x) => x.classList.toggle("is-qui", x === corrente()));
      const c = corrente();
      if (c && quiN) {
        quiN.textContent = $(".guida-n", c).textContent;
        quiNome.textContent = $(".guida-nome", c).textContent;
      }
      if (!v || !lista || lista.offsetParent === null || getComputedStyle(lista).display === "none") {
        luce.classList.remove("visibile");
        return;
      }
      const a = $(".guida-link", v).getBoundingClientRect();
      const g = guida.getBoundingClientRect();
      luce.style.setProperty("--x", `${(a.left - g.left).toFixed(1)}px`);
      luce.style.setProperty("--w", `${a.width.toFixed(1)}px`);
      luce.dataset.sala = v.dataset.sala;
      luce.classList.add("visibile");
    }
    voci.forEach((v) => {
      v.addEventListener("mouseenter", () => {
        indicata = v;
        sposta();
      });
      v.addEventListener("focusin", () => {
        indicata = v;
        sposta();
      });
    });
    guida.addEventListener("mouseleave", () => {
      indicata = null;
      sposta();
    });
    guida.addEventListener("focusout", (e) => {
      if (guida.contains(e.relatedTarget)) return;
      indicata = null;
      sposta();
    });
    new MutationObserver(sposta).observe(radice, { attributes: true, attributeFilter: ["data-sala"] });
    window.addEventListener("resize", sposta);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sposta);

    // quanto della visita hai fatto
    let altezzaPagina = document.documentElement.scrollHeight;
    if ("ResizeObserver" in window) new ResizeObserver(() => (altezzaPagina = document.documentElement.scrollHeight)).observe(document.body);
    suScorrimento(() => {
      const max = altezzaPagina - window.innerHeight;
      if (barra) barra.style.transform = `scaleX(${max > 0 ? limita(window.scrollY / max, 0, 1).toFixed(4) : 0})`;
    });

    // le sale chiuse (per esempio Processo senza video) non compaiono
    const sistemaSale = () => {
      const chiusa = (id) => {
        const s = document.getElementById(id);
        return !s || s.hidden || getComputedStyle(s).display === "none";
      };
      voci.forEach((v) => {
        const a = $(".guida-link", v);
        const id = a.getAttribute("href").slice(1);
        v.hidden = id !== "inizio" && chiusa(id);
      });
      $$(".pianta-sala").forEach((p) => {
        const id = $("a", p).getAttribute("href").slice(1);
        p.classList.toggle("is-chiusa", id !== "inizio" && chiusa(id));
      });
      sposta();
    };
    sistemaSale();
    document.addEventListener("vetrina:pronta", () => setTimeout(sistemaSale, 50));
    setTimeout(() => guida.classList.add("is-pronta"), menoMovimento() ? 0 : 900);

    /* --- La pianta --- */
    const pianta = $("#pianta");
    const btn = $("#pianta-btn");
    if (!pianta || !btn) return;
    const foglio = $(".pianta-foglio", pianta);
    const fuori = () => [$("main"), $(".piede"), $(".testata"), guida].filter(Boolean);
    let chiusura = 0;
    function apri() {
      clearTimeout(chiusura);
      sistemaSale();
      // la sala in cui sei, con il puntino "Sei qui"
      $$(".pianta-sala", pianta).forEach((p) => p.classList.toggle("is-qui", p.dataset.sala === (radice.dataset.sala || "ingresso")));
      // le categorie delle opere, copiate dal menu
      const cat = $("#sottomenu-opere");
      const dove = $("#pianta-categorie");
      if (cat && dove) dove.innerHTML = cat.children.length ? `<p class="pianta-occhiello">Opere per categoria</p><ul class="pianta-cat">${cat.innerHTML}</ul>` : "";
      const conta = $("#pianta-conta");
      if (conta && window.Vetrina && window.Vetrina.opere) conta.textContent = `${window.Vetrina.opere.length} opere`;
      pianta.hidden = false;
      foglio.style.transform = "";
      requestAnimationFrame(() => requestAnimationFrame(() => pianta.classList.add("is-aperta")));
      btn.setAttribute("aria-expanded", "true");
      radice.classList.add("pianta-aperta");
      fuori().forEach((el) => (el.inert = true));
      const qui = $(".pianta-sala.is-qui a", pianta) || $(".pianta-sala a", pianta);
      setTimeout(() => qui && qui.focus({ preventScroll: true }), 60);
    }
    function chiudi(rimetti) {
      if (pianta.hidden) return;
      pianta.classList.remove("is-aperta");
      btn.setAttribute("aria-expanded", "false");
      radice.classList.remove("pianta-aperta");
      fuori().forEach((el) => (el.inert = false));
      chiusura = setTimeout(() => (pianta.hidden = true), menoMovimento() ? 0 : 420);
      if (rimetti) btn.focus({ preventScroll: true });
    }
    btn.addEventListener("click", () => (pianta.hidden ? apri() : chiudi(true)));
    pianta.addEventListener("click", (e) => {
      if (e.target.closest("[data-chiudi]")) chiudi(true);
      else if (e.target.closest("a")) chiudi(false); // il passaggio alla sala lo fa js/script.js
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !pianta.hidden) {
        chiudi(true);
        return;
      }
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
        if (document.querySelector("dialog[open]")) return;
        if (pianta.hidden) apri();
        else chiudi(true);
      }
    });
    // si chiude anche trascinandola giù
    const testa = $(".pianta-testa", pianta);
    const maniglia = $(".pianta-maniglia", pianta);
    let presa = null;
    [testa, maniglia].filter(Boolean).forEach((el) =>
      el.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button, a")) return;
        presa = { y0: e.clientY, dy: 0 };
        foglio.style.transition = "none";
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {
          /* niente */
        }
      })
    );
    window.addEventListener("pointermove", (e) => {
      if (!presa) return;
      presa.dy = Math.max(0, e.clientY - presa.y0);
      foglio.style.transform = `translateY(${presa.dy}px)`;
    });
    const lascia = () => {
      if (!presa) return;
      const dy = presa.dy;
      presa = null;
      foglio.style.transition = "";
      foglio.style.transform = "";
      if (dy > 90) chiudi(true);
    };
    window.addEventListener("pointerup", lascia);
    window.addEventListener("pointercancel", lascia);
  }

  /* ------------------------------------------------------------------
     6d. Altre interazioni
     - Ombre: con le luci accese la luce viene dal mouse, e quadri e
       titoli gettano l'ombra dalla parte opposta.
     - I quadri del muro sono appesi a un chiodo: se la luce li sfiora
       veloce dondolano, e piano piano tornano fermi.
     - Calamite: i bottoni si lasciano attirare un poco dal mouse.
     - Biglietti: gli eventi si inclinano sotto il mouse, con un riflesso.
     - Pennellate: nel piede, passando il mouse si dipinge nei colori di
       Marco (sul telefono un tocco lascia una macchia); il colore svanisce.
     ------------------------------------------------------------------ */
  function preparaOmbre() {
    if (!conMouse() || menoMovimento()) return;
    const radice = document.documentElement;
    let tx = 0;
    let ty = 0.4;
    let x = 0;
    let y = 0.4;
    let ciclo = 0;
    function passo() {
      ciclo = 0;
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      radice.style.setProperty("--sx", x.toFixed(3));
      radice.style.setProperty("--sy", y.toFixed(3));
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.004) ciclo = requestAnimationFrame(passo);
    }
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse" || !radice.classList.contains("luci-accese")) return;
        tx = limita((window.innerWidth / 2 - e.clientX) / (window.innerWidth / 2), -1, 1);
        ty = limita((window.innerHeight * 0.3 - e.clientY) / (window.innerHeight / 2), -1, 1);
        if (!ciclo) ciclo = requestAnimationFrame(passo);
      },
      { passive: true }
    );
  }

  function preparaOscillazioni() {
    if (menoMovimento()) return;
    const ingresso = $(".ingresso");
    if (!ingresso) return;
    const stato = new Map(); // opera -> { a, v }
    let visibile = true;
    let ciclo = 0;
    let px = Lanterna.x;
    let py = Lanterna.y;
    function passo() {
      ciclo = 0;
      if (!visibile || document.hidden || !Muro.opere.length) return;
      const dx = Lanterna.x - px;
      const dy = Lanterna.y - py;
      px = Lanterna.x;
      py = Lanterna.y;
      const veloce = Math.abs(dx) + Math.abs(dy) > 1.2;
      const misure = veloce ? Muro.opere.map((f) => f.getBoundingClientRect()) : null;
      Muro.opere.forEach((f, i) => {
        let s = stato.get(f);
        if (!s) {
          s = { a: 0, v: 0 };
          stato.set(f, s);
        }
        if (veloce) {
          const r = misure[i];
          if (Lanterna.x > r.left && Lanterna.x < r.right && Lanterna.y > r.top - 20 && Lanterna.y < r.bottom) {
            // la spinta dipende da quanto veloce passa la luce e da dove la tocca
            s.v += limita(dx * 0.035, -1.4, 1.4) * (Lanterna.y < r.top + r.height * 0.6 ? 1 : 1.4);
          }
        }
        s.v += -s.a * 0.035; // la molla del filo
        s.v *= 0.965; // l'aria lo frena
        s.a = limita(s.a + s.v, -14, 14);
        const t = s.a.toFixed(2);
        if (f._oscilla !== t) {
          f._oscilla = t;
          f.style.setProperty("--oscilla", `${t}deg`);
        }
      });
      // pochi calcoli: resta in ascolto finché l'ingresso si vede (le misure solo quando la luce corre)
      ciclo = requestAnimationFrame(passo);
    }
    const avvia = () => {
      if (!ciclo && visibile) ciclo = requestAnimationFrame(passo);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((v) => {
        visibile = v[0].isIntersecting;
        avvia();
      }).observe(ingresso);
    }
    // sul telefono un tocco su un quadro lo fa dondolare
    ingresso.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse") return;
        Muro.opere.forEach((f) => {
          const r = f.getBoundingClientRect();
          if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
            const s = stato.get(f) || { a: 0, v: 0 };
            s.v += e.clientX < r.left + r.width / 2 ? 1.6 : -1.6;
            stato.set(f, s);
          }
        });
        avvia();
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", avvia);
    avvia();
  }

  function preparaMagneti() {
    if (!conMouse() || menoMovimento()) return;
    const SEL = ".bottone, .ingresso-entra, .filtro, .guida-link, .evento-calendario, .galleria-fine-freccia, .pianta-chiudi";
    let attivo = null;
    const lascia = (el) => {
      el.style.transition = "translate 0.6s cubic-bezier(0.2, 0.9, 0.2, 1)";
      el.style.translate = "";
      clearTimeout(el._calamita);
      el._calamita = setTimeout(() => (el.style.transition = ""), 650);
    };
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        const el = e.target.closest && e.target.closest(SEL);
        if (attivo && attivo !== el) {
          lascia(attivo);
          attivo = null;
        }
        if (!el) return;
        const r = el.getBoundingClientRect();
        const forza = el.classList.contains("ingresso-entra") ? 0.32 : 0.2;
        const dx = (e.clientX - (r.left + r.width / 2)) * forza;
        const dy = (e.clientY - (r.top + r.height / 2)) * forza;
        clearTimeout(el._calamita);
        el.style.transition = "translate 0.15s ease-out";
        el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        attivo = el;
      },
      { passive: true }
    );
    document.addEventListener("pointerleave", () => attivo && lascia(attivo));
  }

  function preparaBiglietti() {
    if (!conMouse() || menoMovimento()) return;
    let attivo = null;
    const lascia = (ev) => {
      ev.style.removeProperty("--rx");
      ev.style.removeProperty("--ry");
      ev.classList.remove("is-inclinato");
    };
    document.addEventListener(
      "pointermove",
      (e) => {
        const ev = e.target.closest && e.target.closest(".evento");
        if (attivo && attivo !== ev) {
          lascia(attivo);
          attivo = null;
        }
        if (!ev || e.pointerType !== "mouse") return;
        const r = ev.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ev.style.setProperty("--rx", `${((0.5 - py) * 7).toFixed(2)}deg`);
        ev.style.setProperty("--ry", `${((px - 0.5) * 5).toFixed(2)}deg`);
        ev.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
        ev.classList.add("is-inclinato");
        attivo = ev;
      },
      { passive: true }
    );
  }

  function preparaPennellate() {
    const tela = $("#piede-tela");
    const piede = $(".piede");
    if (!tela || !piede || menoMovimento()) return;
    const ctx = tela.getContext("2d");
    const COLORI = ["#C8F03C", "#E4457F", "#F2712B", "#2EC4B6", "#F5C431", "#2F4BDB"];
    let k = 1;
    let colore = Math.floor(Math.random() * COLORI.length);
    let ultimo = null;
    let ultimaVolta = 0;
    let svanisce = 0;
    function dimensiona() {
      k = Math.min(2, window.devicePixelRatio || 1);
      tela.width = Math.max(1, Math.round(piede.clientWidth * k));
      tela.height = Math.max(1, Math.round(piede.clientHeight * k));
      ctx.setTransform(k, 0, 0, k, 0, 0);
    }
    dimensiona();
    if ("ResizeObserver" in window) new ResizeObserver(dimensiona).observe(piede);
    // l'invito, sopra il "Torna su"
    const su = $(".piede-su");
    if (su && !$(".piede-invito")) {
      const p = document.createElement("p");
      p.className = "piede-invito";
      p.textContent = conMouse() ? "Passa il mouse qui: lascia una pennellata" : "Tocca qui: lascia una macchia di colore";
      su.before(p);
    }
    const locale = (e) => {
      const r = piede.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    function tratto(a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l = Math.hypot(dx, dy);
      if (l < 0.5) return;
      const v = l / Math.max(8, b.t - a.t); // pixel al millisecondo
      const largo = limita(30 - v * 9, 8, 30);
      const nx = -dy / l;
      const ny = dx / l;
      ctx.lineCap = "round";
      ctx.strokeStyle = COLORI[colore];
      for (let i = 0; i < 9; i++) {
        const o = (i / 8 - 0.5) * largo + (Math.random() - 0.5) * 2;
        ctx.globalAlpha = 0.35 + Math.random() * 0.5;
        ctx.lineWidth = 1.2 + Math.random() * 3.2;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * o, a.y + ny * o);
        ctx.lineTo(b.x + nx * o, b.y + ny * o);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      segna();
    }
    function macchia(p) {
      ctx.fillStyle = COLORI[colore];
      for (let i = 0; i < 26; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = Math.pow(Math.random(), 1.6) * 38;
        ctx.globalAlpha = 0.3 + Math.random() * 0.6;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 2 + Math.random() * (i < 6 ? 16 : 6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      colore = (colore + 1) % COLORI.length;
      segna();
    }
    // il colore svanisce piano, e il ciclo si ferma quando la tela è pulita
    function segna() {
      ultimaVolta = performance.now();
      if (!svanisce) svanisce = requestAnimationFrame(sbiadisci);
    }
    let conta = 0;
    function sbiadisci(ora) {
      svanisce = 0;
      if (++conta % 3 === 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.045)";
        ctx.fillRect(0, 0, tela.width, tela.height);
        ctx.restore();
      }
      if (ora - ultimaVolta < 9000) svanisce = requestAnimationFrame(sbiadisci);
      else ctx.clearRect(0, 0, tela.width, tela.height);
    }
    piede.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        const p = locale(e);
        if (ultimo && p.t - ultimo.t < 120) tratto(ultimo, p);
        ultimo = p;
      },
      { passive: true }
    );
    piede.addEventListener("pointerleave", () => {
      ultimo = null;
      colore = (colore + 1) % COLORI.length;
    });
    piede.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse" || e.target.closest("a, button")) return;
        macchia(locale(e));
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------
     6e. L'ingresso nella galleria (alla prima visita)
     Al buio si disegna il logo MDC Art Studio: l'arco, la lampada, le
     lettere. Poi l'arco diventa una porta: le ante si aprono, la luce
     esce e si entra. Dura circa 4 secondi; un clic, un tocco, la rotella
     o un tasto lo saltano. Lo decide lo script in cima a index.html
     (classe con-ingresso): una volta per visita, mai se l'indirizzo porta
     già a una sala (#eventi…) o con "riduci movimento".
     ------------------------------------------------------------------ */
  function preparaIngressoGalleria() {
    const radice = document.documentElement;
    const el = $("#ingresso-galleria");
    if (!el) return;
    if (!radice.classList.contains("con-ingresso")) {
      el.remove();
      return;
    }
    try {
      sessionStorage.setItem("ingresso-visto", "1");
    } catch (e) {
      /* niente: tornerà alla prossima visita */
    }
    let dentro = false;
    let finito = false;
    const entra = () => {
      if (dentro) return;
      dentro = true;
      document.dispatchEvent(new CustomEvent("ingresso:dentro"));
    };
    const chiudi = () => {
      if (finito) return;
      finito = true;
      entra();
      radice.classList.remove("con-ingresso");
      el.remove();
      eventi.forEach((ev) => window.removeEventListener(ev, salta));
    };
    function salta() {
      if (finito || el.classList.contains("ig-salta")) return;
      el.classList.add("ig-salta");
      entra();
      setTimeout(chiudi, 480);
    }
    const invito = $(".ig-invito", el);
    if (invito) invito.textContent = conMouse() ? "Clicca per entrare" : "Tocca per entrare";
    const eventi = ["pointerdown", "wheel", "keydown", "touchmove"];
    eventi.forEach((ev) => window.addEventListener(ev, salta, { passive: true }));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.add("ig-via");
        setTimeout(entra, 3350);
        setTimeout(chiudi, 4350);
      })
    );
  }

  /* ------------------------------------------------------------------
     6f. Il passaggio da una sala all'altra
     Quando scegli una sala dal menu (o da un link della pagina) si entra
     nella sala nuova, e ogni sala ha la sua entrata:
       Ingresso    due porte di legno che si chiudono e si riaprono
       Galleria    un varco: il buio si stringe e la porta si allarga
       Opere       il sipario di velluto si chiude e si apre
       Processo    il proiettore si accende e lo schermo si allarga
       Eventi      la serranda scende, l'insegna al neon sfarfalla, risale
       Su misura   la lampada dell'atelier oscilla e la luce si allarga
       Contatti    le porte scorrevoli dell'uscita, con l'insegna verde
     Mentre lo schermo è coperto compare il cartello con il nome della
     sala, e sotto la pagina si sposta. js/script.js lo usa al posto delle
     vecchie pennellate (window.Passaggio).
     ------------------------------------------------------------------ */
  const ENTRATE = {
    inizio: "porte",
    mostra: "varco",
    opere: "tende",
    processo: "proiettore",
    eventi: "neon",
    "su-misura": "lampada",
    contatti: "scorrevoli",
  };
  const Passaggio = (() => {
    let el = null;
    let occupato = false;
    const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
    const fatto = (animazioni) => Promise.all(animazioni.filter(Boolean).map((a) => a.finished.catch(() => {})));

    function prepara() {
      el = document.createElement("div");
      el.className = "passaggio";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML =
        '<div class="pa-fondo"></div><div class="pa-fascio"></div>' +
        '<div class="pa-anta pa-anta--sx"><span class="pa-maniglia"></span></div><div class="pa-anta pa-anta--dx"><span class="pa-maniglia"></span></div>' +
        '<div class="pa-serranda"></div>' +
        '<p class="pa-cartello"><span class="pa-n"></span><span class="pa-nome"></span><span class="pa-insegna"></span></p>';
      document.body.append(el);
    }

    // il buio con un buco (rettangolo o cerchio) in mezzo, per clip-path
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const cornice = () => `0px 0px, ${W()}px 0px, ${W()}px ${H()}px, 0px ${H()}px, 0px 0px`;
    function buco(w, h, cx = W() / 2, cy = H() / 2) {
      const x1 = cx - w / 2;
      const x2 = cx + w / 2;
      const y1 = cy - h / 2;
      const y2 = cy + h / 2;
      return `polygon(evenodd, ${cornice()}, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    }
    function cerchio(r, cx = W() / 2, cy = H() / 2) {
      const p = [];
      for (let i = 0; i <= 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        p.push(`${(cx + Math.cos(a) * r).toFixed(1)}px ${(cy + Math.sin(a) * r).toFixed(1)}px`);
      }
      return `polygon(evenodd, ${cornice()}, ${p.join(", ")})`;
    }
    const tutto = () => buco(W() * 1.3, H() * 1.3);
    const niente = (cx, cy) => buco(0, 0, cx, cy);
    const diagonale = () => Math.hypot(W(), H());

    function cartello(id) {
      const voce = $(`.guida-voce .guida-link[href="#${id}"]`);
      const n = voce ? $(".guida-n", voce).textContent : "";
      let nome = voce ? $(".guida-nome", voce).textContent : "";
      if (id === "mostra") nome = "La galleria";
      if (id === "contatti") nome = "Contatti";
      $(".pa-n", el).textContent = n ? `Sala ${n}` : "";
      $(".pa-nome", el).textContent = nome;
      $(".pa-insegna", el).textContent = id === "contatti" ? "Uscita" : id === "eventi" ? "Stasera in sala" : "";
    }

    const C = { duration: 520, easing: "cubic-bezier(0.7, 0, 0.3, 1)", fill: "forwards" };
    const A = { duration: 720, easing: "cubic-bezier(0.6, 0, 0.2, 1)", fill: "forwards" };
    const parte = (sel) => $(sel, el);
    const cartelloDentro = (ritardo = 260) =>
      parte(".pa-cartello").animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: ritardo, easing: "ease-out", fill: "forwards" });
    const cartelloFuori = () => parte(".pa-cartello").animate([{ opacity: 1 }, { opacity: 0, transform: "scale(1.06)" }], { duration: 260, easing: "ease-in", fill: "forwards" });

    // ogni entrata: chiude (copre lo schermo) e apre (scopre la sala nuova)
    const MODI = {
      porte: {
        chiudi: () => [
          parte(".pa-anta--sx").animate([{ transform: "perspective(1600px) rotateY(84deg)" }, { transform: "perspective(1600px) rotateY(0deg)" }], C),
          parte(".pa-anta--dx").animate([{ transform: "perspective(1600px) rotateY(-84deg)" }, { transform: "perspective(1600px) rotateY(0deg)" }], C),
        ],
        apri: () => [
          parte(".pa-anta--sx").animate([{ transform: "perspective(1600px) rotateY(0deg)" }, { transform: "perspective(1600px) rotateY(86deg)", opacity: 0.4 }], A),
          parte(".pa-anta--dx").animate([{ transform: "perspective(1600px) rotateY(0deg)" }, { transform: "perspective(1600px) rotateY(-86deg)", opacity: 0.4 }], A),
          parte(".pa-fascio").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: "ease-out", fill: "forwards" }),
        ],
      },
      tende: {
        chiudi: () => [
          parte(".pa-anta--sx").animate([{ transform: "translateX(-100%) scaleX(0.4)" }, { transform: "translateX(0) scaleX(1)" }], { ...C, duration: 600, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" }),
          parte(".pa-anta--dx").animate([{ transform: "translateX(100%) scaleX(0.4)" }, { transform: "translateX(0) scaleX(1)" }], { ...C, duration: 600, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" }),
        ],
        apri: () => [
          parte(".pa-anta--sx").animate([{ transform: "translateX(0) scaleX(1) skewY(0deg)" }, { transform: "translateX(-6%) scaleX(0.16) skewY(-2deg)" }], { ...A, duration: 820 }),
          parte(".pa-anta--dx").animate([{ transform: "translateX(0) scaleX(1) skewY(0deg)" }, { transform: "translateX(6%) scaleX(0.16) skewY(2deg)" }], { ...A, duration: 820 }),
        ],
        poi: () => [
          parte(".pa-anta--sx").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }),
          parte(".pa-anta--dx").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }),
        ],
      },
      scorrevoli: {
        chiudi: () => [
          parte(".pa-anta--sx").animate([{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }], { ...C, duration: 480, easing: "cubic-bezier(0.5, 0, 0.2, 1)" }),
          parte(".pa-anta--dx").animate([{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], { ...C, duration: 480, easing: "cubic-bezier(0.5, 0, 0.2, 1)" }),
        ],
        apri: () => [
          parte(".pa-anta--sx").animate([{ transform: "translateX(0)" }, { transform: "translateX(-101%)" }], { ...A, duration: 620, easing: "cubic-bezier(0.6, 0, 0.3, 1)" }),
          parte(".pa-anta--dx").animate([{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], { ...A, duration: 620, easing: "cubic-bezier(0.6, 0, 0.3, 1)" }),
        ],
      },
      varco: {
        chiudi: () => [parte(".pa-fondo").animate([{ clipPath: tutto() }, { clipPath: niente(W() / 2, H() * 0.55) }], { ...C, duration: 560 })],
        apri: () => {
          const w = Math.min(W() * 0.18, 150);
          return [
            parte(".pa-fondo").animate(
              [
                { clipPath: niente(W() / 2, H() * 0.55), offset: 0 },
                { clipPath: buco(w, w * 1.75, W() / 2, H() * 0.55), offset: 0.35 },
                { clipPath: buco(W() * 1.6, H() * 2.2, W() / 2, H() * 0.55), offset: 1 },
              ],
              { ...A, duration: 900, easing: "cubic-bezier(0.55, 0, 0.25, 1)" }
            ),
            parte(".pa-fascio").animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 900, fill: "forwards" }),
          ];
        },
      },
      proiettore: {
        chiudi: () => [
          parte(".pa-fondo").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-in", fill: "forwards" }),
          parte(".pa-fascio").animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 0.8, offset: 0.5 }, { opacity: 0.1, offset: 0.6 }, { opacity: 1, offset: 0.75 }, { opacity: 0.5, offset: 0.82 }, { opacity: 1 }], { duration: 700, fill: "forwards" }),
        ],
        apri: () => {
          const w = Math.min(W() * 0.5, 360);
          return [
            parte(".pa-fondo").animate(
              [
                { clipPath: niente(W() / 2, H() * 0.5), offset: 0 },
                { clipPath: buco(w, (w * 9) / 16, W() / 2, H() * 0.5), offset: 0.3 },
                { clipPath: buco(W() * 1.3, H() * 1.3, W() / 2, H() * 0.5), offset: 1 },
              ],
              { ...A, duration: 820 }
            ),
            parte(".pa-fascio").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }),
          ];
        },
      },
      neon: {
        chiudi: () => [
          parte(".pa-serranda").animate(
            [{ transform: "translateY(-102%)" }, { transform: "translateY(0)", offset: 0.82 }, { transform: "translateY(-2.5%)", offset: 0.91 }, { transform: "translateY(0)" }],
            { duration: 620, easing: "cubic-bezier(0.55, 0, 0.6, 1)", fill: "forwards" }
          ),
        ],
        insegna: () =>
          parte(".pa-cartello").animate(
            [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.15, offset: 0.2 }, { opacity: 1, offset: 0.32 }, { opacity: 0.4, offset: 0.4 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }],
            { duration: 480, fill: "forwards" }
          ),
        apri: () => [parte(".pa-serranda").animate([{ transform: "translateY(0)" }, { transform: "translateY(-102%)" }], { ...A, duration: 760, easing: "cubic-bezier(0.6, 0, 0.3, 1)" })],
      },
      lampada: {
        chiudi: () => [
          parte(".pa-fondo").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease-in", fill: "forwards" }),
          parte(".pa-fascio").animate(
            [{ opacity: 0, transform: "rotate(-14deg)" }, { opacity: 1, transform: "rotate(9deg)", offset: 0.55 }, { opacity: 1, transform: "rotate(-4deg)", offset: 0.8 }, { opacity: 1, transform: "rotate(0deg)" }],
            { duration: 900, easing: "ease-in-out", fill: "forwards" }
          ),
        ],
        apri: () => {
          const cy = H() * 0.62;
          return [
            parte(".pa-fondo").animate([{ clipPath: cerchio(0, W() / 2, cy) }, { clipPath: cerchio(60, W() / 2, cy), offset: 0.25 }, { clipPath: cerchio(diagonale(), W() / 2, cy) }], { ...A, duration: 860 }),
            parte(".pa-fascio").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }),
          ];
        },
      },
    };

    async function transizione(alCentro, id) {
      if (occupato) return;
      const modo = MODI[ENTRATE[id] || "varco"];
      if (menoMovimento() || !document.body.animate) {
        alCentro();
        return;
      }
      occupato = true;
      let spostata = false;
      const sposta = () => {
        if (spostata) return;
        spostata = true;
        alCentro();
      };
      try {
        if (!el) prepara();
        el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        el.className = `passaggio pa--${ENTRATE[id] || "varco"} is-attivo`;
        // le entrate con il buco partono da "tutto aperto"
        if (modo === MODI.varco) parte(".pa-fondo").style.clipPath = tutto();
        cartello(id);
        // nel varco il cartello arriva quando il buio si è quasi chiuso
        const insegna = modo.insegna ? modo.insegna : () => cartelloDentro(ENTRATE[id] === "varco" ? 400 : 260);
        await fatto(modo.chiudi().concat([ENTRATE[id] === "neon" ? null : insegna()]));
        if (ENTRATE[id] === "neon") await fatto([insegna()]);
        sposta();
        await attendi(ENTRATE[id] === "proiettore" || ENTRATE[id] === "lampada" ? 260 : 160);
        const fuori = cartelloFuori();
        await fatto(modo.apri().concat([fuori]));
        if (modo.poi) await fatto(modo.poi());
      } catch (e) {
        sposta();
      } finally {
        if (el) {
          el.classList.remove("is-attivo");
          el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
          parte(".pa-fondo").style.clipPath = "";
        }
        occupato = false;
      }
    }
    return { transizione };
  })();
  window.Passaggio = Passaggio;

  /* ------------------------------------------------------------------
     7. Avvio
     ------------------------------------------------------------------ */
  function prepara() {
    document.documentElement.classList.add("galleria-notturna");
    preparaIngressoGalleria();
    preparaInterruttore();
    preparaSale();
    preparaGuida();
    preparaLanterna();
    preparaPolvere();
    preparaTitoli();
    preparaOmbre();
    preparaOscillazioni();
    preparaMagneti();
    preparaBiglietti();
    preparaPennellate();
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
