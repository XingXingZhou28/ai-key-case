(function () {
  const CURSOR_DEFAULTS = {
    classPrefix: "aiw",
    assetUrl: "../assets/ai-cursor.svg",
    width: 133,
    height: 131,
    hotspotX: 50,
    hotspotY: 37
  };

  const TRIGGER_DEFAULTS = {
    cursor: null,
    shakeThreshold: 2,
    shakeWindow: 820,
    minShakeDistance: 14,
    minShakeSpeed: 180,
    horizontalDominance: 1.2,
    activeDuration: 2600,
    cooldown: 700,
    autoHide: true,
    onActivate: null,
    onDismiss: null
  };

  const CHIP_DEFAULTS = {
    classPrefix: "aiw",
    assetUrl: "",
    text: "Make this more human",
    offsetX: -28,
    offsetY: -70,
    width: 365,
    height: 198
  };

  const VOICE_DEFAULTS = {
    classPrefix: "aiw",
    text: "按住说话",
    listeningText: "正在聆听...",
    unsupportedText: "当前浏览器不支持语音识别",
    lang: "zh-CN",
    continuous: false,
    interimResults: true,
    typeInterval: 90,
    cursorAssetUrl: "../assets/ai-cursor.svg",
    cursorWidth: 133,
    cursorHeight: 131,
    cursorHotspotX: 50,
    cursorHotspotY: 37,
    bubbleOffsetX: 82,
    bubbleOffsetY: 56,
    width: 349,
    height: 198,
    onTranscript: null,
    onStart: null,
    onEnd: null,
    onError: null
  };

  const WATER_RIPPLE_DEFAULTS = {
    classPrefix: "aiw",
    target: null,
    fullScreen: true,
    autoPlay: false,
    loop: false,
    loopDelay: 720,
    duration: 3600,
    renderScale: 0.72,
    maxRenderPixels: 150000,
    maxDpr: 1.25,
    sourceX: 0.5,
    sourceY: 1.06,
    ringCount: 4,
    ringRadius: 760,
    bandWidth: 46,
    blurAmount: 12,
    refractionStrength: 34,
    glowStrength: 0.72,
    opacity: 1,
    scale: 0.54,
    background: null
  };

  const EDGE_GLOW_DEFAULTS = {
    classPrefix: "aiw",
    target: null,
    fullScreen: true,
    autoPlay: false,
    assetUrl: "../assets/edge-glow-pad-edge-only.png",
    intensity: 1,
    thickness: 42,
    blur: 32,
    opacity: 0.82,
    colors: {
      topLeft: "rgba(70, 192, 255, 0.74)",
      topRight: "rgba(255, 37, 99, 0.62)",
      right: "rgba(255, 168, 0, 0.58)",
      bottomRight: "rgba(35, 212, 123, 0.58)",
      bottomLeft: "rgba(121, 138, 255, 0.62)",
      left: "rgba(70, 136, 255, 0.62)"
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class AICursor {
    constructor(options = {}) {
      this.options = { ...CURSOR_DEFAULTS, ...options };
      this.visible = false;
      this.lastPoint = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5
      };

      this.layer = document.createElement("div");
      this.layer.className = `${this.options.classPrefix}-cursor-layer`;
      this.layer.innerHTML = `
        <img
          class="${this.options.classPrefix}-cursor-asset"
          src="${this.options.assetUrl}"
          width="${this.options.width}"
          height="${this.options.height}"
          alt=""
          aria-hidden="true"
        />
      `;

      document.body.append(this.layer);
      this.moveTo(this.lastPoint.x, this.lastPoint.y);
    }

    moveTo(x, y) {
      const safeX = clamp(x, 0, window.innerWidth);
      const safeY = clamp(y, 0, window.innerHeight);
      this.lastPoint = { x: safeX, y: safeY };
      this.layer.style.setProperty("--aiw-cursor-x", `${safeX}px`);
      this.layer.style.setProperty("--aiw-cursor-y", `${safeY}px`);
      this.layer.style.setProperty("--aiw-cursor-hotspot-x", `${this.options.hotspotX}px`);
      this.layer.style.setProperty("--aiw-cursor-hotspot-y", `${this.options.hotspotY}px`);
    }

    show(point) {
      if (point) this.moveTo(point.x, point.y);
      this.visible = true;
      this.layer.classList.add("is-visible");
      document.documentElement.classList.add("aiw-hide-native-cursor");
    }

    hide() {
      this.visible = false;
      this.layer.classList.remove("is-visible");
      document.documentElement.classList.remove("aiw-hide-native-cursor");
    }

    destroy() {
      this.hide();
      this.layer.remove();
    }
  }

  class CursorTrigger {
    constructor(options = {}) {
      this.options = { ...TRIGGER_DEFAULTS, ...options };
      this.cursor = this.options.cursor || new AICursor(this.options.cursorOptions);
      this.lastMove = null;
      this.lastDirection = 0;
      this.shakes = [];
      this.active = false;
      this.cooldownUntil = 0;
      this.hideTimer = 0;

      this.onPointerMove = this.onPointerMove.bind(this);
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    onPointerMove(event) {
      const now = performance.now();
      const point = { x: event.clientX, y: event.clientY, time: now };

      if (this.active) {
        this.cursor.moveTo(point.x, point.y);
      }

      if (!this.lastMove) {
        this.lastMove = point;
        return;
      }

      const dx = point.x - this.lastMove.x;
      const dy = point.y - this.lastMove.y;
      const dt = Math.max(16, point.time - this.lastMove.time);
      const distance = Math.hypot(dx, dy);
      const speed = (distance / dt) * 1000;
      const isHorizontalShake = Math.abs(dx) >= Math.abs(dy) * this.options.horizontalDominance;
      const direction = isHorizontalShake ? Math.sign(dx) : 0;
      const reversed = direction && this.lastDirection && direction !== this.lastDirection;

      if (
        !this.active &&
        now > this.cooldownUntil &&
        reversed &&
        distance >= this.options.minShakeDistance &&
        speed >= this.options.minShakeSpeed
      ) {
        this.shakes.push(now);
        this.shakes = this.shakes.filter(time => now - time <= this.options.shakeWindow);

        if (this.shakes.length >= this.options.shakeThreshold) {
          this.activate(point);
        }
      }

      if (direction) this.lastDirection = direction;
      this.lastMove = point;
    }

    activate(point) {
      window.clearTimeout(this.hideTimer);
      this.active = true;
      this.shakes = [];
      this.cursor.show(point);
      if (typeof this.options.onActivate === "function") {
        this.options.onActivate({ cursor: this.cursor, point });
      }

      if (this.options.autoHide) {
        this.hideTimer = window.setTimeout(() => {
          this.dismiss();
        }, this.options.activeDuration);
      }
    }

    dismiss() {
      if (!this.active) return;
      this.active = false;
      this.cooldownUntil = performance.now() + this.options.cooldown;
      this.cursor.hide();
      if (typeof this.options.onDismiss === "function") {
        this.options.onDismiss({ cursor: this.cursor });
      }
    }

    destroy() {
      window.clearTimeout(this.hideTimer);
      window.removeEventListener("pointermove", this.onPointerMove);
      this.cursor.destroy();
    }
  }

  class AICommandChip {
    constructor(options = {}) {
      this.options = { ...CHIP_DEFAULTS, ...options };
      this.visible = false;
      this.lastPoint = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5
      };

      this.layer = document.createElement("div");
      this.layer.className = `${this.options.classPrefix}-chip-layer`;
      this.layer.innerHTML = this.options.assetUrl
        ? `
        <img
          class="${this.options.classPrefix}-command-chip-asset"
          src="${this.options.assetUrl}"
          width="${this.options.width}"
          height="${this.options.height}"
          alt=""
          aria-hidden="true"
        />
      `
        : `
        <div class="${this.options.classPrefix}-command-chip" role="status" aria-live="polite">
          <span class="${this.options.classPrefix}-command-icon" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <span class="${this.options.classPrefix}-command-label"></span>
        </div>
      `;

      document.body.append(this.layer);
      this.label = this.layer.querySelector(`.${this.options.classPrefix}-command-label`);
      if (this.label) this.setText(this.options.text);
      this.moveTo(this.lastPoint.x, this.lastPoint.y);
    }

    setText(text) {
      this.options.text = text;
      if (this.label) this.label.textContent = text;
    }

    moveTo(x, y) {
      const chipX = clamp(x + this.options.offsetX, 16, window.innerWidth - this.options.width - 16);
      const chipY = clamp(y + this.options.offsetY, 16, window.innerHeight - this.options.height - 16);
      this.lastPoint = { x, y };
      this.layer.style.setProperty("--aiw-chip-x", `${chipX}px`);
      this.layer.style.setProperty("--aiw-chip-y", `${chipY}px`);
    }

    show(point, text) {
      if (text) this.setText(text);
      if (point) this.moveTo(point.x, point.y);
      this.visible = true;
      this.layer.classList.add("is-visible");
    }

    hide() {
      this.visible = false;
      this.layer.classList.remove("is-visible");
    }

    destroy() {
      this.layer.remove();
    }
  }

  class VoiceInputBubble {
    constructor(options = {}) {
      this.options = { ...VOICE_DEFAULTS, ...options };
      this.visible = false;
      this.listening = false;
      this.recognition = null;
      this.typingTimer = 0;
      this.lastPoint = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5
      };

      this.layer = document.createElement("div");
      this.layer.className = `${this.options.classPrefix}-voice-layer`;
      this.layer.innerHTML = `
        <div class="${this.options.classPrefix}-voice-composite">
          <img
            class="${this.options.classPrefix}-voice-cursor-asset"
            src="${this.options.cursorAssetUrl}"
            width="${this.options.cursorWidth}"
            height="${this.options.cursorHeight}"
            alt=""
            aria-hidden="true"
          />
          <div class="${this.options.classPrefix}-voice-bubble" role="status" aria-live="polite">
            <span class="${this.options.classPrefix}-voice-bars" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </span>
            <span class="${this.options.classPrefix}-voice-text"></span>
          </div>
        </div>
      `;

      document.body.append(this.layer);
      this.text = this.layer.querySelector(`.${this.options.classPrefix}-voice-text`);
      this.setTranscript(this.options.text);
      this.moveTo(this.lastPoint.x, this.lastPoint.y);
    }

    moveTo(x, y) {
      const bubbleX = clamp(x - this.options.cursorHotspotX, 16, window.innerWidth - this.options.width - 16);
      const bubbleY = clamp(y - this.options.cursorHotspotY, 16, window.innerHeight - this.options.height - 16);
      this.lastPoint = { x, y };
      this.layer.style.setProperty("--aiw-voice-x", `${bubbleX}px`);
      this.layer.style.setProperty("--aiw-voice-y", `${bubbleY}px`);
      this.layer.style.setProperty("--aiw-voice-bubble-x", `${this.options.bubbleOffsetX}px`);
      this.layer.style.setProperty("--aiw-voice-bubble-y", `${this.options.bubbleOffsetY}px`);
    }

    setTranscript(text) {
      this.stopTyping();
      this.options.text = text;
      this.text.textContent = text;
    }

    stopTyping() {
      window.clearTimeout(this.typingTimer);
      this.typingTimer = 0;
      this.layer.classList.remove("is-typing");
    }

    typeTranscript(text, options = {}) {
      this.stopTyping();
      const content = String(text || "");
      const interval = options.interval || this.options.typeInterval;
      let index = 0;

      this.options.text = content;
      this.text.textContent = "";
      this.layer.classList.add("is-typing");

      const tick = () => {
        index += 1;
        this.text.textContent = content.slice(0, index);

        if (index < content.length) {
          this.typingTimer = window.setTimeout(tick, interval);
          return;
        }

        this.stopTyping();
        if (typeof options.onComplete === "function") {
          options.onComplete(content);
        }
      };

      this.typingTimer = window.setTimeout(tick, interval);
    }

    show(point, text) {
      if (text) this.setTranscript(text);
      if (point) this.moveTo(point.x, point.y);
      this.visible = true;
      this.layer.classList.add("is-visible");
    }

    hide() {
      this.visible = false;
      this.stopTyping();
      this.stopListening();
      this.layer.classList.remove("is-visible");
    }

    getSpeechRecognition() {
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }

    startListening(point) {
      if (point) this.moveTo(point.x, point.y);
      this.show(point, this.options.listeningText);

      const SpeechRecognition = this.getSpeechRecognition();
      if (!SpeechRecognition) {
        this.setTranscript(this.options.unsupportedText);
        if (typeof this.options.onError === "function") {
          this.options.onError({ type: "unsupported" });
        }
        return false;
      }

      this.stopListening();
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.options.lang;
      this.recognition.continuous = this.options.continuous;
      this.recognition.interimResults = this.options.interimResults;

      this.recognition.onstart = () => {
        this.listening = true;
        this.layer.classList.add("is-listening");
        if (typeof this.options.onStart === "function") {
          this.options.onStart();
        }
      };

      this.recognition.onresult = event => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        const clean = transcript.trim();
        if (clean) {
          this.setTranscript(clean);
          if (typeof this.options.onTranscript === "function") {
            this.options.onTranscript(clean);
          }
        }
      };

      this.recognition.onerror = event => {
        this.listening = false;
        this.layer.classList.remove("is-listening");
        if (typeof this.options.onError === "function") {
          this.options.onError(event);
        }
      };

      this.recognition.onend = () => {
        this.listening = false;
        this.layer.classList.remove("is-listening");
        if (typeof this.options.onEnd === "function") {
          this.options.onEnd();
        }
      };

      this.recognition.start();
      return true;
    }

    stopListening() {
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      this.listening = false;
      this.layer.classList.remove("is-listening");
    }

    destroy() {
      this.stopListening();
      this.layer.remove();
    }
  }

  class WaterRippleLayer {
    constructor(options = {}) {
      this.options = { ...WATER_RIPPLE_DEFAULTS, ...options };
      this.target = typeof this.options.target === "string" ? document.querySelector(this.options.target) : this.options.target;
      this.target = this.target || document.body;
      this.running = false;
      this.looping = Boolean(this.options.loop || this.options.autoPlay);
      this.frame = 0;
      this.startedAt = 0;
      this.loopTimer = 0;
      this.resizeObserver = null;

      this.layer = document.createElement("div");
      this.layer.className = `${this.options.classPrefix}-water-ripple-layer`;
      if (this.options.fullScreen) this.layer.classList.add("is-fullscreen");
      this.canvas = document.createElement("canvas");
      this.canvas.className = `${this.options.classPrefix}-water-ripple-canvas`;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

      this.offCanvas = document.createElement("canvas");
      this.offCtx = this.offCanvas.getContext("2d", { willReadFrequently: true });
      this.bgCanvas = document.createElement("canvas");
      this.bgCtx = this.bgCanvas.getContext("2d", { willReadFrequently: true });
      this.refractCanvas = document.createElement("canvas");
      this.refractCtx = this.refractCanvas.getContext("2d", { willReadFrequently: true });
      this.bgData = null;
      this.refractData = null;
      this.hasBackground = false;

      this.layer.append(this.canvas);
      if (!this.options.fullScreen) {
        const position = getComputedStyle(this.target).position;
        if (position === "static") this.target.style.position = "relative";
      }
      this.target.append(this.layer);
      this.resize();

      this.onResize = this.onResize.bind(this);
      if ("ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(this.target);
      } else {
        window.addEventListener("resize", this.onResize);
      }

      if (this.options.autoPlay) this.start();
    }

    onResize() {
      this.resize();
    }

    resize() {
      const rect = this.options.fullScreen
        ? { width: window.innerWidth, height: window.innerHeight }
        : this.target.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr || 1.25);
      const maxPixels = Math.max(1, this.options.maxRenderPixels || width * height);
      const scale = Math.min(this.options.renderScale, Math.sqrt(maxPixels / Math.max(1, width * height)));

      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.renderScale = scale;
      this.canvas.width = Math.max(1, Math.round(width * dpr));
      this.canvas.height = Math.max(1, Math.round(height * dpr));
      this.offCanvas.width = Math.max(1, Math.round(width * scale));
      this.offCanvas.height = Math.max(1, Math.round(height * scale));
      this.bgCanvas.width = this.offCanvas.width;
      this.bgCanvas.height = this.offCanvas.height;
      this.refractCanvas.width = this.offCanvas.width;
      this.refractCanvas.height = this.offCanvas.height;
      this.refractData = this.refractCtx.createImageData(this.refractCanvas.width, this.refractCanvas.height);
      this.buildBackground();
    }

    setBackground(background) {
      this.options.background = background;
      this.buildBackground();
      return this;
    }

    setScale(scale) {
      this.options.scale = clamp(Number(scale) || 1, 0.2, 1.2);
      return this;
    }

    buildBackground() {
      const w = this.bgCanvas.width;
      const h = this.bgCanvas.height;
      this.bgCtx.clearRect(0, 0, w, h);
      if (typeof this.options.background === "function") {
        this.options.background(this.bgCtx, w, h);
        this.hasBackground = true;
      } else if (this.options.background === "demo") {
        const g = this.bgCtx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#f8fafc");
        g.addColorStop(0.48, "#dfe5ec");
        g.addColorStop(1, "#aeb8c4");
        this.bgCtx.fillStyle = g;
        this.bgCtx.fillRect(0, 0, w, h);

        const glow = this.bgCtx.createRadialGradient(w * 0.2, h * 0.2, 0, w * 0.2, h * 0.2, Math.max(w, h) * 0.55);
        glow.addColorStop(0, "rgba(255,255,255,.62)");
        glow.addColorStop(0.38, "rgba(255,255,255,.22)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        this.bgCtx.fillStyle = glow;
        this.bgCtx.fillRect(0, 0, w, h);

        const shade = this.bgCtx.createRadialGradient(w * 0.82, h * 0.88, 0, w * 0.82, h * 0.88, Math.max(w, h) * 0.64);
        shade.addColorStop(0, "rgba(24,32,40,.2)");
        shade.addColorStop(1, "rgba(24,32,40,0)");
        this.bgCtx.fillStyle = shade;
        this.bgCtx.fillRect(0, 0, w, h);
        this.hasBackground = true;
      } else {
        this.hasBackground = false;
      }
      try {
        this.bgData = this.bgCtx.getImageData(0, 0, w, h);
      } catch (error) {
        this.bgData = null;
      }
    }

    sample(data, width, height, x, y, channel) {
      const sx = clamp(x, 0, width - 1);
      const sy = clamp(y, 0, height - 1);
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(width - 1, x0 + 1);
      const y1 = Math.min(height - 1, y0 + 1);
      const tx = sx - x0;
      const ty = sy - y0;
      const i00 = (y0 * width + x0) * 4 + channel;
      const i10 = (y0 * width + x1) * 4 + channel;
      const i01 = (y1 * width + x0) * 4 + channel;
      const i11 = (y1 * width + x1) * 4 + channel;
      const top = data[i00] * (1 - tx) + data[i10] * tx;
      const bottom = data[i01] * (1 - tx) + data[i11] * tx;
      return top * (1 - ty) + bottom * ty;
    }

    smooth(a, b, value) {
      const n = clamp((value - a) / (b - a), 0, 1);
      return n * n * (3 - 2 * n);
    }

    lerp(a, b, value) {
      return a + (b - a) * value;
    }

    angleDistance(a, b) {
      return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    }

    band(distance, width, offset, scale = 1) {
      const n = Math.abs(distance - offset) / Math.max(1, width * scale);
      return n >= 1 ? 0 : Math.sin((1 - n) * Math.PI * 0.5);
    }

    spectral(value) {
      const stops = [
        [1, 0.42, 0.34],
        [1, 0.76, 0.42],
        [0.68, 1, 0.72],
        [0.48, 0.9, 1],
        [0.72, 0.66, 1]
      ];
      const v = clamp(value, 0, 1) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(v));
      const f = v - i;
      return [
        this.lerp(stops[i][0], stops[i + 1][0], f),
        this.lerp(stops[i][1], stops[i + 1][1], f),
        this.lerp(stops[i][2], stops[i + 1][2], f)
      ];
    }

    travel(life) {
      const early = 1 - Math.pow(1 - life, 2.35);
      const settle = Math.sin(this.smooth(0.18, 0.92, life) * Math.PI * 2.15) * 0.018 * (1 - this.smooth(0.56, 1, life));
      return clamp(early + settle, 0, 1);
    }

    fade(life, params = { rippleFadePower: 2.55 }) {
      const spawn = this.smooth(0, 0.1, life);
      const decay = Math.exp(-life * 1.28);
      const end = 1 - this.smooth(0.58, 0.84, life);
      return spawn * decay * Math.pow(end, params.rippleFadePower * 0.42);
    }

    natural(angle, index, life) {
      const drift = life * (0.48 + index * 0.07);
      return Math.sin(angle * 2.15 + index * 1.73 + drift) * 0.52
        + Math.sin(angle * 3.7 - index * 1.18 - drift * 0.76) * 0.3
        + Math.sin(angle * 7.4 + index * 0.83 + drift * 0.42) * 0.13
        + Math.sin(angle * 11.2 - index * 2.1) * 0.05;
    }

    sourceRadius(params) {
      return Math.max(4, params.rippleStartRadius + params.bandWidth * 0.08);
    }

    paramsForView(width, height) {
      const scaleBase = Math.min(width / 1280, height / 840);
      const base = {
        renderScale: this.renderScale,
        ringRadius: 390 * scaleBase,
        innerRadius: Math.max(8, 14 * scaleBase),
        bandWidth: 46 * scaleBase,
        blurAmount: Math.max(5, 12 * scaleBase),
        glowStrength: 0.72,
        wobbleAmplitude: 0.01,
        wobbleFrequency: 1.35,
        pulseSpeed: 0.42,
        pulseAmount: 0.025,
        rippleCount: this.options.ringCount,
        rippleSpacing: 76 * scaleBase,
        expansionSpeed: 0.38,
        rippleStartRadius: Math.max(2, 2 * scaleBase),
        rippleBandScale: 0.74,
        rippleFadePower: 2.55,
        surfaceNoise: 0.22,
        angularDisturbance: 0.28,
        reboundStrength: 0.82,
        blueHue: 220,
        orangeHue: 28,
        saturation: 56,
        lightness: 70,
        contrast: 1.16,
        refractionStrength: 34 * scaleBase,
        causticStrength: 0.58,
        causticWidth: 1.3,
        chromaCausticStrength: 0.88,
        chromaCausticRandomness: 0.42,
        waterDamping: 0.28
      };
      const visualScale = this.options.scale;
      const energyScale = Math.pow(visualScale, 1.35);
      const blurScale = Math.sqrt(visualScale);
      const radiusTimePower = clamp(1.92 - visualScale * 1.18, 0.66, 1.42);

      return {
        ...base,
        ringRadius: Math.max(base.ringRadius * 1.46, Math.hypot(width * 0.5, height * 1.08) * 1.08),
        bandWidth: base.bandWidth * 1.55 * visualScale,
        blurAmount: base.blurAmount * 0.68 * blurScale,
        glowStrength: base.glowStrength * 0.58,
        rippleStartRadius: base.rippleStartRadius * visualScale,
        rippleBandScale: base.rippleBandScale * this.lerp(0.86, 1.08, visualScale),
        radiusTimePower,
        causticStrength: base.causticStrength * 0.68 * energyScale,
        chromaCausticStrength: base.chromaCausticStrength * 0.58 * energyScale,
        refractionStrength: base.refractionStrength * 0.84 * energyScale,
        rippleCount: 3,
        rippleFadePower: base.rippleFadePower * 1.05,
        waterDamping: Math.max(0.16, base.waterDamping * 0.82)
      };
    }

    influence(distance, angle, sourceRadius, range, params, timeValue, power) {
      let displacement = 0;
      let caustic = 0;
      let chroma = 0;
      let bulge = 0;
      const coreRadius = sourceRadius + params.bandWidth * 0.34;
      const coreEnvelope = 1 - this.smooth(coreRadius, sourceRadius + params.bandWidth * 2.4, distance);
      let coreAmount = 0;

      for (let i = 0; i < params.rippleCount; i += 1) {
        const interval = 1 / Math.max(1, params.rippleCount);
        const emittedAge = timeValue * params.expansionSpeed - i * interval;
        const waveAge = emittedAge - 0.08 * interval;
        if (waveAge < 0) continue;
        const life = waveAge;
        if (life > 0.88) continue;
        const ringGain = [1, 0.58, 0.32][i] ?? Math.max(0.22, 1 - i * 0.24);
        const travel = Math.pow(this.travel(life), params.radiusTimePower);

        if (coreEnvelope > 0) {
          const corePull = this.smooth(0, 0.12, life) * (1 - this.smooth(0.16, 0.36, life)) * -0.5;
          const corePush = this.smooth(0.22, 0.54, life) * (1 - this.smooth(0.58, 0.76, life));
          const coreBackwash = this.smooth(0.58, 0.76, life) * (1 - this.smooth(0.78, 0.98, life)) * -0.5;
          const coreVisibility = this.smooth(0.02, 0.14, life) * (1 - this.smooth(0.72, 0.98, life));
          coreAmount += (corePull + corePush + coreBackwash) * coreVisibility * ringGain;
        }

        const radius = sourceRadius + range * travel;
        const natural = this.natural(angle, i, life);
        const disturbedRadius = radius + natural * params.angularDisturbance * params.surfaceNoise * params.bandWidth * 0.76;
        const bandNoise = 1 + natural * params.surfaceNoise * 0.13;
        const band = Math.max(5, params.bandWidth * params.rippleBandScale * this.lerp(0.78, 0.98, travel) * bandNoise);
        const delta = distance - disturbedRadius;
        const normalized = Math.abs(delta) / Math.max(1, band * params.causticWidth);
        if (normalized > 1.8) continue;

        const fade = this.fade(life, params) * power * ringGain;
        const wave = Math.sin((1 - Math.min(normalized, 1)) * Math.PI) * fade;
        const sign = delta < 0 ? -1 : 1;
        const crestShape = Math.pow(Math.max(0, Math.sin((1 - Math.min(normalized, 1)) * Math.PI)), 1.35);
        const crestBulge = crestShape * fade * (0.72 + (1 - travel) * 0.44);
        const coreReboundBoost = 1 - this.smooth(0.18, 0.48, travel);

        const earlyCenter = disturbedRadius - band * this.lerp(0.34, 0.6, travel);
        const earlyDelta = distance - earlyCenter;
        const earlyNorm = Math.abs(earlyDelta) / Math.max(1, band * 1.02);
        const earlyFade = this.smooth(0.12, 0.3, life) * (1 - this.smooth(0.48, 0.84, life)) * (0.82 + coreReboundBoost * 0.18);
        const earlyShape = Math.sin((1 - Math.min(earlyNorm, 1)) * Math.PI);
        const earlyRebound = earlyShape * fade * params.reboundStrength * earlyFade * (0.32 + coreReboundBoost * 0.34);
        const earlySign = earlyDelta < 0 ? -1 : 1;

        const underCenter = disturbedRadius - band * this.lerp(0.78, 1.18, travel);
        const underDelta = distance - underCenter;
        const underNorm = Math.abs(underDelta) / Math.max(1, band * 1.08);
        const underFade = this.smooth(0.24, 0.44, life) * (1 - this.smooth(0.62, 0.94, life)) * (0.48 + coreReboundBoost * 0.52);
        const underShape = Math.sin((1 - Math.min(underNorm, 1)) * Math.PI);
        const undershoot = underShape * fade * params.reboundStrength * underFade * (0.22 + coreReboundBoost * 0.62);
        const underSign = underDelta < 0 ? -1 : 1;

        const reboundCenter = disturbedRadius - band * this.lerp(0.64, 1.08, travel);
        const reboundDelta = distance - reboundCenter;
        const reboundNorm = Math.abs(reboundDelta) / Math.max(1, band * 1.15);
        const reboundFade = this.smooth(0.12, 0.42, life) * (1 - this.smooth(0.82, 0.99, life));
        const reboundShape = Math.sin((1 - Math.min(reboundNorm, 1)) * Math.PI);
        const rebound = reboundShape * fade * params.reboundStrength * reboundFade;
        const reboundSign = reboundDelta < 0 ? -1 : 1;
        const tremor = natural * params.surfaceNoise * 0.08 * fade * (1 - normalized * 0.35);
        const chromaFade = (1 - this.smooth(0.06, 0.52, life)) * (1 - this.smooth(0.18, 0.92, normalized)) * (0.72 + (1 - travel) * 0.28);

        displacement += (sign * wave - earlySign * earlyRebound * 0.82 - underSign * undershoot * 1.18 - reboundSign * rebound * 1.35 + tremor) * (1 - params.waterDamping);
        caustic += (1 - this.smooth(0, 1, normalized)) * fade * (1 + natural * params.surfaceNoise * 0.1);
        caustic -= (1 - this.smooth(0, 1, earlyNorm)) * fade * params.reboundStrength * 0.12 * earlyFade;
        caustic -= (1 - this.smooth(0, 1, underNorm)) * fade * params.reboundStrength * 0.16 * underFade;
        caustic -= (1 - this.smooth(0, 1, reboundNorm)) * fade * params.reboundStrength * 0.22 * reboundFade;
        chroma = Math.max(chroma, fade * chromaFade);
        bulge = Math.max(bulge, crestBulge);
      }

      if (coreEnvelope > 0) {
        coreAmount *= params.reboundStrength * coreEnvelope;
        displacement += coreAmount * 1.12 * (1 - params.waterDamping);
        caustic += Math.max(0, coreAmount) * 0.08;
        caustic -= Math.max(0, -coreAmount) * 0.1;
      }

      return { displacement, caustic, chroma, bulge };
    }

    renderRefraction(params, timeValue, power) {
      const bw = this.bgCanvas.width;
      const bh = this.bgCanvas.height;
      if (!this.bgData || !this.refractData || !bw || !bh) return false;
      const src = this.bgData.data;
      const dst = this.refractData.data;
      const cx = bw * 0.5;
      const cy = bh * 1.06;
      const sourceRadius = this.sourceRadius(params);
      const range = Math.max(1, params.ringRadius * params.renderScale - sourceRadius);

      for (let y = 0; y < bh; y += 1) {
        for (let x = 0; x < bw; x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          const distance = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / distance;
          const ny = dy / distance;
          const angle = Math.atan2(dy, dx);
          const inf = this.influence(distance, angle, sourceRadius, range, params, timeValue, power);
          const offset = inf.displacement * params.refractionStrength;
          const bottomGain = 1 + Math.max(0, 1 - y / Math.max(1, bh)) * 0.1;
          const bulgeLens = 1 + inf.bulge * 0.36 * bottomGain;
          const bulgeX = cx + dx / bulgeLens;
          const bulgeY = cy + dy / bulgeLens;
          const bulgePush = inf.bulge * params.bandWidth * 1.58;
          const tangentialShear = inf.bulge * params.bandWidth * 0.18 * Math.sin(angle * 2.1 + timeValue * 0.9);
          const tx = -ny;
          const ty = nx;
          const sx = bulgeX + nx * (offset + bulgePush) + tx * tangentialShear;
          const sy = bulgeY + ny * (offset + bulgePush) + ty * tangentialShear;
          const idx = (y * bw + x) * 4;
          const caustic = inf.caustic * params.causticStrength * 58;
          const bandSpread = params.bandWidth * this.lerp(0.42, 0.68, params.chromaCausticRandomness);
          const waveDistance = inf.displacement * params.refractionStrength * -0.42;
          const strongAxis = -Math.PI / 2;
          const oppositeAxis = strongAxis + Math.PI;
          const sectorWidth = this.lerp(1.75, 0.9, params.chromaCausticRandomness);
          const sectorA = 1 - this.smooth(0, sectorWidth, this.angleDistance(angle, strongAxis));
          const sectorB = 1 - this.smooth(0, sectorWidth, this.angleDistance(angle, oppositeAxis));
          const directionalMask = Math.pow(Math.max(sectorA, sectorB), this.lerp(2.05, 1.18, params.chromaCausticRandomness));
          const colorPosition = clamp(waveDistance / Math.max(1, bandSpread * 2.35) + 0.5, 0, 1);
          const spectral = this.spectral(colorPosition);
          const soft = this.band(waveDistance, bandSpread, -bandSpread * 0.72, 1.55) * 0.52
            + this.band(waveDistance, bandSpread, 0, 1.75) * 0.72
            + this.band(waveDistance, bandSpread, bandSpread * 0.78, 1.6) * 0.56;
          const energy = Math.max(0, inf.caustic - 0.004) * inf.chroma * params.chromaCausticStrength * 220 * directionalMask * clamp(soft, 0, 1);
          if (this.hasBackground) {
            dst[idx] = clamp(this.sample(src, bw, bh, sx - 0.45, sy, 0) + caustic + energy * spectral[0], 0, 255);
            dst[idx + 1] = clamp(this.sample(src, bw, bh, sx, sy, 1) + caustic + energy * spectral[1] * 0.9, 0, 255);
            dst[idx + 2] = clamp(this.sample(src, bw, bh, sx + 0.45, sy, 2) + caustic * 0.86 + energy * spectral[2] * 1.04, 0, 255);
            dst[idx + 3] = 255;
          } else {
            const alpha = clamp((Math.abs(inf.caustic) * 90 + inf.chroma * 120) * this.options.opacity, 0, 180);
            const shade = clamp(235 + caustic * 0.12 + energy * 0.05, 0, 255);
            dst[idx] = shade;
            dst[idx + 1] = shade;
            dst[idx + 2] = shade;
            dst[idx + 3] = alpha;
          }
        }
      }
      this.refractCtx.putImageData(this.refractData, 0, 0);
      return true;
    }

    makeRingPath(ctx, cx, cy, radius, width, wobbleAmp, wobbleFrequency, phase, index, life, naturalAmount) {
      const outer = radius + width * 0.5;
      const inner = Math.max(2, radius - width * 0.5);
      const steps = 220;
      ctx.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        const wobble = 1 + Math.sin(t * wobbleFrequency + phase) * wobbleAmp + Math.sin(t * (wobbleFrequency * 0.5) - phase * 0.7) * wobbleAmp * 0.35;
        const natural = this.natural(t, index, life) * naturalAmount * width * 0.5;
        const r = outer * wobble;
        const x = cx + Math.cos(t) * (r + natural);
        const y = cy + Math.sin(t) * (r + natural);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i -= 1) {
        const t = (i / steps) * Math.PI * 2;
        const wobble = 1 + Math.sin(t * wobbleFrequency + phase) * wobbleAmp * 0.72 + Math.sin(t * (wobbleFrequency * 0.5) - phase * 0.7) * wobbleAmp * 0.25;
        const natural = this.natural(t, index, life) * naturalAmount * width * 0.36;
        const r = inner * wobble;
        ctx.lineTo(cx + Math.cos(t) * (r + natural), cy + Math.sin(t) * (r + natural));
      }
      ctx.closePath();
    }

    drawGlowRing(ctx, cx, cy, phase, radius, alpha, index, life, params) {
      const width = params.bandWidth;
      const wobbleAmp = params.wobbleAmplitude;
      const naturalAmount = params.angularDisturbance * params.surfaceNoise;
      const gradient = ctx.createConicGradient(-0.35, cx, cy);
      gradient.addColorStop(0, `hsla(${params.blueHue}, ${params.saturation}%, ${params.lightness + 6}%, ${0.12 * alpha})`);
      gradient.addColorStop(0.16, `hsla(${params.blueHue}, ${params.saturation}%, ${params.lightness + 16}%, ${0.92 * params.glowStrength * alpha})`);
      gradient.addColorStop(0.34, `hsla(${params.blueHue - 18}, ${params.saturation - 4}%, ${params.lightness + 2}%, ${0.72 * params.glowStrength * alpha})`);
      gradient.addColorStop(0.5, `hsla(${(params.blueHue + params.orangeHue) * 0.5}, ${params.saturation - 8}%, ${params.lightness + 8}%, ${0.28 * alpha})`);
      gradient.addColorStop(0.68, `hsla(${params.orangeHue}, ${params.saturation}%, ${params.lightness + 12}%, ${0.96 * params.glowStrength * alpha})`);
      gradient.addColorStop(0.9, `hsla(${params.orangeHue + 6}, ${params.saturation - 2}%, ${params.lightness + 2}%, ${0.56 * params.glowStrength * alpha})`);
      gradient.addColorStop(1, `hsla(${params.blueHue}, ${params.saturation}%, ${params.lightness + 6}%, ${0.12 * alpha})`);

      ctx.save();
      ctx.filter = `blur(${params.blurAmount}px) saturate(${1 + params.glowStrength * 0.25})`;
      this.makeRingPath(ctx, cx, cy, radius, width, wobbleAmp, params.wobbleFrequency, phase, index, life, naturalAmount);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.filter = `blur(${Math.max(1, params.blurAmount * 0.22)}px) saturate(${1 + params.glowStrength * 0.18})`;
      this.makeRingPath(ctx, cx, cy, radius, width * 0.92, wobbleAmp * 0.9, params.wobbleFrequency, phase, index, life, naturalAmount);
      ctx.lineWidth = Math.max(0.5, width * 0.04);
      ctx.strokeStyle = gradient;
      ctx.globalAlpha = clamp(alpha * 0.22, 0, 1);
      ctx.stroke();
      ctx.restore();
    }

    render(timestamp) {
      if (!this.running) return;
      if (!this.startedAt) this.startedAt = timestamp;
      const elapsed = timestamp - this.startedAt;
      const progress = clamp(elapsed / this.options.duration, 0, 1);
      const fade = elapsed > this.options.duration - 520
        ? Math.max(0, 1 - (elapsed - (this.options.duration - 520)) / 520)
        : 1;
      const wake = this.smooth(0.02, 0.14, progress) * fade;
      const power = wake * clamp(1 - Math.max(0, (progress - 0.88) / 0.1), 0, 1);
      const overlayAlpha = clamp(wake * (1 - this.smooth(0.82, 0.98, progress)), 0, 1) * this.options.opacity;
      const ow = this.offCanvas.width;
      const oh = this.offCanvas.height;
      const params = this.paramsForView(this.width, this.height);
      const timeValue = progress * 3.18;

      if (this.renderRefraction(params, timeValue, power)) {
        this.offCtx.clearRect(0, 0, ow, oh);
        this.offCtx.drawImage(this.refractCanvas, 0, 0);
      } else {
        this.offCtx.clearRect(0, 0, ow, oh);
        this.offCtx.drawImage(this.bgCanvas, 0, 0);
      }

      this.offCtx.save();
      this.offCtx.scale(params.renderScale, params.renderScale);
      this.offCtx.globalCompositeOperation = "screen";
      const cx = ow * 0.5 / params.renderScale;
      const cy = oh * 1.06 / params.renderScale;
      const sourceRadius = this.sourceRadius(params);
      const rippleRange = Math.max(1, params.ringRadius - sourceRadius);
      for (let i = 0; i < params.rippleCount; i += 1) {
        const interval = 1 / Math.max(1, params.rippleCount);
        const emittedAge = timeValue * params.expansionSpeed - i * interval;
        const life = emittedAge + 0.16 - i * 0.02;
        if (life < 0 || life > 0.88) continue;
        const gain = [1, 0.58, 0.32][i] || Math.max(0.22, 1 - i * 0.24);
        const travel = Math.pow(this.travel(life), params.radiusTimePower);
        const radius = sourceRadius + rippleRange * travel;
        const alpha = this.fade(life, params) * power * gain * 1.16;
        const rippleBand = Math.max(7, params.bandWidth * (params.rippleBandScale * this.lerp(0.86, 1.08, travel)));
        const ringParams = {
          ...params,
          bandWidth: rippleBand,
          blurAmount: params.blurAmount * this.lerp(1.05, 1.32, travel),
          glowStrength: params.glowStrength * this.lerp(0.72, 0.28, travel),
          lightness: params.lightness + this.lerp(8, -4, travel),
          saturation: params.saturation - this.lerp(6, 22, travel),
          wobbleAmplitude: params.wobbleAmplitude + params.angularDisturbance * 0.008,
          wobbleFrequency: params.wobbleFrequency + i * 0.16
        };
        this.drawGlowRing(this.offCtx, cx, cy, i * 1.37 + life * 0.68, radius, alpha, i, life, ringParams);
      }
      this.offCtx.restore();

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.globalAlpha = overlayAlpha;
      this.ctx.filter = `contrast(${params.contrast})`;
      this.ctx.drawImage(this.offCanvas, 0, 0, ow, oh, 0, 0, this.width, this.height);
      this.ctx.filter = "none";
      this.ctx.restore();

      if (elapsed < this.options.duration) {
        this.frame = requestAnimationFrame(time => this.render(time));
        return;
      }

      this.running = false;
      this.startedAt = 0;
      this.layer.classList.remove("is-active");
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.looping) {
        this.loopTimer = window.setTimeout(() => this.play(), this.options.loopDelay);
      }
    }

    play() {
      window.clearTimeout(this.loopTimer);
      cancelAnimationFrame(this.frame);
      this.resize();
      this.running = true;
      this.startedAt = 0;
      this.layer.classList.add("is-active");
      this.frame = requestAnimationFrame(time => this.render(time));
    }

    start() {
      this.looping = true;
      this.play();
    }

    stop() {
      this.looping = false;
      this.running = false;
      this.startedAt = 0;
      window.clearTimeout(this.loopTimer);
      cancelAnimationFrame(this.frame);
      this.layer.classList.remove("is-active");
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() {
      this.stop();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      else window.removeEventListener("resize", this.onResize);
      this.layer.remove();
    }
  }

  class EdgeGlowLayer {
    constructor(options = {}) {
      this.options = {
        ...EDGE_GLOW_DEFAULTS,
        ...options,
        colors: { ...EDGE_GLOW_DEFAULTS.colors, ...(options.colors || {}) }
      };
      this.target = typeof this.options.target === "string" ? document.querySelector(this.options.target) : this.options.target;
      this.target = this.target || document.body;
      this.active = false;

      this.layer = document.createElement("div");
      this.layer.className = `${this.options.classPrefix}-edge-glow-layer`;
      if (this.options.fullScreen) this.layer.classList.add("is-fullscreen");
      this.layer.innerHTML = `
        <img class="${this.options.classPrefix}-edge-glow-image" src="${this.options.assetUrl}" alt="" aria-hidden="true" />
        <span class="${this.options.classPrefix}-edge-glow ${this.options.classPrefix}-edge-glow-top" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow ${this.options.classPrefix}-edge-glow-right" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow ${this.options.classPrefix}-edge-glow-bottom" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow ${this.options.classPrefix}-edge-glow-left" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow-corner ${this.options.classPrefix}-edge-glow-corner-tl" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow-corner ${this.options.classPrefix}-edge-glow-corner-tr" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow-corner ${this.options.classPrefix}-edge-glow-corner-br" aria-hidden="true"></span>
        <span class="${this.options.classPrefix}-edge-glow-corner ${this.options.classPrefix}-edge-glow-corner-bl" aria-hidden="true"></span>
      `;

      if (!this.options.fullScreen) {
        const position = getComputedStyle(this.target).position;
        if (position === "static") this.target.style.position = "relative";
      }
      this.target.append(this.layer);
      this.applyOptions();
      if (this.options.autoPlay) this.start();
    }

    applyOptions() {
      const thickness = Math.max(1, Number(this.options.thickness) || EDGE_GLOW_DEFAULTS.thickness);
      const blur = Math.max(0, Number(this.options.blur) || EDGE_GLOW_DEFAULTS.blur);
      const intensity = Math.max(0, Number(this.options.intensity) || 1);
      const opacity = clamp(Number(this.options.opacity) || EDGE_GLOW_DEFAULTS.opacity, 0, 1);
      this.layer.style.setProperty("--aiw-edge-thickness", `${thickness}px`);
      this.layer.style.setProperty("--aiw-edge-blur", `${blur}px`);
      this.layer.style.setProperty("--aiw-edge-intensity", String(intensity));
      this.layer.style.setProperty("--aiw-edge-opacity", String(opacity));
      this.layer.style.setProperty("--aiw-edge-image", `url("${this.options.assetUrl}")`);
      this.layer.style.setProperty("--aiw-edge-top-left", this.options.colors.topLeft);
      this.layer.style.setProperty("--aiw-edge-top-right", this.options.colors.topRight);
      this.layer.style.setProperty("--aiw-edge-right", this.options.colors.right);
      this.layer.style.setProperty("--aiw-edge-bottom-right", this.options.colors.bottomRight);
      this.layer.style.setProperty("--aiw-edge-bottom-left", this.options.colors.bottomLeft);
      this.layer.style.setProperty("--aiw-edge-left", this.options.colors.left);
    }

    setOptions(options = {}) {
      this.options = {
        ...this.options,
        ...options,
        colors: { ...this.options.colors, ...(options.colors || {}) }
      };
      const image = this.layer.querySelector(`.${this.options.classPrefix}-edge-glow-image`);
      if (image && options.assetUrl) image.src = options.assetUrl;
      this.applyOptions();
      return this;
    }

    start() {
      this.active = true;
      this.layer.classList.add("is-active");
      return this;
    }

    stop() {
      this.active = false;
      this.layer.classList.remove("is-active");
      return this;
    }

    toggle(force) {
      const shouldShow = typeof force === "boolean" ? force : !this.active;
      return shouldShow ? this.start() : this.stop();
    }

    destroy() {
      this.stop();
      this.layer.remove();
    }
  }

  window.AIWater = window.AIWater || {};
  window.AIWater.AICursor = AICursor;
  window.AIWater.CursorTrigger = CursorTrigger;
  window.AIWater.AICommandChip = AICommandChip;
  window.AIWater.VoiceInputBubble = VoiceInputBubble;
  window.AIWater.WaterRippleLayer = WaterRippleLayer;
  window.AIWater.EdgeGlowLayer = EdgeGlowLayer;
  window.AIWater.createCursor = function createCursor(options) {
    return new AICursor(options);
  };
  window.AIWater.createCursorTrigger = function createCursorTrigger(options) {
    return new CursorTrigger(options);
  };
  window.AIWater.createCommandChip = function createCommandChip(options) {
    return new AICommandChip(options);
  };
  window.AIWater.createVoiceInputBubble = function createVoiceInputBubble(options) {
    return new VoiceInputBubble(options);
  };
  window.AIWater.createWaterRippleLayer = function createWaterRippleLayer(options) {
    return new WaterRippleLayer(options);
  };
  window.AIWater.createEdgeGlowLayer = function createEdgeGlowLayer(options) {
    return new EdgeGlowLayer(options);
  };
})();
