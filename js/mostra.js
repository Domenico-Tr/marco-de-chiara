/* =====================================================================
   La galleria notturna
   Il sito è una galleria visitata di notte: al buio, con le luci delle
   sale sul fondo, la polvere che galleggia nei fasci di luce e una
   lanterna che segue il mouse o il dito. All'ingresso l'inchiostro fluido
   si vede dove arriva la luce; nella prima sala si cammina in 3D tra le
   opere. Un interruttore nella barra accende tutte le luci.
   Indice:
     1. Utilità
     2. L'inchiostro fluido dell'ingresso (WebGL)
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

    const fondo = [8 / 255, 9 / 255, 11 / 255];
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
     luce i colori dell'ingresso si accendono e le lettere del nome si
     scaldano. Se nessuno la muove, sul telefono vaga piano da sola.
     Nella luce galleggia la polvere. L'interruttore accende tutte le luci.
     ------------------------------------------------------------------ */
  const Lanterna = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };

  function preparaLanterna() {
    const luce = $(".lanterna");
    if (!luce || menoMovimento()) return;
    let tx = Lanterna.x;
    let ty = Lanterna.y;
    let ultimoTocco = -1e9;
    let mouse = conMouse();
    let ciclo = 0;
    const ingresso = $(".ingresso");
    const nome = $(".ingresso .nome");
    let lettere = [];
    let titoli = null; // [{ el, lettere }] creati da preparaTitoli
    const accesi = new Set();

    window.addEventListener(
      "pointermove",
      (e) => {
        mouse = e.pointerType === "mouse";
        tx = e.clientX;
        ty = e.clientY;
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
        ultimoTocco = performance.now();
        avvia();
      },
      { passive: true }
    );

    function fotogramma(ora) {
      ciclo = 0;
      if (document.hidden) return;
      // sul telefono, se nessuno la tocca, la luce vaga piano da sola
      const vaga = !mouse && ora - ultimoTocco > 2600;
      if (vaga) {
        tx = window.innerWidth * (0.5 + Math.sin(ora * 0.00035) * 0.22);
        ty = window.innerHeight * (0.42 + Math.cos(ora * 0.00027) * 0.12);
      }
      const k = vaga ? 0.04 : 0.16;
      Lanterna.x += (tx - Lanterna.x) * k;
      Lanterna.y += (ty - Lanterna.y) * k;
      luce.style.setProperty("--lx", `${Lanterna.x.toFixed(1)}px`);
      luce.style.setProperty("--ly", `${Lanterna.y.toFixed(1)}px`);
      const H = window.innerHeight;
      const raggio = Math.max(window.innerWidth, H) * 0.3;
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
      // l'ingresso: i colori si vedono dove arriva la luce, le lettere del nome si scaldano
      if (ingresso) {
        const r = ingresso.getBoundingClientRect();
        if (r.bottom > 0) {
          scrivi.push([ingresso, null, Lanterna.x - r.left, Lanterna.y - r.top]);
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
      for (const [el, v, mx, my] of scrivi) {
        if (v === null) {
          el.style.setProperty("--mx", `${mx.toFixed(1)}px`);
          el.style.setProperty("--my", `${my.toFixed(1)}px`);
        } else {
          const testo = v.toFixed(3);
          if (el._calda !== testo) {
            el._calda = testo;
            el.style.setProperty("--calda", testo);
          }
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
    const quanti = conMouse() ? 80 : 38;
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
      cornice.append(V.creaMedia(o, 900, true));
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
    if (piatta) {
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
      const oscilla = conMouse() ? 0 : Math.sin(performance.now() * 0.0006) * 1.2;
      const gradiX = guardaY * 4;
      const gradiY = guardaX * 9 + oscilla;
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
      if (Math.abs(camMeta - cam) > 0.5 || Math.abs(mx - guardaX) > 0.002 || Math.abs(my - guardaY) > 0.002 || !conMouse()) {
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
    preparaIngresso();
    preparaLanterna();
    preparaPolvere();
    preparaTitoli();
    window.addEventListener("scroll", scorri, { passive: true });
    const conContenuti = () => costruisciGalleria();
    if (window.Vetrina && window.Vetrina.opere) conContenuti();
    else document.addEventListener("vetrina:pronta", conContenuti, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepara);
  else prepara();
})();
