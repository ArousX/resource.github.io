/**
 * ==========================================================================
 * 暗底水墨山水 · 墨流引擎 (Dark Ink Landscape + Navier-Stokes Ink Flow)
 * ==========================================================================
 * 背景：暗底三层水墨远山 SVG 画卷（参考 ryan-flow/ink-studio「墨韵」）
 * 墨流：基于 PavelDoGreat/WebGL-Fluid-Simulation（MIT License）的
 *       Navier-Stokes 流体引擎二次改造 —— 去除霓虹色、GUI、Bloom/Sunrays 光污染，
 *       保留真实液体的翻涌、涡流与渗散，墨色以低饱和青灰蓝呈现，
 *       鼠标如笔拖过时墨丝在山水间流动晕染，无颗粒、无灰尘感。
 */

class HighContrastInkWash {
    constructor() {
        this.canvas = document.getElementById('ink-canvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'ink-canvas';
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.zIndex = '0';
            this.canvas.style.pointerEvents = 'none';
            document.body.prepend(this.canvas);
        }
        this.bgInjected = false;

        this.injectBackground();
        this.startFluid();
    }

    /** 注入暗底水墨 SVG 画卷背景 */
    injectBackground() {
        if (this.bgInjected) return;

        const styleId = 'ink-wash-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = [
                '.ink-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;opacity:0.95;}',
                '.ink-bg svg{width:100%;height:100%;display:block;}',
                '.iw-mountain{animation:iw-mountain-rise 2.5s ease forwards;opacity:0;}',
                '.iw-mountain-2{animation-delay:0.4s;}',
                '.iw-mountain-3{animation-delay:0.8s;}',
                '@keyframes iw-mountain-rise{0%{transform:translateY(30px);opacity:0;}100%{transform:translateY(0);opacity:1;}}',
                '.iw-bamboo{animation:iw-bamboo-sway 5s ease-in-out infinite;transform-origin:bottom center;}',
                '.iw-bamboo-2{animation-delay:0.9s;}',
                '.iw-bamboo-3{animation-delay:1.8s;}',
                '@keyframes iw-bamboo-sway{0%,100%{transform:rotate(-1deg);}50%{transform:rotate(1deg);}}',
                '.iw-drop{animation:iw-ink-spread 7s ease-out infinite;}',
                '.iw-drop-2{animation-delay:2.2s;}',
                '.iw-drop-3{animation-delay:4.3s;}',
                '@keyframes iw-ink-spread{0%{r:0;opacity:0.5;}50%{opacity:0.2;}100%{r:90;opacity:0;}}',
                '.iw-crane{animation:iw-crane-fly 26s linear infinite;}',
                '@keyframes iw-crane-fly{0%{transform:translate(0,0);}25%{transform:translate(80px,-40px);}50%{transform:translate(160px,-12px);}75%{transform:translate(240px,-48px);}100%{transform:translate(320px,-24px);}}',
                '.iw-koi{animation:iw-koi-swim 18s ease-in-out infinite;}',
                '.iw-koi-2{animation-delay:5s;animation-duration:24s;}',
                '@keyframes iw-koi-swim{0%{transform:translate(0,0) rotate(0deg);}25%{transform:translate(40px,-14px) rotate(-5deg);}50%{transform:translate(85px,10px) rotate(4deg);}75%{transform:translate(35px,18px) rotate(6deg);}100%{transform:translate(0,0) rotate(0deg);}}',
                '.iw-ripple{animation:iw-ripple 4s ease-out infinite;}',
                '.iw-ripple-2{animation-delay:1.4s;}',
                '.iw-ripple-3{animation-delay:2.8s;}',
                '@keyframes iw-ripple{0%{r:5;opacity:0.5;}100%{r:48;opacity:0;}}',
                '.iw-petal{animation:iw-petal-fall 14s linear infinite;}',
                '.iw-petal-2{animation-delay:3s;animation-duration:16s;}',
                '.iw-petal-3{animation-delay:6s;animation-duration:12s;}',
                '.iw-petal-4{animation-delay:9s;animation-duration:15s;}',
                '@keyframes iw-petal-fall{0%{transform:translateY(-80px) rotate(0deg);opacity:0;}10%{opacity:0.5;}100%{transform:translateY(100vh) rotate(360deg);opacity:0;}}',
                '.iw-brush{stroke-dasharray:1400;stroke-dashoffset:1400;animation:iw-brush 5s ease forwards;}',
                '.iw-brush-2{animation-delay:1.2s;}',
                '@keyframes iw-brush{0%{stroke-dashoffset:1400;opacity:0;}30%{opacity:0.35;}100%{stroke-dashoffset:0;opacity:0.35;}}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(style);
        }

