/* =====================================================================
   La mostra immersiva
   Il sito è un percorso tra sale: a ogni sezione cambia il colore di tutta
   la pagina, all'ingresso l'inchiostro fluido si muove con il mouse o con il
   dito, nella prima sala le opere passano di lato come lungo un corridoio.
   Indice:
     1. Utilità
     2. L'inchiostro fluido dell'ingresso (WebGL)
     3. Le sale: il colore della pagina cambia a ogni sezione
     4. Il corridoio della mostra
     5. I titoli giganti: lettere che salgono e scivolano
     6. Avvio
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
     2. L'inchiostro fluido
     Una piccola simulazione di fluido sulla scheda grafica: il colore viene
     trasportato dalla velocità del fluido, che si arriccia in vortici.
     Al caricamento esplode in macchie di colore, poi ogni tanto ne nasce una
     nuova; il mouse (o il dito) lo mescola. Senza WebGL, o con "riduci
     movimento", resta una composizione ferma di sfumature in CSS.
     ------------------------------------------------------------------ */
  const COLORI_FLUIDO = [
    [0.78, 0.94, 0.24], // verde acido
    [0.95, 0.44, 0.17], // arancio
    [0.89, 0.27, 0.5], // magenta
    [0.18, 0.29, 0.86], // cobalto
    [0.96, 0.77, 0.19], // giallo
    [0.18, 0.77, 0.71], // turchese
  ];

  const VERTICE = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;
  const FRAMMENTI = {
    svuota: `
      precision mediump float;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,
    schermo: `
      precision highp float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uTexture;
      uniform vec3 uFondo;
      uniform vec2 texelSize;
      void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float dx = length(texture2D(uTexture, vR).rgb) - length(texture2D(uTexture, vL).rgb);
        float dy = length(texture2D(uTexture, vT).rgb) - length(texture2D(uTexture, vB).rgb);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        float luce = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.72, 0.72, 1.0);
        c *= luce;
        float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
        vec3 col = uFondo * (1.0 - a * 0.9) + c;
        gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
      }`,
    macchia: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
      }`,
    trasporto: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
      }`,
    divergenza: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,
    rotore: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,
    vortici: `
      precision highp float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 v = texture2D(uVelocity, vUv).xy + force * dt;
        gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
      }`,
    pressione: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float d = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradiente: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
        gl_FragColor = vec4(v, 0.0, 1.0);
      }`,
  };

  function avviaFluido(canvas, area) {
    const piccolo = Math.min(window.innerWidth, window.innerHeight) < 700 || !conMouse();
    const C = {
      SIM: 128,
      COLORE: piccolo ? 640 : 1024,
      DISSIPA_COLORE: 0.42,
      DISSIPA_VELOCITA: 0.28,
      PRESSIONE: 0.8,
      ITERAZIONI: piccolo ? 12 : 20,
      VORTICI: 24,
      RAGGIO: 0.26,
      FORZA: 5200,
    };
    const opzioni = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    let gl = canvas.getContext("webgl2", opzioni);
    const webgl2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", opzioni) || canvas.getContext("experimental-webgl", opzioni);
    if (!gl) return null;

    // formati: mezzi float, con filtro lineare
    let tipo;
    let lineare;
    if (webgl2) {
      gl.getExtension("EXT_color_buffer_float");
      gl.getExtension("EXT_color_buffer_half_float");
      tipo = gl.HALF_FLOAT;
      lineare = true;
    } else {
      const mezzo = gl.getExtension("OES_texture_half_float");
      lineare = !!gl.getExtension("OES_texture_half_float_linear");
      if (!mezzo) return null;
      tipo = mezzo.HALF_FLOAT_OES;
    }
    if (!lineare) return null;
    gl.clearColor(0, 0, 0, 1);

    function renderizzabile(interno, formato) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, interno, 4, 4, 0, formato, tipo, null);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.deleteFramebuffer(f);
      gl.deleteTexture(t);
      return ok;
    }
    function formato(interno, fmt) {
      if (!webgl2) return renderizzabile(interno, fmt) ? { interno, fmt } : null;
      if (renderizzabile(interno, fmt)) return { interno, fmt };
      if (interno === gl.R16F) return formato(gl.RG16F, gl.RG);
      if (interno === gl.RG16F) return formato(gl.RGBA16F, gl.RGBA);
      return null;
    }
    const fRGBA = webgl2 ? formato(gl.RGBA16F, gl.RGBA) : formato(gl.RGBA, gl.RGBA);
    const fRG = webgl2 ? formato(gl.RG16F, gl.RG) : fRGBA;
    const fR = webgl2 ? formato(gl.R16F, gl.RED) : fRGBA;
    if (!fRGBA || !fRG || !fR) return null;

    // programmi
    function compila(tipoShader, sorgente) {
      const s = gl.createShader(tipoShader);
      gl.shaderSource(s, sorgente);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const vertice = compila(gl.VERTEX_SHADER, VERTICE);
    function programma(frammento) {
      const p = gl.createProgram();
      gl.attachShader(p, vertice);
      gl.attachShader(p, compila(gl.FRAGMENT_SHADER, frammento));
      gl.bindAttribLocation(p, 0, "aPosition");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const nome = gl.getActiveUniform(p, i).name;
        u[nome] = gl.getUniformLocation(p, nome);
      }
      return { p, u, usa: () => gl.useProgram(p) };
    }
    const P = {};
    try {
      Object.keys(FRAMMENTI).forEach((k) => (P[k] = programma(FRAMMENTI[k])));
    } catch (e) {
      return null;
    }

    // il quadrato che copre tutto lo schermo
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    function disegna(bersaglio) {
      if (bersaglio) {
        gl.viewport(0, 0, bersaglio.w, bersaglio.h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bersaglio.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function fbo(w, h, f, filtro) {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, f.interno, w, h, 0, f.fmt, tipo, null);
      const buf = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, buf);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        fbo: buf, w, h, tx: 1 / w, ty: 1 / h,
        lega(i) {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          return i;
        },
      };
    }
    function doppio(w, h, f, filtro) {
      let a = fbo(w, h, f, filtro);
      let b = fbo(w, h, f, filtro);
      return {
        w, h, tx: 1 / w, ty: 1 / h,
        get leggi() { return a; },
        get scrivi() { return b; },
        scambia() { const t = a; a = b; b = t; },
      };
    }
    function risoluzione(r) {
      let rapporto = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (rapporto < 1) rapporto = 1 / rapporto;
      const min = Math.round(r);
      const max = Math.round(r * rapporto);
      return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
    }

    let colore, velocita, divergenza, rotore, pressione;
    function preparaBuffer() {
      const s = risoluzione(C.SIM);
      const c = risoluzione(C.COLORE);
      colore = doppio(c.w, c.h, fRGBA, gl.LINEAR);
      velocita = doppio(s.w, s.h, fRG, gl.LINEAR);
      divergenza = fbo(s.w, s.h, fR, gl.NEAREST);
      rotore = fbo(s.w, s.h, fR, gl.NEAREST);
      pressione = doppio(s.w, s.h, fR, gl.NEAREST);
    }

    function dimensiona() {
      const dpr = Math.min(window.devicePixelRatio || 1, piccolo ? 1 : 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    dimensiona();
    preparaBuffer();

    const fondo = [13 / 255, 15 / 255, 12 / 255];
    let tinta = 0;
    function prossimoColore(forza) {
      tinta = (tinta + 1) % COLORI_FLUIDO.length;
      const c = COLORI_FLUIDO[tinta];
      return [c[0] * forza, c[1] * forza, c[2] * forza];
    }

    function macchia(x, y, dx, dy, col, raggio = C.RAGGIO) {
      const rapporto = canvas.width / canvas.height;
      let r = raggio / 100;
      if (rapporto > 1) r *= rapporto;
      P.macchia.usa();
      gl.uniform1i(P.macchia.u.uTarget, velocita.leggi.lega(0));
      gl.uniform1f(P.macchia.u.aspectRatio, rapporto);
      gl.uniform2f(P.macchia.u.point, x, y);
      gl.uniform3f(P.macchia.u.color, dx, dy, 0);
      gl.uniform1f(P.macchia.u.radius, r);
      disegna(velocita.scrivi);
      velocita.scambia();
      gl.uniform1i(P.macchia.u.uTarget, colore.leggi.lega(0));
      gl.uniform3f(P.macchia.u.color, col[0], col[1], col[2]);
      disegna(colore.scrivi);
      colore.scambia();
    }

    function passo(dt) {
      gl.disable(gl.BLEND);
      const tx = velocita.tx;
      const ty = velocita.ty;
      P.rotore.usa();
      gl.uniform2f(P.rotore.u.texelSize, tx, ty);
      gl.uniform1i(P.rotore.u.uVelocity, velocita.leggi.lega(0));
      disegna(rotore);

      P.vortici.usa();
      gl.uniform2f(P.vortici.u.texelSize, tx, ty);
      gl.uniform1i(P.vortici.u.uVelocity, velocita.leggi.lega(0));
      gl.uniform1i(P.vortici.u.uCurl, rotore.lega(1));
      gl.uniform1f(P.vortici.u.curl, C.VORTICI);
      gl.uniform1f(P.vortici.u.dt, dt);
      disegna(velocita.scrivi);
      velocita.scambia();

      P.divergenza.usa();
      gl.uniform2f(P.divergenza.u.texelSize, tx, ty);
      gl.uniform1i(P.divergenza.u.uVelocity, velocita.leggi.lega(0));
      disegna(divergenza);

      P.svuota.usa();
      gl.uniform1i(P.svuota.u.uTexture, pressione.leggi.lega(0));
      gl.uniform1f(P.svuota.u.value, C.PRESSIONE);
      disegna(pressione.scrivi);
      pressione.scambia();

      P.pressione.usa();
      gl.uniform2f(P.pressione.u.texelSize, tx, ty);
      gl.uniform1i(P.pressione.u.uDivergence, divergenza.lega(0));
      for (let i = 0; i < C.ITERAZIONI; i++) {
        gl.uniform1i(P.pressione.u.uPressure, pressione.leggi.lega(1));
        disegna(pressione.scrivi);
        pressione.scambia();
      }

      P.gradiente.usa();
      gl.uniform2f(P.gradiente.u.texelSize, tx, ty);
      gl.uniform1i(P.gradiente.u.uPressure, pressione.leggi.lega(0));
      gl.uniform1i(P.gradiente.u.uVelocity, velocita.leggi.lega(1));
      disegna(velocita.scrivi);
      velocita.scambia();

      P.trasporto.usa();
      gl.uniform2f(P.trasporto.u.texelSize, tx, ty);
      const v = velocita.leggi.lega(0);
      gl.uniform1i(P.trasporto.u.uVelocity, v);
      gl.uniform1i(P.trasporto.u.uSource, v);
      gl.uniform1f(P.trasporto.u.dt, dt);
      gl.uniform1f(P.trasporto.u.dissipation, C.DISSIPA_VELOCITA);
      disegna(velocita.scrivi);
      velocita.scambia();

      gl.uniform1i(P.trasporto.u.uVelocity, velocita.leggi.lega(0));
      gl.uniform1i(P.trasporto.u.uSource, colore.leggi.lega(1));
      gl.uniform1f(P.trasporto.u.dissipation, C.DISSIPA_COLORE);
      disegna(colore.scrivi);
      colore.scambia();
    }

    function mostra() {
      P.schermo.usa();
      gl.uniform2f(P.schermo.u.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      gl.uniform1i(P.schermo.u.uTexture, colore.leggi.lega(0));
      gl.uniform3f(P.schermo.u.uFondo, fondo[0], fondo[1], fondo[2]);
      disegna(null);
    }

    // l'esplosione iniziale: macchie che partono dal centro verso fuori
    function esplosione() {
      const quante = 9;
      for (let i = 0; i < quante; i++) {
        const a = (i / quante) * Math.PI * 2 + Math.random() * 0.4;
        const forza = 900 + Math.random() * 700;
        const x = 0.5 + Math.cos(a) * 0.08;
        const y = 0.55 + Math.sin(a) * 0.1;
        macchia(x, y, Math.cos(a) * forza, Math.sin(a) * forza, prossimoColore(0.55), C.RAGGIO * 1.6);
      }
    }
    function macchiaACaso() {
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.2 + Math.random() * 0.65;
      const a = Math.random() * Math.PI * 2;
      const f = 500 + Math.random() * 600;
      macchia(x, y, Math.cos(a) * f, Math.sin(a) * f, prossimoColore(0.38), C.RAGGIO * (1 + Math.random()));
    }

    // il mouse (o il dito) mescola il colore
    let ultimo = null;
    let ultimoMovimento = 0;
    const coda = [];
    function posizione(e) {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    }
    area.addEventListener(
      "pointermove",
      (e) => {
        const [x, y] = posizione(e);
        if (ultimo) {
          const dx = (x - ultimo[0]) * C.FORZA;
          const dy = (y - ultimo[1]) * C.FORZA;
          if (Math.abs(dx) + Math.abs(dy) > 1) coda.push([x, y, dx, dy]);
        }
        ultimo = [x, y];
        ultimoMovimento = performance.now();
      },
      { passive: true }
    );
    area.addEventListener("pointerleave", () => (ultimo = null));
    area.addEventListener(
      "pointerdown",
      (e) => {
        const [x, y] = posizione(e);
        ultimo = [x, y];
        ultimoMovimento = performance.now();
        coda.push([x, y, (Math.random() - 0.5) * 600, 600, true]);
      },
      { passive: true }
    );

    let attivo = false;
    let ciclo = 0;
    let prima = performance.now();
    let prossimaACaso = performance.now() + 2600;
    let coloreMouse = prossimoColore(0.16);
    let cambioColore = performance.now();
    let partito = false;

    function fotogramma(ora) {
      if (!attivo) {
        ciclo = 0;
        return;
      }
      const dt = Math.min((ora - prima) / 1000, 1 / 60);
      prima = ora;
      if (dimensiona()) preparaBuffer();
      if (!partito) {
        partito = true;
        esplosione();
      }
      if (ora - cambioColore > 900) {
        coloreMouse = prossimoColore(0.16);
        cambioColore = ora;
      }
      while (coda.length) {
        const [x, y, dx, dy, tocco] = coda.shift();
        macchia(x, y, dx, dy, tocco ? prossimoColore(0.45) : coloreMouse, tocco ? C.RAGGIO * 1.5 : C.RAGGIO);
      }
      // se nessuno lo tocca, il colore continua a muoversi da solo
      if (ora > prossimaACaso && ora - ultimoMovimento > 1800) {
        macchiaACaso();
        prossimaACaso = ora + 1500 + Math.random() * 1400;
      }
      passo(dt);
      mostra();
      ciclo = requestAnimationFrame(fotogramma);
    }

    return {
      avvia() {
        if (attivo) return;
        attivo = true;
        prima = performance.now();
        ciclo = requestAnimationFrame(fotogramma);
      },
      ferma() {
        attivo = false;
        if (ciclo) cancelAnimationFrame(ciclo);
        ciclo = 0;
      },
    };
  }

  function preparaIngresso() {
    const sezione = $(".ingresso");
    const tela = $("#fluido");
    if (!sezione || !tela) return;
    if (menoMovimento()) {
      sezione.classList.add("senza-fluido");
      return;
    }
    let fluido = null;
    try {
      fluido = avviaFluido(tela, sezione);
    } catch (e) {
      fluido = null;
    }
    if (!fluido) {
      sezione.classList.add("senza-fluido");
      return;
    }
    sezione.classList.add("con-fluido");
    let visibile = true;
    const aggiorna = () => (visibile && !document.hidden ? fluido.avvia() : fluido.ferma());
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((v) => {
        visibile = v[0].isIntersecting;
        aggiorna();
      }).observe(sezione);
    }
    document.addEventListener("visibilitychange", aggiorna);
    aggiorna();
  }

  /* ------------------------------------------------------------------
     3. Le sale
     La sala che occupa il centro dello schermo dà il colore a tutta la
     pagina (e alla barra del browser sul telefono). I colori sono in
     css/style.css, blocco "MOSTRA IMMERSIVA".
     ------------------------------------------------------------------ */
  const COLORE_BARRA = {
    ingresso: "#0D0F0C",
    mostra: "#C8F03C",
    catalogo: "#F2EEE6",
    processo: "#F5C431",
    eventi: "#E4457F",
    "su-misura": "#F2712B",
    contatti: "#0D0F0C",
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
      // in fondo alla pagina vale l'ultima sala
      if (sale.length && sale[sale.length - 1].getBoundingClientRect().bottom <= y) imposta(sale[sale.length - 1].dataset.sala);
    };
    suScorrimento(aggiorna);
    window.addEventListener("resize", aggiorna);
    // le foto che si caricano spostano le sale anche senza scorrere: si ricontrolla
    let fermo = 0;
    window.addEventListener("scroll", () => {
      clearTimeout(fermo);
      fermo = setTimeout(aggiorna, 160);
    }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(() => requestAnimationFrame(aggiorna)).observe(document.body);
    aggiorna();
    // subito dopo il primo colore le transizioni si accendono (niente lampi al caricamento)
    requestAnimationFrame(() => requestAnimationFrame(() => radice.classList.add("sale-pronte")));
  }

  /* ------------------------------------------------------------------
     4. Il corridoio della mostra
     Su schermi larghi la sala resta ferma mentre scorri e le opere passano
     di lato, girandosi appena verso di te; sul telefono (e con "riduci
     movimento") si sfogliano col dito.
     ------------------------------------------------------------------ */
  function operePerLaMostra(opere) {
    const segnate = opere.filter((o) => o.inEvidenza && o.immagine);
    const lista = segnate.length >= 3 ? segnate : opere.filter((o) => o.immagine);
    return lista.slice(0, 12);
  }

  function costruisciMostra() {
    const V = window.Vetrina;
    const binario = $("#mostra-binario");
    const pista = $("#mostra-pista");
    if (!V || !binario || !pista) return;
    const tutte = V.opere || [];
    const lista = operePerLaMostra(tutte);
    if (!lista.length) {
      $("#mostra").hidden = true;
      return;
    }
    binario.replaceChildren();
    lista.forEach((o, i) => {
      const art = document.createElement("article");
      art.className = "mostra-opera";
      const numero = document.createElement("span");
      numero.className = "mostra-numero";
      numero.setAttribute("aria-hidden", "true");
      numero.textContent = String(i + 1).padStart(2, "0");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opera-apri mostra-apri";
      btn.setAttribute("aria-label", `Guarda ${String(o.titolo).trim()} a schermo intero`);
      const cornice = document.createElement("span");
      cornice.className = "mostra-cornice";
      cornice.append(V.creaMedia(o, 900, true)); // subito: le larghezze servono per la corsa del corridoio
      btn.append(cornice);
      btn.addEventListener("click", () => V.apriScheda(lista, i, btn));
      const cap = document.createElement("div");
      cap.className = "mostra-didascalia";
      const dettagli = [o.tecnica, o.misure].filter(Boolean).map((x) => esc(String(x).trim())).join(" · ");
      cap.innerHTML =
        `<div class="reazioni">${V.visteHTML(o)}${V.bottonePiace(o)}</div>` +
        `<p class="mostra-titolo-opera"><em>${esc(String(o.titolo).trim())}</em>${o.anno ? `<span>${esc(o.anno)}</span>` : ""}</p>` +
        (dettagli ? `<p class="mostra-dettagli">${dettagli}</p>` : "") +
        (o.categoria ? `<p class="mostra-categoria">${esc(V.nomeCategoria(o.categoria))}</p>` : "");
      art.append(numero, btn, cap);
      binario.append(art);
    });
    const fine = document.createElement("a");
    fine.className = "mostra-fine";
    fine.href = "#opere";
    fine.innerHTML = `<span class="mostra-fine-testo">Tutte le ${tutte.length} opere</span><span class="mostra-fine-freccia" aria-hidden="true"></span>`;
    binario.append(fine);
    $("#mostra-totale").textContent = String(lista.length).padStart(2, "0");
    animaMostra(pista, binario, lista.length);
  }

  function animaMostra(pista, binario, quante) {
    const vista = $(".mostra-vista");
    const testa = $(".mostra-testa");
    const barra = $("#mostra-barra");
    const conta = $("#mostra-conta");
    const fondo = $(".mostra-fondo");
    const carte = $$(".mostra-opera", binario);
    let distanza = 0;
    let agganciata = false;
    const vuoleAggancio = () => window.matchMedia("(min-width: 761px)").matches && !menoMovimento();

    function misura() {
      agganciata = vuoleAggancio();
      pista.classList.toggle("is-agganciata", agganciata);
      if (!agganciata) {
        pista.style.height = "";
        binario.style.transform = "";
        return;
      }
      distanza = Math.max(0, binario.scrollWidth - vista.clientWidth);
      // un po' di strada in più all'inizio e alla fine, per fermarsi a guardare
      pista.style.height = `${Math.round(window.innerHeight + distanza * 1.05 + window.innerHeight * 0.25)}px`;
    }

    function effetti(centroX, larghezza) {
      let vicina = 0;
      let minimo = Infinity;
      carte.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = (r.left + r.width / 2 - centroX) / larghezza;
        if (Math.abs(d) < minimo) {
          minimo = Math.abs(d);
          vicina = i;
        }
        if (r.right < -200 || r.left > larghezza + 200) return;
        const k = limita(d, -1.2, 1.2);
        c.style.setProperty("--m-ry", `${(k * -16).toFixed(2)}deg`);
        c.style.setProperty("--m-sc", (1 - Math.min(0.12, Math.abs(k) * 0.1)).toFixed(3));
        c.style.setProperty("--m-y", `${(Math.abs(k) * 18).toFixed(1)}px`);
        c.classList.toggle("is-centro", Math.abs(d) < 0.22);
      });
      conta.textContent = String(vicina + 1).padStart(2, "0");
    }

    function aggiorna() {
      // il titolo della sala entra quando la sala arriva a metà schermo
      if (testa && !testa.classList.contains("visibile") && pista.getBoundingClientRect().top < window.innerHeight * 0.6) testa.classList.add("visibile");
      if (agganciata) {
        const r = pista.getBoundingClientRect();
        const corsa = pista.offsetHeight - window.innerHeight;
        const avanti = limita((-r.top - window.innerHeight * 0.12) / Math.max(1, corsa - window.innerHeight * 0.25), 0, 1);
        binario.style.transform = `translate3d(${(-avanti * distanza).toFixed(1)}px, 0, 0)`;
        barra.style.transform = `scaleX(${avanti.toFixed(4)})`;
        if (fondo) fondo.style.transform = `translate3d(${(-avanti * 35).toFixed(2)}%, 0, 0)`;
        if (r.bottom > 0 && r.top < window.innerHeight) effetti(window.innerWidth / 2, window.innerWidth);
      } else {
        const max = binario.scrollWidth - binario.clientWidth;
        const avanti = max > 0 ? binario.scrollLeft / max : 0;
        barra.style.transform = `scaleX(${avanti.toFixed(4)})`;
        if (!menoMovimento()) effetti(binario.getBoundingClientRect().left + binario.clientWidth / 2, binario.clientWidth);
      }
    }

    // con la tastiera: l'opera che riceve il fuoco viene portata al centro
    binario.addEventListener("focusin", (e) => {
      if (!agganciata) return;
      const carta = e.target.closest(".mostra-opera, .mostra-fine");
      if (!carta) return;
      const indice = [...binario.children].indexOf(carta);
      const passo = binario.children.length > 1 ? indice / (binario.children.length - 1) : 0;
      const corsa = pista.offsetHeight - window.innerHeight;
      const y = pista.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.12 + passo * (corsa - window.innerHeight * 0.25);
      window.scrollTo({ top: y, behavior: "auto" });
    });
    binario.addEventListener("scroll", aggiorna, { passive: true });
    suScorrimento(aggiorna);
    let ritardo = 0;
    window.addEventListener("resize", () => {
      clearTimeout(ritardo);
      ritardo = setTimeout(() => {
        misura();
        aggiorna();
      }, 120);
    });
    // le foto cambiano la larghezza del binario mentre si caricano
    binario.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", () => { misura(); aggiorna(); }, { once: true });
    });
    misura();
    aggiorna();
    void quante;
  }

  /* ------------------------------------------------------------------
     5. I titoli giganti
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
    if (menoMovimento()) return;
    const scivola = () => {
      const h = window.innerHeight;
      titoli.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.bottom < -100 || r.top > h + 100) return;
        const p = (r.top + r.height / 2) / h; // 1 in basso, 0 in alto
        t.style.setProperty("--deriva", `${((p - 0.5) * 7).toFixed(2)}vw`);
      });
    };
    suScorrimento(scivola);
    scivola();
  }

  // con "riduci movimento" il titolo della mostra c'è subito
  function osservaMostra() {
    const testa = $(".mostra-testa");
    if (testa && menoMovimento()) testa.classList.add("visibile");
  }

  /* ------------------------------------------------------------------
     6. Avvio
     ------------------------------------------------------------------ */
  function prepara() {
    document.documentElement.classList.add("mostra-immersiva");
    preparaSale();
    preparaIngresso();
    preparaTitoli();
    osservaMostra();
    window.addEventListener("scroll", scorri, { passive: true });
    const conContenuti = () => costruisciMostra();
    if (window.Vetrina && window.Vetrina.opere) conContenuti();
    else document.addEventListener("vetrina:pronta", conContenuti, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepara);
  else prepara();
})();
