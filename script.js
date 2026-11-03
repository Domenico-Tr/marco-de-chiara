/* =====================================================================
   Vetrina d'artista — comportamento della pagina
   I contenuti stanno nella cartella "contenuti" (file JSON) e si
   modificano dal pannello di gestione: qui non serve cambiare nulla.
   Indice:
     1. Utilità e lettura dei contenuti
     2. Segnaposto dipinti (per le opere ancora senza foto)
     2b. Pennellate a tutto schermo (transizione tra sezioni)
     3. Menu, filtri e griglia delle opere
     4. Scheda dell'opera a tutto schermo
     5. Eventi
     6. Contatti
     7. Testata e menu su telefono
     7b. Passaggio tra le sezioni con le pennellate
     8. Avvio
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Utilità
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const menoMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const NOMI_CATEGORIE = Object.fromEntries(CATEGORIE.map((c) => [c.id, c.nome]));
  const STATI = { disponibile: "Disponibile", venduta: "Venduta", riservata: "Riservata" };
  const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

  // Contenuti letti dai file JSON all'avvio
  let OPERE = [];
  let EVENTI = [];
  let CONTATTI = {};
  let PROCESSO = [];

  const percorsoLocale = (p) => String(p || "").trim().replace(/^\/+/, "");

  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Il pannello salva "Quadri", il sito usa "quadri": accetta entrambi
  function idCategoria(valore) {
    const t = String(valore || "").trim().toLowerCase();
    const c = CATEGORIE.find((x) => x.id === t || x.nome.toLowerCase() === t);
    if (c) return c.id;
    const ultima = CATEGORIE[CATEGORIE.length - 1];
    return ultima ? ultima.id : "altro";
  }

  function normalizzaOpera(o) {
    const opera = o && typeof o === "object" ? o : {};
    return {
      ...opera,
      id: opera.id || slug(opera.titolo) || "opera",
      titolo: String(opera.titolo || "Senza titolo"),
      categoria: idCategoria(opera.categoria),
      stato: String(opera.stato || "").trim().toLowerCase(),
      // "/img/foto.jpg" e "img/foto.jpg" funzionano entrambi, anche su GitHub Pages
      immagine: String(opera.immagine || "").trim().replace(/^\/+/, ""),
      inEvidenza: opera.inEvidenza === true || opera.inEvidenza === "true",
    };
  }

  function normalizzaEvento(e) {
    return {
      ...e,
      inizio: String(e.inizio).slice(0, 10),
      fine: e.fine ? String(e.fine).slice(0, 10) : "",
    };
  }

  async function caricaContenuti() {
    const leggi = async (percorso) => {
      const risposta = await fetch(percorso, { cache: "no-store" });
      if (!risposta.ok) throw new Error(`${percorso}: errore ${risposta.status}`);
      return risposta.json();
    };
    const [opere, eventi, sito, processo] = await Promise.all([
      leggi("contenuti/opere.json"),
      leggi("contenuti/eventi.json"),
      leggi("contenuti/sito.json"),
      // facoltativo: se il file non c'è ancora la sezione resta vuota
      leggi("contenuti/processo.json").catch(() => []),
    ]);
    PROCESSO = (Array.isArray(processo) ? processo : [])
      .filter((v) => v && v.titolo && (v.video || v.link))
      .map((v) => ({
        ...v,
        video: percorsoLocale(v.video),
        copertina: percorsoLocale(v.copertina),
        link: String(v.link || "").trim(),
        data: v.data ? String(v.data).slice(0, 10) : "",
      }));
    OPERE = (Array.isArray(opere) ? opere : []).filter(Boolean).map(normalizzaOpera);
    EVENTI = (Array.isArray(eventi) ? eventi : [])
      .filter((e) => e && e.titolo && e.inizio)
      .map(normalizzaEvento);
    CONTATTI = sito && typeof sito === "object" ? sito : {};
  }

  function mostraErroreContenuti(errore) {
    console.error("Contenuti non letti:", errore);
    const doppioClic = location.protocol === "file:";
    const motivo = doppioClic
      ? "Hai aperto index.html con un doppio clic: in questo modo il browser non permette di leggere i file della cartella <code>contenuti</code>. Aprilo con Live Server in VS Code (tasto destro su index.html, Open with Live Server) oppure dal sito pubblicato."
      : `Controlla che la cartella <code>contenuti</code> sia stata caricata insieme al sito e che i file JSON non contengano errori. Dettaglio: ${esc(errore && errore.message)}`;
    $("#opere-griglia").innerHTML = `<p class="avviso-contenuti"><strong>Le opere non si possono caricare.</strong> ${motivo}</p>`;
    $("#evidenza").hidden = true;
  }

  /* ------------------------------------------------------------------
     2. Segnaposto dipinti
     Ogni opera senza "immagine" riceve un piccolo dipinto astratto,
     sempre uguale per la stessa opera (il disegno dipende dal suo id).
     ------------------------------------------------------------------ */
  function generatore(seme) {
    let t = seme >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashTesto(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Schiarisce (q > 0) o scurisce (q < 0) un colore esadecimale
  function tinta(hex, q) {
    const n = parseInt(hex.replace("#", ""), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const verso = q > 0 ? 255 : 0;
    const k = Math.abs(q);
    return `rgb(${rgb.map((v) => Math.round(v + (verso - v) * k)).join(",")})`;
  }

  const haFiltro = (() => {
    try {
      const c = document.createElement("canvas").getContext("2d");
      c.filter = "blur(2px)";
      return c.filter === "blur(2px)";
    } catch (e) {
      return false;
    }
  })();

  let grana = null;
  function texturaGrana() {
    if (grana) return grana;
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    const x = c.getContext("2d");
    const img = x.createImageData(192, 192);
    const r = generatore(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + r() * 165;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grana = c;
    return c;
  }

  // Ombra morbida che funziona anche nei browser senza ctx.filter
  function ombra(ctx, traccia, sfocatura, alpha) {
    const off = 20000;
    const m = ctx.getTransform();
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = sfocatura;
    ctx.shadowOffsetX = m.a * off;
    ctx.shadowOffsetY = m.b * off;
    ctx.translate(-off, 0);
    ctx.fillStyle = "#000";
    traccia();
    ctx.restore();
  }

  function rettangoloArrotondato(ctx, x, y, w, h, raggio) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, raggio);
    else ctx.rect(x, y, w, h);
  }

  function pennellate(ctx, r, x, y, w, h, colore, quante, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = colore;
    ctx.lineCap = "round";
    for (let i = 0; i < quante; i++) {
      ctx.globalAlpha = alpha * (0.4 + r());
      ctx.lineWidth = 1 + r() * h * 0.025;
      const yy = y + r() * h;
      const xx = x - w * 0.1 + r() * w * 0.5;
      const lung = w * (0.4 + r() * 0.8);
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.bezierCurveTo(
        xx + lung * 0.33, yy + (r() - 0.5) * h * 0.03,
        xx + lung * 0.66, yy + (r() - 0.5) * h * 0.03,
        xx + lung, yy + (r() - 0.5) * h * 0.04
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function campitura(ctx, r, x, y, w, h, colore, morbido) {
    ctx.save();
    ctx.fillStyle = colore;
    if (haFiltro) ctx.filter = `blur(${morbido * 0.6}px)`;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.12;
    for (let k = 0; k < 10; k++) {
      const j = () => (r() - 0.5) * morbido * 2.4;
      ctx.fillRect(x + j(), y + j(), w + j(), h + j());
    }
    ctx.restore();
  }

  const STILI = {
    // Campi di colore sovrapposti
    campi(ctx, w, h, c, r) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      pennellate(ctx, r, 0, 0, w, h, "#000000", 40, 0.04);
      const campi = c.slice(1);
      const mx = w * 0.09;
      const my = h * 0.07;
      const spazio = h * 0.035;
      const pesi = campi.map(() => 0.6 + r());
      const totale = pesi.reduce((a, b) => a + b, 0);
      const disponibile = h - my * 2 - spazio * (campi.length - 1);
      let y = my;
      campi.forEach((colore, i) => {
        const hh = (disponibile * pesi[i]) / totale;
        campitura(ctx, r, mx, y, w - mx * 2, hh, colore, Math.max(w, h) * 0.01);
        pennellate(ctx, r, mx, y, w - mx * 2, hh, i % 2 ? "#ffffff" : "#000000", 30, 0.05);
        y += hh + spazio;
      });
    },

    // Paesaggio con orizzonte basso
    orizzonte(ctx, w, h, c, r) {
      const cielo = ctx.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(0, c[0]);
      cielo.addColorStop(0.7, c[1]);
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, w, h);
      pennellate(ctx, r, 0, 0, w, h * 0.7, "#ffffff", 50, 0.05);
      const linea = h * (0.64 + r() * 0.08);
      if (c[4]) {
        ctx.save();
        ctx.fillStyle = c[4];
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.arc(w * (0.62 + r() * 0.12), linea - h * 0.13, Math.min(w, h) * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      campitura(ctx, r, -w * 0.05, linea, w * 1.1, h - linea + h * 0.05, c[2], w * 0.006);
      pennellate(ctx, r, 0, linea, w, h - linea, c[3], 70, 0.12);
    },

    // Forme geometriche a colori piatti
    geometrie(ctx, w, h, c, r) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      pennellate(ctx, r, 0, 0, w, h, "#000000", 25, 0.035);
      const m = Math.min(w, h);
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(w * (0.36 + r() * 0.2), h * (0.36 + r() * 0.1), m * (0.24 + r() * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[2];
      ctx.fillRect(w * 0.18, h * (0.56 + r() * 0.06), w * (0.5 + r() * 0.2), h * 0.2);
      ctx.restore();
      ctx.strokeStyle = c[3];
      ctx.lineWidth = m * 0.012;
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.78, m * 0.18, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = m * 0.004;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.88);
      ctx.lineTo(w * 0.9, h * 0.88);
      ctx.stroke();
    },

    // Stampa d'arte: impronta della matrice, linee, tiratura e firma a matita
    trama(ctx, w, h, c, r, seg) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const px = w * 0.13, py = h * 0.1, pw = w - px * 2, ph = h * 0.7;
      ctx.fillStyle = "rgba(0,0,0,0.035)";
      ctx.fillRect(px - w * 0.012, py - w * 0.012, pw + w * 0.024, ph + w * 0.024);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.fillStyle = c[2];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(px + pw * (0.3 + r() * 0.4), py + ph * (0.3 + r() * 0.4), Math.min(pw, ph) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c[1];
      const n = 46 + Math.floor(r() * 20);
      const freq = 2 + r() * 4;
      const amp = ph * (0.008 + r() * 0.012);
      const fase = r() * 6;
      for (let i = 0; i <= n; i++) {
        const y0 = py + (ph * i) / n;
        ctx.lineWidth = Math.max(1, (ph / n) * (0.25 + 0.35 * Math.sin(i * 0.35 + fase) ** 2));
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const x = px + (pw * s) / 60;
          const y = y0 + Math.sin((s / 60) * Math.PI * freq + i * 0.18 + fase) * amp;
          if (s) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "rgba(60,60,60,0.75)";
      ctx.font = `italic ${Math.round(w * 0.03)}px Georgia, serif`;
      ctx.fillText(seg.tiratura || "1/10", px, py + ph + h * 0.065);
      ctx.strokeStyle = "rgba(60,60,60,0.7)";
      ctx.lineWidth = Math.max(1, w * 0.0025);
      const fx = px + pw * 0.7, fy = py + ph + h * 0.058;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.bezierCurveTo(fx + pw * 0.06, fy - h * 0.03, fx + pw * 0.05, fy + h * 0.02, fx + pw * 0.12, fy - h * 0.01);
      ctx.bezierCurveTo(fx + pw * 0.16, fy - h * 0.025, fx + pw * 0.2, fy + h * 0.005, fx + pw * 0.3, fy - h * 0.008);
      ctx.stroke();
    },

    // Scultura su basamento, fotografata in studio
    scultura(ctx, w, h, c, r, seg) {
      const fondo = ctx.createLinearGradient(0, 0, 0, h);
      fondo.addColorStop(0, c[0]);
      fondo.addColorStop(1, c[1]);
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, w, h);
      const alone = ctx.createRadialGradient(w * 0.5, h * 0.15, 0, w * 0.5, h * 0.15, h * 0.7);
      alone.addColorStop(0, "rgba(255,255,255,0.18)");
      alone.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = alone;
      ctx.fillRect(0, 0, w, h);

      const pavimento = h * 0.84;
      const bw = w * 0.38, bx = (w - bw) / 2, bTop = h * 0.6;
      ombra(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(w / 2 + bw * 0.12, pavimento, bw * 0.62, h * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }, w * 0.03, 0.35);
      ctx.fillStyle = c[2];
      ctx.fillRect(bx, bTop, bw, pavimento - bTop);
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(bx + bw * 0.86, bTop, bw * 0.14, pavimento - bTop);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(bx, bTop, bw, Math.max(1, h * 0.004));

      const cx = w / 2, base = bTop, col = c[3];
      const luce = (x, y, rag) => {
        const g = ctx.createRadialGradient(x - rag * 0.35, y - rag * 0.45, rag * 0.05, x, y, rag * 1.15);
        g.addColorStop(0, tinta(col, 0.35));
        g.addColorStop(0.55, col);
        g.addColorStop(1, tinta(col, -0.45));
        return g;
      };
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.03, base + h * 0.004, w * 0.12, h * 0.008, 0, 0, Math.PI * 2);
      ctx.fill();

      const forma = seg.forma || "arco";
      if (forma === "arco") {
        const aw = w * 0.13, ah = h * 0.34, sp = w * 0.05, ry = base - ah + aw;
        ctx.beginPath();
        ctx.moveTo(cx - aw, base);
        ctx.lineTo(cx - aw, ry);
        ctx.arc(cx, ry, aw, Math.PI, 0);
        ctx.lineTo(cx + aw, base);
        ctx.lineTo(cx + aw - sp, base);
        ctx.lineTo(cx + aw - sp, ry);
        ctx.arc(cx, ry, aw - sp, 0, Math.PI, true);
        ctx.lineTo(cx - aw + sp, base);
        ctx.closePath();
        const g = ctx.createLinearGradient(cx - aw, 0, cx + aw, 0);
        g.addColorStop(0, tinta(col, 0.25));
        g.addColorStop(0.45, col);
        g.addColorStop(1, tinta(col, -0.4));
        ctx.fillStyle = g;
        ctx.fill();
      } else if (forma === "pietre") {
        let y = base;
        [[0.15, 0.045], [0.11, 0.042], [0.08, 0.038], [0.05, 0.034]].forEach(([rx, ryy]) => {
          const ex = w * rx, ey = h * ryy, dx = (r() - 0.5) * w * 0.035;
          y -= ey * 0.95;
          ctx.fillStyle = luce(cx + dx, y, Math.max(ex, ey));
          ctx.beginPath();
          ctx.ellipse(cx + dx, y, ex, ey, (r() - 0.5) * 0.12, 0, Math.PI * 2);
          ctx.fill();
          y -= ey * 0.8;
        });
      } else {
        const R = Math.min(w * 0.17, h * 0.2);
        const cy = base - h * 0.022 - R;
        if (c[4]) {
          ctx.fillStyle = c[4];
          ctx.fillRect(cx - R * 0.55, base - h * 0.022, R * 1.1, h * 0.022);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.arc(cx + R * 0.06, cy - R * 0.04, R * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = luce(cx, cy, R);
        ctx.fill("evenodd");
      }
    },

    // Foulard di seta appoggiato
    foulard(ctx, w, h, c) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const lato = Math.min(w, h) * 0.66;
      const b = lato * 0.07;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.12);
      ombra(ctx, () => ctx.fillRect(-lato / 2 + lato * 0.02, -lato / 2 + lato * 0.035, lato, lato), lato * 0.05, 0.28);
      ctx.fillStyle = c[1];
      ctx.fillRect(-lato / 2, -lato / 2, lato, lato);
      ctx.strokeStyle = c[2];
      ctx.lineWidth = lato * 0.035;
      ctx.strokeRect(-lato / 2 + b, -lato / 2 + b, lato - 2 * b, lato - 2 * b);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-lato / 2 + b * 1.6, -lato / 2 + b * 1.6, lato - 3.2 * b, lato - 3.2 * b);
      ctx.clip();
      ctx.strokeStyle = c[3];
      ctx.lineWidth = lato * 0.008;
      for (let i = 0; i < 14; i++) {
        const y = -lato / 2 + b * 1.6 + (i * (lato - 3.2 * b)) / 13;
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
          const x = -lato / 2 + (s * lato) / 40;
          const yy = y + Math.sin(s * 0.5 + i * 0.7) * lato * 0.012;
          if (s) ctx.lineTo(x, yy);
          else ctx.moveTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(lato * 0.12, -lato * 0.08, lato * 0.08, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(-lato / 2, -lato / 2, lato / 2, lato / 2);
      g.addColorStop(0, "rgba(255,255,255,0.14)");
      g.addColorStop(0.5, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(0,0,0,0.14)");
      ctx.fillStyle = g;
      ctx.fillRect(-lato / 2, -lato / 2, lato, lato);
      ctx.restore();
    },

    // Taccuino con copertina dipinta
    taccuino(ctx, w, h, c, r) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const th = h * 0.72, tw = th / 1.4;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(0.07);
      ctx.translate(-tw / 2, -th / 2);
      ombra(ctx, () => { rettangoloArrotondato(ctx, tw * 0.03, th * 0.03, tw, th, tw * 0.03); ctx.fill(); }, tw * 0.06, 0.3);
      ctx.fillStyle = c[3];
      rettangoloArrotondato(ctx, tw * 0.02, th * 0.01, tw, th * 0.985, tw * 0.03);
      ctx.fill();
      ctx.fillStyle = c[1];
      rettangoloArrotondato(ctx, 0, 0, tw, th, tw * 0.03);
      ctx.fill();
      ctx.save();
      rettangoloArrotondato(ctx, 0, 0, tw, th, tw * 0.03);
      ctx.clip();
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = i % 2 ? c[3] : c[2];
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = tw * (0.04 + r() * 0.06);
        const y0 = th * (0.2 + r() * 0.6);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.1, y0);
        ctx.bezierCurveTo(tw * 0.3, y0 - th * 0.15 * r(), tw * 0.6, y0 + th * 0.15 * r(), tw * 1.1, y0 - th * 0.05);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const dorso = ctx.createLinearGradient(0, 0, tw * 0.12, 0);
      dorso.addColorStop(0, "rgba(0,0,0,0.28)");
      dorso.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dorso;
      ctx.fillRect(0, 0, tw * 0.12, th);
      ctx.restore();
      ctx.fillStyle = "rgba(20,20,20,0.85)";
      ctx.fillRect(tw * 0.8, -th * 0.005, tw * 0.025, th * 1.01);
      ctx.restore();
    },

    // Piatto in ceramica visto dall'alto
    ceramica(ctx, w, h, c, r) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.37, cx = w / 2, cy = h / 2;
      ombra(ctx, () => { ctx.beginPath(); ctx.arc(cx + R * 0.05, cy + R * 0.08, R, 0, Math.PI * 2); ctx.fill(); }, R * 0.14, 0.32);
      ctx.fillStyle = c[2];
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = c[3];
      ctx.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.35 + k * 0.2;
        ctx.lineWidth = R * (0.05 - k * 0.012);
        ctx.beginPath();
        for (let i = 0; i <= 220; i++) {
          const t = i / 220;
          const a = t * Math.PI * 7 + k * 0.9;
          const rad = R * 0.84 * t;
          const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = c[2];
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * R * 0.85;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, R * (0.004 + r() * 0.008), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      const riflesso = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx - R * 0.4, cy - R * 0.45, R * 0.9);
      riflesso.addColorStop(0, "rgba(255,255,255,0.22)");
      riflesso.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = riflesso;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    },

    // Disegno preparatorio a matita e acquerello
    disegno(ctx, w, h, c, r) {
      ctx.fillStyle = c[0];
      ctx.fillRect(0, 0, w, h);
      const m = Math.min(w, h), linea = h * 0.6;
      const macchia = (x, y, rx, ry, colore, volte) => {
        ctx.save();
        ctx.fillStyle = colore;
        for (let i = 0; i < volte; i++) {
          ctx.globalAlpha = 0.05 + r() * 0.06;
          ctx.beginPath();
          ctx.ellipse(x + (r() - 0.5) * rx * 0.3, y + (r() - 0.5) * ry * 0.3, rx * (0.75 + r() * 0.35), ry * (0.75 + r() * 0.35), (r() - 0.5) * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      macchia(w * 0.5, linea + h * 0.14, w * 0.42, h * 0.12, c[2], 14);
      macchia(w * 0.66, linea - h * 0.14, m * 0.07, m * 0.07, c[1], 10);
      ctx.save();
      ctx.strokeStyle = c[3];
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1, w * 0.0018);
      ctx.beginPath();
      ctx.moveTo(w * 0.06, linea);
      ctx.lineTo(w * 0.94, linea + h * 0.004);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 90; i++) {
        const x = w * 0.1 + r() * w * 0.8, y = linea + h * 0.02 + r() * h * 0.22, l = w * (0.015 + r() * 0.03);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + l, y - l * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(w * 0.66, linea - h * 0.14, m * 0.06, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = c[3];
      ctx.font = `italic ${Math.round(w * 0.024)}px Georgia, serif`;
      ctx.fillText("terra più bassa?", w * 0.08, h * 0.12);
      ctx.fillText("rosso più freddo", w * 0.6, h * 0.9);
      ctx.restore();
    },
  };

  function dipingi(canvas, opera, lato) {
    const seg = opera.segnaposto || { stile: "campi", proporzione: [4, 5], colori: ["#CFCFCB", "#B9B8B2", "#E4E3DE"] };
    const [pw, ph] = seg.proporzione || [4, 5];
    const w = pw >= ph ? lato : Math.round((lato * pw) / ph);
    const h = pw >= ph ? Math.round((lato * ph) / pw) : lato;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const r = generatore(hashTesto(opera.id || opera.titolo || "opera"));
    (STILI[seg.stile] || STILI.campi)(ctx, w, h, seg.colori, r, seg);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(texturaGrana(), "repeat");
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Foto vera se c'è, altrimenti segnaposto dipinto
  function creaMedia(o, lato, subito) {
    if (o.immagine) {
      const img = document.createElement("img");
      img.className = "media";
      img.alt = `${o.titolo}${o.anno ? ", " + o.anno : ""}. ${o.tecnica || ""}`;
      img.loading = subito ? "eager" : "lazy";
      img.decoding = "async";
      // Se la foto non si trova, al suo posto compare un avviso con il percorso cercato
      img.addEventListener("error", () => {
        const avviso = document.createElement("div");
        avviso.className = "media media-mancante";
        avviso.innerHTML = `<strong>Foto non trovata</strong><span>${esc(o.immagine)}</span><span>Ricarica la foto dal pannello o controlla il nome del file</span>`;
        img.replaceWith(avviso);
      }, { once: true });
      img.src = o.immagine;
      return img;
    }
    const c = document.createElement("canvas");
    c.className = "media";
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", `${o.titolo}, ${o.tecnica || ""}`);
    dipingi(c, o, lato);
    return c;
  }

  /* ------------------------------------------------------------------
     2b. Pennellate a tutto schermo
     Passando da una sezione all'altra, quattro pennellate larghe (sei sui
     telefoni) coprono lo schermo andando avanti e indietro come un pittore.
     Sotto la vernice la pagina si sposta, poi altre pennellate "puliscono"
     la tela e rivelano la nuova sezione.
     Ogni pennellata è fatta di una cinquantina di setole: ognuna ha un tono,
     uno spessore e un ritardo leggermente diversi, e quelle sui bordi
     lasciano dei vuoti come un pennello quasi asciutto.
     I colori sono --pennellata-1 ... --pennellata-4, definiti in
     cima a css/style.css (lì trovi anche altre tavolozze pronte).
     ------------------------------------------------------------------ */
  const Pittura = (() => {
    let tela = null;
    let ctx = null;
    let W = 0;
    let H = 0;
    let occupata = false;

    function pigmenti() {
      const stile = getComputedStyle(document.documentElement);
      const leggi = (nome, riserva) => {
        const v = stile.getPropertyValue(nome).trim();
        return /^#[0-9a-f]{6}$/i.test(v) ? v : riserva;
      };
      return [
        leggi("--pennellata-1", "#1B1C1E"),
        leggi("--pennellata-2", "#2E3440"),
        leggi("--pennellata-3", "#3F4752"),
        leggi("--pennellata-4", "#23262B"),
      ];
    }

    function prepara() {
      tela = document.createElement("canvas");
      tela.className = "velo-pittura";
      tela.setAttribute("aria-hidden", "true");
      document.body.appendChild(tela);
      ctx = tela.getContext("2d");
    }

    function dimensiona() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      tela.width = Math.round(W * dpr);
      tela.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Tratti in cui una setola di bordo non lascia colore (pennello asciutto)
    function vuoti() {
      const lista = [];
      const quanti = Math.floor(Math.random() * 3);
      for (let i = 0; i < quanti; i++) {
        const a = 0.25 + Math.random() * 0.7;
        lista.push([a, a + 0.02 + Math.random() * 0.08]);
      }
      return lista;
    }

    function creaPennellate(colori, cancella) {
      const quante = H > W ? 6 : 4;
      const passo = H / quante;
      const spessore = passo * 1.7; // le pennellate si sovrappongono per coprire tutto
      const gruppo = {
        fase: Math.random() * 6,
        onda: H * (0.01 + Math.random() * 0.012),
        pennellate: [],
      };
      const inclinazione = (Math.random() - 0.5) * 0.04;
      for (let i = 0; i < quante; i++) {
        const base = colori[i % colori.length];
        const setole = [];
        const numeroSetole = 56;
        for (let s = 0; s < numeroSetole; s++) {
          const pos = s / (numeroSetole - 1) - 0.5;
          const bordo = Math.abs(pos) > 0.36;
          setole.push({
            scarto: pos * spessore,
            larghezza: (spessore / numeroSetole) * (1.9 + Math.random() * 1.3),
            alpha: cancella ? 1 : bordo ? 0.5 + Math.random() * 0.45 : 0.92 + Math.random() * 0.08,
            colore: tinta(base, (Math.random() - 0.5) * 0.22),
            ritardo: Math.random() * 0.05 + (bordo ? 0.03 : 0),
            vuoti: bordo ? vuoti() : [],
            fatto: 0,
          });
        }
        gruppo.pennellate.push({
          verso: i % 2 ? -1 : 1, // avanti e indietro
          centro: passo * (i + 0.5),
          inclinazione: inclinazione + (Math.random() - 0.5) * 0.012,
          ritardo: i * (cancella ? 0.045 : 0.07),
          setole,
        });
      }
      return gruppo;
    }

    function punto(gruppo, pen, setola, p) {
      const x = pen.verso > 0 ? -0.15 * W + p * 1.3 * W : 1.15 * W - p * 1.3 * W;
      const pressione = Math.min(1, 0.5 + p * 4); // il pennello si allarga appena appoggiato
      const y =
        pen.centro +
        Math.sin((x / W) * Math.PI * 1.3 + gruppo.fase) * gruppo.onda +
        (x - W / 2) * pen.inclinazione +
        setola.scarto * pressione;
      return [x, y];
    }

    const nelVuoto = (lista, p) => lista.some(([a, z]) => p >= a && p <= z);

    function traccia(gruppo, pen, setola, da, a, cancella) {
      if (a <= da) return;
      ctx.strokeStyle = cancella ? "#000" : setola.colore;
      ctx.globalAlpha = setola.alpha;
      ctx.lineWidth = setola.larghezza;
      ctx.beginPath();
      const passi = Math.max(2, Math.ceil((a - da) / 0.01));
      let staccato = true;
      for (let k = 0; k <= passi; k++) {
        const p = da + ((a - da) * k) / passi;
        if (nelVuoto(setola.vuoti, p)) {
          staccato = true;
          continue;
        }
        const [x, y] = punto(gruppo, pen, setola, p);
        if (staccato) {
          ctx.moveTo(x, y);
          staccato = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Disegna (o cancella) le pennellate fotogramma per fotogramma
    function anima(gruppo, cancella, durata) {
      return new Promise((fine) => {
        const t0 = performance.now();
        function fotogramma(ora) {
          const t = (ora - t0) / 1000;
          let finito = true;
          ctx.save();
          ctx.globalCompositeOperation = cancella ? "destination-out" : "source-over";
          // estremi piatti: ogni fotogramma riprende il tratto senza lasciare "perline"
          ctx.lineCap = "butt";
          ctx.lineJoin = "round";
          for (const pen of gruppo.pennellate) {
            for (const setola of pen.setole) {
              const grezzo = (t - pen.ritardo - setola.ritardo) / durata;
              if (grezzo < 1) finito = false;
              const p = morbido(Math.min(1, Math.max(0, grezzo)));
              traccia(gruppo, pen, setola, setola.fatto, p, cancella);
              setola.fatto = p;
            }
          }
          ctx.restore();
          if (finito) fine();
          else requestAnimationFrame(fotogramma);
        }
        requestAnimationFrame(fotogramma);
      });
    }

    const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

    // alCentro viene eseguita quando lo schermo è tutto coperto di colore
    async function transizione(alCentro) {
      let eseguita = false;
      const centro = () => {
        if (!eseguita) {
          eseguita = true;
          alCentro();
        }
      };
      if (occupata) return;
      if (menoMovimento()) {
        centro();
        return;
      }
      occupata = true;
      try {
        if (!tela) prepara();
        dimensiona();
        ctx.clearRect(0, 0, W, H);
        tela.classList.remove("is-sfuma");
        tela.classList.add("is-attiva");
        const colori = pigmenti();
        await anima(creaPennellate(colori, false), false, 0.42);
        centro();
        await attendi(80);
        await anima(creaPennellate(colori, true), true, 0.36);
        tela.classList.add("is-sfuma");
        await attendi(220);
      } catch (err) {
        centro();
      } finally {
        if (tela) {
          tela.classList.remove("is-attiva", "is-sfuma");
          ctx.clearRect(0, 0, W, H);
        }
        occupata = false;
      }
    }

    return { transizione };
  })();

  /* ------------------------------------------------------------------
     3. Menu, filtri e griglia delle opere
     ------------------------------------------------------------------ */
  let filtro = "tutte";
  let visibili = OPERE.slice();

  const conta = (id) => (id === "tutte" ? OPERE.length : OPERE.filter((o) => o.categoria === id).length);

  function statoHTML(o) {
    if (!STATI[o.stato]) return "";
    return `<p class="stato stato--${esc(o.stato)}">${STATI[o.stato]}</p>`;
  }

  function didascaliaHTML(o) {
    return `
      <p class="didascalia-titolo"><em>${esc(o.titolo)}</em>${o.anno ? `, ${esc(o.anno)}` : ""}</p>
      ${o.tecnica ? `<p>${esc(o.tecnica)}</p>` : ""}
      ${o.misure ? `<p>${esc(o.misure)}</p>` : ""}
      ${o.edizione ? `<p>${esc(o.edizione)}</p>` : ""}
      ${statoHTML(o)}`;
  }

  function costruisciSottomenu() {
    const voci = [{ id: "tutte", nome: "Tutte le opere" }, ...CATEGORIE];
    $("#sottomenu-opere").innerHTML = voci
      .map((v) => `<li><a href="#opere" data-categoria="${esc(v.id)}"><span>${esc(v.nome)}</span><span class="conta">${conta(v.id)}</span></a></li>`)
      .join("");
  }

  function costruisciFiltri() {
    const voci = [{ id: "tutte", nome: "Tutte" }, ...CATEGORIE];
    const box = $("#filtri");
    box.innerHTML = voci
      .map((v) => `<li><button type="button" class="filtro" data-categoria="${esc(v.id)}" aria-pressed="${v.id === filtro}">${esc(v.nome)}<span class="conta">${conta(v.id)}</span></button></li>`)
      .join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-categoria]");
      if (b) impostaFiltro(b.dataset.categoria);
    });
  }

  /* modo:
     "sfuma"   le opere vecchie svaniscono, le nuove compaiono dipinte (clic sui filtri)
     "rivela"  le nuove compaiono dipinte subito (dopo la transizione dal menu)
     "nessuno" nessuna animazione (apertura della pagina) */
  function impostaFiltro(id, modo = "sfuma") {
    filtro = id === "tutte" || NOMI_CATEGORIE[id] ? id : "tutte";
    document.querySelectorAll(".filtro").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.categoria === filtro)));
    const griglia = $("#opere-griglia");
    clearTimeout(griglia._attesa);
    if (modo === "sfuma" && !menoMovimento()) {
      griglia.classList.add("is-cambiando");
      griglia._attesa = setTimeout(() => {
        disegnaGriglia(true, 0);
        griglia.classList.remove("is-cambiando");
      }, 200);
    } else {
      // con "rivela" si aspetta che il velo di pittura si ritiri
      disegnaGriglia(modo !== "nessuno", 0.3);
    }
  }

  function schedaOpera(o, i, anima, ritardoBase) {
    const art = document.createElement("article");
    art.className = "opera";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opera-apri";
    btn.setAttribute("aria-label", `Guarda ${o.titolo} a schermo intero`);
    const media = creaMedia(o, 760);
    btn.append(media);
    btn.addEventListener("click", () => apriScheda(visibili, i, btn));
    const cap = document.createElement("div");
    cap.className = "didascalia";
    cap.innerHTML = didascaliaHTML(o);
    if (anima) {
      // Le opere si dipingono una dopo l'altra, la didascalia arriva poco dopo
      const ritardo = ritardoBase + Math.min(i, 8) * 0.07;
      media.classList.add("rivela");
      media.style.setProperty("--ritardo", `${ritardo}s`);
      cap.classList.add("appare");
      cap.style.setProperty("--ritardo", `${ritardo + 0.35}s`);
    }
    art.append(btn, cap);
    return art;
  }

  function disegnaGriglia(anima = false, ritardoBase = 0) {
    const griglia = $("#opere-griglia");
    visibili = filtro === "tutte" ? OPERE.slice() : OPERE.filter((o) => o.categoria === filtro);
    griglia.replaceChildren();
    if (!visibili.length) {
      griglia.innerHTML =
        filtro === "tutte"
          ? `<p class="vuoto">Le opere saranno pubblicate a breve.</p>`
          : `<p class="vuoto">Nessuna opera in questa categoria per ora. <button type="button" class="link-bottone" data-categoria="tutte">Mostra tutte le opere</button></p>`;
    } else {
      visibili.forEach((o, i) => griglia.append(schedaOpera(o, i, anima, ritardoBase)));
    }
    const n = visibili.length;
    $("#stato-filtro").textContent =
      filtro === "tutte" ? `${n} opere` : `${NOMI_CATEGORIE[filtro]}: ${n} ${n === 1 ? "opera" : "opere"}`;
  }

  function costruisciEvidenza() {
    const fig = $("#evidenza");
    const o = OPERE.find((x) => x.inEvidenza) || OPERE[0];
    if (!o) {
      fig.hidden = true;
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "evidenza-apri";
    btn.setAttribute("aria-label", `Guarda ${o.titolo} a schermo intero`);
    const cornice = document.createElement("span");
    cornice.className = "cornice";
    const media = creaMedia(o, 1100, true);
    media.classList.add("rivela"); // dipinta sulla tela bianca all'apertura
    cornice.append(media);
    btn.append(cornice);
    btn.addEventListener("click", () => apriScheda(OPERE, OPERE.indexOf(o), btn));
    const cap = document.createElement("figcaption");
    cap.className = "didascalia";
    cap.innerHTML = didascaliaHTML(o);
    fig.append(btn, cap);
  }

  /* ------------------------------------------------------------------
     4. Scheda dell'opera a tutto schermo
     ------------------------------------------------------------------ */
  const scheda = $("#scheda");
  let elenco = [];
  let indice = 0;
  let origine = null;

  function apriScheda(lista, i, daDove) {
    elenco = lista;
    indice = Math.max(0, i);
    origine = daDove || null;
    riempiScheda(1);
    if (!scheda.open) {
      if (typeof scheda.showModal === "function") scheda.showModal();
      else scheda.setAttribute("open", "");
      document.documentElement.classList.add("no-scroll");
      $("#scheda-chiudi").focus();
    }
  }

  // verso: 1 = opera successiva (pennellata da sinistra), -1 = precedente (da destra)
  function riempiScheda(verso = 1) {
    const o = elenco[indice];
    if (!o) return;
    const media = creaMedia(o, 1600, true);
    media.classList.add("rivela");
    if (verso < 0) media.classList.add("rivela--indietro");
    media.style.setProperty("--durata", "0.75s");
    $("#scheda-media").replaceChildren(media);
    const info = $(".scheda-info");
    info.classList.remove("is-nuova");
    void info.offsetWidth; // fa ripartire l'animazione dei testi
    info.classList.add("is-nuova");
    $("#scheda-titolo").innerHTML = `<em>${esc(o.titolo)}</em>`;
    $("#scheda-meta").innerHTML = [o.anno, o.tecnica, o.misure, o.edizione]
      .filter(Boolean)
      .map((x) => `<span>${esc(x)}</span>`)
      .join("");
    $("#scheda-descrizione").textContent = o.descrizione || "";
    $("#scheda-descrizione").hidden = !o.descrizione;

    let prezzo = "";
    if (o.stato !== "venduta") prezzo = `<span>${o.prezzo ? esc(o.prezzo) : "Prezzo su richiesta"}</span>`;
    $("#scheda-stato").innerHTML = statoHTML(o) + prezzo;

    const richiesta = $("#scheda-richiesta");
    const azioni = richiesta.parentElement;
    if (CONTATTI.email) {
      const oggetto = `Informazioni su "${o.titolo}"${o.anno ? ` (${o.anno})` : ""}`;
      richiesta.href = `mailto:${CONTATTI.email}?subject=${encodeURIComponent(oggetto)}`;
      richiesta.textContent = o.stato === "venduta" ? "Chiedi di opere simili" : "Chiedi informazioni";
      $("#scheda-email").textContent = CONTATTI.email;
      azioni.hidden = false;
    } else {
      azioni.hidden = true;
    }

    $("#scheda-pos").textContent = `${indice + 1} di ${elenco.length}`;
    $("#scheda-nav").hidden = elenco.length < 2;
  }

  function sposta(passo) {
    if (elenco.length < 2) return;
    indice = (indice + passo + elenco.length) % elenco.length;
    riempiScheda(passo);
  }

  function chiudiScheda() {
    if (typeof scheda.close === "function") scheda.close();
    else {
      scheda.removeAttribute("open");
      scheda.dispatchEvent(new Event("close"));
    }
  }

  function preparaScheda() {
    $("#scheda-chiudi").addEventListener("click", chiudiScheda);
    $("#scheda-prec").addEventListener("click", () => sposta(-1));
    $("#scheda-succ").addEventListener("click", () => sposta(1));
    scheda.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") sposta(1);
      if (e.key === "ArrowLeft") sposta(-1);
    });
    scheda.addEventListener("close", () => {
      document.documentElement.classList.remove("no-scroll");
      if (origine && document.contains(origine)) origine.focus();
    });
    // Scorrimento col dito sull'immagine
    let x0 = null;
    const media = $("#scheda-media");
    media.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    media.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) sposta(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  /* ------------------------------------------------------------------
     5. Eventi
     ------------------------------------------------------------------ */
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  function leggiData(s) {
    const [a, m, g] = String(s).split("-").map(Number);
    return new Date(a, m - 1, g);
  }
  const giorno = (d) => (d.getDate() === 1 ? "1°" : String(d.getDate()));
  const giornoMese = (d) => `${giorno(d)} ${MESI[d.getMonth()]}`;

  function periodo(a, b) {
    if (!b || +a === +b) return `${giornoMese(a)} ${a.getFullYear()}`;
    if (a.getFullYear() === b.getFullYear()) {
      if (a.getMonth() === b.getMonth()) return `${giorno(a)}–${giorno(b)} ${MESI[a.getMonth()]} ${a.getFullYear()}`;
      return `${giornoMese(a)} – ${giornoMese(b)} ${a.getFullYear()}`;
    }
    return `${giornoMese(a)} ${a.getFullYear()} – ${giornoMese(b)} ${b.getFullYear()}`;
  }

  function statoEvento(ev) {
    const a = leggiData(ev.inizio);
    const b = leggiData(ev.fine || ev.inizio);
    if (b < oggi) return { tipo: "passato" };
    if (a <= oggi) return { tipo: "ora", testo: "In corso" };
    const giorni = Math.round((a - oggi) / 864e5);
    if (giorni === 1) return { tipo: "presto", testo: "Domani" };
    if (giorni <= 21) return { tipo: "presto", testo: `Tra ${giorni} giorni` };
    return { tipo: "futuro" };
  }

  function eventoHTML(ev) {
    const a = leggiData(ev.inizio);
    const b = leggiData(ev.fine || ev.inizio);
    const st = statoEvento(ev);
    const pill = st.testo ? `<span class="pill${st.tipo === "ora" ? " pill--ora" : ""}">${st.testo}</span>` : "";
    const luogo = [ev.luogo, ev.citta].filter(Boolean).map(esc).join(", ");
    const mappa = ev.indirizzo
      ? `<a class="evento-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.indirizzo)}" target="_blank" rel="noopener">Apri in Google Maps</a>`
      : "";
    const sito = ev.link ? `<a class="evento-link" href="${esc(ev.link)}" target="_blank" rel="noopener">Pagina dell'evento</a>` : "";
    return `
      <li class="evento">
        <p class="evento-data">
          <span class="evento-giorno">${giorno(a)}</span>
          <span class="evento-mese">${MESI_BREVI[a.getMonth()]} ${a.getFullYear()}</span>
        </p>
        <div class="evento-corpo">
          <h3 class="evento-titolo">${esc(ev.titolo)}</h3>
          ${ev.tipo ? `<p class="evento-tipo">${esc(ev.tipo)}</p>` : ""}
          <p class="evento-righe">
            ${luogo ? `<span>${luogo}</span>` : ""}
            <span>${periodo(a, b)}</span>
            ${ev.indirizzo ? `<span>${esc(ev.indirizzo)}</span>` : ""}
            ${ev.note ? `<span>${esc(ev.note)}</span>` : ""}
          </p>
          ${mappa}${sito}
        </div>
        ${pill ? `<p class="evento-stato">${pill}</p>` : ""}
      </li>`;
  }

  function costruisciEventi() {
    const prossimi = EVENTI.filter((e) => statoEvento(e).tipo !== "passato")
      .sort((x, y) => leggiData(x.inizio) - leggiData(y.inizio));
    const passati = EVENTI.filter((e) => statoEvento(e).tipo === "passato")
      .sort((x, y) => leggiData(y.fine || y.inizio) - leggiData(x.fine || x.inizio));

    $("#eventi-lista").innerHTML = prossimi.length
      ? prossimi.map(eventoHTML).join("")
      : `<li class="nessun-evento">Al momento non ci sono eventi in programma. Le nuove date escono prima su Instagram.</li>`;

    if (passati.length) {
      $("#eventi-passati").innerHTML = passati.map(eventoHTML).join("");
      $("#archivio").hidden = false;
    }

    // Riga sotto la presentazione: mostra in corso o prossimo appuntamento
    const primo = prossimi[0];
    const box = $("#adesso");
    if (!primo) return;
    const ora = statoEvento(primo).tipo === "ora";
    const dove = [primo.luogo, primo.citta].filter(Boolean).map(esc).join(", ");
    const quando = ora
      ? `fino al ${giornoMese(leggiData(primo.fine || primo.inizio))}`
      : `dal ${giornoMese(leggiData(primo.inizio))}`;
    box.innerHTML = `<span>${ora ? "In corso" : "Prossimo appuntamento"}: <a href="#eventi">${esc(primo.titolo)}</a>, ${dove}, ${quando}</span>`;
    box.classList.toggle("is-futuro", !ora);
    box.hidden = false;
  }

  /* ------------------------------------------------------------------
     5b. Processo creativo
     Ogni video può essere un file caricato dal pannello (cartella video/)
     oppure un link a YouTube, Instagram o TikTok.
     - file:      lettore del browser, senza uscire dal sito
     - YouTube:   copertina con "Guarda"; al clic parte il video nel sito
     - Instagram, TikTok: copertina che apre il video sul social
     I video con la data più recente compaiono per primi.
     ------------------------------------------------------------------ */
  const ICONA_PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';

  function analizzaLink(indirizzo) {
    let u;
    try {
      u = new URL(indirizzo);
    } catch (e) {
      return null;
    }
    const host = u.hostname.replace(/^(www|m)\./, "");
    const idValido = (id) => (/^[\w-]{6,20}$/.test(id || "") ? id : null);
    if (host === "youtu.be") {
      const id = idValido(u.pathname.split("/")[1]);
      return id ? { tipo: "youtube", id, verticale: false } : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const parti = u.pathname.split("/");
      if (parti[1] === "shorts" || parti[1] === "embed" || parti[1] === "live") {
        const id = idValido(parti[2]);
        return id ? { tipo: "youtube", id, verticale: parti[1] === "shorts" } : null;
      }
      const id = idValido(u.searchParams.get("v"));
      return id ? { tipo: "youtube", id, verticale: false } : null;
    }
    if (host.endsWith("instagram.com")) return { tipo: "instagram", url: u.href, verticale: true };
    if (host.endsWith("tiktok.com")) return { tipo: "tiktok", url: u.href, verticale: true };
    return { tipo: "altro", url: u.href, verticale: false };
  }

  function avvisoVideoMancante(percorso) {
    const avviso = document.createElement("div");
    avviso.className = "media-mancante";
    avviso.innerHTML = `<strong>Video non trovato</strong><span>${esc(percorso)}</span><span>Ricaricalo dal pannello</span>`;
    return avviso;
  }

  // Restituisce il riquadro del video e il suo orientamento
  function mediaVideo(v, scheda) {
    // 1. File caricato
    if (v.video) {
      const box = document.createElement("div");
      box.className = "video-media";
      const el = document.createElement("video");
      el.controls = true;
      el.playsInline = true;
      el.preload = "metadata";
      if (v.copertina) el.poster = v.copertina;
      // senza copertina, "#t=0.1" mostra il primo fotogramma anche su iPhone
      el.src = v.copertina ? v.video : `${v.video}#t=0.1`;
      el.setAttribute("aria-label", v.titolo);
      el.addEventListener("loadedmetadata", () => {
        const r = el.videoWidth / el.videoHeight;
        scheda.classList.remove("video--verticale", "video--orizzontale", "video--quadrato");
        scheda.classList.add(r > 1.15 ? "video--orizzontale" : r > 0.87 ? "video--quadrato" : "video--verticale");
        aggiornaFrecce();
      });
      el.addEventListener("error", () => box.replaceChildren(avvisoVideoMancante(v.video)), { once: true });
      box.append(el);
      return { box, orientamento: "verticale" };
    }

    // 2. Link
    const info = analizzaLink(v.link);
    if (!info) return null;
    const orientamento = info.verticale ? "verticale" : "orizzontale";
    const copertina = v.copertina || (info.tipo === "youtube" ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : "");
    const nomi = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", altro: "il sito" };
    const icone = { instagram: ICONE.instagram, tiktok: ICONE.tiktok };

    const fondo = `<span class="video-fondo">${icone[info.tipo] ? `<span class="icona">${icone[info.tipo]}</span>` : ""}</span>`;
    const immagine = copertina ? `<img src="${esc(copertina)}" alt="" loading="lazy">` : "";

    if (info.tipo === "youtube") {
      const box = document.createElement("button");
      box.type = "button";
      box.className = "video-media video-facciata";
      box.setAttribute("aria-label", `Guarda il video ${v.titolo}`);
      box.innerHTML = `${fondo}${immagine}<span class="video-gioca">${ICONA_PLAY}Guarda</span>`;
      const img = box.querySelector("img");
      if (img) img.addEventListener("error", () => img.remove(), { once: true });
      box.addEventListener("click", () => {
        const contenitore = document.createElement("div");
        contenitore.className = "video-media";
        contenitore.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${info.id}?autoplay=1&rel=0&playsinline=1" title="${esc(v.titolo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        box.replaceWith(contenitore);
      });
      return { box, orientamento };
    }

    const box = document.createElement("a");
    box.className = "video-media video-facciata";
    box.href = info.url;
    box.target = "_blank";
    box.rel = "noopener";
    box.setAttribute("aria-label", `Guarda ${v.titolo} su ${nomi[info.tipo]}`);
    const etichetta = icone[info.tipo] ? `<span class="icona">${icone[info.tipo]}</span>` : ICONA_PLAY;
    box.innerHTML = `${fondo}${immagine}<span class="video-gioca">${etichetta}Guarda su ${nomi[info.tipo]}</span>`;
    const img = box.querySelector("img");
    if (img) img.addEventListener("error", () => img.remove(), { once: true });
    return { box, orientamento };
  }

  function schedaVideo(v) {
    const scheda = document.createElement("article");
    scheda.className = "video";
    const media = mediaVideo(v, scheda);
    if (!media) return null;
    scheda.classList.add(`video--${media.orientamento}`);

    const testo = document.createElement("div");
    testo.className = "video-testo";
    const data = v.data ? leggiData(v.data) : null;
    testo.innerHTML = `
      ${data && !isNaN(data) ? `<p class="video-data">${giornoMese(data)} ${data.getFullYear()}</p>` : ""}
      <h3 class="video-titolo">${esc(v.titolo)}</h3>
      ${v.descrizione ? `<p class="video-descrizione">${esc(v.descrizione)}</p>` : ""}`;

    // Collegamento all'opera finita, se il titolo corrisponde a un'opera
    const cercato = String(v.opera || "").trim().toLowerCase();
    const indiceOpera = cercato ? OPERE.findIndex((o) => o.titolo.trim().toLowerCase() === cercato) : -1;
    if (indiceOpera >= 0) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-bottone video-opera";
      btn.textContent = "Guarda l'opera finita";
      btn.addEventListener("click", () => apriScheda(OPERE, indiceOpera, btn));
      testo.append(btn);
    }

    scheda.append(media.box, testo);
    return scheda;
  }

  function aggiornaFrecce() {
    const striscia = $("#processo-striscia");
    const comandi = $("#processo-comandi");
    if (!striscia || !comandi) return;
    const scorre = striscia.scrollWidth > striscia.clientWidth + 4;
    comandi.hidden = !scorre;
    $("#processo-prec").disabled = striscia.scrollLeft <= 4;
    $("#processo-succ").disabled = striscia.scrollLeft + striscia.clientWidth >= striscia.scrollWidth - 4;
  }

  function costruisciProcesso() {
    const striscia = $("#processo-striscia");
    const ordinati = PROCESSO.map((v, i) => ({ v, i })).sort((a, b) => {
      if (a.v.data && b.v.data && a.v.data !== b.v.data) return a.v.data < b.v.data ? 1 : -1;
      if (a.v.data && !b.v.data) return -1;
      if (!a.v.data && b.v.data) return 1;
      return a.i - b.i;
    });
    const schede = ordinati.map(({ v }) => schedaVideo(v)).filter(Boolean);
    if (!schede.length) {
      striscia.innerHTML = `<p class="vuoto">Presto qui i video dallo studio.</p>`;
      striscia.removeAttribute("tabindex");
      return;
    }
    striscia.replaceChildren(...schede);

    const passo = (verso) =>
      striscia.scrollBy({ left: verso * striscia.clientWidth * 0.8, behavior: menoMovimento() ? "auto" : "smooth" });
    $("#processo-prec").addEventListener("click", () => passo(-1));
    $("#processo-succ").addEventListener("click", () => passo(1));
    striscia.addEventListener("scroll", aggiornaFrecce, { passive: true });
    window.addEventListener("resize", aggiornaFrecce);
    striscia.querySelectorAll("img").forEach((img) => img.addEventListener("load", aggiornaFrecce, { once: true }));
    aggiornaFrecce();
  }

  // Un solo video alla volta: quando ne parte uno, gli altri si fermano
  document.addEventListener(
    "play",
    (e) => {
      document.querySelectorAll("video").forEach((v) => {
        if (v !== e.target) v.pause();
      });
    },
    true
  );

  /* ------------------------------------------------------------------
     6. Contatti
     ------------------------------------------------------------------ */
  // Busta per l'email, disegnata qui; Instagram e TikTok usano le icone di Font Awesome
  const ICONE = {
    email:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
    instagram: '<i class="fa-brands fa-instagram" aria-hidden="true"></i>',
    tiktok: '<i class="fa-brands fa-tiktok" aria-hidden="true"></i>',
  };

  function costruisciContatti() {
    const pulisci = (s) => String(s || "").trim().replace(/^@/, "");
    const elenco = (v) => [].concat(v || []).map(pulisci).filter(Boolean);

    const voci = [];
    if (CONTATTI.email) {
      voci.push({ tipo: "email", etichetta: "Email", testo: CONTATTI.email, href: `mailto:${CONTATTI.email}`, copia: true });
    }
    elenco(CONTATTI.instagram).forEach((u) => {
      voci.push({ tipo: "instagram", etichetta: "Instagram", testo: `@${u}`, href: `https://www.instagram.com/${encodeURIComponent(u)}/`, esterno: true });
    });
    elenco(CONTATTI.tiktok).forEach((u) => {
      voci.push({ tipo: "tiktok", etichetta: "TikTok", testo: `@${u}`, href: `https://www.tiktok.com/@${encodeURIComponent(u)}`, esterno: true });
    });

    const attributiLink = (v) => `href="${esc(v.href)}"${v.esterno ? ' target="_blank" rel="noopener"' : ""}`;

    const lista = $("#contatti-lista");
    lista.innerHTML = voci
      .map(
        (v) => `
        <li class="contatto">
          <span class="contatto-etichetta">${v.etichetta}</span>
          <a class="contatto-valore" ${attributiLink(v)}>
            <span class="icona">${ICONE[v.tipo]}</span>
            <span class="contatto-testo">${esc(v.testo)}</span>
          </a>
          ${v.copia ? `<button type="button" class="copia" data-testo="${esc(v.testo)}">Copia</button>` : "<span></span>"}
        </li>`
      )
      .join("");

    // Gli stessi social, piccoli, nel piè di pagina
    $("#piede-social").innerHTML = voci
      .filter((v) => v.tipo !== "email")
      .map(
        (v) => `
        <li><a ${attributiLink(v)} aria-label="${v.etichetta} ${esc(v.testo)}">
          <span class="icona">${ICONE[v.tipo]}</span><span>${esc(v.testo.slice(1))}</span>
        </a></li>`
      )
      .join("");

    lista.addEventListener("click", (e) => {
      const b = e.target.closest(".copia");
      if (!b) return;
      const fatto = (msg) => {
        b.textContent = msg;
        clearTimeout(b._timer);
        b._timer = setTimeout(() => { b.textContent = "Copia"; }, 2200);
      };
      const seleziona = () => {
        const t = b.parentElement.querySelector(".contatto-testo");
        const range = document.createRange();
        range.selectNodeContents(t);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        fatto("Selezionato");
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(b.dataset.testo).then(() => fatto("Copiato"), seleziona);
        } else {
          seleziona();
        }
      } catch (err) {
        seleziona();
      }
    });
  }

  /* ------------------------------------------------------------------
     7. Testata e menu su telefono
     ------------------------------------------------------------------ */
  function preparaMenu() {
    const btn = $("#menu-btn");
    const menu = $("#menu");
    const telefono = window.matchMedia("(max-width: 760px)");
    // Il pannello si apre con una pennellata; in chiusura resta visibile
    // finché il colore non si è ritirato (classe is-closing)
    const imposta = (aperto) => {
      btn.setAttribute("aria-expanded", String(aperto));
      btn.querySelector("span").textContent = aperto ? "Chiudi" : "Menu";
      clearTimeout(menu._chiusura);
      if (aperto) {
        menu.classList.remove("is-closing");
        menu.classList.add("is-open");
      } else if (menu.classList.contains("is-open")) {
        if (!telefono.matches || menoMovimento()) {
          menu.classList.remove("is-open", "is-closing");
          return;
        }
        menu.classList.add("is-closing");
        menu._chiusura = setTimeout(() => menu.classList.remove("is-open", "is-closing"), 400);
      }
    };
    btn.addEventListener("click", () => imposta(btn.getAttribute("aria-expanded") !== "true"));

    // Un clic su una voce chiude il menu; il passaggio di sezione lo fa preparaNavigazione
    menu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      imposta(false);
      a.blur();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        imposta(false);
        btn.focus();
      }
    });

    // Il filetto sotto la testata compare quando si scorre
    const testata = $(".testata");
    const aggiorna = () => testata.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", aggiorna, { passive: true });
    aggiorna();
  }

  /* ------------------------------------------------------------------
     7b. Passaggio tra le sezioni con le pennellate
     Ogni link interno (#opere, #eventi, #contatti, #inizio e le categorie
     del sottomenu) copre lo schermo di colore, sposta la pagina sotto
     la vernice e poi la ripulisce.
     ------------------------------------------------------------------ */
  function vaiA(id, categoria) {
    const meta = document.getElementById(id);
    if (!meta) return;
    Pittura.transizione(() => {
      if (categoria) impostaFiltro(categoria, "rivela");
      const radice = document.documentElement;
      radice.style.scrollBehavior = "auto"; // salto istantaneo, tanto è coperto
      if (id === "inizio") window.scrollTo(0, 0);
      else meta.scrollIntoView();
      radice.style.scrollBehavior = "";
      const ancora = categoria && categoria !== "tutte" ? categoria : id;
      try {
        history.replaceState(null, "", `#${ancora}`);
      } catch (err) {
        /* alcune anteprime non permettono di cambiare l'indirizzo */
      }
      const titolo = meta.querySelector("h1, h2");
      if (titolo) {
        titolo.setAttribute("tabindex", "-1");
        titolo.focus({ preventScroll: true });
      }
    });
  }

  function preparaNavigazione() {
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains("salta")) return;
      const id = a.getAttribute("href").slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      if (a.closest("#scheda")) chiudiScheda();
      vaiA(id, a.dataset.categoria);
    });
  }

  // La voce del menu della sezione che stai guardando resta sottolineata
  function preparaSezioneCorrente() {
    if (!("IntersectionObserver" in window)) return;
    const link = {};
    document.querySelectorAll(".menu-lista > .menu-voce > .menu-link").forEach((a) => {
      link[a.getAttribute("href").slice(1)] = a;
    });
    const osservatore = new IntersectionObserver(
      (voci) => {
        voci.forEach((v) => {
          const a = link[v.target.id];
          if (!a) return;
          if (v.isIntersecting) {
            Object.values(link).forEach((x) => x.removeAttribute("aria-current"));
            a.setAttribute("aria-current", "location");
          } else {
            a.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    Object.keys(link).forEach((id) => {
      const s = document.getElementById(id);
      if (s) osservatore.observe(s);
    });
  }

  /* ------------------------------------------------------------------
     8. Avvio
     ------------------------------------------------------------------ */
  async function avvia() {
    // Queste parti non dipendono dai contenuti
    preparaScheda();
    preparaMenu();
    preparaNavigazione();
    preparaSezioneCorrente();
    $("#anno").textContent = String(new Date().getFullYear());

    try {
      await caricaContenuti();
    } catch (errore) {
      costruisciSottomenu();
      costruisciFiltri();
      mostraErroreContenuti(errore);
      return;
    }

    if (CONTATTI.presentazione) $(".presentazione").textContent = CONTATTI.presentazione;
    costruisciSottomenu();
    costruisciFiltri();
    costruisciEvidenza();
    costruisciEventi();
    costruisciContatti();
    costruisciProcesso();

    // Il bottone "Mostra tutte le opere" nella griglia vuota
    $("#opere-griglia").addEventListener("click", (e) => {
      const b = e.target.closest(".link-bottone[data-categoria]");
      if (b) impostaFiltro(b.dataset.categoria);
    });

    // Un indirizzo come pagina.html#sculture apre già filtrato
    const h = decodeURIComponent(location.hash.slice(1));
    if (NOMI_CATEGORIE[h]) {
      impostaFiltro(h, "nessuno");
      $("#opere").scrollIntoView();
    } else {
      disegnaGriglia();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia);
  else avvia();
})();