        const svgId = 'ink-wash-bg';
        if (document.getElementById(svgId)) return;

        const bg = document.createElement('div');
        bg.className = 'ink-bg';
        bg.id = svgId;
        bg.innerHTML = `
<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iw-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#262e3a"/>
      <stop offset="100%" stop-color="#171c25"/>
    </linearGradient>
    <linearGradient id="iw-mtn-far" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3a4252" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#232935" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="iw-mtn-mid" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2b3240" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1a2029" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="iw-mtn-near" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#20262f" stop-opacity="1"/>
      <stop offset="100%" stop-color="#12161d" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="iw-koi-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#5a2c30"/>
      <stop offset="50%" stop-color="#8a4448"/>
      <stop offset="100%" stop-color="#5a2c30"/>
    </linearGradient>
    <radialGradient id="iw-moon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#dbe2ea" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="#dbe2ea" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#dbe2ea" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 纯黑底 -->
  <rect width="100%" height="100%" fill="#000000"/>

  <!-- 月晕（极淡） -->
  <circle cx="1560" cy="180" r="260" fill="url(#iw-moon)"/>
  <circle cx="1560" cy="180" r="34" fill="#e6ecf4" opacity="0.14"/>

  <!-- 三层水墨远山 -->
  <g class="iw-mountain iw-mountain-3" opacity="0.5">
    <path d="M0,680 Q340,480 640,600 T1260,540 T1920,640 L1920,1080 L0,1080 Z" fill="url(#iw-mtn-far)"/>
  </g>
  <g class="iw-mountain iw-mountain-2" opacity="0.7">
    <path d="M0,740 Q300,540 600,670 T1180,600 T1920,720 L1920,1080 L0,1080 Z" fill="url(#iw-mtn-mid)"/>
    <path d="M0,740 Q300,540 600,670 T1180,600 T1920,720" stroke="#6b7688" stroke-width="1" fill="none" opacity="0.16"/>
  </g>
  <g class="iw-mountain" opacity="0.95">
    <path d="M0,820 Q240,640 540,750 T1100,690 T1920,810 L1920,1080 L0,1080 Z" fill="url(#iw-mtn-near)"/>
    <path d="M0,820 Q240,640 540,750 T1100,690 T1920,810" stroke="#3a4355" stroke-width="1.2" fill="none" opacity="0.32"/>
  </g>

  <!-- 墨竹 -->
  <g class="iw-bamboo" transform="translate(60, 260)">
    <rect x="0" y="0" width="9" height="340" fill="#223a28" rx="2"/>
    <line x1="0" y1="60" x2="9" y2="60" stroke="#16281b" stroke-width="2.5"/>
    <line x1="0" y1="130" x2="9" y2="130" stroke="#16281b" stroke-width="2.5"/>
    <line x1="0" y1="200" x2="9" y2="200" stroke="#16281b" stroke-width="2.5"/>
    <path d="M9,45 Q34,34 56,50 Q44,56 9,56" fill="#2c4a34" opacity="0.5"/>
    <path d="M9,120 Q38,104 66,126 Q48,138 9,132" fill="#2c4a34" opacity="0.5"/>
  </g>
  <g class="iw-bamboo iw-bamboo-2" transform="translate(86, 330)">
    <rect x="0" y="0" width="7" height="270" fill="#223a28" rx="2"/>
    <line x1="0" y1="45" x2="7" y2="45" stroke="#16281b" stroke-width="2"/>
    <line x1="0" y1="105" x2="7" y2="105" stroke="#16281b" stroke-width="2"/>
    <line x1="0" y1="165" x2="7" y2="165" stroke="#16281b" stroke-width="2"/>
    <path d="M0,38 Q-28,26 -50,42 Q-34,52 0,44" fill="#2c4a34" opacity="0.5"/>
  </g>
  <g class="iw-bamboo iw-bamboo-3" transform="translate(1800, 250)">
    <rect x="0" y="0" width="10" height="350" fill="#223a28" rx="2"/>
    <line x1="0" y1="65" x2="10" y2="65" stroke="#16281b" stroke-width="2.5"/>
    <line x1="0" y1="145" x2="10" y2="145" stroke="#16281b" stroke-width="2.5"/>
    <line x1="0" y1="225" x2="10" y2="225" stroke="#16281b" stroke-width="2.5"/>
    <path d="M0,55 Q-40,38 -66,58 Q-46,68 0,64" fill="#2c4a34" opacity="0.5"/>
    <path d="M10,135 Q48,118 74,142 Q52,154 10,148" fill="#2c4a34" opacity="0.5"/>
  </g>

  <!-- 墨滴 -->
  <g filter="url(#iw-blur)">
    <circle class="iw-drop" cx="210" cy="160" r="0" fill="#0b0d12" opacity="0"/>
    <circle class="iw-drop iw-drop-2" cx="1500" cy="210" r="0" fill="#0b0d12" opacity="0"/>
    <circle class="iw-drop iw-drop-3" cx="980" cy="110" r="0" fill="#0b0d12" opacity="0"/>
  </g>
  <filter id="iw-blur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
  </filter>

  <!-- 仙鹤 -->
  <g class="iw-crane" transform="translate(60, 90)">
    <path d="M0,0 Q6,-6 16,-4 L27,-1 L16,2 Q6,6 0,0" fill="#8a93a4"/>
    <circle cx="-4" cy="0" r="3" fill="#8a93a4"/>
    <line x1="-8" y1="0" x2="-14" y2="0" stroke="#8a93a4" stroke-width="1"/>
    <path d="M11,-4 Q22,-18 34,-12" stroke="#8a93a4" stroke-width="1.2" fill="none"/>
    <path d="M11,4 Q22,18 34,12" stroke="#8a93a4" stroke-width="1.2" fill="none"/>
  </g>

  <!-- 水波涟漪 + 锦鲤 -->
  <g transform="translate(1330, 880)" opacity="0.6">
    <circle class="iw-ripple" cx="50" cy="20" r="5" fill="none" stroke="#7c8698" stroke-width="0.6" opacity="0"/>
    <circle class="iw-ripple iw-ripple-2" cx="50" cy="20" r="5" fill="none" stroke="#7c8698" stroke-width="0.6" opacity="0"/>
    <circle class="iw-ripple iw-ripple-3" cx="50" cy="20" r="5" fill="none" stroke="#7c8698" stroke-width="0.6" opacity="0"/>
  </g>
  <g class="iw-koi" transform="translate(1400, 920)" opacity="0.85">
    <ellipse cx="0" cy="0" rx="24" ry="9" fill="url(#iw-koi-grad)"/>
    <path d="M20,0 Q36,-9 40,0 Q36,9 20,0" fill="#6e3438"/>
    <circle cx="-14" cy="-3" r="2" fill="#0d0f14"/>
    <path d="M-5,-7 Q0,-12 5,-7" stroke="#b0636a" stroke-width="2" fill="none"/>
    <path d="M-5,7 Q0,12 5,7" stroke="#b0636a" stroke-width="2" fill="none"/>
  </g>

  <!-- 花瓣 -->
  <g class="iw-petal" transform="translate(320, 0)"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#7a5a5e" opacity="0.35"/></g>
  <g class="iw-petal iw-petal-2" transform="translate(520, 0)"><ellipse cx="0" cy="0" rx="6" ry="4" fill="#6b4e52" opacity="0.3"/></g>
  <g class="iw-petal iw-petal-3" transform="translate(720, 0)"><ellipse cx="0" cy="0" rx="7" ry="4" fill="#7a5a5e" opacity="0.35"/></g>
  <g class="iw-petal iw-petal-4" transform="translate(1560, 0)"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#6b4e52" opacity="0.3"/></g>
</svg>`;
        this.canvas.insertAdjacentElement('beforebegin', bg);
        this.bgInjected = true;
    }

    /** ===== Navier-Stokes 墨流引擎（基于 WebGL-Fluid-Simulation, MIT） ===== */
    startFluid() {
        const canvas = this.canvas;
        const DPR = Math.min(window.devicePixelRatio || 1, 2);

        // —— 配置：去霓虹、去光晕，黑墨低饱和
        const config = {
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 640,
            DENSITY_DISSIPATION: 2.0,
            VELOCITY_DISSIPATION: 0.45,
            PRESSURE: 0.75,
            PRESSURE_ITERATIONS: 20,
            CURL: 25,
            SPLAT_RADIUS: 0.085,
            SPLAT_FORCE: 4700,
            SHADING: true,
            BACK_COLOR: { r: 0, g: 0, b: 0 },
            TRANSPARENT: true,
            BLOOM: false,
            SUNRAYS: false
        };

        let pointers = [];
        const pointerPrototype = () => ({
            id: -1, texcoordX: 0, texcoordY: 0,
            prevTexcoordX: 0, prevTexcoordY: 0,
            deltaX: 0, deltaY: 0, down: false, moved: false,
            color: inkColor()
        });
        pointers.push(pointerPrototype());

        const getWebGLContext = () => {
            const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
            let gl = canvas.getContext('webgl2', params);
            const isWebGL2 = !!gl;
            if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
            let halfFloat, supportLinearFiltering;
            if (isWebGL2) {
                gl.getExtension('EXT_color_buffer_float');
                supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
            } else {
                halfFloat = gl.getExtension('OES_texture_half_float');
                supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
            }
            gl.clearColor(0, 0, 0, 1);
            const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
            let formatRGBA, formatRG, formatR;
            const getSupportedFormat = (internal, format, type) => {
                const t = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, t);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, type, null);
                const fbo = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
                const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
                if (!ok) {
                    if (internal === gl.R16F) return getSupportedFormat(gl.RG16F, format, type);
                    if (internal === gl.RG16F) return getSupportedFormat(gl.RGBA16F, format, type);
                    return null;
                }
                return { internalFormat: internal, format };
            };
            if (isWebGL2) {
                formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
                formatRG = getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType);
                formatR = getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType);
            } else {
                formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
                formatRG = formatRGBA;
                formatR = formatRGBA;
            }
            return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
        };

        const { gl, ext } = getWebGLContext();
        if (!ext.formatRGBA) { console.warn('WebGL float framebuffer not supported'); return; }
        if (!ext.supportLinearFiltering) {
            config.DYE_RESOLUTION = 384;
            config.SHADING = false;
        }

        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));
            return shader;
        };
        const createProgram = (vs, fs) => {
            const p = gl.createProgram();
            gl.attachShader(p, vs);
            gl.attachShader(p, fs);
            gl.linkProgram(p);
            return p;
        };
        const getUniforms = program => {
            const o = {};
            const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < n; i++) {
                const u = gl.getActiveUniform(program, i);
                o[u.name] = gl.getUniformLocation(program, u.name);
            }
            return o;
        };
        const Program = (vs, fs) => {
            const p = createProgram(vs, fs);
            return { program: p, uniforms: getUniforms(p), bind() { gl.useProgram(p); } };
        };

        const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
            uniform vec2 texelSize;
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`);

        const copyShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; uniform sampler2D uTexture;
            void main () { gl_FragColor = texture2D(uTexture, vUv); }`);

        const clearShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
            void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`);

        const colorShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            uniform vec4 color;
            void main () { gl_FragColor = color; }`);

        const displayShader = compileShader(gl.FRAGMENT_SHADER, (config.SHADING ? '#define SHADING\n' : '') + `
            precision highp float; precision highp sampler2D;
            varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
            uniform sampler2D uTexture; uniform vec2 texelSize;
            void main () {
                vec3 c = texture2D(uTexture, vUv).rgb;
                #ifdef SHADING
                vec3 lc = texture2D(uTexture, vL).rgb;
                vec3 rc = texture2D(uTexture, vR).rgb;
                vec3 tc = texture2D(uTexture, vT).rgb;
                vec3 bc = texture2D(uTexture, vB).rgb;
                float dx = length(rc) - length(lc);
                float dy = length(tc) - length(bc);
                vec3 n = normalize(vec3(dx, dy, length(texelSize)));
                vec3 l = vec3(0.0, 0.0, 1.0);
                float diffuse = clamp(dot(n, l) + 0.6, 0.6, 1.0);
                c *= diffuse;
                #endif
                float a = max(c.r, max(c.g, c.b));
                gl_FragColor = vec4(c, a);
            }`);

        const splatShader = compileShader(gl.FRAGMENT_SHADER, `
            precision highp float; precision highp sampler2D;
            varying vec2 vUv;
            uniform sampler2D uTarget; uniform float aspectRatio;
            uniform vec3 color; uniform vec2 point; uniform float radius;
            void main () {
                vec2 p = vUv - point.xy;
                p.x *= aspectRatio;
                vec3 splat = exp(-dot(p, p) / radius) * color;
                vec3 base = texture2D(uTarget, vUv).xyz;
                gl_FragColor = vec4(base + splat, 1.0);
            }`);

        const advectionShader = compileShader(gl.FRAGMENT_SHADER, (ext.supportLinearFiltering ? '' : '#define MANUAL_FILTERING\n') + `
            precision highp float; precision highp sampler2D;
            varying vec2 vUv;
            uniform sampler2D uVelocity; uniform sampler2D uSource;
            uniform vec2 texelSize; uniform vec2 dyeTexelSize;
            uniform float dt; uniform float dissipation;
            vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                vec2 st = uv / tsize - 0.5;
                vec2 iuv = floor(st); vec2 fuv = fract(st);
                vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
                return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
            }
            void main () {
                #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
                #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
                #endif
                float decay = 1.0 + dissipation * dt;
                gl_FragColor = result / decay;
            }`);

        const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
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
                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }`);

        const curlShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uVelocity, vL).y;
                float R = texture2D(uVelocity, vR).y;
                float T = texture2D(uVelocity, vT).x;
                float B = texture2D(uVelocity, vB).x;
                float vorticity = R - L - T + B;
                gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
            }`);

        const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
            precision highp float; precision highp sampler2D;
            varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
            uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
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
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity += force * dt;
                velocity = min(max(velocity, -1000.0), 1000.0);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }`);

        const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
            uniform sampler2D uPressure; uniform sampler2D uDivergence;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float C = texture2D(uPressure, vUv).x;
                float divergence = texture2D(uDivergence, vUv).x;
                float pressure = (L + R + B + T - divergence) * 0.25;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }`);

        const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float; precision mediump sampler2D;
            varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
            uniform sampler2D uPressure; uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity.xy -= vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }`);

        const blit = (() => {
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(0);
            return (target, clear = false) => {
                if (target == null) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
                else { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
                if (clear) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            };
        })();

        const createFBO = (w, h, internalFormat, format, type, param) => {
            gl.activeTexture(gl.TEXTURE0);
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return { texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
        };
        const createDoubleFBO = (w, h, internalFormat, format, type, param) => {
            let fbo1 = createFBO(w, h, internalFormat, format, type, param);
            let fbo2 = createFBO(w, h, internalFormat, format, type, param);
            return {
                width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
                get read() { return fbo1; }, set read(v) { fbo1 = v; },
                get write() { return fbo2; }, set write(v) { fbo2 = v; },
                swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
            };
        };

        let dye, velocity, divergence, curl, pressure;
        const initFramebuffers = () => {
            const simRes = getResolution(config.SIM_RESOLUTION);
            const dyeRes = getResolution(config.DYE_RESOLUTION);
            const texType = ext.halfFloatTexType;
            const rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
            const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
            gl.disable(gl.BLEND);
            if (!dye) dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
            else dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
            if (!velocity) velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
            else velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
            divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        };
        const resizeFBO = (target, w, h, internalFormat, format, type, param) => {
            const n = createFBO(w, h, internalFormat, format, type, param);
            copyProgram.bind();
            gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
            blit(n);
            return n;
        };
        const resizeDoubleFBO = (target, w, h, internalFormat, format, type, param) => {
            if (target.width === w && target.height === h) return target;
            target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
            target.write = createFBO(w, h, internalFormat, format, type, param);
            target.width = w; target.height = h;
            target.texelSizeX = 1 / w; target.texelSizeY = 1 / h;
            return target;
        };

        const copyProgram = Program(baseVertexShader, copyShader);
        const clearProgram = Program(baseVertexShader, clearShader);
        const colorProgram = Program(baseVertexShader, colorShader);
        const splatProgram = Program(baseVertexShader, splatShader);
        const advectionProgram = Program(baseVertexShader, advectionShader);
        const divergenceProgram = Program(baseVertexShader, divergenceShader);
        const curlProgram = Program(baseVertexShader, curlShader);
        const vorticityProgram = Program(baseVertexShader, vorticityShader);
        const pressureProgram = Program(baseVertexShader, pressureShader);
        const gradienSubtractProgram = Program(baseVertexShader, gradientSubtractShader);
        const displayMaterial = (() => {
            const prog = createProgram(baseVertexShader, displayShader);
            return { program: prog, uniforms: getUniforms(prog), setKeywords() {}, bind() { gl.useProgram(prog); } };
        })();

        const step = (dt) => {
            gl.disable(gl.BLEND);
            curlProgram.bind();
            gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
            blit(curl);
            vorticityProgram.bind();
            gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
            gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
            gl.uniform1f(vorticityProgram.uniforms.dt, dt);
            blit(velocity.write); velocity.swap();
            divergenceProgram.bind();
            gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
            blit(divergence);
            clearProgram.bind();
            gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
            gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
            blit(pressure.write); pressure.swap();
            pressureProgram.bind();
            gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
            for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
                gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
                blit(pressure.write); pressure.swap();
            }
            gradienSubtractProgram.bind();
            gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
            gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
            blit(velocity.write); velocity.swap();
            advectionProgram.bind();
            gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            let velId = velocity.read.attach(0);
            gl.uniform1i(advectionProgram.uniforms.uVelocity, velId);
            gl.uniform1i(advectionProgram.uniforms.uSource, velId);
            gl.uniform1f(advectionProgram.uniforms.dt, dt);
            gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
            blit(velocity.write); velocity.swap();
            if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
            gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
            gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
            blit(dye.write); dye.swap();
        };

        const renderToScreen = () => {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            const width = gl.drawingBufferWidth;
            const height = gl.drawingBufferHeight;
            displayMaterial.bind();
            if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
            gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
            blit(null);
        };

        const scaleByPixelRatio = input => Math.floor(input * DPR);
        const correctRadius = radius => {
            const ar = canvas.width / canvas.height;
            return ar > 1 ? radius * ar : radius;
        };
        const correctDeltaX = d => {
            const ar = canvas.width / canvas.height;
            return ar < 1 ? d * ar : d;
        };
        const correctDeltaY = d => {
            const ar = canvas.width / canvas.height;
            return ar > 1 ? d / ar : d;
        };
        const getResolution = resolution => {
            let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
            if (ar < 1) ar = 1 / ar;
            const min = Math.round(resolution);
            const max = Math.round(resolution * ar);
            return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
        };
        const splat = (x, y, dx, dy, color) => {
            splatProgram.bind();
            gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
            gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
            gl.uniform2f(splatProgram.uniforms.point, x, y);
            gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
            gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
            blit(velocity.write); velocity.swap();
            gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
            gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
            blit(dye.write); dye.swap();
        };

        // 墨色：中等偏淡，低饱和青灰蓝，浓淡随机，无霓虹
        function inkColor() {
            const v = 0.135 + Math.random() * 0.07;
            const blueLean = 1.22;
            return { r: v * 0.9, g: v * blueLean * 0.86, b: v * blueLean };
        }

        const resizeCanvas = () => {
            const w = scaleByPixelRatio(canvas.clientWidth || window.innerWidth);
            const h = scaleByPixelRatio(canvas.clientHeight || window.innerHeight);
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
            return false;
        };

        initFramebuffers();
        resizeCanvas();
        window.addEventListener('resize', () => { if (resizeCanvas()) initFramebuffers(); });

        // 指针交互：划过即落墨
        const toLocal = (cx, cy) => {
            const rect = canvas.getBoundingClientRect();
            return { x: cx - rect.left, y: cy - rect.top };
        };
        const updatePointer = p => {
            if (p.moved) { p.moved = false; splatPointer(p); }
        };
        const splatPointer = p => {
            const dx = p.deltaX * config.SPLAT_FORCE;
            const dy = p.deltaY * config.SPLAT_FORCE;
            splat(p.texcoordX, p.texcoordY, dx, dy, p.color);
        };
        const applyInputs = () => {
            for (let i = 0; i < pointers.length; i++) {
                const p = pointers[i];
                if (!p.moved) continue;
                const moved = Math.hypot(p.deltaX, p.deltaY);
                if (moved < 0.0004) continue; // 微小抖动不落墨
                p.moved = false;
                splatPointer(p);
            }
        };

        const onMove = (cx, cy) => {
            const pos = toLocal(cx, cy);
            const p = pointers[0];
            p.prevTexcoordX = p.texcoordX;
            p.prevTexcoordY = p.texcoordY;
            p.texcoordX = pos.x / canvas.width;
            p.texcoordY = 1 - pos.y / canvas.height;
            p.deltaX = correctDeltaX(p.texcoordX - p.prevTexcoordX);
            p.deltaY = correctDeltaY(p.texcoordY - p.prevTexcoordY);
            p.moved = true;
            p.down = true;
        };
        window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', e => {
            if (e.touches.length) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }
        }, { passive: false });

        let lastUpdateTime = performance.now();
        window.__inkDebug = { frames: 0, maxRead: 0 };
        const updateLoop = () => {
            const now = performance.now();
            const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
            lastUpdateTime = now;
            if (resizeCanvas()) initFramebuffers();
            applyInputs();
            step(dt);
            renderToScreen();
            window.__inkDebug.frames++;
            const px = new Uint8Array(4);
            gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            const mx = Math.max(px[0], px[1], px[2]);
            if (mx > window.__inkDebug.maxRead) window.__inkDebug.maxRead = mx;
            requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }
}

// 自动挂载
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.highContrastInkWash = new HighContrastInkWash(); });
    } else {
        window.highContrastInkWash = new HighContrastInkWash();
    }
}