/* =====================================================================
   Un'opera su misura — "Proponi la tua opera"
   Il visitatore compone la sua opera in un piccolo atelier (tipo, tecnica,
   misure, stile, colori, dettagli), vede un bozzetto dipinto dal sito che
   cambia a ogni scelta e la vede in scala su una parete. Alla fine il sito
   prepara una scheda in PDF da scaricare e apre l'email per Marco.
   Niente viene inviato da nessuna parte: il PDF si crea nel browser.
   Indice:
     1. Utilità e colori
     2. Il bozzetto (pittura generativa a setole)
     3. La vista in scala sulla parete
     4. La sezione "Su misura" (la tela che si dipinge da sola)
     5. L'atelier: scelte, passi, bozza salvata
     6. Il PDF della proposta
     7. Email per Marco e condivisione
     8. Avvio
===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Utilità e colori
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const menoMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));

  // Numeri casuali ripetibili: lo stesso "seme" dà sempre lo stesso bozzetto
  function casuale(seme) {
    let a = seme >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hexValido = (h) => /^#[0-9a-f]{6}$/i.test(String(h || ""));
  function inRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const aHex = (r, g, b) =>
    "#" + [r, g, b].map((v) => Math.round(limita(v, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();

  function inHsl(hex) {
    let [r, g, b] = inRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function daHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = limita(s, 0, 1);
    l = limita(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] =
      h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return aHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  // luminosità percepita, da 0 (nero) a 1 (bianco)
  const luce = (hex) => {
    const [r, g, b] = inRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  function mescola(a, b, t) {
    const x = inRgb(a);
    const y = inRgb(b);
    return aHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  // schiarisce (q > 0) o scurisce (q < 0) un colore
  function tono(hex, q) {
    return q > 0 ? mescola(hex, "#FFFFFF", q) : mescola(hex, "#000000", -q);
  }
  function rgba(hex, a) {
    const [r, g, b] = inRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Nomi dei colori (per il PDF e per chi usa un lettore di schermo)
  const NOMI_TINTE = [
    [15, "rosso"], [40, "arancio"], [62, "ocra"], [75, "giallo"], [100, "verde acido"], [150, "verde"], [168, "verde acqua"],
    [192, "turchese"], [215, "azzurro"], [250, "blu"], [275, "indaco"], [300, "viola"], [348, "magenta"], [360, "rosso"],
  ];
  function nomeColore(hex) {
    const [h, s, l] = inHsl(hex);
    if (l < 0.12) return "nero";
    if (l > 0.93) return "bianco";
    if (s < 0.12) return l < 0.35 ? "grigio scuro" : l > 0.7 ? "grigio chiaro" : "grigio";
    let nome = NOMI_TINTE.find(([g]) => h <= g)[1];
    if (s < 0.35 && (nome === "arancio" || nome === "ocra" || nome === "rosso")) nome = l < 0.45 ? "terra bruciata" : "terra";
    if (l < 0.36 && (nome === "azzurro" || nome === "turchese")) return "blu petrolio";
    if (l < 0.3) return `${nome} scuro`;
    if (l > 0.75) return `${nome} chiaro`;
    return nome;
  }

  /* ------------------------------------------------------------------
     2. Il bozzetto
     Ogni pennellata è una linea morbida percorsa da tante "setole": ognuna
     con un tono, uno spessore e un'opacità leggermente diversi; quelle sui
     bordi saltano qua e là come un pennello quasi asciutto. Lo stile sceglie
     la composizione (orizzonte basso per il paesaggio, tavolo e vaso per la
     natura morta, busto per il ritratto…), l'atmosfera e il tono correggono
     i colori. Per incisioni, disegni e sculture cambia il modo di dipingere.
     ------------------------------------------------------------------ */
  const Bozzetto = (() => {
    let trama = null; // la trama della tela (css/tela.webp)
    let tramaPronta = null;
    function caricaTrama() {
      if (tramaPronta) return tramaPronta;
      tramaPronta = new Promise((ok) => {
        const img = new Image();
        img.onload = () => {
          trama = img;
          ok(img);
        };
        img.onerror = () => ok(null);
        img.src = "css/tela.webp";
      });
      return tramaPronta;
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

    // Una linea morbida (Catmull-Rom) che passa per i punti dati, campionata fitta
    function campiona(punti, passo) {
      const p = punti.length < 2 ? [punti[0], punti[0]] : punti;
      const fuori = [];
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[Math.max(0, i - 1)];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[Math.min(p.length - 1, i + 2)];
        const lung = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const n = Math.max(2, Math.ceil(lung / passo));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          const t2 = t * t;
          const t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          fuori.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      fuori.push(p[p.length - 1]);
      // le normali, per allargare le setole ai lati della linea
      return fuori.map((q, i) => {
        const a = fuori[Math.max(0, i - 1)];
        const b = fuori[Math.min(fuori.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        return { x: q[0], y: q[1], nx: -dy / l, ny: dx / l };
      });
    }

    // Prepara le setole di una pennellata
    function preparaPennello(t, r) {
      const largo = Math.max(0.6, t.larghezza);
      const quante = t.setole || limita(Math.round(largo / 2), 5, 30);
      const linea = campiona(t.punti, Math.max(2.5, Math.min(8, largo / 3)));
      const setole = [];
      const secco = t.asciutto ?? 0.5;
      const variazione = t.variazione ?? 0.1;
      for (let i = 0; i < quante; i++) {
        const pos = quante === 1 ? 0 : i / (quante - 1) - 0.5;
        const bordo = Math.abs(pos) > 0.34;
        const vuoti = [];
        if (bordo && r() < secco) {
          const k = 1 + Math.floor(r() * 3);
          for (let j = 0; j < k; j++) {
            const a = 0.15 + r() * 0.8;
            vuoti.push([a, a + 0.03 + r() * 0.12]);
          }
        }
        setole.push({
          o: pos * largo,
          w: (largo / quante) * (1.5 + r() * 1.1),
          col: tono(t.colore, (r() - 0.5) * 2 * variazione),
          a: (t.alpha ?? 0.92) * (bordo ? 0.45 + r() * 0.45 : 0.82 + r() * 0.18),
          inizio: r() * 0.07 + (bordo ? 0.03 : 0),
          fine: 1 - r() * (bordo ? 0.16 : 0.06),
          vuoti,
        });
      }
      return { tipo: "pennello", linea, setole, colore: t.colore, fatto: 0 };
    }

    // Colpo di spatola: un blocco piatto dai bordi sfrangiati, con le righe
    // lasciate dalla lama e una cresta di colore sul bordo
    function preparaSpatola(t, r) {
      const [a, b] = t.punti;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l;
      const uy = dy / l;
      const nx = -uy;
      const ny = ux;
      const h = t.larghezza / 2;
      const bordo = (x0, y0, x1, y1, n, rugosita) => {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const j = (r() - 0.5) * rugosita;
          pts.push([x0 + (x1 - x0) * k + nx * j, y0 + (y1 - y0) * k + ny * j]);
        }
        return pts;
      };
      const sopra = bordo(a[0] + nx * h, a[1] + ny * h, b[0] + nx * h, b[1] + ny * h, 10, h * 0.12);
      const sotto = bordo(b[0] - nx * h, b[1] - ny * h, a[0] - nx * h, a[1] - ny * h, 10, h * 0.22);
      const righe = [];
      for (let i = 0; i < 12; i++) {
        const o = (r() * 2 - 1) * h;
        righe.push({ o, chiaro: r() < 0.5, a: 0.12 + r() * 0.2, w: 0.6 + r() * 1.6, da: r() * 0.2, a2: 0.75 + r() * 0.25 });
      }
      return { tipo: "spatola", sopra, sotto, righe, a, b, ux, uy, nx, ny, h, colore: t.colore, alpha: t.alpha ?? 0.97, fatto: 0 };
    }

    // Le forme piene (vasi, teste, sfere) ricevono sopra qualche pennellata
    // che segue la forma e un contorno a setole, così non sembrano ritagliate
    function poligonoEllisse([cx, cy, rx, ry, rot = 0], n = 20) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      return pts;
    }
    function preparaForma(t, r, W, H) {
      const F = { ...t, tipo: "forma", fatto: 0 };
      if (!t.pennellate) return F;
      const s = Math.min(W, H);
      const poli = t.forma || poligonoEllisse(t.ellisse);
      F.poli = poli;
      const xs = poli.map((p) => p[0]);
      const ys = poli.map((p) => p[1]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const verso = t.verso ?? (y1 - y0 > x1 - x0 ? Math.PI / 2 : 0);
      const ux = Math.cos(verso);
      const uy = Math.sin(verso);
      const lungo = Math.abs((x1 - x0) * ux) + Math.abs((y1 - y0) * uy);
      const largo = Math.abs((x1 - x0) * uy) + Math.abs((y1 - y0) * ux);
      const base = t.base || t.colore || "#888888";
      F.trama = [];
      const n = t.pennellate;
      for (let i = 0; i < n; i++) {
        const o = ((i + 0.5) / n - 0.5) * largo + (r() - 0.5) * (largo / n);
        const px = cx - uy * o;
        const py = cy + ux * o;
        F.trama.push(
          preparaPennello(
            {
              punti: linea(r, px - ux * lungo * 0.6, py - uy * lungo * 0.6, px + ux * lungo * 0.6, py + uy * lungo * 0.6, largo * 0.04, 4),
              larghezza: (largo / n) * (1.3 + r() * 0.8),
              colore: tono(base, (r() - 0.45) * 0.34),
              alpha: t.forzaTrama ?? 0.32,
              asciutto: 0.9,
            },
            r
          )
        );
      }
      if (t.contorno !== false) {
        F.bordo = preparaPennello(
          { punti: poli.concat([poli[0], poli[1]]), larghezza: s * (t.spessoreBordo ?? 0.012), colore: tono(base, -0.12), alpha: 0.45, asciutto: 0.95, variazione: 0.15 },
          r
        );
      }
      return F;
    }

    // la pressione: il pennello si allarga appena appoggiato e si alza alla fine
    const pressione = (p) => Math.min(1, 0.4 + p * 5) * (p > 0.82 ? 1 - (p - 0.82) * 2.2 : 1);
    const nelVuoto = (v, p) => v.some(([a, z]) => p >= a && p <= z);

    // Dipinge la pennellata da "da" ad "a" (0..1): serve per vederla nascere
    function pennella(ctx, T, da, a) {
      if (a <= da) return;
      const L = T.linea;
      const n = L.length - 1;
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";
      for (const s of T.setole) {
        const p0 = Math.max(da, s.inizio);
        const p1 = Math.min(a, s.fine);
        if (p1 <= p0) continue;
        const k0 = Math.floor(p0 * n);
        const k1 = Math.ceil(p1 * n);
        ctx.strokeStyle = s.col;
        ctx.globalAlpha = s.a;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        let staccato = true;
        for (let k = k0; k <= k1; k++) {
          const p = k / n;
          if (nelVuoto(s.vuoti, p)) {
            staccato = true;
            continue;
          }
          const q = L[k];
          const o = s.o * pressione(p);
          const x = q.x + q.nx * o;
          const y = q.y + q.ny * o;
          if (staccato) {
            ctx.moveTo(x, y);
            staccato = false;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Curva chiusa e morbida che passa vicino ai punti
    function curvaChiusa(ctx, pts) {
      const n = pts.length;
      const m = (i) => {
        const p = pts[(i + n) % n];
        const q = pts[(i + 1) % n];
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      };
      const inizio = m(n - 1);
      ctx.moveTo(inizio[0], inizio[1]);
      for (let i = 0; i < n; i++) {
        const c = pts[i];
        const e = m(i);
        ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);
      }
      ctx.closePath();
    }

    function riempimento(ctx, F) {
      if (F.lineare) {
        const [x0, y0, x1, y1, stop] = F.lineare;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        stop.forEach(([o, c]) => g.addColorStop(o, c));
        return g;
      }
      if (F.radiale) {
        const [x0, y0, r0, x1, y1, r1, stop] = F.radiale;
        const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        stop.forEach(([o, c]) => g.addColorStop(o, c));
        return g;
      }
      return F.colore;
    }

    function disegnaForma(ctx, F, quanto = 1) {
      ctx.save();
      ctx.globalAlpha = (F.alpha ?? 1) * quanto;
      if (F.sfuma && haFiltro) ctx.filter = `blur(${F.sfuma}px)`;
      if (F.misto) ctx.globalCompositeOperation = F.misto;
      ctx.fillStyle = riempimento(ctx, F);
      const percorso = () => {
        ctx.beginPath();
        if (F.ellisse) {
          const [cx, cy, rx, ry, rot] = F.ellisse;
          ctx.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2);
        } else if (F.spigoli) {
          F.forma.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
        } else curvaChiusa(ctx, F.forma);
      };
      percorso();
      ctx.fill();
      if (F.trama) {
        ctx.filter = "none";
        percorso();
        ctx.clip();
        F.trama.forEach((T) => pennella(ctx, T, 0, 1));
      }
      ctx.restore();
      if (F.bordo) pennella(ctx, F.bordo, 0, 1);
    }

    function disegnaSpatola(ctx, S, quanto) {
      const { sopra, sotto, righe, a, ux, uy, nx, ny, h } = S;
      ctx.save();
      // la spatola scorre: si vede solo la parte già passata
      const l = Math.hypot(S.b[0] - a[0], S.b[1] - a[1]) * quanto;
      ctx.beginPath();
      ctx.moveTo(a[0] - nx * h * 1.5 - ux * 4, a[1] - ny * h * 1.5 - uy * 4);
      ctx.lineTo(a[0] + nx * h * 1.5 - ux * 4, a[1] + ny * h * 1.5 - uy * 4);
      ctx.lineTo(a[0] + nx * h * 1.5 + ux * l, a[1] + ny * h * 1.5 + uy * l);
      ctx.lineTo(a[0] - nx * h * 1.5 + ux * l, a[1] - ny * h * 1.5 + uy * l);
      ctx.clip();
      ctx.beginPath();
      sopra.concat(sotto).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.globalAlpha = S.alpha;
      ctx.fillStyle = S.colore;
      ctx.fill();
      ctx.clip();
      const L = Math.hypot(S.b[0] - a[0], S.b[1] - a[1]);
      for (const g of righe) {
        ctx.globalAlpha = g.a;
        ctx.strokeStyle = g.chiaro ? tono(S.colore, 0.4) : tono(S.colore, -0.35);
        ctx.lineWidth = g.w;
        ctx.beginPath();
        ctx.moveTo(a[0] + nx * g.o + ux * L * g.da, a[1] + ny * g.o + uy * L * g.da);
        ctx.lineTo(a[0] + nx * g.o + ux * L * g.a2, a[1] + ny * g.o + uy * L * g.a2);
        ctx.stroke();
      }
      ctx.restore();
      // la cresta sul bordo della lama e l'ombra dall'altra parte
      ctx.save();
      ctx.globalAlpha = 0.7 * quanto;
      ctx.lineWidth = Math.max(1, h * 0.06);
      ctx.strokeStyle = tono(S.colore, 0.5);
      ctx.beginPath();
      sopra.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha = 0.35 * quanto;
      ctx.strokeStyle = tono(S.colore, -0.5);
      ctx.beginPath();
      sotto.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }

    /* ---------- Tavolozza secondo atmosfera ---------- */
    function regolaColori(colori, atmosfera) {
      const base = (colori || []).filter(hexValido);
      const lista = base.length ? base : ["#0B2316", "#1F5A2E", "#C3EA36", "#F4C534", "#E6588F"];
      return lista.map((hex) => {
        let [h, s, l] = inHsl(hex);
        switch (atmosfera) {
          case "serena": s *= 0.8; l = l + (0.62 - l) * 0.22; break;
          case "intensa": s = Math.min(1, s * 1.18 + 0.05); l = l + (l - 0.5) * 0.18; break;
          case "malinconica": s *= 0.55; h = h + (220 - h) * 0.12; l *= 0.9; break;
          case "energica": s = Math.min(1, s * 1.25 + 0.08); break;
          case "misteriosa": s *= 0.85; l *= 0.72; break;
          case "luminosa": s = Math.min(1, s * 1.05); l = l + (1 - l) * 0.18; break;
          default: break;
        }
        return daHsl(h, s, l);
      });
    }

    function fondoBase(P, tonoGenerale) {
      const ord = P.slice().sort((a, b) => luce(a) - luce(b));
      if (tonoGenerale === "scuro") return mescola(ord[0], "#000000", 0.3);
      if (tonoGenerale === "chiaro") return mescola(ord[ord.length - 1], "#FBF8F1", 0.6);
      return mescola(ord[Math.floor(ord.length / 2)], "#EFEAE0", 0.68);
    }

    /* ---------- Aiuti per comporre ---------- */
    function linea(r, x0, y0, x1, y1, onda, punti = 5) {
      const fuori = [];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      const fase = r() * 6;
      for (let i = 0; i < punti; i++) {
        const t = i / (punti - 1);
        const o = Math.sin(t * Math.PI * 1.4 + fase) * onda + (r() - 0.5) * onda * 0.6;
        fuori.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]);
      }
      return fuori;
    }
    function arco(cx, cy, rx, ry, a0, a1, punti = 9) {
      const fuori = [];
      for (let i = 0; i < punti; i++) {
        const a = a0 + ((a1 - a0) * i) / (punti - 1);
        fuori.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      }
      return fuori;
    }
    function blob(r, cx, cy, rx, ry, irregolare = 0.12, n = 12) {
      const pts = [];
      const fase = r() * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const k = 1 + Math.sin(a * 3 + fase) * irregolare * 0.6 + (r() - 0.5) * irregolare;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      return pts;
    }
    const scegli = (r, lista) => lista[Math.floor(r() * lista.length) % lista.length];
    const ordina = (P) => P.slice().sort((a, b) => luce(a) - luce(b));
    const vivaci = (P) => P.slice().sort((a, b) => inHsl(b)[1] * (1 - Math.abs(luce(b) - 0.55)) - inHsl(a)[1] * (1 - Math.abs(luce(a) - 0.55)));

    // Volume: un colore che va dalla luce (in alto a sinistra) all'ombra
    const volume = (c, x0, y0, x1, y1) => ({ lineare: [x0, y0, x1, y1, [[0, tono(c, 0.28)], [0.45, c], [1, tono(c, -0.38)]]] });
    const sfera = (c, cx, cy, raggio) => ({
      radiale: [cx - raggio * 0.35, cy - raggio * 0.4, raggio * 0.05, cx, cy, raggio * 1.05, [[0, tono(c, 0.45)], [0.45, c], [1, tono(c, -0.45)]]],
    });

    /* ---------- Le composizioni ---------- */
    function imprimitura(r, W, H, P, fondo, out) {
      const k = 7;
      for (let i = 0; i < k; i++) {
        const y = (H * (i + 0.5)) / k;
        const c = r() < 0.6 ? tono(fondo, (r() - 0.5) * 0.16) : mescola(scegli(r, P), fondo, 0.72);
        out.push({
          punti: linea(r, -0.15 * W, y + (r() - 0.5) * H * 0.06, 1.15 * W, y + (r() - 0.5) * H * 0.1, H * 0.03),
          larghezza: (H / k) * 1.9,
          colore: c,
          alpha: 0.3 + r() * 0.2,
          asciutto: 0.8,
          variazione: 0.05,
        });
      }
    }

    function cielo(r, W, H, P, out, fitto) {
      const ord = ordina(P);
      const chiari = ord.slice(Math.floor(ord.length / 2));
      const scuri = ord.slice(0, Math.ceil(ord.length / 2));
      const oriz = H * (0.64 + r() * 0.08); // orizzonti bassi
      const kc = Math.round(11 * fitto);
      for (let i = 0; i < kc; i++) {
        const t = i / (kc - 1);
        const y = oriz * (0.04 + t * 0.94);
        const c = mescola(scegli(r, chiari), "#FFFFFF", 0.1 + t * 0.32); // verso l'orizzonte il cielo schiarisce
        out.push({
          punti: linea(r, -0.1 * W, y, 1.1 * W, y + (r() - 0.5) * H * 0.04, H * 0.012),
          larghezza: (oriz / kc) * (1.6 + r() * 0.6),
          colore: c,
          alpha: 0.9,
          asciutto: 0.6,
        });
      }
      return { oriz, chiari, scuri };
    }

    function terra(r, W, H, oriz, scuri, out, fitto) {
      out.push({ tipo: "forma", spigoli: true, forma: [[-10, oriz], [W + 10, oriz], [W + 10, H + 10], [-10, H + 10]], colore: tono(scuri[scuri.length - 1], -0.1), alpha: 1 });
      const kt = Math.round(9 * fitto);
      for (let i = 0; i < kt; i++) {
        const t = i / (kt - 1);
        const y = oriz + (H - oriz) * (0.04 + t * 0.98);
        const largo = ((H - oriz) / kt) * (0.9 + t * 1.6); // più larghe in primo piano
        out.push({
          punti: linea(r, -0.1 * W, y + (r() - 0.5) * 8, 1.1 * W, y + (r() - 0.5) * H * 0.05, H * 0.01),
          larghezza: largo,
          colore: tono(scegli(r, scuri), 0.05 - t * 0.16),
          alpha: 0.9,
        });
      }
    }

    function cipresso(r, x, base, alto, largo, colore, out) {
      out.push({
        tipo: "forma",
        forma: [[x, base - alto], [x + largo * 0.35, base - alto * 0.72], [x + largo * 0.5, base - alto * 0.3], [x + largo * 0.3, base], [x - largo * 0.3, base], [x - largo * 0.5, base - alto * 0.3], [x - largo * 0.35, base - alto * 0.72]],
        lineare: [x - largo / 2, 0, x + largo / 2, 0, [[0, tono(colore, 0.18)], [1, tono(colore, -0.3)]]],
        alpha: 0.97,
        base: colore,
        pennellate: 3,
        spessoreBordo: 0.006,
      });
      out.push({ punti: [[x - largo * 0.1, base - alto * 0.15], [x - largo * 0.18, base - alto * 0.55], [x - largo * 0.05, base - alto * 0.9]], larghezza: largo * 0.18, colore: tono(colore, 0.3), alpha: 0.6 });
    }

    const COMPOSIZIONI = {
      astratto(r, W, H, P, mood, out) {
        const s = Math.min(W, H);
        const diag = Math.hypot(W, H);
        const ord = ordina(P);
        const medi = ord.slice(1);
        const verso = mood === "serena" ? 0 : mood === "energica" ? -0.7 : (r() - 0.5) * 1.2;
        const ampiezza = mood === "serena" ? 0.35 : mood === "energica" ? 1.4 : 0.9;
        // tre campiture larghe
        for (let i = 0; i < 3; i++) {
          const y = H * (0.18 + r() * 0.64);
          const a = verso + (r() - 0.5) * ampiezza * 0.5;
          const dx = Math.cos(a) * diag * 0.7;
          const dy = Math.sin(a) * diag * 0.7;
          out.push({ punti: linea(r, W / 2 - dx, y - dy, W / 2 + dx, y + dy, s * 0.06), larghezza: s * (0.22 + r() * 0.16), colore: scegli(r, medi), alpha: 0.88 });
        }
        // gesti: pennellate decise di media larghezza
        const gesti = mood === "energica" ? 22 : mood === "serena" ? 10 : 15;
        for (let i = 0; i < gesti; i++) {
          const x = W * (r() * 1.1 - 0.05);
          const y = H * (r() * 1.1 - 0.05);
          let a = verso + (r() - 0.5) * Math.PI * ampiezza;
          const punti = [[x, y]];
          const passi = 2 + Math.floor(r() * 3);
          const lung = diag * (0.1 + r() * 0.14);
          for (let k = 0; k < passi; k++) {
            a += (r() - 0.5) * 0.8;
            const ul = punti[punti.length - 1];
            punti.push([ul[0] + Math.cos(a) * lung, ul[1] + Math.sin(a) * lung]);
          }
          out.push({ punti, larghezza: s * (0.05 + r() * 0.08), colore: scegli(r, medi), alpha: 0.9, asciutto: 0.7 });
        }
        // pochi segni calligrafici scuri e qualche tocco del colore più vivo
        for (let i = 0; i < 3; i++) {
          const x = W * (0.15 + r() * 0.7);
          const y = H * (0.15 + r() * 0.7);
          const a = verso + (r() - 0.5) * 2;
          const l = s * (0.25 + r() * 0.25);
          out.push({
            punti: [[x, y], [x + Math.cos(a) * l * 0.5 + (r() - 0.5) * l * 0.3, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * l * 0.3], [x + Math.cos(a + 0.4) * l, y + Math.sin(a + 0.4) * l]],
            larghezza: s * (0.014 + r() * 0.012),
            colore: ord[0],
            alpha: 0.95,
            asciutto: 0.25,
          });
        }
        const vivo = vivaci(P)[0];
        for (let i = 0; i < 6; i++) {
          const x = W * (0.1 + r() * 0.8);
          const y = H * (0.1 + r() * 0.8);
          const a = r() * Math.PI * 2;
          const l = s * (0.06 + r() * 0.1);
          out.push({
            punti: [[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * l * 0.3], [x + Math.cos(a) * l, y + Math.sin(a) * l]],
            larghezza: s * (0.018 + r() * 0.02),
            colore: vivo,
            alpha: 1,
            asciutto: 0.2,
          });
        }
      },

      paesaggio(r, W, H, P, mood, out, fitto = 1) {
        const s = Math.min(W, H);
        const { oriz, chiari, scuri } = cielo(r, W, H, P, out, fitto);
        // il sole (o la luna) sopra l'orizzonte, con il suo alone
        if (mood !== "misteriosa" && (mood === "luminosa" || mood === "serena" || r() < 0.65)) {
          const caldo = mescola(vivaci(chiari.concat(P))[0], "#FFF6D8", 0.25);
          const cx = W * (0.22 + r() * 0.56);
          const cy = oriz * (0.28 + r() * 0.32);
          const raggio = s * (0.05 + r() * 0.04);
          out.push({ tipo: "forma", ellisse: [cx, cy, raggio * 3.2, raggio * 3.2], radiale: [cx, cy, 0, cx, cy, raggio * 3.2, [[0, rgba(caldo, 0.55)], [1, rgba(caldo, 0)]]] });
          out.push({ tipo: "forma", forma: blob(r, cx, cy, raggio, raggio, 0.05, 14), colore: caldo, sfuma: 0.6 });
          out.push({ tipo: "forma", ellisse: [cx - raggio * 0.22, cy - raggio * 0.25, raggio * 0.45, raggio * 0.4], colore: rgba(tono(caldo, 0.45), 0.7), sfuma: raggio * 0.25 });
        }
        // colline lontane appoggiate sull'orizzonte (sempre più chiare in lontananza)
        for (let i = 2; i >= 0; i--) {
          const y = oriz - H * (0.012 + i * 0.024);
          const pts = [[-10, oriz + 4]];
          const n = 7;
          const fase = r() * 6;
          for (let k = 0; k <= n; k++) {
            const x = (W * k) / n;
            pts.push([x, y - Math.abs(Math.sin(k * 0.9 + fase)) * H * (0.02 + i * 0.012) - r() * H * 0.01]);
          }
          pts.push([W + 10, oriz + 4]);
          out.push({ tipo: "forma", forma: pts, colore: mescola(scuri[0], chiari[0], 0.25 + i * 0.22), alpha: 0.95, pennellate: 4, verso: 0, contorno: false });
        }
        terra(r, W, H, oriz, scuri, out, fitto);
        // cipressi e alberi lontani sull'orizzonte
        const quanti = 2 + Math.floor(r() * 3);
        for (let i = 0; i < quanti; i++) {
          const x = W * (0.1 + r() * 0.8);
          const alto = H * (0.05 + r() * 0.07);
          cipresso(r, x, oriz + H * 0.012, alto, alto * 0.26, tono(scuri[0], -0.15), out);
        }
        return { oriz, chiari, scuri };
      },

      realismo(r, W, H, P, mood, out) {
        const { oriz, scuri } = COMPOSIZIONI.paesaggio(r, W, H, P, mood, out, 1.5);
        const s = Math.min(W, H);
        const ord = ordina(P);
        // un albero in primo piano: tronco, chioma piena e foglie più chiare
        const x = W * (r() < 0.5 ? 0.22 + r() * 0.1 : 0.68 + r() * 0.1);
        const base = oriz + (H - oriz) * 0.6;
        const cima = oriz - H * (0.28 + r() * 0.08);
        const scuro = tono(ord[0], -0.15);
        out.push({ tipo: "forma", ellisse: [x + s * 0.04, base + s * 0.012, s * 0.16, s * 0.022], colore: "rgba(0,0,0,0.35)", sfuma: 3 });
        out.push({ tipo: "forma", forma: [[x - s * 0.018, base], [x - s * 0.01, cima + s * 0.1], [x + s * 0.012, cima + s * 0.1], [x + s * 0.022, base]], colore: scuro });
        const chioma = mescola(scuri[Math.min(1, scuri.length - 1)], ord[0], 0.4);
        for (let b = 0; b < 4; b++) {
          const bx = x + (r() - 0.5) * s * 0.14;
          const by = cima + s * 0.06 + (r() - 0.5) * s * 0.08;
          const c = tono(chioma, (b - 1.5) * 0.08);
          out.push({ tipo: "forma", forma: blob(r, bx, by, s * (0.08 + r() * 0.04), s * (0.07 + r() * 0.03), 0.35, 14), ...sfera(c, bx, by, s * 0.1), base: c, pennellate: 4, verso: r() * 3, forzaTrama: 0.45, spessoreBordo: 0.016 });
        }
        for (let i = 0; i < 26; i++) {
          const a = r() * Math.PI * 2;
          const d = Math.sqrt(r()) * s * 0.12;
          const cx = x + Math.cos(a) * d - s * 0.02;
          const cy = cima + s * 0.05 + Math.sin(a) * d * 0.75 - s * 0.02;
          const l = s * (0.018 + r() * 0.025);
          const b = r() * Math.PI;
          out.push({
            punti: [[cx - Math.cos(b) * l, cy - Math.sin(b) * l * 0.4], [cx, cy], [cx + Math.cos(b) * l, cy + Math.sin(b) * l * 0.4]],
            larghezza: s * (0.014 + r() * 0.014),
            colore: tono(scegli(r, P), (r() - 0.3) * 0.25),
            alpha: 0.9,
          });
        }
      },

      "natura-morta"(r, W, H, P, mood, out) {
        const s = Math.min(W, H);
        const ord = ordina(P);
        const chiari = ord.slice(Math.floor(ord.length / 2));
        const tavolo = H * (0.6 + r() * 0.06);
        // la parete dietro, a pennellate verticali
        for (let i = 0; i < 9; i++) {
          const x = W * ((i + 0.5) / 9) + (r() - 0.5) * W * 0.05;
          out.push({
            punti: linea(r, x, -0.05 * H, x + (r() - 0.5) * W * 0.1, tavolo + H * 0.03, W * 0.012, 4),
            larghezza: (W / 9) * (1.6 + r() * 0.5),
            colore: mescola(scegli(r, chiari), "#FFFFFF", 0.22 + r() * 0.15),
            alpha: 0.88,
          });
        }
        // il piano del tavolo e il suo bordo
        const legno = mescola(ord[Math.min(1, ord.length - 1)], "#6B4226", 0.35);
        out.push({ tipo: "forma", spigoli: true, forma: [[-10, tavolo], [W + 10, tavolo], [W + 10, H + 10], [-10, H + 10]], colore: legno });
        for (let i = 0; i < 7; i++) {
          const y = tavolo + (H - tavolo) * ((i + 0.5) / 7);
          out.push({ punti: linea(r, -0.1 * W, y, 1.1 * W, y + (r() - 0.5) * 6, 3), larghezza: ((H - tavolo) / 7) * 1.4, colore: tono(legno, (r() - 0.5) * 0.18 - i * 0.02), alpha: 0.7, asciutto: 0.8 });
        }
        out.push({ punti: linea(r, -0.05 * W, tavolo, 1.05 * W, tavolo + 2, 1.5), larghezza: s * 0.01, colore: tono(legno, 0.45), alpha: 0.85, asciutto: 0.4 });
        // il vaso, con luce e ombra
        const vx = W * (0.32 + r() * 0.06);
        const vh = H * (0.3 + r() * 0.06);
        const vb = tavolo + H * 0.06;
        const vl = s * (0.11 + r() * 0.03);
        const colVaso = scegli(r, vivaci(P).slice(0, 3));
        out.push({ tipo: "forma", ellisse: [vx + vl * 0.6, vb, vl * 1.5, s * 0.03], colore: "rgba(0,0,0,0.38)", sfuma: 4 });
        const prof = (t) => (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * (t > 0.82 ? 0.55 + (t - 0.82) * 1.6 : 1);
        const lato = [];
        for (let i = 0; i <= 10; i++) lato.push([vx + vl * prof(i / 10), vb - (i / 10) * vh]);
        const forma = lato.concat(lato.slice().reverse().map(([x, y]) => [2 * vx - x, y]));
        out.push({ tipo: "forma", forma, ...volume(colVaso, vx - vl, 0, vx + vl, 0), base: colVaso, pennellate: 6, verso: Math.PI / 2 + 0.05 });
        for (let i = 0; i < 6; i++) {
          const t = 0.1 + i * 0.14;
          const half = vl * prof(t) * 0.92;
          const y = vb - t * vh;
          out.push({ punti: [[vx - half, y - 1], [vx, y + s * 0.01], [vx + half, y - 1]], larghezza: s * 0.012, colore: tono(colVaso, (r() - 0.5) * 0.3), alpha: 0.35 });
        }
        out.push({ punti: [[vx - vl * 0.45, vb - vh * 0.12], [vx - vl * 0.58, vb - vh * 0.42], [vx - vl * 0.42, vb - vh * 0.7]], larghezza: s * 0.018, colore: tono(colVaso, 0.6), alpha: 0.85, asciutto: 0.3 });
        out.push({ tipo: "forma", ellisse: [vx, vb - vh * 1.0, vl * 0.42, s * 0.012], colore: tono(colVaso, -0.5) });
        // i frutti
        const frutti = 2 + Math.floor(r() * 2);
        const coloriFrutti = vivaci(P).filter((c) => c !== colVaso);
        for (let i = 0; i < frutti; i++) {
          const raggio = s * (0.05 + r() * 0.025);
          const fx = vx + vl * 1.25 + raggio * 1.1 + i * raggio * 2.05 + (r() - 0.5) * raggio * 0.4;
          const fy = tavolo + H * 0.085 - raggio + (r() - 0.5) * raggio * 0.3;
          const c = coloriFrutti[i % coloriFrutti.length] || colVaso;
          out.push({ tipo: "forma", ellisse: [fx + raggio * 0.5, fy + raggio * 0.92, raggio * 1.25, raggio * 0.25], colore: "rgba(0,0,0,0.35)", sfuma: 3 });
          out.push({ tipo: "forma", forma: blob(r, fx, fy, raggio, raggio * 0.95, 0.06, 14), ...sfera(c, fx, fy, raggio), base: c, pennellate: 4, verso: r() * 3, spessoreBordo: 0.008 });
          out.push({ punti: arco(fx, fy, raggio * 0.7, raggio * 0.7, Math.PI * 0.2, Math.PI * 0.9, 6), larghezza: raggio * 0.22, colore: tono(c, -0.3), alpha: 0.45 });
          out.push({ punti: arco(fx - raggio * 0.3, fy - raggio * 0.32, raggio * 0.22, raggio * 0.18, Math.PI, Math.PI * 1.75, 5), larghezza: raggio * 0.14, colore: "#FFFFFF", alpha: 0.65, asciutto: 0.1 });
        }
      },

      ritratto(r, W, H, P, mood, out, figure = 1) {
        const s = Math.min(W, H);
        const ord = ordina(P);
        // fondo a pennellate diagonali
        for (let i = 0; i < 8; i++) {
          const x = W * (i / 7);
          out.push({
            punti: linea(r, x - W * 0.3, -0.1 * H, x + W * 0.3, 1.1 * H, W * 0.02, 4),
            larghezza: (W / 7) * 1.7,
            colore: mescola(scegli(r, P), ord[ord.length - 1], 0.25 + r() * 0.2),
            alpha: 0.85,
          });
        }
        const caldi = P.filter((c) => {
          const h = inHsl(c)[0];
          return h < 55 || h > 330;
        });
        const pelle = mescola(caldi.length ? scegli(r, caldi) : "#D99A6C", "#DCA27A", 0.8);
        const lista = figure === 2 ? [[0.33, 0.92, 0], [0.7, 0.8, 1]] : [[0.5, 1, 0]];
        for (const [fx, scala, n] of lista) {
          const cx = W * fx + (r() - 0.5) * W * 0.02;
          const k = s * scala;
          const ys = H * (0.73 + n * 0.05);
          const abito = n ? scegli(r, vivaci(P)) : ord[Math.min(1, ord.length - 1)];
          const capelli = tono(n ? ord[Math.min(2, ord.length - 1)] : ord[0], -0.25);
          const giro = (r() - 0.5) * 0.12; // la testa appena girata
          // busto e spalle
          out.push({
            tipo: "forma",
            forma: [[cx - k * 0.46, H + k * 0.4], [cx - k * 0.42, ys + k * 0.14], [cx - k * 0.32, ys + k * 0.035], [cx - k * 0.09, ys - k * 0.01], [cx + k * 0.09, ys - k * 0.01], [cx + k * 0.32, ys + k * 0.035], [cx + k * 0.42, ys + k * 0.14], [cx + k * 0.46, H + k * 0.4]],
            ...volume(abito, cx - k * 0.4, ys, cx + k * 0.4, H),
            base: abito,
            pennellate: 6,
            verso: Math.PI / 2,
          });
          for (let j = 0; j < 4; j++) {
            const x = cx + (j - 1.5) * k * 0.16;
            out.push({ punti: [[x, ys + k * 0.06], [x + (r() - 0.5) * k * 0.05, ys + (H - ys) * 0.5], [x + (r() - 0.5) * k * 0.08, H + 4]], larghezza: k * 0.05, colore: tono(abito, (r() - 0.4) * 0.3), alpha: 0.45 });
          }
          // collo
          const hy = ys - k * 0.3;
          const rx = k * 0.125;
          const ry = k * 0.165;
          const hx = cx + giro * k;
          const lunghi = r() < 0.5;
          // i capelli dietro la testa (lunghi fino alle spalle o raccolti)
          out.push({
            tipo: "forma",
            forma: lunghi
              ? [[hx - rx * 1.3, hy + ry * 1.25], [hx - rx * 1.35, hy - ry * 0.3], [hx - rx * 0.75, hy - ry * 1.18], [hx + rx * 0.6, hy - ry * 1.22], [hx + rx * 1.35, hy - ry * 0.35], [hx + rx * 1.4, hy + ry * 1.3], [hx + rx * 0.4, hy + ry * 1.45], [hx - rx * 0.5, hy + ry * 1.45]]
              : [[hx - rx * 1.12, hy + ry * 0.2], [hx - rx * 1.15, hy - ry * 0.55], [hx - rx * 0.5, hy - ry * 1.15], [hx + rx * 0.55, hy - ry * 1.15], [hx + rx * 1.2, hy - ry * 0.45], [hx + rx * 1.15, hy + ry * 0.35], [hx, hy + ry * 0.1]],
            ...volume(capelli, hx - rx, hy - ry, hx + rx, hy + ry),
            base: capelli,
            pennellate: 7,
            verso: Math.PI / 2,
            forzaTrama: 0.5,
          });
          out.push({ tipo: "forma", spigoli: true, forma: [[hx - k * 0.06, hy + ry * 0.4], [hx + k * 0.06, hy + ry * 0.4], [cx + k * 0.075, ys + k * 0.015], [cx, ys + k * 0.05], [cx - k * 0.075, ys + k * 0.015]], ...volume(tono(pelle, -0.08), cx - k * 0.06, 0, cx + k * 0.06, 0), base: pelle, pennellate: 2, contorno: false });
          // testa
          out.push({ tipo: "forma", ellisse: [hx, hy, rx, ry, giro], ...sfera(pelle, hx, hy, ry), base: pelle, pennellate: 5, verso: Math.PI / 2 + giro, forzaTrama: 0.28, spessoreBordo: 0.008 });
          // l'ombra sotto il mento e sul lato in ombra del viso
          out.push({ tipo: "forma", ellisse: [cx + rx * 0.55 + giro * k, hy + ry * 0.1, rx * 0.42, ry * 0.85, giro], colore: rgba(tono(pelle, -0.45), 0.35), sfuma: 4 });
          out.push({ punti: arco(cx + giro * k, hy, rx * 0.82, ry * 0.85, Math.PI * 0.62, Math.PI * 1.3, 6), larghezza: k * 0.022, colore: tono(pelle, 0.4), alpha: 0.65 });
          // capelli davanti: una ciocca che scende di lato dalla riga
          const lato = r() < 0.5 ? -1 : 1;
          out.push({
            tipo: "forma",
            forma: [
              [hx - rx * 1.05, hy - ry * 0.05], [hx - rx * 1.08, hy - ry * 0.62], [hx - rx * 0.45, hy - ry * 1.1], [hx + rx * 0.5, hy - ry * 1.1],
              [hx + rx * 1.08, hy - ry * 0.6], [hx + rx * 1.05, hy - ry * 0.05], [hx + rx * 0.8, hy - ry * 0.5],
              [hx + lato * rx * 0.25, hy - ry * 0.78], [hx - rx * 0.75, hy - ry * 0.42],
            ],
            ...volume(capelli, hx - rx, hy - ry, hx + rx, hy),
            base: capelli,
            pennellate: 6,
            verso: Math.PI / 2 - lato * 0.5,
            forzaTrama: 0.55,
          });
          for (let j = 0; j < 4; j++) {
            out.push({ punti: arco(hx, hy - ry * 0.05, rx * (0.9 + j * 0.05), ry * (0.92 + j * 0.04), Math.PI * (1.15 + r() * 0.08), Math.PI * (1.7 + r() * 0.1), 6), larghezza: k * 0.01, colore: tono(capelli, 0.35 + r() * 0.2), alpha: 0.5 });
          }
        }
      },

      "soggetti-umani"(r, W, H, P, mood, out) {
        COMPOSIZIONI.ritratto(r, W, H, P, mood, out, 2);
      },

      surreale(r, W, H, P, mood, out) {
        const s = Math.min(W, H);
        const { oriz, chiari, scuri } = cielo(r, W, H, P, out, 0.9);
        terra(r, W, H, oriz, scuri, out, 0.9);
        const viva = vivaci(P)[0];
        const cx = W * (0.55 + r() * 0.15);
        const cy = oriz - H * (0.24 + r() * 0.08);
        const raggio = s * (0.13 + r() * 0.04);
        // l'ombra lunga sul terreno, staccata dalla sfera che galleggia
        out.push({ tipo: "forma", ellisse: [cx + raggio * 1.2, oriz + (H - oriz) * 0.35, raggio * 1.6, raggio * 0.16, -0.05], colore: "rgba(0,0,0,0.45)", sfuma: 5 });
        out.push({ tipo: "forma", ellisse: [cx, cy, raggio, raggio], ...sfera(viva, cx, cy, raggio), base: viva, pennellate: 6, verso: 0.4, forzaTrama: 0.3 });
        out.push({ punti: arco(cx, cy, raggio * 0.93, raggio * 0.93, Math.PI * 0.05, Math.PI * 0.6, 7), larghezza: raggio * 0.08, colore: mescola(chiari[0], "#FFFFFF", 0.4), alpha: 0.6 });
        // una porta sottile, in piedi da sola sull'orizzonte
        const px = W * (0.17 + r() * 0.1);
        const ph = H * 0.22;
        const pw = W * 0.065;
        out.push({ tipo: "forma", spigoli: true, forma: [[px - pw / 2, oriz + 2], [px - pw / 2, oriz - ph], [px + pw / 2, oriz - ph], [px + pw / 2, oriz + 2]], colore: mescola(chiari[chiari.length - 1], "#FFFFFF", 0.3) });
        out.push({ tipo: "forma", spigoli: true, forma: [[px - pw * 0.36, oriz], [px - pw * 0.36, oriz - ph * 0.9], [px + pw * 0.36, oriz - ph * 0.9], [px + pw * 0.36, oriz]], lineare: [0, oriz - ph, 0, oriz, [[0, tono(scuri[0], -0.4)], [1, tono(scuri[0], -0.1)]]] });
        out.push({ tipo: "forma", forma: [[px + pw / 2, oriz + 2], [px + pw / 2 + W * 0.18, oriz + H * 0.05], [px + pw / 2 + W * 0.2, oriz + H * 0.07], [px - pw / 2, oriz + 4]], colore: "rgba(0,0,0,0.3)", sfuma: 2 });
      },

      materico(r, W, H, P, mood, out) {
        const s = Math.min(W, H);
        const quanti = 24;
        for (let i = 0; i < quanti; i++) {
          const x = W * (r() * 1.1 - 0.05);
          const y = H * (r() * 1.1 - 0.05);
          const a = (r() - 0.5) * 0.7 + (r() < 0.55 ? 0 : Math.PI / 2);
          const l = s * (0.2 + r() * 0.3);
          out.push({
            tipo: "spatola",
            punti: [[x - (Math.cos(a) * l) / 2, y - (Math.sin(a) * l) / 2], [x + (Math.cos(a) * l) / 2, y + (Math.sin(a) * l) / 2]],
            larghezza: s * (0.09 + r() * 0.12),
            colore: scegli(r, P),
          });
        }
        // graffi scuri e qualche goccia di colore vivo
        const ord = ordina(P);
        for (let i = 0; i < 5; i++) {
          const x = W * r();
          const y = H * r();
          const a = r() * Math.PI;
          const l = s * (0.15 + r() * 0.2);
          out.push({ punti: [[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 6], [x + Math.cos(a) * l, y + Math.sin(a) * l]], larghezza: s * 0.006, colore: ord[0], alpha: 0.8, asciutto: 0.4 });
        }
      },
    };
    COMPOSIZIONI.altro = COMPOSIZIONI.astratto;

    /* ---------- Scultura: una scena su un piedistallo ---------- */
    const MATERIALI = {
      bronzo: ["#5E4320", "#E2BF73"],
      gesso: ["#A9A193", "#FBF9F4"],
      marmo: ["#A8A39A", "#FBFAF7"],
      terracotta: ["#7A3820", "#E39667"],
      legno: ["#4F311A", "#C2905C"],
      ferro: ["#24272A", "#8D959C"],
    };
    function scultura(r, W, H, P, op, out) {
      const s = Math.min(W, H);
      const chiave = Object.keys(MATERIALI).find((k) => String(op.tecnica || "").toLowerCase().includes(k));
      const ord = ordina(P);
      let [ombra, lucido] = (chiave && MATERIALI[chiave]) || [tono(vivaci(P)[0], -0.45), tono(vivaci(P)[0], 0.35)];
      // una velatura dei colori scelti (come la patina o lo smalto)
      const patina = vivaci(P)[0];
      ombra = mescola(ombra, patina, 0.18);
      lucido = mescola(lucido, patina, 0.12);
      // il bronzo e il ferro hanno riflessi a bande, gesso, marmo, terracotta e legno sono opachi
      const lucente = !chiave || chiave === "bronzo" || chiave === "ferro";
      const metallo = (x0, x1) =>
        lucente
          ? { lineare: [x0, 0, x1, 0, [[0, ombra], [0.3, mescola(ombra, lucido, 0.85)], [0.48, lucido], [0.72, mescola(ombra, lucido, 0.45)], [1, tono(ombra, -0.2)]]] }
          : { lineare: [x0, 0, x1, 0, [[0, lucido], [0.45, mescola(ombra, lucido, 0.72)], [1, mescola(ombra, lucido, 0.25)]]] };
      const piano = H * 0.6;
      const cx = W * 0.5;
      const stile = op.stile;
      out.push({ tipo: "forma", ellisse: [cx + s * 0.03, piano - s * 0.03, s * 0.13, s * 0.02], colore: "rgba(0,0,0,0.22)", sfuma: 3 });
      if (stile === "ritratto" || stile === "soggetti-umani") {
        const k = s * 0.9;
        const pb = piano - s * 0.03;
        // il piccolo zoccolo e il busto tagliato in basso a semicerchio
        out.push({ tipo: "forma", spigoli: true, forma: [[cx - k * 0.06, pb], [cx - k * 0.05, pb - k * 0.05], [cx + k * 0.05, pb - k * 0.05], [cx + k * 0.06, pb]], ...metallo(cx - k * 0.06, cx + k * 0.06) });
        const ys = pb - k * 0.3;
        out.push({ tipo: "forma", forma: [[cx - k * 0.05, pb - k * 0.05], [cx - k * 0.12, pb - k * 0.09], [cx - k * 0.17, ys + k * 0.09], [cx - k * 0.165, ys + k * 0.02], [cx - k * 0.06, ys - k * 0.01], [cx + k * 0.06, ys - k * 0.01], [cx + k * 0.165, ys + k * 0.02], [cx + k * 0.17, ys + k * 0.09], [cx + k * 0.12, pb - k * 0.09], [cx + k * 0.05, pb - k * 0.05]], ...metallo(cx - k * 0.21, cx + k * 0.21), base: lucido, pennellate: 4, forzaTrama: 0.14, contorno: false });
        out.push({ tipo: "forma", spigoli: true, forma: [[cx - k * 0.045, ys - k * 0.12], [cx + k * 0.045, ys - k * 0.12], [cx + k * 0.052, ys + k * 0.01], [cx - k * 0.052, ys + k * 0.01]], ...metallo(cx - k * 0.052, cx + k * 0.052), contorno: false });
        const hy = ys - k * 0.22;
        out.push({ tipo: "forma", ellisse: [cx, hy, k * 0.095, k * 0.125, 0.08], ...metallo(cx - k * 0.1, cx + k * 0.1), base: lucido, pennellate: 4, forzaTrama: 0.14, contorno: false });
        out.push({ tipo: "forma", ellisse: [cx + k * 0.045, hy + k * 0.02, k * 0.035, k * 0.095, 0.08], colore: rgba(ombra, 0.3), sfuma: 3 });
      } else if (stile === "natura-morta") {
        const vx = cx - s * 0.07;
        const vh = s * 0.3;
        const vl = s * 0.065;
        const prof = (t) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.25));
        const lato = [];
        for (let i = 0; i <= 10; i++) lato.push([vx + vl * prof(i / 10), piano - s * 0.03 - (i / 10) * vh]);
        out.push({ tipo: "forma", forma: lato.concat(lato.slice().reverse().map(([x, y]) => [2 * vx - x, y])), ...metallo(vx - vl, vx + vl) });
        const fx = cx + s * 0.09;
        const fy = piano - s * 0.03 - s * 0.055;
        out.push({ tipo: "forma", ellisse: [fx, fy, s * 0.055, s * 0.055], ...sfera(mescola(ombra, lucido, 0.6), fx, fy, s * 0.055) });
      } else {
        // una forma che sale avvitandosi, come una fiamma o un nastro
        const alto = s * 0.46;
        const base = piano - s * 0.03;
        for (let g = 0; g < 2; g++) {
          const fase = g * Math.PI + r() * 0.6;
          const sx = [];
          const dx = [];
          for (let i = 0; i <= 14; i++) {
            const t = i / 14;
            const centro = cx + Math.sin(t * Math.PI * 2.1 + fase) * s * 0.06 * (1 - t * 0.5);
            const largo = s * 0.05 * (1 - t * 0.75) * (0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI * 2.1 + fase)));
            sx.push([centro - largo, base - t * alto]);
            dx.push([centro + largo, base - t * alto]);
          }
          out.push({ tipo: "forma", forma: sx.concat(dx.reverse()), ...metallo(cx - s * 0.12, cx + s * 0.12), alpha: g ? 1 : 0.92 });
        }
        out.push({ punti: [[cx - s * 0.02, base - alto * 0.12], [cx - s * 0.045, base - alto * 0.45], [cx - s * 0.005, base - alto * 0.8]], larghezza: s * 0.008, colore: tono(lucido, 0.3), alpha: 0.7 });
      }
      void ord;
    }

    function disegnaStudio(ctx, W, H, P) {
      const s = Math.min(W, H);
      const piano = H * 0.6;
      const muro = ctx.createLinearGradient(0, 0, 0, H * 0.86);
      muro.addColorStop(0, mescola("#E9E5DC", P[0], 0.06));
      muro.addColorStop(1, mescola("#D3CCBF", P[0], 0.06));
      ctx.fillStyle = muro;
      ctx.fillRect(0, 0, W, H);
      // la luce del faretto
      const faro = ctx.createRadialGradient(W * 0.5, H * 0.32, 0, W * 0.5, H * 0.32, s * 0.6);
      faro.addColorStop(0, "rgba(255,255,255,0.65)");
      faro.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = faro;
      ctx.fillRect(0, 0, W, H);
      // pavimento
      const pav = ctx.createLinearGradient(0, H * 0.86, 0, H);
      pav.addColorStop(0, "#C7BFB0");
      pav.addColorStop(1, "#B5AC9B");
      ctx.fillStyle = pav;
      ctx.fillRect(0, H * 0.86, W, H * 0.14);
      // piedistallo
      const pl = s * 0.36;
      const x0 = W / 2 - pl / 2;
      const fianco = ctx.createLinearGradient(x0, 0, x0 + pl, 0);
      fianco.addColorStop(0, "#FBFAF6");
      fianco.addColorStop(0.7, "#F1EEE7");
      fianco.addColorStop(1, "#DAD5CB");
      ctx.fillStyle = fianco;
      ctx.fillRect(x0, piano, pl, H * 0.86 - piano);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(x0, piano);
      ctx.lineTo(x0 + pl, piano);
      ctx.lineTo(x0 + pl - s * 0.03, piano - s * 0.03);
      ctx.lineTo(x0 + s * 0.03, piano - s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      if (haFiltro) ctx.filter = "blur(4px)";
      ctx.fillRect(x0 - s * 0.01, H * 0.86 - 2, pl + s * 0.07, s * 0.02);
      ctx.restore();
    }

    /* ---------- Incisione e disegno: dalla pittura alla stampa ----------
       Il bozzetto viene prima dipinto a colori, poi trasformato: per le
       incisioni in righe d'inchiostro più o meno spesse secondo il tono
       (come i segni della sgorbia), per i disegni in tratteggio a matita. */
    function trasformaInStampa(ctx, scena) {
      const { W, H, modo } = scena;
      const s = Math.min(W, H);
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      const N = W * H;
      let Lm = new Float32Array(N);
      for (let i = 0; i < N; i++) Lm[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      // sfocatura leggera (due passate di media a scatola)
      const raggio = Math.max(1, Math.round(s * 0.004));
      const tmp = new Float32Array(N);
      for (let y = 0; y < H; y++) {
        let acc = 0;
        for (let x = -raggio; x <= raggio; x++) acc += Lm[y * W + limita(x, 0, W - 1)];
        for (let x = 0; x < W; x++) {
          tmp[y * W + x] = acc / (2 * raggio + 1);
          acc += Lm[y * W + Math.min(W - 1, x + raggio + 1)] - Lm[y * W + Math.max(0, x - raggio)];
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = -raggio; y <= raggio; y++) acc += tmp[limita(y, 0, H - 1) * W + x];
        for (let y = 0; y < H; y++) {
          Lm[y * W + x] = acc / (2 * raggio + 1);
          acc += tmp[Math.min(H - 1, y + raggio + 1) * W + x] - tmp[Math.max(0, y - raggio) * W + x];
        }
      }
      // allarga i toni: il più chiaro diventa bianco, il più scuro nero
      let lo = 1;
      let hi = 0;
      for (let i = 0; i < N; i += 7) {
        lo = Math.min(lo, Lm[i]);
        hi = Math.max(hi, Lm[i]);
      }
      const span = Math.max(0.15, hi - lo);
      for (let i = 0; i < N; i++) Lm[i] = limita((Lm[i] - lo) / span, 0, 1);
      const carta = inRgb(scena.carta);
      const ink = inRgb(scena.inchiostro);
      const passo = s * (modo === "incisione" ? 0.021 : 0.011);
      const m = modo === "incisione" ? Math.round(s * 0.07) : 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const L = Lm[i];
          // bordi delle forme (gradiente del tono)
          const gx = Lm[y * W + Math.min(W - 1, x + 1)] - Lm[y * W + Math.max(0, x - 1)];
          const gy = Lm[Math.min(H - 1, y + 1) * W + x] - Lm[Math.max(0, y - 1) * W + x];
          const bordo = Math.hypot(gx, gy);
          let q; // quanto inchiostro, 0..1
          if (modo === "incisione") {
            if (x < m || y < m || x >= W - m || y >= H - m) q = 0;
            else {
              const fase = (y + Math.sin(x / (s * 0.16) + y / (s * 0.9)) * s * 0.025 + L * s * 0.05) / passo;
              const v = 0.5 + 0.5 * Math.cos(fase * Math.PI * 2);
              const scuro = 1 - L;
              const soglia = Math.min(0.9, scuro * 1.12 - 0.04);
              q = L < 0.1 ? 1 : L > 0.93 ? 0 : v < soglia ? 1 : 0;
              if (bordo > 0.06) q = 1;
            }
          } else {
            const scuro = 1 - L;
            const j = Math.sin(x * 0.05 + y * 0.031) * 0.18;
            const h1 = ((x + y) / passo + j) % 1;
            const h2 = ((x - y + 10000) / passo - j) % 1;
            q = 0;
            if (scuro > 0.22 && h1 < (scuro - 0.22) * 0.75) q += 0.55;
            if (scuro > 0.55 && h2 < (scuro - 0.55) * 0.9) q += 0.4;
            q += Math.min(0.85, bordo * 7);
            q = Math.min(1, q) * 0.82;
          }
          const k = i * 4;
          d[k] = carta[0] + (ink[0] - carta[0]) * q;
          d[k + 1] = carta[1] + (ink[1] - carta[1]) * q;
          d[k + 2] = carta[2] + (ink[2] - carta[2]) * q;
          d[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      Lm = null;
    }

    /* ---------- La scena completa ---------- */
    // opzioni: { tipo, tecnica, stile, atmosfera, tono, colori, seme }
    function componi(op, W, H) {
      const r = casuale(op.seme || 1);
      const P = regolaColori(op.colori, op.atmosfera);
      const tipo = op.tipo || "quadro";
      const stile = COMPOSIZIONI[op.stile] ? op.stile : "astratto";
      const grezzi = [];
      let modo = "pittura";
      const fondo = fondoBase(P, op.tono);
      if (tipo === "scultura") {
        modo = "scultura";
        scultura(r, W, H, P, { ...op, stile }, grezzi);
      } else {
        if (tipo === "incisione") modo = "incisione";
        else if (tipo === "disegno") modo = "disegno";
        else if (tipo === "stampa") modo = "stampa";
        if (op.velatura) {
          // nella vetrina il quadro nuovo nasce sopra il vecchio: prima una mano di fondo
          for (let i = 0; i < 6; i++) {
            const y = (H * (i + 0.5)) / 6;
            grezzi.push({ punti: linea(r, -0.15 * W, y, 1.15 * W, y + (r() - 0.5) * H * 0.06, H * 0.02), larghezza: (H / 6) * 1.9, colore: tono(fondo, (r() - 0.5) * 0.08), alpha: 0.96, asciutto: 0.5, variazione: 0.04 });
          }
        }
        imprimitura(r, W, H, P, fondo, grezzi);
        COMPOSIZIONI[stile](r, W, H, P, op.atmosfera, grezzi);
      }
      const tratti = grezzi.map((t) =>
        t.tipo === "forma" ? preparaForma(t, r, W, H) : t.tipo === "spatola" ? preparaSpatola(t, r) : preparaPennello(t, r)
      );
      const ord = ordina(P);
      const viva = vivaci(P)[0];
      return {
        W, H, P, fondo, modo, tratti, atmosfera: op.atmosfera,
        carta: modo === "disegno" ? "#F5F2EA" : "#F3EFE6",
        inchiostro:
          modo === "disegno" ? "#2B2A28" : luce(ord[0]) < 0.22 ? ord[0] : inHsl(viva)[1] > 0.45 ? tono(viva, -0.3) : "#161616",
      };
    }

    // Disegna la scena; "fino" (0..1) per vederla dipingere un po' alla volta
    function dipingi(ctx, scena, fino = 1) {
      const { tratti } = scena;
      const quanti = tratti.length;
      const ultimo = fino * quanti;
      for (let i = 0; i < quanti; i++) {
        const T = tratti[i];
        const p = limita(ultimo - i, 0, 1);
        if (p <= T.fatto) continue;
        if (T.tipo === "forma") {
          // le forme compaiono in dissolvenza: si ridisegnano solo a fine passaggio
          if (p >= 1) disegnaForma(ctx, T, 1);
          else continue;
        } else if (T.tipo === "spatola") {
          if (p >= 1 || p - T.fatto > 0.34) disegnaSpatola(ctx, T, p);
          else continue;
        } else pennella(ctx, T, T.fatto, p);
        T.fatto = p;
      }
    }

    function preparaFondo(ctx, scena) {
      const { W, H, modo, P } = scena;
      if (modo === "scultura") disegnaStudio(ctx, W, H, P);
      else {
        ctx.fillStyle = scena.fondo;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function finisci(ctx, scena) {
      const { W, H, modo } = scena;
      const s = Math.min(W, H);
      if (scena.atmosfera === "misteriosa" && modo !== "scultura") {
        const v = ctx.createRadialGradient(W / 2, H / 2, s * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
      }
      if (scena.atmosfera === "luminosa" && modo !== "scultura") {
        const v = ctx.createRadialGradient(W * 0.4, H * 0.3, 0, W * 0.4, H * 0.3, Math.hypot(W, H) * 0.55);
        v.addColorStop(0, "rgba(255,250,230,0.35)");
        v.addColorStop(1, "rgba(255,250,230,0)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
      }
      if (modo === "incisione" || modo === "disegno") {
        trasformaInStampa(ctx, scena);
        if (modo === "incisione") {
          // la firma a matita sotto la lastra, come sulle stampe numerate
          const m = s * 0.07;
          ctx.strokeStyle = "rgba(40,40,40,0.6)";
          ctx.lineWidth = Math.max(1, s * 0.0025);
          ctx.beginPath();
          ctx.moveTo(m, H - m * 0.45);
          ctx.lineTo(m + s * 0.05, H - m * 0.5);
          ctx.moveTo(W - m - s * 0.14, H - m * 0.48);
          ctx.bezierCurveTo(W - m - s * 0.1, H - m * 0.75, W - m - s * 0.06, H - m * 0.2, W - m, H - m * 0.5);
          ctx.stroke();
        }
      }
      if (modo === "stampa") {
        // la stampa ha un margine di carta bianca
        const m = s * 0.06;
        ctx.fillStyle = "#F8F6F0";
        ctx.fillRect(0, 0, W, m);
        ctx.fillRect(0, H - m * 1.4, W, m * 1.4);
        ctx.fillRect(0, 0, m, H);
        ctx.fillRect(W - m, 0, m, H);
      }
      // la trama della tela (o della carta) sopra tutto
      if (trama) {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = modo === "scultura" ? 0.25 : modo === "pittura" ? 0.85 : 0.4;
        const motivo = ctx.createPattern(trama, "repeat");
        const k = Math.max(0.35, s / 900);
        if (motivo.setTransform && window.DOMMatrix) motivo.setTransform(new DOMMatrix().scale(k, k));
        ctx.fillStyle = motivo;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // Disegna subito tutto il bozzetto su un canvas (larghezza e altezza in pixel)
    function disegna(canvas, op, W, H) {
      canvas.width = Math.round(W);
      canvas.height = Math.round(H);
      const ctx = canvas.getContext("2d", { willReadFrequently: op.tipo === "incisione" || op.tipo === "disegno" });
      const scena = componi(op, canvas.width, canvas.height);
      preparaFondo(ctx, scena);
      dipingi(ctx, scena, 1);
      finisci(ctx, scena);
      return scena;
    }

    // Una pennellata larga e orizzontale: la fascia in testa al PDF
    function fascia(canvas, colore, seme = 3, spessore = 0.78) {
      const r = casuale(seme);
      const W = canvas.width;
      const H = canvas.height;
      const T = preparaPennello(
        { punti: linea(r, W * 0.005, H * 0.5, W * 0.995, H * 0.48, H * 0.05, 6), larghezza: H * spessore, colore, alpha: 1, asciutto: 0.9, variazione: 0.07, setole: 70 },
        r
      );
      pennella(canvas.getContext("2d"), T, 0, 1);
    }

    return { componi, preparaFondo, dipingi, finisci, disegna, caricaTrama, regolaColori, fascia };
  })();

  // le proporzioni del bozzetto: quelle dell'opera (la scultura ha una scena 4:5)
  function proporzione(st) {
    if (st.tipo === "scultura") return 4 / 5;
    const { l, a } = misureCm(st);
    return l && a ? limita(l / a, 0.3, 3.2) : 4 / 5;
  }

  /* ------------------------------------------------------------------
     3. La vista in scala: l'opera su una parete, accanto a una persona
        alta 170 cm (e a un divano, per i quadri)
     ------------------------------------------------------------------ */
  function sagomaPersona(ctx, x, y0, k, colore) {
    // x: centro, y0: pavimento, k: pixel per centimetro
    const P = (cx, cy) => [x + cx * k, y0 - cy * k];
    ctx.fillStyle = colore;
    ctx.beginPath();
    const [hx, hy] = P(0, 159);
    ctx.ellipse(hx, hy, 10 * k, 11.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    const corpo = [
      [-5, 147], [-19, 142], [-23, 132], [-24, 96], [-20, 95], [-18, 125], [-16, 100], [-17, 88],
      [-13, 2], [-4, 2], [-1, 78], [1, 78], [4, 2], [13, 2], [17, 88], [16, 100], [18, 125], [20, 95],
      [24, 96], [23, 132], [19, 142], [5, 147],
    ];
    corpo.forEach(([cx, cy], i) => {
      const [px, py] = P(cx, cy);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }

  function divano(ctx, cx, y0, k, colore) {
    const R = (x, y, w, h, rr) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
      else ctx.rect(x, y, w, h);
      ctx.fill();
    };
    const L = 200 * k;
    const x = cx - L / 2;
    ctx.fillStyle = tono(colore, -0.25);
    R(x + 8 * k, y0 - 10 * k, 6 * k, 10 * k, 1 * k);
    R(x + L - 14 * k, y0 - 10 * k, 6 * k, 10 * k, 1 * k);
    ctx.fillStyle = tono(colore, -0.08);
    R(x + 10 * k, y0 - 85 * k, L - 20 * k, 50 * k, 6 * k); // schienale
    ctx.fillStyle = colore;
    R(x + 18 * k, y0 - 46 * k, L - 36 * k, 22 * k, 5 * k); // cuscini
    ctx.fillStyle = tono(colore, -0.12);
    R(x, y0 - 64 * k, 22 * k, 54 * k, 7 * k); // braccioli
    R(x + L - 22 * k, y0 - 64 * k, 22 * k, 54 * k, 7 * k);
    R(x + 14 * k, y0 - 28 * k, L - 28 * k, 18 * k, 3 * k); // base
  }

  function quota(ctx, x0, y0, x1, y1, testo, k) {
    ctx.save();
    ctx.strokeStyle = "rgba(18,38,26,0.55)";
    ctx.fillStyle = "#12261A";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    const vert = Math.abs(x1 - x0) < 1;
    const t = 4;
    if (vert) {
      ctx.moveTo(x0 - t, y0); ctx.lineTo(x0 + t, y0); ctx.moveTo(x1 - t, y1); ctx.lineTo(x1 + t, y1);
    } else {
      ctx.moveTo(x0, y0 - t); ctx.lineTo(x0, y0 + t); ctx.moveTo(x1, y1 - t); ctx.lineTo(x1, y1 + t);
    }
    ctx.stroke();
    ctx.font = `500 ${Math.max(10, Math.min(13, 11 * k * 3))}px Jost, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const w = ctx.measureText(testo).width + 10;
    ctx.fillStyle = "rgba(250,250,247,0.92)";
    if (vert) {
      ctx.translate(mx, my);
      ctx.rotate(-Math.PI / 2);
      ctx.fillRect(-w / 2, -8, w, 16);
      ctx.fillStyle = "#12261A";
      ctx.fillText(testo, 0, 1);
    } else {
      ctx.fillRect(mx - w / 2, my - 8, w, 16);
      ctx.fillStyle = "#12261A";
      ctx.fillText(testo, mx, my + 1);
    }
    ctx.restore();
  }

  function disegnaScala(canvas, st, bozzetto, larghezzaPx, altezzaPx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(larghezzaPx * dpr);
    canvas.height = Math.round(altezzaPx * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = larghezzaPx;
    const H = altezzaPx;
    const { l, a, p } = misureCm(st);
    const larg = l || 50;
    const alt = a || 70;
    const scultura = st.tipo === "scultura";
    const conDivano = !scultura && larg <= 260;
    // quanto spazio serve in centimetri
    const sceneL = Math.max(scultura ? 240 : 300, larg + 170, conDivano ? 330 : 0);
    const pavimentoCm = 26;
    const k = Math.min(W / sceneL, (H - 6) / (Math.max(230, alt + (scultura ? 100 : 120)) + pavimentoCm));
    const y0 = H - pavimentoCm * k; // il pavimento
    // parete e pavimento
    ctx.fillStyle = "#ECE8E0";
    ctx.fillRect(0, 0, W, H);
    const luceParete = ctx.createRadialGradient(W * 0.55, H * 0.2, 0, W * 0.55, H * 0.2, W * 0.8);
    luceParete.addColorStop(0, "rgba(255,255,255,0.6)");
    luceParete.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = luceParete;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#D4CCBE";
    ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = "#C3BAAA";
    ctx.fillRect(0, y0, W, Math.max(2, 3 * k));

    const cxOpera = W * 0.58;
    // la persona, a sinistra dell'opera
    const xPersona = Math.max(26 * k, cxOpera - (larg / 2) * k - 70 * k);
    if (!scultura && conDivano) divano(ctx, cxOpera, y0, k, "#9DA89B");
    if (scultura) {
      const sopraPiedistallo = alt < 120;
      const hp = sopraPiedistallo ? 100 : 0;
      const lp = Math.max(40, (p || larg) + 14);
      if (hp) {
        ctx.fillStyle = "#F7F5F0";
        ctx.fillRect(cxOpera - (lp / 2) * k, y0 - hp * k, lp * k, hp * k);
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(cxOpera + (lp / 2 - 6) * k, y0 - hp * k, 6 * k, hp * k);
      }
      // la sagoma della scultura, con i colori del bozzetto
      const base = y0 - hp * k;
      const sw = larg * k;
      const sh = alt * k;
      if (bozzetto) {
        // il bozzetto della scultura sta al centro della sua scena: lo ritagliamo
        const bw = bozzetto.width;
        const bh = bozzetto.height;
        const src = { x: bw * 0.28, y: bh * 0.1, w: bw * 0.44, h: bh * 0.5 };
        const kk = Math.min(sw / src.w, sh / src.h) * 1.15;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cxOpera, base - sh / 2, Math.max(sw, 10) / 1.6, sh / 1.85, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(bozzetto, src.x, src.y, src.w, src.h, cxOpera - (src.w * kk) / 2, base - src.h * kk, src.w * kk, src.h * kk);
        ctx.restore();
      }
      quota(ctx, cxOpera + (Math.max(lp, larg) / 2 + 14) * k, base, cxOpera + (Math.max(lp, larg) / 2 + 14) * k, base - sh, `${fmt(alt)} cm`, k);
    } else {
      // il quadro: centro a 150 cm, o sopra lo schienale del divano
      const centro = Math.max(150, (conDivano ? 85 + 22 : 40) + alt / 2);
      const x = cxOpera - (larg / 2) * k;
      const y = y0 - (centro + alt / 2) * k;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x, y, larg * k, alt * k);
      ctx.restore();
      if (bozzetto) ctx.drawImage(bozzetto, x, y, larg * k, alt * k);
      quota(ctx, x, y - 14, x + larg * k, y - 14, `${fmt(larg)} cm`, k);
      quota(ctx, x + larg * k + 14, y, x + larg * k + 14, y + alt * k, `${fmt(alt)} cm`, k);
    }
    sagomaPersona(ctx, xPersona, y0, k, "rgba(18,38,26,0.82)");
    ctx.fillStyle = "#5B6A5F";
    ctx.font = "400 11px Jost, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("170 cm", xPersona, y0 - 178 * k);
  }

  const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

  /* ------------------------------------------------------------------
     Le scelte possibili (testi, misure, tecniche, tavolozze)
     ------------------------------------------------------------------ */
  const TIPI = [
    { v: "quadro", t: "Quadro", d: "Su tela o tavola" },
    { v: "scultura", t: "Scultura", d: "Da tavolo o da terra" },
    { v: "incisione", t: "Incisione", d: "Xilografia, linoleum…" },
    { v: "stampa", t: "Stampa", d: "Fine art, in edizione" },
    { v: "disegno", t: "Disegno", d: "Matita, carboncino, china" },
    { v: "altro", t: "Altro", d: "Raccontami tu" },
  ];
  const TECNICHE = {
    quadro: ["Olio", "Acrilico", "Acquerello", "Tecnica mista", "Materico (spatola)", "Con foglia d'oro"],
    scultura: ["Gesso", "Bronzo", "Resina", "Terracotta", "Legno", "Marmo"],
    incisione: ["Xilografia", "Linoleografia", "Acquaforte", "Puntasecca"],
    stampa: ["Giclée fine art", "Serigrafia", "Litografia", "Riproduzione di un'opera di Marco"],
    disegno: ["Matita", "Carboncino", "China", "Pastelli"],
    altro: ["Tecnica mista", "Collage", "Su legno o metallo", "Murale"],
  };
  const FORMATI = {
    piatto: [
      { v: "piccolo", t: "Piccolo", m: [30, 40] },
      { v: "medio", t: "Medio", m: [50, 70] },
      { v: "grande", t: "Grande", m: [70, 100] },
      { v: "molto-grande", t: "Molto grande", m: [100, 150] },
    ],
    carta: [
      { v: "a4", t: "A4", m: [21, 29.7] },
      { v: "a3", t: "A3", m: [29.7, 42] },
      { v: "medio", t: "50 × 70", m: [50, 70] },
      { v: "grande", t: "70 × 100", m: [70, 100] },
    ],
    scultura: [
      { v: "piccola", t: "Da tavolo", m: [20, 30, 20] },
      { v: "media", t: "Media", m: [35, 60, 30] },
      { v: "grande", t: "Grande", m: [55, 120, 45] },
      { v: "monumentale", t: "Da giardino", m: [80, 180, 70] },
    ],
  };
  const famigliaFormati = (tipo) => (tipo === "scultura" ? "scultura" : tipo === "quadro" || tipo === "altro" ? "piatto" : "carta");
  const STILI = [
    { v: "natura-morta", t: "Natura morta" },
    { v: "realismo", t: "Realismo" },
    { v: "astratto", t: "Astratto" },
    { v: "soggetti-umani", t: "Soggetti umani" },
    { v: "ritratto", t: "Ritratto" },
    { v: "paesaggio", t: "Paesaggio" },
    { v: "surreale", t: "Surreale" },
    { v: "materico", t: "Materico" },
    { v: "altro", t: "Altro…" },
  ];
  const ATMOSFERE = [
    { v: "serena", t: "Serena" },
    { v: "intensa", t: "Intensa" },
    { v: "malinconica", t: "Malinconica" },
    { v: "energica", t: "Energica" },
    { v: "misteriosa", t: "Misteriosa" },
    { v: "luminosa", t: "Luminosa" },
  ];
  const TAVOLOZZE = [
    { v: "marco", t: "Come le opere di Marco", c: ["#0B2316", "#1F5A2E", "#C3EA36", "#F4C534", "#E6588F"] },
    { v: "terre", t: "Terre calde", c: ["#3B2416", "#8E4428", "#C9773E", "#E2B36B", "#F1E3C8"] },
    { v: "mare", t: "Mare e cielo", c: ["#0E2A3B", "#1F5F7A", "#43BDB4", "#9BD3E0", "#F2EFE6"] },
    { v: "bosco", t: "Bosco", c: ["#14251A", "#2F5130", "#6C8F3A", "#B5C46A", "#E8E1C2"] },
    { v: "tramonto", t: "Tramonto", c: ["#2B1B3A", "#8C2F5B", "#E6588F", "#F08A2E", "#F4C534"] },
    { v: "pastello", t: "Pastello", c: ["#8FA6B8", "#C8B6D9", "#F2C6C2", "#F6E3B4", "#F7F4EC"] },
    { v: "notte", t: "Notte", c: ["#0B1020", "#1E2B52", "#3D4F8F", "#8C9BD1", "#E9D9A6"] },
    { v: "bianco-nero", t: "Bianco e nero", c: ["#111111", "#4A4A4A", "#8C8C8C", "#D2D2D2", "#F6F4EF"] },
  ];
  const TONI = [
    { v: "chiaro", t: "Chiaro" },
    { v: "medio", t: "Medio" },
    { v: "scuro", t: "Scuro" },
  ];
  const DESTINAZIONI = [
    { v: "soggiorno", t: "Soggiorno" },
    { v: "camera", t: "Camera" },
    { v: "ufficio", t: "Ufficio o studio" },
    { v: "locale", t: "Negozio o locale" },
    { v: "regalo", t: "Un regalo" },
    { v: "altro", t: "Altro" },
  ];
  const CORNICI = [
    { v: "si", t: "Con cornice" },
    { v: "no", t: "Senza cornice" },
    { v: "consiglio", t: "Consigliami tu" },
  ];
  const BUDGET = [
    { v: "fino-300", t: "Fino a 300 €" },
    { v: "300-800", t: "300 – 800 €" },
    { v: "800-2000", t: "800 – 2.000 €" },
    { v: "oltre-2000", t: "Oltre 2.000 €" },
    { v: "da-definire", t: "Ne parliamo" },
  ];
  const TEMPI = [
    { v: "nessuna-fretta", t: "Nessuna fretta" },
    { v: "1-mese", t: "Entro un mese" },
    { v: "3-mesi", t: "Entro tre mesi" },
    { v: "data", t: "Per una data precisa" },
  ];
  const ORIENTAMENTI = [
    { v: "verticale", t: "Verticale" },
    { v: "orizzontale", t: "Orizzontale" },
    { v: "quadrato", t: "Quadrato" },
  ];

  const nomeDi = (lista, v) => (lista.find((x) => x.v === v) || {}).t || "";

  // Larghezza, altezza (e profondità) in centimetri, secondo le scelte fatte
  function misureCm(st) {
    if (st.formato === "su-misura") {
      const n = (x) => {
        const v = parseFloat(String(x || "").replace(",", "."));
        return v > 0 && v < 2000 ? v : 0;
      };
      return { l: n(st.larghezza), a: n(st.altezza), p: n(st.profondita) };
    }
    const fam = famigliaFormati(st.tipo);
    const f = FORMATI[fam].find((x) => x.v === st.formato) || FORMATI[fam][1];
    if (fam === "scultura") return { l: f.m[0], a: f.m[1], p: f.m[2] };
    let [l, a] = f.m;
    if (st.orientamento === "orizzontale") [l, a] = [a, l];
    if (st.orientamento === "quadrato") a = l = Math.max(l, a) * 0.8;
    return { l: Math.round(l * 10) / 10, a: Math.round(a * 10) / 10, p: 0 };
  }

  function testoMisure(st) {
    const { l, a, p } = misureCm(st);
    if (!l || !a) return "Da definire";
    if (st.tipo === "scultura") return `${fmt(l)} × ${fmt(a)}${p ? ` × ${fmt(p)}` : ""} cm (l × h${p ? " × p" : ""})`;
    return `${fmt(l)} × ${fmt(a)} cm`;
  }

  const opDa = (x) => ({
    tipo: x.tipo === "altro" ? "quadro" : x.tipo,
    tecnica: x.tecnica === "altro" ? x.tecnicaAltro : x.tecnica,
    stile: x.stile === "altro" ? "astratto" : x.stile,
    atmosfera: x.atmosfera,
    tono: x.tono,
    colori: x.colori,
    seme: x.seme,
  });

  // Il ponte con js/script.js: contatti (email di Marco) e transizioni
  const ponte = () => window.Vetrina || {};
  const contatti = () => ponte().contatti || {};

  /* ------------------------------------------------------------------
     4. La sezione "Su misura": la tela che si dipinge da sola
     Un bozzetto dopo l'altro, pennellata dopo pennellata; ogni quadro
     nuovo nasce sopra il vecchio, come quando un pittore riusa la tela.
     ------------------------------------------------------------------ */
  const VETRINA = [
    { tipo: "quadro", stile: "paesaggio", tavolozza: "tramonto", atmosfera: "serena", tono: "chiaro", tecnica: "Olio", formato: "medio", orientamento: "orizzontale" },
    { tipo: "quadro", stile: "astratto", tavolozza: "marco", atmosfera: "energica", tono: "medio", tecnica: "Acrilico", formato: "grande", orientamento: "verticale" },
    { tipo: "quadro", stile: "natura-morta", tavolozza: "terre", atmosfera: "", tono: "medio", tecnica: "Olio", formato: "piccolo", orientamento: "verticale" },
    { tipo: "quadro", stile: "ritratto", tavolozza: "mare", atmosfera: "malinconica", tono: "chiaro", tecnica: "Olio", formato: "medio", orientamento: "verticale" },
    { tipo: "quadro", stile: "materico", tavolozza: "tramonto", atmosfera: "intensa", tono: "medio", tecnica: "Materico (spatola)", formato: "molto-grande", orientamento: "verticale" },
    { tipo: "quadro", stile: "surreale", tavolozza: "notte", atmosfera: "misteriosa", tono: "scuro", tecnica: "Acrilico", formato: "grande", orientamento: "verticale" },
  ];
  const coloriDi = (v) => (TAVOLOZZE.find((t) => t.v === v) || TAVOLOZZE[0]).c.slice();

  function preparaVetrina() {
    const tela = $("#su-misura-tela");
    if (!tela) return;
    const didascalia = $("#su-misura-didascalia");
    const ctx = tela.getContext("2d");
    const DURATA = 4200;
    const PAUSA = 2600;
    let indice = 0;
    let scena = null;
    let inizio = 0;
    let ciclo = 0;
    let attesa = 0;
    let visibile = false;
    let W = 0;
    let H = 0;

    const testoDi = (p) => {
      const st = { ...p };
      return `${nomeDi(STILI, p.stile)} · ${nomeDi(TAVOLOZZE, p.tavolozza).toLowerCase()} — ${p.tecnica.toLowerCase()}, ${testoMisure(st)}`;
    };
    const morbido = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function dimensiona() {
      const r = tela.getBoundingClientRect();
      if (!r.width) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (w === W && h === H) return false;
      W = tela.width = w;
      H = tela.height = h;
      return true;
    }

    function nuova(primaVolta) {
      const p = VETRINA[indice % VETRINA.length];
      scena = Bozzetto.componi({ ...opDa({ ...p, colori: coloriDi(p.tavolozza) }), seme: 300 + indice * 17, velatura: !primaVolta }, W, H);
      if (primaVolta) Bozzetto.preparaFondo(ctx, scena);
      didascalia.classList.remove("is-pronta");
      inizio = performance.now();
    }

    function fotogramma(ora) {
      ciclo = 0;
      if (!visibile || !scena) return;
      const t = Math.min(1, (ora - inizio) / DURATA);
      Bozzetto.dipingi(ctx, scena, morbido(t));
      if (t >= 1) {
        didascalia.textContent = testoDi(VETRINA[indice % VETRINA.length]);
        didascalia.classList.add("is-pronta");
        attesa = setTimeout(() => {
          attesa = 0;
          indice++;
          nuova(false);
          if (visibile) ciclo = requestAnimationFrame(fotogramma);
        }, PAUSA);
        return;
      }
      ciclo = requestAnimationFrame(fotogramma);
    }

    function riparti() {
      if (ciclo || attesa) return;
      ciclo = requestAnimationFrame(fotogramma);
    }

    function statico() {
      dimensiona();
      const p = VETRINA[0];
      scena = Bozzetto.componi({ ...opDa({ ...p, colori: coloriDi(p.tavolozza) }), seme: 300 }, W, H);
      Bozzetto.preparaFondo(ctx, scena);
      Bozzetto.dipingi(ctx, scena, 1);
      didascalia.textContent = testoDi(p);
      didascalia.classList.add("is-pronta");
    }

    if (menoMovimento() || !("IntersectionObserver" in window)) {
      statico();
      window.addEventListener("resize", () => dimensiona() && statico());
      return;
    }
    new IntersectionObserver(
      (voci) => {
        visibile = voci[0].isIntersecting && !document.hidden;
        if (visibile) {
          if (dimensiona() || !scena) nuova(true);
          riparti();
        }
      },
      { rootMargin: "120px 0px" }
    ).observe(tela);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) visibile = false;
    });
    let ritardo = 0;
    window.addEventListener("resize", () => {
      clearTimeout(ritardo);
      ritardo = setTimeout(() => {
        if (dimensiona()) {
          nuova(true);
          riparti();
        }
      }, 200);
    });
  }

  /* ------------------------------------------------------------------
     5. L'atelier
     ------------------------------------------------------------------ */
  const CHIAVE_BOZZA = "proposta-su-misura";
  const statoIniziale = () => ({
    tipo: "quadro",
    tipoAltro: "",
    tecnica: "",
    tecnicaAltro: "",
    orientamento: "verticale",
    formato: "medio",
    larghezza: "",
    altezza: "",
    profondita: "",
    stile: "astratto",
    stileAltro: "",
    atmosfera: "",
    idea: "",
    tavolozza: "marco",
    colori: coloriDi("marco"),
    tono: "medio",
    destinazione: "",
    cornice: "",
    budget: "",
    tempi: "",
    data: "",
    nome: "",
    email: "",
    telefono: "",
    citta: "",
    note: "",
    consenso: false,
    seme: 7,
    ispirazione: null, // { titolo, anno, tecnica, misure, colori, immagine }
    riferimenti: [], // { nome, url, w, h } (non vengono salvati nella bozza)
  });
  let st = statoIniziale();
  let passo = 0;
  let origine = null;
  let vista = "bozzetto";
  let ultimoPdf = null;
  let primaPittura = true;

  function leggiBozza() {
    try {
      const b = JSON.parse(localStorage.getItem(CHIAVE_BOZZA) || "null");
      if (b && typeof b === "object") return b;
    } catch (e) {
      /* bozza non leggibile: si riparte da capo */
    }
    return null;
  }
  function salvaBozza() {
    try {
      const { riferimenti, consenso, ...resto } = st;
      localStorage.setItem(CHIAVE_BOZZA, JSON.stringify(resto));
    } catch (e) {
      /* il browser non permette di salvare: pazienza */
    }
  }

  // Testi leggibili delle scelte (per riepilogo, PDF ed email)
  function valori() {
    const tempi =
      st.tempi === "data" && st.data
        ? `Per il ${new Date(st.data + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
        : nomeDi(TEMPI, st.tempi);
    return {
      tipo: st.tipo === "altro" ? st.tipoAltro.trim() || "Altro" : nomeDi(TIPI, st.tipo),
      tecnica: st.tecnica === "altro" ? st.tecnicaAltro.trim() || "Altro" : st.tecnica || "",
      misure: testoMisure(st),
      orientamento: st.tipo === "scultura" ? "" : nomeDi(ORIENTAMENTI, st.orientamento),
      stile: st.stile === "altro" ? st.stileAltro.trim() || "Altro" : nomeDi(STILI, st.stile),
      atmosfera: nomeDi(ATMOSFERE, st.atmosfera),
      tono: nomeDi(TONI, st.tono),
      tavolozza:
        st.tavolozza === "mia"
          ? "I miei colori"
          : st.tavolozza === "ispirazione" && st.ispirazione
            ? `Dall'opera «${st.ispirazione.titolo}»`
            : nomeDi(TAVOLOZZE, st.tavolozza),
      destinazione: nomeDi(DESTINAZIONI, st.destinazione),
      cornice: haCornice() ? nomeDi(CORNICI, st.cornice) : "",
      budget: nomeDi(BUDGET, st.budget),
      tempi,
    };
  }
  const haCornice = () => st.tipo !== "scultura";

  function riassunto() {
    const v = valori();
    return [v.tipo, v.tecnica, v.misure !== "Da definire" ? v.misure : "", v.stile].filter(Boolean).join(" · ");
  }

  /* ---------- Pezzi di modulo ---------- */
  const id = (nome) => `atelier-${nome}`;
  function gruppo(nome, legenda, opzioni, valore, { aiuto = "", classe = "", extra = "" } = {}) {
    return `<fieldset class="campo campo--scelte ${classe}">
      <legend class="campo-etichetta">${legenda}</legend>
      ${aiuto ? `<p class="campo-aiuto">${aiuto}</p>` : ""}
      <div class="scelte">${opzioni
        .map(
          (o, i) =>
            `<label class="scelta"${o.pigmento ? ` style="--pigmento:${o.pigmento}"` : ` style="--pigmento:${PIGMENTI_SCELTE[i % PIGMENTI_SCELTE.length]}"`}><input type="radio" name="${nome}" value="${esc(o.v)}"${o.v === valore ? " checked" : ""}><span class="scelta-testo">${esc(o.t)}</span>${o.d ? `<span class="scelta-dettaglio">${esc(o.d)}</span>` : ""}</label>`
        )
        .join("")}</div>
      ${extra}
    </fieldset>`;
  }
  const PIGMENTI_SCELTE = ["var(--acido)", "var(--giallo)", "var(--magenta)", "var(--turchese)", "var(--arancio)"];

  function testo(nome, etichetta, valore, { tipo = "text", aiuto = "", obbligatorio = false, attr = "", nascosto = false } = {}) {
    const aiutoId = aiuto ? `${id(nome)}-aiuto` : "";
    const descr = [aiutoId, `${id(nome)}-errore`].filter(Boolean).join(" ");
    const campo =
      tipo === "textarea"
        ? `<textarea id="${id(nome)}" name="${nome}" rows="4" aria-describedby="${descr}" ${attr}>${esc(valore)}</textarea>`
        : `<input id="${id(nome)}" name="${nome}" type="${tipo}" value="${esc(valore)}" aria-describedby="${descr}"${obbligatorio ? ' required aria-required="true"' : ""} ${attr}>`;
    return `<div class="campo" data-campo="${nome}"${nascosto ? " hidden" : ""}>
      <label class="campo-etichetta" for="${id(nome)}">${etichetta}${obbligatorio ? ' <span class="obbligatorio">(obbligatorio)</span>' : ""}</label>
      ${aiuto ? `<p class="campo-aiuto" id="${aiutoId}">${aiuto}</p>` : ""}
      ${campo}
      <p class="campo-errore" id="${id(nome)}-errore" hidden></p>
    </div>`;
  }

  // Piccoli disegni a mano per i tipi di opera
  const ICONE = {
    quadro: '<path d="M6 7h20v15H6z"/><path d="M9 19c3-4 5-6 8-3s4 1 6-2"/><path d="M11 22l-3 6M21 22l3 6M16 22v6"/>',
    scultura: '<path d="M16 5c3 0 4.5 2.4 4.5 5S18.8 15 16 15s-4.5-2.4-4.5-5S13 5 16 5z"/><path d="M13.5 15c-3 .8-5 3-5 6h15c0-3-2-5.2-5-6"/><path d="M10 21h12v6H10z"/>',
    incisione: '<path d="M5 8h22v17H5z"/><path d="M8 13c4-1 7 1 11 0s5-1 6 0M8 17c4-1 7 1 11 0s5-1 6 0M8 21c3-1 6 1 9 0"/><path d="M21 3l6 6"/>',
    stampa: '<path d="M8 4h13l4 4v20H8z"/><path d="M21 4v4h4"/><path d="M11 13h11M11 17h11M11 21h7"/>',
    disegno: '<path d="M7 25l2-6L22 6l4 4L13 23z"/><path d="M19 9l4 4"/><path d="M5 28c4-1 8 1 12 0s6-1 10 0"/>',
    altro: '<path d="M16 5v22M5 16h22"/><path d="M9 9l14 14M23 9L9 23" opacity=".45"/>',
  };

  function passoOpera() {
    const carte = TIPI.map(
      (t) => `<label class="tipo">
        <input type="radio" name="tipo" value="${t.v}"${st.tipo === t.v ? " checked" : ""}>
        <svg class="tipo-icona" viewBox="0 0 32 32" aria-hidden="true">${ICONE[t.v]}</svg>
        <span class="tipo-nome">${t.t}</span>
        <span class="tipo-descr">${t.d}</span>
      </label>`
    ).join("");
    const ispirazione = st.ispirazione
      ? `<div class="ispirazione">
          ${st.ispirazione.immagine ? `<img src="${esc(st.ispirazione.immagine)}" alt="">` : ""}
          <p>Ispirata a <em>${esc(st.ispirazione.titolo)}</em>${st.ispirazione.anno ? `, ${esc(st.ispirazione.anno)}` : ""}. Ho ripreso i suoi colori e le sue misure: puoi cambiare tutto.</p>
          <button type="button" class="link-bottone" data-azione="togli-ispirazione">Togli</button>
        </div>`
      : "";
    return `${ispirazione}
      <fieldset class="campo campo--scelte"><legend class="campo-etichetta">Tipo di opera</legend><div class="tipi">${carte}</div></fieldset>
      ${testo("tipoAltro", "Che cosa ti piacerebbe?", st.tipoAltro, { aiuto: "Per esempio: un murale, un'opera su legno, un oggetto dipinto…", nascosto: st.tipo !== "altro" })}`;
  }

  function passoTecnica() {
    const lista = (TECNICHE[st.tipo] || TECNICHE.altro).map((t) => ({ v: t, t }));
    lista.push({ v: "Lascio scegliere a Marco", t: "Scegli tu" }, { v: "altro", t: "Altro…" });
    const aiuto =
      st.tipo === "scultura"
        ? "Il materiale cambia anche il bozzetto: prova bronzo, gesso o terracotta."
        : st.tipo === "incisione"
          ? "Le incisioni si stampano a mano, in pochi esemplari numerati."
          : "";
    return gruppo("tecnica", "Tecnica", lista, st.tecnica, { aiuto }) +
      testo("tecnicaAltro", "Quale tecnica?", st.tecnicaAltro, { nascosto: st.tecnica !== "altro" });
  }

  function passoMisure() {
    const fam = famigliaFormati(st.tipo);
    const orient =
      st.tipo === "scultura" ? "" : gruppo("orientamento", "Orientamento", ORIENTAMENTI, st.orientamento);
    const formati = FORMATI[fam].map((f) => {
      const m = misureCm({ ...st, formato: f.v });
      const max = Math.max(m.l, m.a);
      return { ...f, l: m.l, a: m.a, d: st.tipo === "scultura" ? `alta circa ${fmt(m.a)} cm` : `${fmt(m.l)} × ${fmt(m.a)} cm`, s: max };
    });
    const piu = formati.reduce((a, f) => Math.max(a, f.s), 1);
    const carte = formati
      .map((f) => {
        const lato = 14 + (f.s / piu) * 22;
        const w = (f.l / Math.max(f.l, f.a)) * lato;
        const h = (f.a / Math.max(f.l, f.a)) * lato;
        return `<label class="formato"><input type="radio" name="formato" value="${f.v}"${st.formato === f.v ? " checked" : ""}>
          <span class="formato-sagoma" aria-hidden="true"><i style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></i></span>
          <span class="formato-nome">${f.t}</span><span class="formato-misura">${f.d}</span></label>`;
      })
      .join("");
    const libero = `<label class="formato formato--libero"><input type="radio" name="formato" value="su-misura"${st.formato === "su-misura" ? " checked" : ""}>
        <span class="formato-sagoma" aria-hidden="true"><i class="formato-libero"></i></span>
        <span class="formato-nome">Su misura</span><span class="formato-misura">scrivi tu le misure</span></label>`;
    const campi = `<div class="misure-libere" data-campo="misure-libere"${st.formato === "su-misura" ? "" : " hidden"}>
        ${testo("larghezza", "Larghezza (cm)", st.larghezza, { tipo: "number", attr: 'min="1" max="1500" inputmode="decimal"' })}
        ${testo("altezza", "Altezza (cm)", st.altezza, { tipo: "number", attr: 'min="1" max="1500" inputmode="decimal"' })}
        ${st.tipo === "scultura" ? testo("profondita", "Profondità (cm)", st.profondita, { tipo: "number", attr: 'min="1" max="1500" inputmode="decimal"' }) : ""}
      </div>`;
    return `${orient}<fieldset class="campo campo--scelte"><legend class="campo-etichetta">Formato</legend>
        <p class="campo-aiuto">Guarda "In scala" qui accanto per vederla su una parete, vicino a una persona.</p>
        <div class="formati">${carte}${libero}</div>${campi}</fieldset>`;
  }

  function passoStile() {
    return (
      gruppo("stile", "Stile e soggetto", STILI, st.stile) +
      testo("stileAltro", "Quale stile o soggetto?", st.stileAltro, { nascosto: st.stile !== "altro", aiuto: "Per esempio: animali, architettura, fiori, un luogo preciso…" }) +
      gruppo("atmosfera", "Atmosfera", ATMOSFERE, st.atmosfera, { aiuto: "Cambia la luce e i colori del bozzetto." }) +
      testo("idea", "Raccontami la tua idea", st.idea, {
        tipo: "textarea",
        aiuto: "Cosa vorresti vedere, cosa deve evocare, per chi è. Anche poche parole vanno bene.",
        attr: 'maxlength="1500" placeholder="Per esempio: il mare d\'inverno visto dalla casa dei nonni, con un orizzonte basso e tanto cielo."',
      })
    );
  }

  function tavolozzeDisponibili() {
    const lista = TAVOLOZZE.slice();
    if (st.ispirazione && st.ispirazione.colori) lista.unshift({ v: "ispirazione", t: `Da «${st.ispirazione.titolo}»`, c: st.ispirazione.colori });
    return lista;
  }

  function mieiColori() {
    return `<div class="miei-colori" id="atelier-miei-colori">
      ${st.colori
        .map(
          (c, i) => `<label class="mio-colore" style="--c:${c}" title="${esc(nomeColore(c))}">
            <span class="visually-hidden">Colore ${i + 1}: ${esc(nomeColore(c))}</span>
            <input type="color" name="colore" data-i="${i}" value="${c.toLowerCase()}">
          </label>`
        )
        .join("")}
      ${st.colori.length < 6 ? '<button type="button" class="mio-colore-azione" data-azione="aggiungi-colore" aria-label="Aggiungi un colore">+</button>' : ""}
      ${st.colori.length > 2 ? '<button type="button" class="mio-colore-azione" data-azione="togli-colore" aria-label="Togli l\'ultimo colore">−</button>' : ""}
    </div>`;
  }

  function passoColori() {
    const tav = tavolozzeDisponibili()
      .map(
        (t) => `<label class="tavolozza"><input type="radio" name="tavolozza" value="${t.v}"${st.tavolozza === t.v ? " checked" : ""}>
          <span class="tavolozza-colori" aria-hidden="true">${t.c.map((c) => `<i style="--c:${c}"></i>`).join("")}</span>
          <span class="tavolozza-nome">${esc(t.t)}</span></label>`
      )
      .join("");
    return `<fieldset class="campo campo--scelte"><legend class="campo-etichetta">Tavolozza</legend><div class="tavolozze">${tav}</div></fieldset>
      <div class="campo">
        <p class="campo-etichetta" id="atelier-miei-colori-titolo">I tuoi colori</p>
        <p class="campo-aiuto">Tocca un colore per cambiarlo, oppure aggiungine uno.</p>
        ${mieiColori()}
      </div>
      ${gruppo("tono", "Tono generale", TONI, st.tono)}`;
  }

  function anteprimeRiferimenti() {
    return st.riferimenti
      .map(
        (r, i) => `<figure class="riferimento"><img src="${r.url}" alt="${esc(r.nome)}">
          <button type="button" class="riferimento-togli" data-azione="togli-riferimento" data-i="${i}" aria-label="Togli ${esc(r.nome)}">×</button></figure>`
      )
      .join("");
  }

  function passoDettagli() {
    return (
      gruppo("destinazione", "Dove andrà?", DESTINAZIONI, st.destinazione) +
      (haCornice() ? gruppo("cornice", "Cornice", CORNICI, st.cornice) : "") +
      gruppo("budget", "Budget indicativo", BUDGET, st.budget, { aiuto: "Serve solo a capire da dove partire: il prezzo lo concordiamo insieme." }) +
      gruppo("tempi", "Quando ti servirebbe?", TEMPI, st.tempi, {
        extra: testo("data", "Data", st.data, { tipo: "date", nascosto: st.tempi !== "data" }),
      }) +
      `<div class="campo">
        <p class="campo-etichetta">Immagini di ispirazione</p>
        <p class="campo-aiuto">La parete dove andrà, opere che ami, una foto con i colori giusti: fino a 4. Finiscono nel PDF e restano sul tuo dispositivo.</p>
        <div class="riferimenti" id="atelier-riferimenti">${anteprimeRiferimenti()}
          <label class="riferimento-aggiungi"${st.riferimenti.length >= 4 ? " hidden" : ""}><input type="file" name="riferimenti" accept="image/*" multiple class="visually-hidden"><span aria-hidden="true">+</span> Aggiungi</label>
        </div>
      </div>`
    );
  }

  function passoDati() {
    return `<p class="passo-intro">Così posso risponderti. I dati finiscono solo nel PDF e nell'email che mandi tu.</p>
      ${testo("nome", "Nome e cognome", st.nome, { obbligatorio: true, attr: 'autocomplete="name"' })}
      ${testo("email", "Email", st.email, { tipo: "email", obbligatorio: true, attr: 'autocomplete="email" inputmode="email"' })}
      <div class="campi-affiancati">
        ${testo("telefono", "Telefono", st.telefono, { tipo: "tel", attr: 'autocomplete="tel"' })}
        ${testo("citta", "Città", st.citta, { attr: 'autocomplete="address-level2"' })}
      </div>
      ${testo("note", "Qualcos'altro per me?", st.note, { tipo: "textarea", attr: 'maxlength="1000"' })}
      <div class="campo campo--consenso" data-campo="consenso">
        <label class="consenso"><input type="checkbox" name="consenso" id="atelier-consenso"${st.consenso ? " checked" : ""} aria-describedby="atelier-consenso-errore">
          <span>Acconsento a che Marco De Chiara usi questi dati solo per rispondere alla mia proposta. <span class="obbligatorio">(obbligatorio)</span></span></label>
        <p class="campo-errore" id="atelier-consenso-errore" hidden></p>
      </div>`;
  }

  function passoFine() {
    const v = valori();
    const riga = (k, x) => (x ? `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>` : "");
    const gruppoR = (titolo, n, righe) =>
      `<section class="riepilogo-gruppo"><h4>${titolo} <button type="button" class="link-bottone" data-vai="${n}">Modifica<span class="visually-hidden"> ${titolo}</span></button></h4><dl>${righe}</dl></section>`;
    const email = contatti().email;
    return `<div class="riepilogo">
        ${gruppoR("L'opera", 0, riga("Tipo", v.tipo) + riga("Tecnica", v.tecnica || "Da definire") + riga("Misure", v.misure) + riga("Orientamento", v.orientamento))}
        ${gruppoR("Stile", 3, riga("Stile", v.stile) + riga("Atmosfera", v.atmosfera) + riga("Idea", st.idea.trim()))}
        ${gruppoR("Colori", 4, `<div><dt>Tavolozza</dt><dd>${esc(v.tavolozza)} <span class="riepilogo-colori" aria-hidden="true">${st.colori.map((c) => `<i style="--c:${c}"></i>`).join("")}</span></dd></div>` + riga("Tono", v.tono))}
        ${gruppoR("Dettagli", 5, riga("Destinazione", v.destinazione) + riga("Cornice", v.cornice) + riga("Budget", v.budget) + riga("Tempi", v.tempi) + riga("Immagini", st.riferimenti.length ? `${st.riferimenti.length} allegate` : ""))}
        ${gruppoR("I tuoi dati", 6, riga("Nome", st.nome) + riga("Email", st.email) + riga("Telefono", st.telefono) + riga("Città", st.citta))}
      </div>
      <div class="invio" id="atelier-invio">
        <button type="button" class="bottone bottone--grande" data-azione="crea-pdf" id="atelier-crea">Crea la proposta in PDF</button>
        <p class="invio-nota">${email ? `Il PDF si scarica sul tuo dispositivo e si apre l'email per me, già indirizzata a <strong>${esc(email)}</strong>: ti basta allegarlo e inviare.` : "Il PDF si scarica sul tuo dispositivo."}</p>
        <div class="invio-fatto" id="atelier-fatto" hidden>
          <p class="invio-titolo" tabindex="-1" id="atelier-fatto-titolo">La tua proposta è pronta</p>
          <p class="invio-file"><span class="invio-icona" aria-hidden="true">PDF</span><span id="atelier-nome-pdf"></span></p>
          <ol class="invio-passi" id="atelier-passi-invio"></ol>
          <div class="invio-azioni">
            <button type="button" class="bottone" data-azione="condividi" hidden id="atelier-condividi">Invia il PDF…</button>
            ${email ? '<button type="button" class="bottone" data-azione="email" id="atelier-apri-email">Apri l\'email per Marco</button>' : ""}
            <button type="button" class="bottone bottone--leggero" data-azione="scarica" id="atelier-scarica">Scarica di nuovo</button>
          </div>
          <p class="invio-ricomincia"><button type="button" class="link-bottone" data-azione="ricomincia">Componi un'altra opera</button></p>
        </div>
        <p class="campo-errore" id="atelier-errore-pdf" role="alert" hidden></p>
      </div>`;
  }

  const PASSI = [
    { breve: "Opera", titolo: "Che opera immagini?", html: passoOpera },
    { breve: "Tecnica", titolo: "Con quale tecnica?", html: passoTecnica },
    { breve: "Misure", titolo: "Quanto grande?", html: passoMisure },
    { breve: "Stile", titolo: "Stile e soggetto", html: passoStile },
    { breve: "Colori", titolo: "I colori", html: passoColori },
    { breve: "Dettagli", titolo: "Gli ultimi dettagli", html: passoDettagli },
    { breve: "Contatti", titolo: "A chi rispondo?", html: passoDati },
    { breve: "Proposta", titolo: "La tua proposta", html: passoFine },
  ];
  const ULTIMO = PASSI.length - 1;
  const DATI = ULTIMO - 1;

  /* ---------- Navigazione tra i passi ---------- */
  function mostraPasso(n, { fuoco = true } = {}) {
    passo = limita(n, 0, ULTIMO);
    const corpo = $("#atelier-corpo");
    const p = PASSI[passo];
    corpo.innerHTML = `<section class="passo" aria-labelledby="atelier-passo-titolo">
        <h3 class="passo-titolo" id="atelier-passo-titolo" tabindex="-1"><span class="passo-numero" aria-hidden="true">${passo + 1}</span>${p.titolo}</h3>
        ${p.html()}
      </section>`;
    corpo.scrollTop = 0;
    $$(".tappa", $("#atelier-tappe")).forEach((b, i) => {
      if (i === passo) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      b.classList.toggle("is-fatta", i < passo);
    });
    $("#atelier-indietro").hidden = passo === 0;
    const avanti = $("#atelier-avanti");
    avanti.hidden = passo === ULTIMO;
    avanti.textContent = passo === DATI ? "Vedi la proposta" : "Avanti";
    $("#atelier-conta").textContent = `Passo ${passo + 1} di ${PASSI.length}: ${p.breve}`;
    if (passo === ULTIMO && ultimoPdf) mostraFatto();
    if (fuoco) $("#atelier-passo-titolo").focus({ preventScroll: true });
    if (!menoMovimento()) corpo.firstElementChild.classList.add("is-entra");
  }

  function costruisciTappe() {
    $("#atelier-tappe").innerHTML = PASSI.map(
      (p, i) => `<li><button type="button" class="tappa" data-vai="${i}"><span class="tappa-n" aria-hidden="true">${i + 1}</span><span class="tappa-nome">${p.breve}</span></button></li>`
    ).join("");
  }

  const emailValida = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(x || "").trim());
  function errore(nome, messaggio) {
    const campo = $(`#${id(nome)}`);
    const p = $(`#${id(nome)}-errore`);
    if (!p) return;
    p.textContent = messaggio || "";
    p.hidden = !messaggio;
    if (campo) campo.setAttribute("aria-invalid", messaggio ? "true" : "false");
  }
  function datiValidi(mostra) {
    const problemi = [];
    if (!st.nome.trim()) problemi.push(["nome", "Scrivi il tuo nome, così so come chiamarti."]);
    if (!emailValida(st.email)) problemi.push(["email", st.email.trim() ? "Questa email non sembra completa: controlla la chiocciola e il punto." : "Scrivi la tua email, così posso risponderti."]);
    if (!st.consenso) problemi.push(["consenso", "Serve il tuo consenso per poterti rispondere."]);
    if (mostra) {
      ["nome", "email", "consenso"].forEach((n) => errore(n, (problemi.find((x) => x[0] === n) || [])[1]));
      if (problemi.length) $(`#${id(problemi[0][0])}`)?.focus();
    }
    return !problemi.length;
  }

  function vai(n) {
    if (n === ULTIMO && !datiValidi(false)) {
      mostraPasso(DATI);
      datiValidi(true);
      return;
    }
    mostraPasso(n);
  }

  /* ---------- Anteprima: bozzetto e vista in scala ---------- */
  let attesaAnteprima = 0;
  function aggiornaAnteprima(subito) {
    $("#atelier-riassunto").textContent = riassunto();
    clearTimeout(attesaAnteprima);
    attesaAnteprima = setTimeout(disegnaAnteprima, subito ? 0 : 90);
  }

  function misuraPalco() {
    const palco = $("#atelier-palco");
    const r = palco.getBoundingClientRect();
    return { w: Math.max(80, r.width), h: Math.max(80, r.height) };
  }

  function disegnaAnteprima() {
    if (!atelierAperto()) return;
    const { w: pw, h: ph } = misuraPalco();
    const rapporto = proporzione(st);
    let w = pw * 0.9;
    let h = w / rapporto;
    if (h > ph * 0.9) {
      h = ph * 0.9;
      w = h * rapporto;
    }
    const cornice = $("#atelier-cornice");
    cornice.style.width = `${w.toFixed(1)}px`;
    cornice.style.height = `${h.toFixed(1)}px`;
    // al massimo ~700 mila pixel: le incisioni si calcolano punto per punto
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(700000 / (w * h)));
    const sopra = $(".atelier-tela.is-sopra");
    const sotto = $$(".atelier-tela").find((c) => c !== sopra);
    const op = opDa(st);
    if (primaPittura && !menoMovimento() && op.tipo !== "incisione" && op.tipo !== "disegno") {
      // la prima volta il bozzetto si dipinge sotto i tuoi occhi
      primaPittura = false;
      sotto.width = Math.round(w * dpr);
      sotto.height = Math.round(h * dpr);
      const ctx = sotto.getContext("2d");
      const scena = Bozzetto.componi(op, sotto.width, sotto.height);
      Bozzetto.preparaFondo(ctx, scena);
      sotto.classList.add("is-sopra");
      sopra.classList.remove("is-sopra");
      const t0 = performance.now();
      const passoAnim = (ora) => {
        const t = Math.min(1, (ora - t0) / 1300);
        Bozzetto.dipingi(ctx, scena, 1 - Math.pow(1 - t, 2));
        if (t < 1) requestAnimationFrame(passoAnim);
        else {
          Bozzetto.finisci(ctx, scena);
          if (vista === "scala") disegnaVistaScala();
        }
      };
      requestAnimationFrame(passoAnim);
      return;
    }
    primaPittura = false;
    Bozzetto.disegna(sotto, op, w * dpr, h * dpr);
    sotto.classList.add("is-sopra");
    sopra.classList.remove("is-sopra");
    $("#atelier-tela-a").setAttribute("aria-hidden", sotto.id === "atelier-tela-a" ? "false" : "true");
    $("#atelier-tela-b").setAttribute("aria-hidden", sotto.id === "atelier-tela-b" ? "false" : "true");
    if (vista === "scala") disegnaVistaScala();
  }

  function disegnaVistaScala() {
    const { w, h } = misuraPalco();
    disegnaScala($("#atelier-scala"), st, $(".atelier-tela.is-sopra"), w, h);
    const { l, a } = misureCm(st);
    $("#atelier-scala").setAttribute("aria-label", `La tua opera, ${fmt(l)} per ${fmt(a)} centimetri, su una parete accanto a una persona alta 170 cm`);
  }

  function cambiaVista(v) {
    vista = v;
    $$(".atelier-vista-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === v)));
    $("#atelier-cornice").hidden = v !== "bozzetto";
    $("#atelier-scala").hidden = v !== "scala";
    if (v === "scala") disegnaVistaScala();
  }

  /* ---------- Le scelte cambiano lo stato ---------- */
  const SEMPLICI = ["tipoAltro", "tecnica", "tecnicaAltro", "orientamento", "larghezza", "altezza", "profondita", "stile", "stileAltro", "atmosfera", "idea", "tono", "destinazione", "cornice", "budget", "tempi", "data", "nome", "email", "telefono", "citta", "note"];
  const mostra = (sel, si) => {
    const el = $(sel);
    if (el) el.hidden = !si;
  };

  function alCambio(e) {
    const el = e.target;
    const nome = el.name;
    if (!nome) return;
    let ridisegna = true;
    if (nome === "tipo") {
      st.tipo = el.value;
      const fam = famigliaFormati(st.tipo);
      if (st.formato !== "su-misura" && !FORMATI[fam].some((f) => f.v === st.formato)) st.formato = FORMATI[fam][1].v;
      if (st.tecnica && st.tecnica !== "altro" && st.tecnica !== "Lascio scegliere a Marco" && !(TECNICHE[st.tipo] || []).includes(st.tecnica)) st.tecnica = "";
      mostra('[data-campo="tipoAltro"]', st.tipo === "altro");
    } else if (nome === "formato") {
      st.formato = el.value;
      mostra('[data-campo="misure-libere"]', st.formato === "su-misura");
      if (st.formato === "su-misura" && !st.larghezza && !st.altezza) {
        const m = misureCm({ ...st, formato: st.tipo === "scultura" ? "media" : "medio" });
        st.larghezza = String(m.l);
        st.altezza = String(m.a);
        if (st.tipo === "scultura") st.profondita = String(m.p);
        ["larghezza", "altezza", "profondita"].forEach((k) => {
          const x = $(`#${id(k)}`);
          if (x) x.value = st[k];
        });
      }
    } else if (nome === "tavolozza") {
      st.tavolozza = el.value;
      const t = tavolozzeDisponibili().find((x) => x.v === el.value);
      if (t) st.colori = t.c.slice();
      const box = $("#atelier-miei-colori");
      if (box) box.outerHTML = mieiColori();
    } else if (nome === "colore") {
      const i = Number(el.dataset.i);
      if (hexValido(el.value)) {
        st.colori[i] = el.value.toUpperCase();
        el.parentElement.style.setProperty("--c", st.colori[i]);
        el.parentElement.title = nomeColore(st.colori[i]);
      }
      st.tavolozza = "mia";
      $$('input[name="tavolozza"]').forEach((r) => (r.checked = false));
      if (e.type === "input") ridisegna = true;
    } else if (nome === "consenso") {
      st.consenso = el.checked;
      if (st.consenso) errore("consenso", "");
      ridisegna = false;
    } else if (nome === "riferimenti") {
      aggiungiRiferimenti(el.files);
      el.value = "";
      return;
    } else if (SEMPLICI.includes(nome)) {
      st[nome] = el.value;
      if (nome === "tecnica") mostra('[data-campo="tecnicaAltro"]', st.tecnica === "altro");
      if (nome === "stile") mostra('[data-campo="stileAltro"]', st.stile === "altro");
      if (nome === "tempi") mostra('[data-campo="data"]', st.tempi === "data");
      if (["nome", "email", "telefono", "citta", "note", "idea", "data", "tipoAltro", "tecnicaAltro", "stileAltro"].includes(nome)) ridisegna = false;
      if ((nome === "nome" || nome === "email") && e.type === "change") {
        if (nome === "nome" && st.nome.trim()) errore("nome", "");
        if (nome === "email" && emailValida(st.email)) errore("email", "");
      }
    }
    ultimoPdf = null;
    salvaBozza();
    if (ridisegna) aggiornaAnteprima();
    else $("#atelier-riassunto").textContent = riassunto();
  }

  // Immagini di ispirazione: rimpicciolite nel browser e tenute in memoria
  async function aggiungiRiferimenti(files) {
    const lista = Array.from(files || []).filter((f) => /^image\//.test(f.type)).slice(0, 4 - st.riferimenti.length);
    for (const f of lista) {
      try {
        const url = URL.createObjectURL(f);
        const img = await new Promise((ok, ko) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = ko;
          i.src = url;
        });
        const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        const x = c.getContext("2d");
        x.fillStyle = "#FFFFFF";
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        st.riferimenti.push({ nome: f.name || "immagine", url: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height });
      } catch (err) {
        /* immagine non leggibile: la saltiamo */
      }
    }
    ultimoPdf = null;
    aggiornaRiferimenti();
  }
  function aggiornaRiferimenti() {
    const box = $("#atelier-riferimenti");
    if (!box) return;
    box.querySelectorAll(".riferimento").forEach((x) => x.remove());
    box.insertAdjacentHTML("afterbegin", anteprimeRiferimenti());
    box.querySelector(".riferimento-aggiungi").hidden = st.riferimenti.length >= 4;
  }

  function alClic(e) {
    const vaiA = e.target.closest("[data-vai]");
    if (vaiA) {
      vai(Number(vaiA.dataset.vai));
      return;
    }
    const b = e.target.closest("[data-azione]");
    if (!b) return;
    const azione = b.dataset.azione;
    if (azione === "aggiungi-colore" && st.colori.length < 6) {
      const ult = st.colori[st.colori.length - 1];
      st.colori.push(daHsl(inHsl(ult)[0] + 40, Math.max(0.35, inHsl(ult)[1]), 0.6));
      st.tavolozza = "mia";
    } else if (azione === "togli-colore" && st.colori.length > 2) {
      st.colori.pop();
      st.tavolozza = "mia";
    } else if (azione === "togli-riferimento") {
      st.riferimenti.splice(Number(b.dataset.i), 1);
      aggiornaRiferimenti();
      $("#atelier-riferimenti .riferimento-aggiungi input")?.focus();
      ultimoPdf = null;
      return;
    } else if (azione === "togli-ispirazione") {
      st.ispirazione = null;
      if (st.tavolozza === "ispirazione") st.tavolozza = "mia";
      mostraPasso(passo);
      salvaBozza();
      return;
    } else if (azione === "crea-pdf") {
      creaEInvia(b);
      return;
    } else if (azione === "email") {
      apriEmail();
      return;
    } else if (azione === "condividi") {
      condividi();
      return;
    } else if (azione === "scarica") {
      if (ultimoPdf) scarica(ultimoPdf);
      return;
    } else if (azione === "ricomincia") {
      const tenuti = { nome: st.nome, email: st.email, telefono: st.telefono, citta: st.citta };
      st = { ...statoIniziale(), ...tenuti, seme: Math.floor(Math.random() * 9999) };
      ultimoPdf = null;
      salvaBozza();
      mostraPasso(0);
      aggiornaAnteprima(true);
      return;
    } else return;
    // colori cambiati con + e −
    const box = $("#atelier-miei-colori");
    if (box) box.outerHTML = mieiColori();
    $$('input[name="tavolozza"]').forEach((r) => (r.checked = false));
    ultimoPdf = null;
    salvaBozza();
    aggiornaAnteprima();
  }

  /* ---------- Aprire e chiudere ---------- */
  const atelierAperto = () => {
    const d = $("#atelier");
    return d && (d.open || d.hasAttribute("open"));
  };

  // Una tavolozza di 5 colori dalla foto di un'opera (media a gruppi)
  function coloriDaImmagine(img) {
    try {
      const lato = 48;
      const c = document.createElement("canvas");
      c.width = c.height = lato;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, lato, lato);
      const d = x.getImageData(0, 0, lato, lato).data;
      const px = [];
      for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      let centri = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => px.slice().sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))[Math.floor(q * (px.length - 1))].slice());
      for (let giro = 0; giro < 8; giro++) {
        const somme = centri.map(() => [0, 0, 0, 0]);
        for (const p of px) {
          let mi = 0;
          let md = Infinity;
          centri.forEach((cc, i) => {
            const dd = (p[0] - cc[0]) ** 2 + (p[1] - cc[1]) ** 2 + (p[2] - cc[2]) ** 2;
            if (dd < md) {
              md = dd;
              mi = i;
            }
          });
          const s = somme[mi];
          s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
        }
        centri = centri.map((cc, i) => (somme[i][3] ? [somme[i][0] / somme[i][3], somme[i][1] / somme[i][3], somme[i][2] / somme[i][3]] : cc));
      }
      return centri.map((cc) => aHex(cc[0], cc[1], cc[2])).sort((a, b) => luce(a) - luce(b));
    } catch (e) {
      return null; // foto non leggibile (da un altro sito)
    }
  }

  // Da un'opera di Marco: tipo, tecnica, misure e colori
  function daOpera(o, img) {
    const tecnicaOpera = String(o.tecnica || "").trim();
    const t = tecnicaOpera.toLowerCase();
    let tipo = "quadro";
    if (o.categoria === "sculture") tipo = "scultura";
    else if (/xilo|lino|incis|acquaforte|puntasecca/.test(t)) tipo = "incisione";
    else if (o.categoria === "stampe") tipo = "stampa";
    const tecniche = TECNICHE[tipo] || [];
    const trovata = tecniche.find((x) => t.includes(x.toLowerCase().split(" ")[0]));
    const m = String(o.misure || "").match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
    const colori = img ? coloriDaImmagine(img) : null;
    const nuovo = {
      ...statoIniziale(),
      nome: st.nome,
      email: st.email,
      telefono: st.telefono,
      citta: st.citta,
      tipo,
      tecnica: trovata || (tecnicaOpera ? "altro" : ""),
      tecnicaAltro: trovata ? "" : tecnicaOpera,
      seme: Math.floor(Math.random() * 9999),
      ispirazione: {
        titolo: String(o.titolo || "").trim(),
        anno: o.anno || "",
        tecnica: tecnicaOpera,
        misure: o.misure || "",
        colori,
        immagine: o.immagine || "",
      },
    };
    if (m) {
      // la foto dice se l'opera è verticale o orizzontale
      let l = parseFloat(m[1].replace(",", "."));
      let a = parseFloat(m[2].replace(",", "."));
      const rapporto = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0;
      if (rapporto && Math.abs(rapporto - 1) > 0.06) {
        const grande = Math.max(l, a);
        const piccola = Math.min(l, a);
        l = rapporto > 1 ? grande : piccola;
        a = rapporto > 1 ? piccola : grande;
      }
      nuovo.formato = "su-misura";
      nuovo.larghezza = String(l);
      nuovo.altezza = String(a);
      nuovo.orientamento = Math.abs(l - a) < 1 ? "quadrato" : l > a ? "orizzontale" : "verticale";
    } else {
      nuovo.formato = FORMATI[famigliaFormati(tipo)][1].v;
    }
    if (colori) {
      nuovo.tavolozza = "ispirazione";
      nuovo.colori = colori.slice();
    }
    return nuovo;
  }

  function apri({ ispirazione = null, immagine = null, da = null } = {}) {
    const d = $("#atelier");
    if (!d) return;
    origine = da || document.activeElement;
    if (ispirazione) {
      st = daOpera(ispirazione, immagine);
    } else if (!st.__caricato) {
      const b = leggiBozza();
      if (b) st = { ...statoIniziale(), ...b, riferimenti: [], consenso: false };
    }
    st.__caricato = true;
    ultimoPdf = null;
    primaPittura = true;
    costruisciTappe();
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
    document.documentElement.classList.add("atelier-aperto");
    if (!menoMovimento()) {
      d.classList.add("is-entra");
      d.addEventListener("animationend", () => d.classList.remove("is-entra"), { once: true });
    }
    cambiaVista("bozzetto");
    mostraPasso(ispirazione ? 0 : passo === ULTIMO ? 0 : passo);
    requestAnimationFrame(() => aggiornaAnteprima(true));
  }

  function chiudi() {
    const d = $("#atelier");
    if (typeof d.close === "function") d.close();
    else d.removeAttribute("open");
  }

  /* ------------------------------------------------------------------
     6. Il PDF della proposta
     jsPDF (js/lib) e i caratteri del sito (js/lib/font) si scaricano
     solo quando servono, la prima volta che si crea un PDF.
     ------------------------------------------------------------------ */
  let jsPdfPronto = null;
  function caricaJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPdfPronto) {
      jsPdfPronto = new Promise((ok, ko) => {
        const s = document.createElement("script");
        s.src = "js/lib/jspdf.umd.min.js";
        s.onload = () => (window.jspdf && window.jspdf.jsPDF ? ok(window.jspdf.jsPDF) : ko(new Error("jsPDF")));
        s.onerror = () => {
          jsPdfPronto = null;
          ko(new Error("jsPDF non trovato"));
        };
        document.head.append(s);
      });
    }
    return jsPdfPronto;
  }
  const fontCache = {};
  async function caricaFont(file) {
    if (fontCache[file]) return fontCache[file];
    const r = await fetch(`js/lib/font/${file}`);
    if (!r.ok) throw new Error(`Carattere ${file} non trovato`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    fontCache[file] = btoa(bin);
    return fontCache[file];
  }

  // I caratteri del PDF hanno solo le lettere latine: le altre si semplificano
  const CONSENTITI = /[\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\n]/;
  function pulisci(t) {
    let out = "";
    for (const ch of String(t ?? "")) {
      if (CONSENTITI.test(ch)) out += ch;
      else {
        const base = ch.normalize("NFD")[0];
        if (base && CONSENTITI.test(base)) out += base;
      }
    }
    return out.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  }

  const slugNome = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  function canvasBozzetto(latoMax) {
    const rapporto = proporzione(st);
    const w = rapporto >= 1 ? latoMax : latoMax * rapporto;
    const h = rapporto >= 1 ? latoMax / rapporto : latoMax;
    const c = document.createElement("canvas");
    Bozzetto.disegna(c, opDa(st), w, h);
    return c;
  }

  async function creaPdf() {
    const jsPDF = await caricaJsPdf();
    const [corsivo, corsivoForte, jost, jostMedio] = await Promise.all([
      caricaFont("cormorant-corsivo.ttf"),
      caricaFont("cormorant-corsivo-forte.ttf"),
      caricaFont("jost.ttf"),
      caricaFont("jost-medio.ttf"),
    ]);
    await Bozzetto.caricaTrama();
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    doc.addFileToVFS("Cormorant-Italic.ttf", corsivo);
    doc.addFont("Cormorant-Italic.ttf", "Cormorant", "italic");
    doc.addFileToVFS("Cormorant-SemiBoldItalic.ttf", corsivoForte);
    doc.addFont("Cormorant-SemiBoldItalic.ttf", "Cormorant", "bolditalic");
    doc.addFileToVFS("Jost-Regular.ttf", jost);
    doc.addFont("Jost-Regular.ttf", "Jost", "normal");
    doc.addFileToVFS("Jost-Medium.ttf", jostMedio);
    doc.addFont("Jost-Medium.ttf", "Jost", "bold");

    const C = {
      parete: [250, 250, 247], inchiostro: [18, 38, 26], grafite: [91, 106, 95], linea: [221, 226, 217],
      accento: [31, 90, 46], acido: [195, 234, 54], fascia: "#0B2316",
    };
    const v = valori();
    const ora = new Date();
    const dataTesto = ora.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    const codice = `MDC-${String(ora.getFullYear()).slice(2)}${String(ora.getMonth() + 1).padStart(2, "0")}${String(ora.getDate()).padStart(2, "0")}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
    const M = 18;
    const LARGO = 210 - 2 * M;
    let pagina = 1;
    const sfondo = () => {
      doc.setFillColor(...C.parete);
      doc.rect(0, 0, 210, 297, "F");
    };
    sfondo();

    // La fascia scura con il nome, come la barra del sito
    const fascia = document.createElement("canvas");
    fascia.width = 2400;
    fascia.height = 330;
    Bozzetto.fascia(fascia, C.fascia, 5);
    doc.addImage(fascia.toDataURL("image/png"), "PNG", -4, 9, 218, 30);
    const tratto = document.createElement("canvas");
    tratto.width = 900;
    tratto.height = 90;
    Bozzetto.fascia(tratto, "#C3EA36", 9, 0.55);
    doc.addImage(tratto.toDataURL("image/png"), "PNG", M + 1, 26.6, 54, 5.4);
    doc.setFont("Cormorant", "italic");
    doc.setFontSize(27);
    doc.setTextColor(...C.parete);
    doc.text("Marco De Chiara", M, 27.5);
    doc.setFont("Jost", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...C.acido);
    doc.setCharSpace(0.55);
    doc.text("PROPOSTA DI OPERA SU MISURA", 210 - M, 26, { align: "right" });
    doc.setCharSpace(0);

    // Titolo dell'opera
    let y = 58;
    doc.setFont("Cormorant", "italic");
    doc.setFontSize(25);
    doc.setTextColor(...C.inchiostro);
    const titolo = pulisci(`${v.tipo}${v.tecnica && v.tecnica !== "Lascio scegliere a Marco" ? ", " + v.tecnica.toLowerCase() : ""}`);
    doc.text(doc.splitTextToSize(titolo, LARGO)[0], M, y);
    y += 7;
    doc.setFont("Jost", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.grafite);
    doc.text(pulisci(`${v.misure}  ·  proposta di ${st.nome.trim()}  ·  ${dataTesto}  ·  n. ${codice}`), M, y);
    y += 4;
    doc.setDrawColor(...C.inchiostro);
    doc.setLineWidth(0.25);
    doc.line(M, y, 210 - M, y);

    // Colonna sinistra: il bozzetto in cornice, la tavolozza, la vista in scala
    const xs = M;
    const ls = 86;
    let ys = y + 8;
    const boz = canvasBozzetto(1300);
    const rapporto = boz.width / boz.height;
    let bw = ls - 10;
    let bh = bw / rapporto;
    if (bh > 104) {
      bh = 104;
      bw = bh * rapporto;
    }
    const fw = bw + 10;
    const fh = bh + 10;
    const fx = xs + (ls - fw) / 2;
    doc.setFillColor(226, 230, 222);
    doc.rect(fx + 0.9, ys + 1.2, fw, fh, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(fx, ys, fw, fh, "F");
    doc.addImage(boz.toDataURL("image/jpeg", 0.86), "JPEG", fx + 5, ys + 5, bw, bh);
    ys += fh + 4.5;
    doc.setFont("Jost", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.grafite);
    doc.text("Bozzetto indicativo creato dal sito: proporzioni e colori, non l'opera finale.", xs + ls / 2, ys, { align: "center", maxWidth: ls });
    ys += 9;
    const etichetta = (testo, x, yy) => {
      doc.setFont("Jost", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...C.accento);
      doc.setCharSpace(0.45);
      doc.text(testo.toUpperCase(), x, yy);
      doc.setCharSpace(0);
    };
    etichetta("Tavolozza", xs, ys);
    doc.setFont("Jost", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.grafite);
    doc.text(pulisci(`${v.tavolozza} · tono ${v.tono.toLowerCase()}`), xs + ls, ys, { align: "right" });
    ys += 5;
    const n = st.colori.length;
    const passoC = ls / n;
    st.colori.forEach((c, i) => {
      const cx = xs + passoC * i + passoC / 2;
      doc.setFillColor(...inRgb(c));
      doc.circle(cx, ys + 5, 4.6, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.inchiostro);
      doc.text(pulisci(nomeColore(c)), cx, ys + 14, { align: "center", maxWidth: passoC - 1 });
      doc.setTextColor(...C.grafite);
      doc.text(c, cx, ys + 17.2, { align: "center" });
    });
    ys += 25;
    const scala = document.createElement("canvas");
    disegnaScala(scala, st, boz, 640, 400);
    etichetta("In scala", xs, ys);
    doc.setFont("Jost", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.grafite);
    doc.text("accanto a una persona alta 170 cm", xs + ls, ys, { align: "right" });
    ys += 3;
    doc.addImage(scala.toDataURL("image/jpeg", 0.88), "JPEG", xs, ys, ls, ls * (400 / 640));
    ys += ls * (400 / 640);

    // Colonna destra: le scelte
    const xd = 116;
    const ld = 210 - M - xd;
    let yd = y + 9;
    const sezione = (titoloS, righe) => {
      const valide = righe.filter((r) => r[1]);
      if (!valide.length) return;
      etichetta(titoloS, xd, yd);
      yd += 2.5;
      doc.setDrawColor(...C.linea);
      doc.setLineWidth(0.2);
      doc.line(xd, yd, xd + ld, yd);
      yd += 5;
      valide.forEach(([k, val]) => {
        doc.setFont("Jost", "normal");
        doc.setFontSize(7.6);
        doc.setTextColor(...C.grafite);
        doc.text(k, xd, yd);
        doc.setFontSize(9.4);
        doc.setTextColor(...C.inchiostro);
        const righeTesto = doc.splitTextToSize(pulisci(val), ld - 25);
        doc.text(righeTesto, xd + 25, yd);
        yd += Math.max(1, righeTesto.length) * 4.3 + 1.6;
      });
      yd += 4;
    };
    sezione("L'opera", [["Tipo", v.tipo], ["Tecnica", v.tecnica || "Da definire"], ["Misure", v.misure], ["Orientamento", v.orientamento]]);
    sezione("Stile", [["Stile", v.stile], ["Atmosfera", v.atmosfera || "Da definire"]]);
    sezione("Dettagli", [["Destinazione", v.destinazione], ["Cornice", v.cornice], ["Budget", v.budget], ["Tempi", v.tempi]]);
    if (st.ispirazione) {
      const I = st.ispirazione;
      sezione("Ispirata a", [["Opera", `«${I.titolo}»${I.anno ? ", " + I.anno : ""}`], ["Tecnica", I.tecnica], ["Misure", I.misure]]);
      const foto = $(`img[src$="${CSS.escape(I.immagine || "##")}"]`);
      if (foto && foto.complete && foto.naturalWidth) {
        try {
          const k = Math.min(1, 600 / Math.max(foto.naturalWidth, foto.naturalHeight));
          const c = document.createElement("canvas");
          c.width = Math.round(foto.naturalWidth * k);
          c.height = Math.round(foto.naturalHeight * k);
          c.getContext("2d").drawImage(foto, 0, 0, c.width, c.height);
          const iw = 30;
          const ih = Math.min(40, iw * (c.height / c.width));
          doc.addImage(c.toDataURL("image/jpeg", 0.86), "JPEG", xd + 25, yd - 2, ih * (c.width / c.height), ih);
          yd += ih + 6;
        } catch (e) {
          /* foto non utilizzabile */
        }
      }
    }
    sezione("Contatti", [["Nome", st.nome.trim()], ["Email", st.email.trim()], ["Telefono", st.telefono.trim()], ["Città", st.citta.trim()]]);

    // Sotto, a tutta larghezza: l'idea, le note e le immagini di riferimento
    y = Math.max(ys, yd) + 8;
    const nuovaPagina = () => {
      doc.addPage();
      pagina++;
      sfondo();
      y = 22;
    };
    const blocco = (titoloB, testoB) => {
      const t = pulisci(testoB);
      if (!t) return;
      doc.setFont("Jost", "normal");
      doc.setFontSize(10);
      const righe = doc.splitTextToSize(t, LARGO);
      if (y + 12 + righe.length * 5 > 280) nuovaPagina();
      doc.setFont("Cormorant", "bolditalic");
      doc.setFontSize(15);
      doc.setTextColor(...C.inchiostro);
      doc.text(titoloB, M, y);
      y += 6.5;
      doc.setFont("Jost", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.inchiostro);
      righe.forEach((riga) => {
        if (y > 282) nuovaPagina();
        doc.text(riga, M, y);
        y += 5;
      });
      y += 5;
    };
    blocco("L'idea", st.idea);
    blocco("Note per Marco", st.note);
    if (st.riferimenti.length) {
      const lato = (LARGO - 3 * 6) / 4;
      const alto = Math.max(...st.riferimenti.map((r) => Math.min(lato * 1.35, lato * (r.h / r.w))));
      if (y + 10 + alto > 282) nuovaPagina();
      doc.setFont("Cormorant", "bolditalic");
      doc.setFontSize(15);
      doc.setTextColor(...C.inchiostro);
      doc.text("Immagini di riferimento", M, y);
      y += 4;
      st.riferimenti.forEach((r, i) => {
        let w = lato;
        let h = lato * (r.h / r.w);
        if (h > lato * 1.35) {
          h = lato * 1.35;
          w = h * (r.w / r.h);
        }
        doc.addImage(r.url, "JPEG", M + i * (lato + 6), y, w, h);
      });
      y += alto + 6;
    }

    // Piede di ogni pagina
    const indirizzo = location.origin && location.origin !== "null" ? (location.origin + location.pathname).replace(/index\.html$/, "") : "";
    const totale = doc.getNumberOfPages();
    for (let i = 1; i <= totale; i++) {
      doc.setPage(i);
      doc.setDrawColor(...C.linea);
      doc.setLineWidth(0.2);
      doc.line(M, 286, 210 - M, 286);
      doc.setFont("Jost", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.grafite);
      doc.text(pulisci(`Proposta preparata sul sito di Marco De Chiara${indirizzo ? " · " + indirizzo : ""}`), M, 290.5);
      doc.text(`${i} / ${totale}`, 210 - M, 290.5, { align: "right" });
    }
    void pagina;
    doc.setProperties({
      title: pulisci(`Proposta di opera su misura – ${st.nome.trim()}`),
      subject: "Proposta di opera su misura per Marco De Chiara",
      author: pulisci(st.nome.trim()),
      creator: "Sito di Marco De Chiara",
    });
    const blob = doc.output("blob");
    const nome = `proposta-opera-su-misura-${slugNome(st.nome) || "marco-de-chiara"}.pdf`;
    return { blob, nome, codice };
  }

  /* ------------------------------------------------------------------
     7. Email per Marco e condivisione
     ------------------------------------------------------------------ */
  function scarica(p) {
    p.scaricato = true;
    const url = URL.createObjectURL(p.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = p.nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function linkEmail() {
    const email = String(contatti().email || "").trim();
    if (!/^[^\s@?&]+@[^\s@?&]+$/.test(email)) return "";
    const v = valori();
    const righe = [
      "Ciao Marco,",
      "ti mando la mia proposta per un'opera su misura: trovi tutti i dettagli nel PDF allegato.",
      "",
      `• Opera: ${v.tipo}${v.tecnica ? " – " + v.tecnica : ""}`,
      `• Misure: ${v.misure}${v.orientamento ? " (" + v.orientamento.toLowerCase() + ")" : ""}`,
      `• Stile: ${v.stile}${v.atmosfera ? ", atmosfera " + v.atmosfera.toLowerCase() : ""}`,
      `• Colori: ${st.colori.map(nomeColore).join(", ")}`,
    ];
    if (v.budget) righe.push(`• Budget: ${v.budget}`);
    if (v.tempi) righe.push(`• Tempi: ${v.tempi}`);
    if (st.ispirazione) righe.push(`• Ispirata a: «${st.ispirazione.titolo}»`);
    if (st.idea.trim()) righe.push("", st.idea.trim().slice(0, 600) + (st.idea.trim().length > 600 ? "…" : ""));
    righe.push("", ultimoPdf ? `(Allegato: ${ultimoPdf.nome})` : "", "", "Grazie,", st.nome.trim(), [st.email.trim(), st.telefono.trim()].filter(Boolean).join(" · "));
    const oggetto = `Proposta di opera su misura – ${st.nome.trim()}`;
    return `mailto:${email}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join("\r\n"))}`;
  }
  function apriEmail() {
    const link = linkEmail();
    if (link) window.location.href = link;
  }

  const puoCondividere = () => {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(["x"], "x.pdf", { type: "application/pdf" })] }));
    } catch (e) {
      return false;
    }
  };
  // Sul telefono: il PDF si manda direttamente con Mail, WhatsApp…
  async function condividi() {
    if (!ultimoPdf) return;
    try {
      const file = new File([ultimoPdf.blob], ultimoPdf.nome, { type: "application/pdf" });
      const email = contatti().email;
      await navigator.share({
        files: [file],
        title: "Proposta di opera su misura",
        text: email ? `Per Marco De Chiara: ${email}` : "Proposta di opera su misura per Marco De Chiara",
      });
    } catch (e) {
      /* condivisione annullata */
    }
  }

  function mostraFatto() {
    const fatto = $("#atelier-fatto");
    if (!fatto || !ultimoPdf) return;
    fatto.hidden = false;
    $("#atelier-nome-pdf").textContent = `${ultimoPdf.nome} · ${Math.max(1, Math.round(ultimoPdf.blob.size / 1024))} kB`;
    const email = contatti().email;
    const telefono = puoCondividere();
    $("#atelier-condividi").hidden = !telefono;
    const apriEmailBtn = $("#atelier-apri-email");
    if (apriEmailBtn) apriEmailBtn.classList.toggle("bottone--leggero", telefono);
    $("#atelier-scarica").textContent = telefono && !ultimoPdf.scaricato ? "Scarica il PDF" : "Scarica di nuovo";
    // sul telefono il PDF si manda con la condivisione; sul computer è già nei download
    $("#atelier-passi-invio").innerHTML = telefono
      ? `<li>Tocca «Invia il PDF» e scegli la tua app di posta (o WhatsApp).</li><li>${email ? `Scrivilo a <strong>${esc(email)}</strong>: è l'indirizzo di Marco.` : "Mandalo a Marco con i contatti qui sotto nella pagina."}</li>`
      : `<li>Il PDF è nei tuoi download.</li><li>${email ? `Nell'email per ${esc(email)} allega il PDF e premi invia.` : "Mandalo a Marco con i contatti qui sotto nella pagina."}</li>`;
    $("#atelier-crea").hidden = true;
    fatto.closest(".invio").querySelector(".invio-nota").hidden = true;
  }

  async function creaEInvia(bottone) {
    const err = $("#atelier-errore-pdf");
    err.hidden = true;
    bottone.disabled = true;
    bottone.classList.add("is-occupato");
    const testoPrima = bottone.textContent;
    bottone.textContent = "Sto dipingendo il PDF…";
    try {
      ultimoPdf = await creaPdf();
      const telefono = puoCondividere();
      // sul computer: scarica il PDF e apre l'email; sul telefono si sceglie
      if (!telefono) scarica(ultimoPdf);
      mostraFatto();
      $("#atelier-fatto-titolo").focus({ preventScroll: false });
      if (!telefono && contatti().email) setTimeout(apriEmail, 700);
    } catch (e) {
      err.textContent = "Non sono riuscito a creare il PDF. Controlla la connessione e riprova: oppure scrivimi direttamente dai contatti qui sotto.";
      err.hidden = false;
    } finally {
      bottone.disabled = false;
      bottone.classList.remove("is-occupato");
      bottone.textContent = testoPrima;
    }
  }

  /* ------------------------------------------------------------------
     8. Avvio
     ------------------------------------------------------------------ */
  function prepara() {
    preparaVetrina();
    const d = $("#atelier");
    if (!d) return;
    Bozzetto.caricaTrama().then(() => atelierAperto() && aggiornaAnteprima(true));
    const form = $("#atelier-form");
    form.addEventListener("input", alCambio);
    form.addEventListener("change", (e) => {
      if (e.target.type !== "color" && e.target.type !== "text" && e.target.tagName !== "TEXTAREA") alCambio(e);
      else if (e.target.name === "nome" || e.target.name === "email") alCambio(e);
    });
    form.addEventListener("click", alClic);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (passo === DATI && !datiValidi(true)) return;
      if (passo < ULTIMO) mostraPasso(passo + 1);
    });
    $("#atelier-indietro").addEventListener("click", () => mostraPasso(passo - 1));
    $("#atelier-chiudi").addEventListener("click", chiudi);
    $("#atelier-rimescola").addEventListener("click", () => {
      st.seme = Math.floor(Math.random() * 99999);
      ultimoPdf = null;
      salvaBozza();
      aggiornaAnteprima(true);
    });
    $$(".atelier-vista-btn").forEach((b) => b.addEventListener("click", () => cambiaVista(b.dataset.vista)));
    d.addEventListener("close", () => {
      document.documentElement.classList.remove("atelier-aperto");
      if (location.hash === "#proponi") {
        try {
          history.replaceState(null, "", location.pathname + location.search);
        } catch (e) {
          /* anteprime senza indirizzo */
        }
      }
      if (origine && typeof origine.focus === "function") origine.focus({ preventScroll: true });
    });
    let ritardo = 0;
    window.addEventListener("resize", () => {
      if (!atelierAperto()) return;
      clearTimeout(ritardo);
      ritardo = setTimeout(() => aggiornaAnteprima(true), 150);
    });

    // Tutti i bottoni "Proponi la tua opera" e i link a #proponi
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-apri-atelier]");
      if (b) {
        e.preventDefault();
        apri({ da: b });
      }
    });
    const daIndirizzo = () => {
      if (location.hash === "#proponi" && !atelierAperto()) apri();
    };
    window.addEventListener("hashchange", daIndirizzo);
    if (document.readyState === "complete") daIndirizzo();
    else window.addEventListener("load", daIndirizzo, { once: true });
  }

  window.SuMisura = { apri, Bozzetto, disegnaScala, misureCm, proporzione, TAVOLOZZE, nomeColore };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepara);
  else prepara();
})();
