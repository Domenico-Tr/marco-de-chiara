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
     Arrivando alla Sala 01 c'è una porta chiusa: si tocca e si apre.
     Dietro c'è un bivio con tre corridoi: Quadri, Stampe, Sculture.
     Scegliendone uno si cammina scorrendo la pagina: le opere sono
     appese a zig-zag (le sculture stanno sui piedistalli e si possono
     girare trascinandole), ognuna con il suo faretto. Col mouse ci si
     guarda intorno; le opere lontane restano nell'ombra e si accendono
     avvicinandosi. In fondo al corridoio si passa al successivo o si
     torna al bivio. Con "riduci movimento" i corridoi diventano file di
     opere da sfogliare.
     Sculture: se in img/scontornate/ c'è la foto scontornata (stesso nome
     della foto, in .webp o .png) la scultura è solida e si gira; se manca,
     sta in una teca di vetro. Se nel pannello c'è un modello 3D (.glb),
     toccandola si apre il modello da girare a 360°.
     ------------------------------------------------------------------ */
  // chiude la porta della galleria (la usa anche il passaggio verso la sala 01)
  let chiudiGalleria = null;
  const CORRIDOI = [
    { id: "quadri", nome: "Quadri", nota: "Il corridoio dei dipinti" },
    { id: "stampe", nome: "Stampe", nota: "Incisioni e grafica" },
    { id: "sculture", nome: "Sculture", nota: "Sui piedistalli, da girare" },
  ];
  function operePer(cat, opere) {
    const tutte = opere.filter((o) => o.categoria === cat && (o.immagine || cat === "sculture"));
    return tutte.filter((o) => o.inEvidenza).concat(tutte.filter((o) => !o.inEvidenza)).slice(0, 20);
  }
  // la foto scontornata di una scultura (si prova .webp, poi .png)
  const SCONTORNATE = new Map();
  function scontornata(o) {
    if (SCONTORNATE.has(o.immagine)) return SCONTORNATE.get(o.immagine);
    const nome = String(o.immagine || "").split("/").pop().replace(/\.[^.]+$/, "");
    const prove = [o.scontornata, nome && `img/scontornate/${nome}.webp`, nome && `img/scontornate/${nome}.png`]
      .filter(Boolean)
      .map((p) => String(p).trim().replace(/^\/+/, ""));
    const promessa = new Promise((risolvi) => {
      const prova = (i) => {
        if (i >= prove.length) return risolvi(null);
        const im = new Image();
        im.onload = () => risolvi(prove[i]);
        im.onerror = () => prova(i + 1);
        im.src = prove[i];
      };
      prova(0);
    });
    SCONTORNATE.set(o.immagine, promessa);
    return promessa;
  }

  // la porta della galleria: il portale in pietra con la lunetta di vetro,
  // le applique, il cordone di velluto e due battenti di legno (in HTML,
  // così si aprono davvero in 3D sui cardini)
  const PORTA_ANTA = (lato) => `<svg viewBox="0 0 90 232" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pl-${lato}" x1="0" x2="1"><stop offset="0" stop-color="#2A2017"/><stop offset="0.55" stop-color="#3B2D20"/><stop offset="1" stop-color="#4A3826"/></linearGradient>
        <linearGradient id="pc-${lato}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FFE9C2" stop-opacity="0.9"/><stop offset="1" stop-color="#E7A35A" stop-opacity="0.75"/></linearGradient>
        <linearGradient id="po-${lato}" x1="0" x2="1"><stop offset="0" stop-color="#7A5A2C"/><stop offset="0.5" stop-color="#F3DDA8"/><stop offset="1" stop-color="#7A5A2C"/></linearGradient>
      </defs>
      <rect width="90" height="232" fill="url(#pl-${lato})"/>
      <path d="M9 0v232M23 0c1 60-2 120 0 232M41 0c-2 80 2 150 0 232M58 0c1 50-1 140 1 232M74 0v232" stroke="#000" stroke-opacity="0.16" stroke-width="0.6" fill="none"/>
      <rect x="11" y="12" width="68" height="74" fill="#1A130D"/>
      <rect x="15" y="16" width="60" height="66" fill="url(#pc-${lato})" class="porta-vetrino"/>
      <path d="M45 16v66M15 49h60" stroke="#2A2017" stroke-width="3"/>
      <path d="M17 18l22 0-22 30z" fill="#FFF" opacity="0.12"/>
      <path d="M11 98h68v116H11z" fill="#1E1710"/>
      <path d="M11 98h68l-6 6H17v104l-6 6z" fill="#FFE6BE" opacity="0.08"/>
      <path d="M79 98v116H11l6-6h56V104z" fill="#000" opacity="0.38"/>
      <rect x="17" y="104" width="56" height="104" fill="url(#pl-${lato})"/>
      <rect x="25" y="114" width="40" height="84" fill="none" stroke="#000" stroke-opacity="0.3"/>
      <rect x="82" y="96" width="4" height="52" rx="2" fill="url(#po-${lato})"/>
      <rect x="80" y="100" width="6" height="3" fill="#6B4E25"/><rect x="80" y="141" width="6" height="3" fill="#6B4E25"/>
      <rect x="80.5" y="156" width="7" height="15" rx="3.5" fill="url(#po-${lato})"/>
      <path class="porta-serratura" d="M84 160.5a1.6 1.6 0 1 1 0 3.2l0.9 4h-1.8z" fill="#FFD9A0"/>
      <rect x="0" y="220" width="90" height="12" fill="url(#po-${lato})" opacity="0.55"/>
      <rect x="88.6" y="0" width="1.4" height="232" fill="#000" opacity="0.5"/>
    </svg>`;
  const PORTA_HTML = `<svg class="porta-svg porta-svg--fondo" viewBox="0 0 400 460" aria-hidden="true">
      <defs>
        <radialGradient id="pt-dentro" cx="50%" cy="62%" r="70%"><stop offset="0" stop-color="#FFFBF0"/><stop offset="0.45" stop-color="#FFE0AA"/><stop offset="1" stop-color="#C98642"/></radialGradient>
        <radialGradient id="pt-vetro" cx="200" cy="180" r="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF1CF"/><stop offset="0.55" stop-color="#F5BE6E"/><stop offset="1" stop-color="#9C6430"/></radialGradient>
        <linearGradient id="pt-pietra" x1="0" y1="0" x2="0" y2="1"><stop class="pt-pietra-a" offset="0" stop-color="#5A5045"/><stop class="pt-pietra-b" offset="1" stop-color="#2E2822"/></linearGradient>
        <radialGradient id="pt-applique"><stop offset="0" stop-color="#FFD9A0" stop-opacity="0.55"/><stop offset="0.45" stop-color="#FFC77A" stop-opacity="0.16"/><stop offset="1" stop-color="#FFC77A" stop-opacity="0"/></radialGradient>
        <linearGradient id="pt-spiraglio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD9A0" stop-opacity="0.55"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></linearGradient>
        <linearGradient id="pt-ottone" x1="0" x2="1"><stop offset="0" stop-color="#7A5A2C"/><stop offset="0.5" stop-color="#F3DDA8"/><stop offset="1" stop-color="#7A5A2C"/></linearGradient>
        <linearGradient id="pt-velluto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B0262F"/><stop offset="1" stop-color="#5A0C14"/></linearGradient>
      </defs>
      <circle class="porta-alone" cx="52" cy="206" r="96" fill="url(#pt-applique)"/>
      <circle class="porta-alone" cx="348" cy="206" r="96" fill="url(#pt-applique)"/>
      <path class="porta-spiraglio" d="M110 416H290L352 460H48Z" fill="url(#pt-spiraglio)"/>
      <g class="porta-dentro">
        <rect x="110" y="180" width="180" height="240" fill="url(#pt-dentro)"/>
        <path d="M110 416L176 330H224L290 416Z" fill="#7A4E26" opacity="0.28"/>
        <path d="M176 330V262H224V330" fill="none" stroke="#9C6A38" stroke-opacity="0.45"/>
        <rect x="190" y="282" width="20" height="26" fill="none" stroke="#7A4E26" stroke-opacity="0.6" stroke-width="2"/>
        <path d="M128 300l26 6v34l-26 10zM272 300l-26 6v34l26 10z" fill="#7A4E26" opacity="0.32"/>
      </g>
      <g class="porta-lunetta">
        <path d="M110 180A90 90 0 0 1 290 180Z" fill="url(#pt-vetro)"/>
        <path d="M200 180L110 180M200 180L122 135M200 180L155 102M200 180L200 90M200 180L245 102M200 180L278 135M200 180L290 180" stroke="#2A2017" stroke-width="3"/>
        <path d="M166 180A34 34 0 0 1 234 180Z" fill="#2A2017"/>
        <path d="M174 180A26 26 0 0 1 226 180" fill="none" stroke="url(#pt-ottone)" stroke-width="1.5"/>
        <path d="M110 180A90 90 0 0 1 290 180" fill="none" stroke="#2A2017" stroke-width="5"/>
      </g>
      <rect x="106" y="176" width="188" height="8" fill="#2A2017"/>
      <rect x="106" y="176" width="188" height="1.5" fill="#FFE6BE" opacity="0.2"/>
      <rect class="porta-sotto" x="112" y="415" width="176" height="3" rx="1.5" fill="#FFD9A0"/>
      <path class="porta-portale" d="M84 420V180A116 116 0 0 1 316 180V420H290V180A90 90 0 0 0 110 180V420Z" fill="url(#pt-pietra)"/>
      <path d="M200 180m-90 0a90 90 0 0 1 180 0M200 180m-116 0a116 116 0 0 1 232 0" fill="none" stroke="#FFF1DA" stroke-opacity="0.22"/>
      <path d="M90.4 180H116M93.9 150l24.7 6.6M104.3 122l22.5 13M120 98l18.4 18.4M142 82.4l13 22.5M170 72.1l6.7 24.8M230 72.1l-6.7 24.8M258 82.4l-13 22.5M280 98l-18.4 18.4M295.7 122l-22.5 13M306.1 150l-24.7 6.6M309.6 180H284" stroke="#000" stroke-opacity="0.35"/>
      <path d="M185 60H215L209 94H191Z" fill="#6E6255"/>
      <path d="M185 60H215L214 66H186Z" fill="#FFF1DA" opacity="0.25"/>
      <text class="porta-chiave" x="200" y="82" text-anchor="middle">MDC</text>
      <rect x="78" y="170" width="44" height="11" fill="#6E6255"/><rect x="278" y="170" width="44" height="11" fill="#6E6255"/>
      <rect x="78" y="394" width="40" height="26" fill="#3A332B"/><rect x="282" y="394" width="40" height="26" fill="#3A332B"/>
      <path d="M78 394h40M282 394h40" stroke="#FFF1DA" stroke-opacity="0.2"/>
      <circle class="porta-alone porta-alone--forte" cx="52" cy="206" r="60" fill="url(#pt-applique)"/>
      <circle class="porta-alone porta-alone--forte" cx="348" cy="206" r="60" fill="url(#pt-applique)"/>
      <path d="M0 420H400" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.4"/>
      <g class="porta-applique">
        <path d="M48 196h8v22h-8zM344 196h8v22h-8z" fill="url(#pt-ottone)"/>
        <path d="M52 214v-14q0-6 9-6h3M348 214v-14q0-6-9-6h-3" fill="none" stroke="url(#pt-ottone)" stroke-width="2"/>
        <path d="M58 194h12l-2 6h-8zM330 194h12l-2 6h-8z" fill="url(#pt-ottone)"/>
        <ellipse class="porta-fiamma" cx="64" cy="186" rx="4" ry="8" fill="#FFF3D6"/>
        <ellipse class="porta-fiamma" cx="336" cy="186" rx="4" ry="8" fill="#FFF3D6"/>
      </g>
    </svg>
    <span class="porta-battente porta-battente--sx" aria-hidden="true">${PORTA_ANTA("sx")}</span>
    <span class="porta-battente porta-battente--dx" aria-hidden="true">${PORTA_ANTA("dx")}</span>
    <span class="porta-fessura" aria-hidden="true"></span>
    <svg class="porta-svg porta-svg--fronte" viewBox="0 0 400 460" aria-hidden="true">
      <g class="porta-colonnine">
        <ellipse cx="62" cy="446" rx="15" ry="4" fill="#000" opacity="0.45"/>
        <ellipse cx="338" cy="446" rx="15" ry="4" fill="#000" opacity="0.45"/>
        <path d="M50 446q12-6 24 0zM326 446q12-6 24 0z" fill="url(#pt-ottone)"/>
        <rect x="59.5" y="364" width="5" height="80" fill="url(#pt-ottone)"/>
        <rect x="335.5" y="364" width="5" height="80" fill="url(#pt-ottone)"/>
        <circle cx="62" cy="361" r="6.5" fill="url(#pt-ottone)"/>
        <circle cx="338" cy="361" r="6.5" fill="url(#pt-ottone)"/>
      </g>
      <g class="porta-cordone porta-cordone--sx">
        <path d="M64 368Q132 400 200 400" fill="none" stroke="url(#pt-velluto)" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M70 368Q132 396 196 397" fill="none" stroke="#FF9AA0" stroke-opacity="0.35" stroke-width="1.2"/>
      </g>
      <g class="porta-cordone porta-cordone--dx">
        <path d="M200 400Q268 400 336 368" fill="none" stroke="url(#pt-velluto)" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M204 397Q268 396 330 368" fill="none" stroke="#FF9AA0" stroke-opacity="0.35" stroke-width="1.2"/>
        <circle cx="200" cy="400" r="5" fill="none" stroke="url(#pt-ottone)" stroke-width="2.2"/>
      </g>
    </svg>`;

  function costruisciGalleria() {
    const V = window.Vetrina;
    const mondo = $("#galleria-mondo");
    const pista = $("#mostra-pista");
    const palco = $("#galleria-palco");
    if (!V || !mondo || !pista || !palco) return;
    const tutte = V.opere || [];
    const corridoi = CORRIDOI.map((c) => ({ ...c, opere: operePer(c.id, tutte) })).filter((c) => c.opere.length);
    if (!corridoi.length) {
      $("#mostra").hidden = true;
      return;
    }
    mondo.replaceChildren();
    // la sala (pavimento, pareti, soffitto, luci) è disegnata su una tela
    // grande quanto lo schermo, con la stessa prospettiva delle opere
    let tela = $(".galleria-sala", palco);
    if (!tela) {
      tela = document.createElement("canvas");
      tela.className = "galleria-sala";
      tela.setAttribute("aria-hidden", "true");
      palco.prepend(tela);
    }
    const motore = animaGalleria(pista, mondo, tela);

    /* --- la porta e il bivio --- */
    const vista = $(".mostra-vista", pista);
    const guida = $(".mostra-guida");
    const schede = $("#galleria-corridoi");
    const conMouseOra = conMouse();
    const testi = {
      porta: `La porta è chiusa: ${conMouseOra ? "cliccala" : "toccala"} per entrare.`,
      bivio: "Tre corridoi: scegli da che parte andare.",
      corridoio: `Scorri per camminare tra le opere${conMouseOra ? ", muovi il mouse per guardarti intorno" : ""}. Toccane una per vederla da vicino.`,
    };
    const vest = document.createElement("div");
    vest.className = "galleria-vestibolo";
    vest.innerHTML =
      `<div class="porta-scena">` +
      `<button class="porta" type="button" aria-label="Apri la porta della galleria">${PORTA_HTML}` +
      `<span class="porta-targa" aria-hidden="true"><span class="porta-targa-n">Sala 01</span><span class="porta-targa-nome">La galleria</span></span></button>` +
      `<p class="porta-invito" aria-hidden="true">${conMouseOra ? "Clicca la porta per entrare" : "Tocca la porta per entrare"}</p></div>` +
      `<div class="bivio" hidden><p class="bivio-titolo">Da che parte andiamo?</p><div class="bivio-archi">` +
      corridoi
        .map(
          (c, i) =>
            `<button class="bivio-arco" type="button" data-corridoio="${c.id}" style="--i:${i}"><span class="bivio-varco"><span class="bivio-luce" aria-hidden="true"></span></span>` +
            `<span class="bivio-nome">${esc(c.nome)}</span><span class="bivio-conta">${c.opere.length} ${c.opere.length === 1 ? "opera" : "opere"} · ${esc(c.nota)}</span></button>`
        )
        .join("") +
      `</div></div>`;
    palco.after(vest);
    // dentro ogni arco, la prima opera del corridoio
    corridoi.forEach((c) => {
      const varco = $(`.bivio-arco[data-corridoio="${c.id}"] .bivio-varco`, vest);
      const o = c.opere.find((x) => x.immagine);
      if (!o) return;
      if (c.id === "sculture") {
        scontornata(o).then((src) => {
          const im = document.createElement("img");
          im.alt = "";
          im.className = src ? "bivio-scultura" : "media";
          im.src = src || V.miniatura(o.immagine, 300);
          im.onerror = () => (im.src = o.immagine);
          varco.append(im);
        });
      } else {
        const m = V.creaMedia(o, 300, false);
        m.alt = "";
        varco.append(m);
      }
    });
    // le schede dei corridoi, sotto il titolo
    if (schede) {
      schede.innerHTML =
        corridoi.map((c) => `<button type="button" data-corridoio="${c.id}">${esc(c.nome)}</button>`).join("") +
        `<button type="button" data-bivio>Bivio</button>`;
    }

    const radice = document.documentElement;
    const aCapo = () => {
      // si torna all'inizio della sala, senza scivolare
      const y = pista.getBoundingClientRect().top + window.scrollY;
      radice.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.max(0, y - (motore.piatta ? 60 : 0)));
      radice.style.scrollBehavior = "";
    };
    function stato(s, corridoio) {
      pista.dataset.stato = s;
      if (guida) guida.textContent = testi[s];
      if (schede) {
        schede.hidden = s !== "corridoio";
        $$("button", schede).forEach((b) => b.setAttribute("aria-current", String(b.dataset.corridoio === corridoio)));
      }
    }
    stato("porta");

    let attesaBivio = 0;
    let occupato = false;
    function apriPorta() {
      if (vest.classList.contains("porta-aperta")) return;
      // si entra proprio dal vano della porta
      const scena = $(".porta-scena", vest);
      const rp = $(".porta", vest).getBoundingClientRect();
      const rs = scena.getBoundingClientRect();
      scena.style.transformOrigin = `${(rp.left - rs.left + rp.width / 2).toFixed(0)}px ${(rp.top - rs.top + rp.height * 0.66).toFixed(0)}px`;
      vest.classList.add("porta-aperta");
      attesaBivio = setTimeout(
        () => {
          vest.classList.add("mostra-bivio");
          $(".bivio", vest).hidden = false;
          stato("bivio");
          const primo = $(".bivio-arco", vest);
          if (primo) primo.focus({ preventScroll: true });
        },
        menoMovimento() ? 0 : 1700
      );
    }

    // nel corridoio: le opere sono in sala, il vestibolo sparisce
    function inCorridoio(c, dati) {
      motore.carica(dati, { cammina: true });
      pista.classList.add("in-corridoio");
      stato("corridoio", c.id);
    }
    let viaDalBivio = [];
    function lasciaVestibolo() {
      vest.hidden = true;
      vest.classList.remove("verso-corridoio");
      viaDalBivio.forEach((x) => x.cancel());
      viaDalBivio = [];
      $$(".bivio-arco", vest).forEach((a) => a.classList.remove("scelto"));
    }
    function entra(id) {
      const c = corridoi.find((x) => x.id === id);
      if (!c || occupato) return;
      const prossimo = corridoi[(corridoi.indexOf(c) + 1) % corridoi.length];
      const dati = costruisciCorridoio(c, prossimo, corridoi.length > 1, tutte, V);
      const dalBivio = !vest.hidden;
      if (motore.piatta || menoMovimento() || !palco.animate) {
        inCorridoio(c, dati);
        lasciaVestibolo();
        aCapo();
        return;
      }
      occupato = true;
      const fine = () => {
        occupato = false;
      };
      if (!dalBivio) {
        // da un corridoio all'altro: la sala si spegne e se ne accende un'altra
        const buio = palco.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-in", fill: "forwards" });
        buio.finished
          .catch(() => {})
          .then(() => {
            inCorridoio(c, dati);
            aCapo();
            buio.cancel();
            palco.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-out" });
            fine();
          });
        return;
      }
      // dal bivio: dentro l'arco scelto compare il corridoio vero, l'arco si
      // allarga fino a diventare la sala e intanto si cammina in avanti.
      // La sala si allinea in cima allo schermo scivolando, senza scatti.
      const scarto = pista.getBoundingClientRect().top;
      aCapo();
      const scivola = scarto - pista.getBoundingClientRect().top;
      const arco = $(`.bivio-arco[data-corridoio="${id}"]`, vest);
      const archi = $$(".bivio-arco", vest);
      const qui = archi.indexOf(arco);
      const rp = palco.getBoundingClientRect();
      const rv = $(".bivio-varco", arco).getBoundingClientRect();
      const R = (rv.width / 2).toFixed(1);
      const da = `inset(${(rv.top - rp.top).toFixed(1)}px ${(rp.right - rv.right).toFixed(1)}px ${(rp.bottom - rv.bottom).toFixed(1)}px ${(rv.left - rp.left).toFixed(1)}px round ${R}px ${R}px 0px 0px)`;
      const tutto = "inset(0px 0px 0px 0px round 0px 0px 0px 0px)";
      arco.classList.add("scelto");
      vest.classList.add("verso-corridoio");
      // gli altri due archi scivolano via ai lati
      viaDalBivio = archi
        .filter((x) => x !== arco)
        .map((x) =>
          x.animate(
            [
              { opacity: 1, transform: "none" },
              { opacity: 0, transform: `translateX(${archi.indexOf(x) < qui ? -14 : 14}vw) scale(0.94)` },
            ],
            { duration: 700, easing: "cubic-bezier(0.5, 0, 0.3, 1)", fill: "forwards" }
          )
        );
      if (Math.abs(scivola) > 1) {
        vista.animate([{ transform: `translateY(${scivola.toFixed(1)}px)` }, { transform: "translateY(0px)" }], {
          duration: 750,
          easing: "cubic-bezier(0.3, 0, 0.2, 1)",
        });
      }
      inCorridoio(c, dati);
      const varco = palco.animate([{ clipPath: da }, { clipPath: da, offset: 0.28 }, { clipPath: tutto }], {
        duration: 1600,
        easing: "cubic-bezier(0.65, 0, 0.3, 1)",
      });
      varco.finished
        .catch(() => {})
        .then(() => {
          if (pista.dataset.stato === "corridoio") lasciaVestibolo();
          fine();
        });
    }
    function bivio() {
      palco.getAnimations().forEach((a) => a.cancel());
      occupato = false;
      motore.carica({});
      pista.classList.remove("in-corridoio");
      lasciaVestibolo();
      vest.hidden = false;
      vest.classList.add("porta-aperta", "mostra-bivio");
      $(".bivio", vest).hidden = false;
      stato("bivio");
      aCapo();
      const primo = $(".bivio-arco", vest);
      if (primo) primo.focus({ preventScroll: true });
    }
    // la porta si richiude: ogni volta che si torna nella galleria si entra di nuovo
    function chiudi() {
      if (pista.dataset.stato === "porta") return;
      clearTimeout(attesaBivio);
      palco.getAnimations().forEach((a) => a.cancel());
      occupato = false;
      const b0 = pista.getBoundingClientRect().bottom;
      const y0 = window.scrollY;
      radice.style.overflowAnchor = "none";
      vest.classList.add("di-colpo");
      motore.carica({});
      pista.classList.remove("in-corridoio");
      lasciaVestibolo();
      vest.hidden = false;
      vest.classList.remove("porta-aperta", "mostra-bivio");
      $(".bivio", vest).hidden = true;
      $(".porta-scena", vest).style.transformOrigin = "";
      stato("porta");
      // se la galleria è ormai alle spalle, quello che viene dopo resta fermo dov'è
      if (b0 < window.innerHeight * 0.5) {
        // (in coordinate della pagina: accorciandosi, la pagina può aver già spostato lo scorrimento)
        const b1 = pista.getBoundingClientRect().bottom + window.scrollY;
        radice.style.scrollBehavior = "auto";
        window.scrollTo(0, Math.max(0, y0 + (b1 - (b0 + y0))));
        radice.style.scrollBehavior = "";
      }
      void vest.offsetWidth;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          vest.classList.remove("di-colpo");
          radice.style.overflowAnchor = "";
        })
      );
    }
    chiudiGalleria = chiudi;
    if ("IntersectionObserver" in window) {
      // (la fascia in alto, sotto la firma, conta come fuori)
      new IntersectionObserver(
        (v) => {
          if (!v[0].isIntersecting) chiudi();
        },
        { rootMargin: "-90px 0px 0px 0px" }
      ).observe(pista);
    }
    $(".porta", vest).addEventListener("click", apriPorta);
    vest.addEventListener("click", (e) => {
      const a = e.target.closest(".bivio-arco");
      if (a) entra(a.dataset.corridoio);
    });
    const scegli = (e) => {
      const b = e.target.closest("[data-corridoio], [data-bivio]");
      if (!b || !pista.contains(b)) return;
      if (b.hasAttribute("data-bivio")) bivio();
      else if (!vest.contains(b)) entra(b.dataset.corridoio);
    };
    pista.addEventListener("click", scegli);
  }

  // Le opere di un corridoio: pannelli appesi, o sculture sui piedistalli
  function costruisciCorridoio(c, prossimo, altri, tutte, V) {
    const lista = c.opere;
    const pannelli = lista.map((o, i) => (c.id === "sculture" ? creaScultura(o, i, lista, V) : creaPannello(o, i, lista, V)));
    const fine = document.createElement("div");
    fine.className = "galleria-fine";
    const quante = tutte.filter((o) => o.categoria === c.id).length;
    fine.innerHTML =
      `<span class="galleria-fine-luce" aria-hidden="true"></span>` +
      `<p class="galleria-fine-testo"><span>Fine del corridoio</span><em>${esc(c.nome)}</em></p>` +
      `<div class="galleria-fine-azioni">` +
      (altri ? `<button type="button" class="galleria-fine-avanti" data-corridoio="${prossimo.id}">${esc(prossimo.nome)} <span aria-hidden="true">→</span></button>` : "") +
      `<button type="button" class="galleria-fine-bivio" data-bivio>Torna al bivio</button>` +
      `<a class="galleria-fine-tutte" href="#opere" data-categoria="${c.id}">Tutte le ${quante} ${esc(c.nome.toLowerCase())} nel catalogo</a>` +
      `</div>`;
    $("#mostra-totale").textContent = String(lista.length).padStart(2, "0");
    return { pannelli, fine };
  }

  function creaPannello(o, i, lista, V) {
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
    p.append(btn, cartellino(o, i, V));
    return p;
  }

  function cartellino(o, i, V) {
    const c = document.createElement("div");
    c.className = "galleria-cartellino";
    const dettagli = [o.tecnica, o.misure].filter(Boolean).map((x) => esc(String(x).trim())).join(" · ");
    c.innerHTML =
      `<span class="galleria-numero" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>` +
      `<div class="galleria-testi"><p class="galleria-titolo-opera"><em>${esc(String(o.titolo).trim())}</em>${o.anno ? `, ${esc(o.anno)}` : ""}</p>` +
      (dettagli ? `<p class="galleria-dettagli">${dettagli}</p>` : "") +
      `</div><div class="reazioni">${V.visteHTML(o)}${V.bottonePiace(o)}</div>`;
    return c;
  }

  // Una scultura su un piedistallo vero (un parallelepipedo in 3D), con la
  // targhetta sul davanti. La scultura è fatta di strati della foto
  // scontornata, uno dietro l'altro: girandola si vede che ha uno spessore.
  function creaScultura(o, i, lista, V) {
    const p = document.createElement("article");
    p.className = `galleria-pannello galleria-scultura ${i % 2 ? "is-destra" : "is-sinistra"}`;
    p.dataset.tipo = "scultura";
    p.innerHTML =
      '<span class="galleria-fascio" aria-hidden="true"></span>' +
      '<span class="piedistallo" aria-hidden="true"><span class="pd pd--fronte"></span><span class="pd pd--retro"></span><span class="pd pd--sx"></span><span class="pd pd--dx"></span><span class="pd pd--sopra"></span></span>';
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opera-apri galleria-apri scultura-apri";
    btn.setAttribute("aria-label", `${o.modello3d ? "Gira in 3D" : "Guarda"} ${String(o.titolo).trim()}`);
    const giro = document.createElement("span");
    giro.className = "scultura-giro";
    btn.append(giro);
    if (!o.immagine) {
      // la foto non c'è ancora: la scultura è coperta da un telo
      giro.innerHTML = '<span class="scultura-telo"><svg viewBox="0 0 100 130" aria-hidden="true"><path d="M50 4c-9 0-14 9-15 20-1 9-6 14-12 22C14 58 9 80 6 126h88c-3-46-8-68-17-80-6-8-11-13-12-22C64 13 59 4 50 4z" fill="#E9E1D2"/><path d="M50 4c-4 30-10 70-14 122M50 4c5 34 9 74 12 122M35 24c-6 30-14 64-20 102M65 24c6 30 13 64 18 102" stroke="#BFB4A0" stroke-width="1.2" fill="none"/></svg></span><span class="scultura-nota">In allestimento</span>';
    } else {
      scontornata(o).then((src) => {
        if (src) {
          giro.classList.add("is-solida");
          giro.innerHTML = Array.from({ length: 8 }, (_, k) => `<img class="scultura-strato" style="--k:${k}" src="${esc(src)}" alt="" draggable="false">`).join("");
        } else {
          // senza foto scontornata: in una teca di vetro
          giro.classList.add("is-teca");
          const m = V.creaMedia(o, 520, true);
          m.draggable = false;
          giro.append(m);
          const vetro = document.createElement("span");
          vetro.className = "teca-vetro";
          giro.append(vetro);
        }
      });
    }
    // trascinando di lato la scultura gira (la pagina continua a scorrere in verticale)
    let presa = null;
    btn.addEventListener("pointerdown", (e) => {
      presa = { x: e.clientX, base: Number(btn.dataset.giro || 0), mossa: false, id: e.pointerId };
    });
    btn.addEventListener("pointermove", (e) => {
      if (!presa) return;
      const dx = e.clientX - presa.x;
      if (Math.abs(dx) > 6) {
        presa.mossa = true;
        try {
          btn.setPointerCapture(presa.id);
        } catch (err) {
          /* niente */
        }
      }
      if (presa.mossa) {
        btn.dataset.giro = String(limita(presa.base + dx * 0.45, -70, 70));
        p.dispatchEvent(new CustomEvent("scultura:gira", { bubbles: true }));
      }
    });
    const lascia = () => {
      if (presa && presa.mossa) btn._senzaClic = true;
      presa = null;
      setTimeout(() => (btn._senzaClic = false), 50);
    };
    btn.addEventListener("pointerup", lascia);
    btn.addEventListener("pointercancel", lascia);
    btn.addEventListener("click", (e) => {
      if (btn._senzaClic) {
        e.preventDefault();
        return;
      }
      if (o.modello3d) apriModello3d(o);
      else if (o.immagine) V.apriScheda(lista.filter((x) => x.immagine), lista.filter((x) => x.immagine).indexOf(o), btn);
    });
    const cart = cartellino(o, i, V);
    cart.classList.add("scultura-targa");
    if (o.modello3d) cart.insertAdjacentHTML("beforeend", '<span class="scultura-3d">3D</span>');
    p.append(btn, cart);
    return p;
  }

  // Il modello 3D vero (.glb, dal pannello): si gira a 360° con il dito o il mouse
  let vistaModello = null;
  function apriModello3d(o) {
    if (!vistaModello) {
      vistaModello = document.createElement("dialog");
      vistaModello.className = "vista-3d";
      vistaModello.innerHTML =
        '<div class="vista-3d-scena"></div><div class="vista-3d-testa"><p class="vista-3d-titolo"></p><p class="vista-3d-aiuto">Trascina per girarla, avvicina le dita (o la rotella) per ingrandire</p></div>' +
        '<button type="button" class="scheda-chiudi vista-3d-chiudi">Chiudi</button>';
      document.body.append(vistaModello);
      vistaModello.querySelector(".vista-3d-chiudi").addEventListener("click", () => vistaModello.close());
      vistaModello.addEventListener("close", () => (vistaModello.querySelector(".vista-3d-scena").innerHTML = ""));
    }
    const carica = () =>
      new Promise((risolvi) => {
        if (window.customElements && customElements.get("model-viewer")) return risolvi();
        const s = document.createElement("script");
        s.type = "module";
        s.src = "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
        s.onload = risolvi;
        s.onerror = risolvi;
        document.head.append(s);
      });
    vistaModello.querySelector(".vista-3d-titolo").innerHTML = `<em>${esc(String(o.titolo).trim())}</em>${o.anno ? `, ${esc(o.anno)}` : ""}`;
    vistaModello.showModal();
    carica().then(() => {
      const src = String(o.modello3d).trim().replace(/^\/+/, "");
      vistaModello.querySelector(".vista-3d-scena").innerHTML = `<model-viewer src="${esc(src)}" alt="${esc(String(o.titolo).trim())}" camera-controls auto-rotate shadow-intensity="1" exposure="1.1" environment-image="neutral" touch-action="pan-y" style="width:100%;height:100%;background:transparent"></model-viewer>`;
    });
  }

  function animaGalleria(pista, mondo, tela) {
    const palco = $("#galleria-palco");
    const vista = $(".mostra-vista", pista);
    const barra = $("#mostra-barra");
    const conta = $("#mostra-conta");
    const testa = $(".mostra-testa");
    const S = { pannelli: [], fine: null };
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
      if (testa) testa.classList.add("visibile");
      return {
        piatta: true,
        carica({ pannelli, fine } = {}) {
          mondo.replaceChildren();
          S.pannelli = pannelli || [];
          S.pannelli.forEach((el) => {
            mondo.append(el);
            carica(el, true);
          });
          if (fine) mondo.append(fine);
        },
      };
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
      const n = S.pannelli.length;
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
      const camFine = Math.max(1, fineZ - (stretto ? 360 : 720));
      G = { W, H, n, stretto, prospettiva, passo, primo, largo, altezza, pavimentoY, soffittoY, profondita, fineZ, camFine, k: 1 };
      palco.style.perspective = `${prospettiva}px`;
      mondo.style.setProperty("--altezza-opera", `${altezza.toFixed(0)}px`);
      // le misure delle sculture: piedistallo e scultura sopra
      const sh = altezza * 0.72;
      const ph = altezza * (stretto ? 0.5 : 0.62);
      const pw = stretto ? Math.min(altezza * 0.5, W * 0.3) : Math.min(altezza * 0.56, largo * 1.15);
      mondo.style.setProperty("--scultura-h", `${sh.toFixed(0)}px`);
      mondo.style.setProperty("--piedistallo-h", `${ph.toFixed(0)}px`);
      mondo.style.setProperty("--piedistallo-w", `${pw.toFixed(0)}px`);
      mondo.style.setProperty("--spessore", `${Math.max(1.2, sh / 170).toFixed(2)}px`);

      // la tela della sala: un po' meno definita dello schermo (è luce morbida, e costa meno)
      const k = Math.min(1.25, window.devicePixelRatio || 1) * (stretto ? 0.75 : 0.6);
      tela.width = Math.max(1, Math.round(W * k));
      tela.height = Math.max(1, Math.round(H * k));
      G.k = tela.width / W;

      // i pannelli a zig-zag, girati verso il centro della sala; le sculture più al centro
      S.pannelli.forEach((p, i) => {
        const destra = i % 2 === 1;
        const scultura = p.dataset.tipo === "scultura";
        const x = (destra ? 1 : -1) * (scultura ? largo * 0.62 : largo);
        const y = scultura ? pavimentoY - (sh + ph) / 2 : -altezza * 0.08;
        const z = -(primo + i * passo);
        p.dataset.z = String(z);
        p.dataset.x = String(x);
        const giro = scultura ? (destra ? -12 : 12) : destra ? -24 : 24;
        p.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z}px) rotateY(${giro}deg) translate(-50%, -50%)`;
      });
      if (S.fine) {
        S.fine.dataset.z = String(-fineZ);
        S.fine.style.transform = `translate3d(0, ${(altezza * (stretto ? 0.14 : -0.05)).toFixed(1)}px, ${-fineZ}px) translate(-50%, -50%)`;
      }
      // la pista è lunga quanto il cammino (più un respiro all'inizio e alla fine);
      // davanti alla porta e al bivio è alta uno schermo
      G.vistaH = vista.clientHeight || window.innerHeight;
      pista.style.height = n ? `${Math.round(G.vistaH * 1.35 + camFine * 0.72)}px` : "";
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
      S.pannelli.forEach((el) => {
        if (el.style.visibility === "hidden" && Number(el.dataset.z) + cam > 0) return;
        const xi = Number(el.dataset.x) || largo;
        const zi = Number(el.dataset.z);
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
        const xp = xi > 0 ? X : -X;
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

    function fotogramma(ora) {
      ciclo = 0;
      if (!visibile) return;
      if (testa && !testa.classList.contains("visibile") && pista.getBoundingClientRect().top < window.innerHeight * 0.6) testa.classList.add("visibile");
      if (!S.pannelli.length) {
        // davanti alla porta e al bivio il titolo e la guida tornano in vista
        if (testa) testa.classList.remove("in-cammino");
        return;
      }
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
      let girano = false;
      S.pannelli.forEach((el, i) => {
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
        // le sculture vicine girano piano sul piedistallo (e col dito o il mouse)
        if (el.dataset.tipo === "scultura" && passata < 1 && lontano < G.passo * 2.2) {
          const b = el.querySelector(".scultura-apri");
          const g = el.querySelector(".scultura-giro");
          const t = (ora || performance.now()) * 0.00055 + i;
          const deg = Number(b.dataset.giro || 0) + Math.sin(t) * 26;
          if (g) g.style.setProperty("--giro", `${deg.toFixed(2)}deg`);
          girano = true;
        }
      });
      if (S.fine) {
        const relFine = Number(S.fine.dataset.z) + cam;
        S.fine.style.setProperty("--ombra", limita((-relFine - G.passo) / (G.passo * 2.4), 0, 1).toFixed(3));
      }
      disegnaSala(gradiX, gradiY);
      conta.textContent = String(vicina + 1).padStart(2, "0");
      barra.style.transform = `scaleX(${(cam / G.camFine).toFixed(4)})`;
      palco.style.setProperty("--nebbia", (1 - Math.min(1, cam / G.camFine) ** 1.5).toFixed(3));
      if (testa) testa.classList.toggle("in-cammino", cam > G.passo * 0.35);
      // si continua finché il passo o lo sguardo non si sono fermati
      if (girano || Math.abs(camMeta - cam) > 0.5 || Math.abs(mx - guardaX) > 0.002 || Math.abs(my - guardaY) > 0.002) {
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
      if (!el || !el.dataset.z) return;
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
    mondo.addEventListener("scultura:gira", avvia);
    geometria();
    cam = avanzamento() * G.camFine;
    avvia();
    return {
      piatta: false,
      // mette in sala le opere di un corridoio (o nessuna, davanti alla porta e al bivio)
      carica({ pannelli, fine } = {}, { cammina = false } = {}) {
        mondo.replaceChildren();
        S.pannelli = pannelli || [];
        S.fine = fine || null;
        S.pannelli.forEach((el) => mondo.append(el));
        if (S.fine) mondo.append(S.fine);
        geometria();
        // entrando nel corridoio si parte un passo più indietro e si cammina avanti
        cam = cammina ? -G.passo * 0.9 : 0;
        camMeta = 0;
        avvia();
      },
    };
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
    // cliccata una voce col mouse o col dito, la tendina delle opere si chiude
    // (e non resta aperta solo perché il link ha ancora il fuoco)
    const opere = $(".guida-voce--opere", guida);
    guida.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a || e.detail === 0) return;
      a.blur();
      if (opere && opere.contains(a)) opere.classList.add("tendina-chiusa");
    });
    if (opere) opere.addEventListener("mouseleave", () => opere.classList.remove("tendina-chiusa"));
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
    const SEL = ".bottone, .ingresso-entra, .filtro, .guida-link, .evento-calendario, .galleria-fine-azioni > *, .pianta-chiudi";
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

    async function transizione(vaiAlCentro, id) {
      if (occupato) return;
      const alCentro = () => {
        if (id === "mostra" && chiudiGalleria) chiudiGalleria();
        vaiAlCentro();
      };
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
