/**
 * WebGL Dynamic Chinese Ink Wash Fluid Background (动态水墨流体引擎)
 * Based on GPU Navier-Stokes fluid & ink wash dynamics (PavelDoGreat architecture)
 * Customized for Chinese Ink Wash: 浓墨、淡墨、青黛、烟岚
 */
(function () {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'webgl-ink-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.85';
    document.body.prepend(canvas);

    const config = {
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 512,
        DENSITY_DISSIPATION: 0.98,
        VELOCITY_DISSIPATION: 0.98,
        PRESSURE: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 30,
        SPLAT_RADIUS: 0.28,
        SPLAT_FORCE: 6000,
        SHADING: true,
        COLORFUL: false,
        COLOR_PALETTE: [
            { r: 0.15, g: 0.22, b: 0.35 },  // 黛蓝淡墨
            { r: 0.08, g: 0.12, b: 0.20 },  // 焦墨
            { r: 0.25, g: 0.35, b: 0.50 },  // 苍青微岚
            { r: 0.18, g: 0.15, b: 0.28 },  // 紫烟轻岚
            { r: 0.30, g: 0.40, b: 0.55 },  // 远山素青
        ]
    };

    function getWebGLContext(canvas) {
        const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
        let gl = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;
        if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        if (!gl) return null;

        let halfFloat;
        let supportLinearFiltering;
        if (isWebGL2) {
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        } else {
            halfFloat = gl.getExtension('OES_texture_half_float');
            supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat ? halfFloat.HALF_FLOAT_OES : gl.FLOAT);
        let formatRGBA, formatRG, formatR;

        if (isWebGL2) {
            formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
            formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
            formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        } else {
            formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
    }

    function getSupportedFormat(gl, internalFormat, format, type) {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
            switch (internalFormat) {
                case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
                case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
                default: return null;
            }
        }
        return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    const context = getWebGLContext(canvas);
    if (!context) return;
    const { gl, ext } = context;

    class Program {
        constructor(vertexShader, fragmentShader) {
            this.uniforms = {};
            this.program = createProgram(vertexShader, fragmentShader);
            this.uniforms = getUniforms(this.program);
        }
        bind() { gl.useProgram(this.program); }
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        return program;
    }

    function getUniforms(program) {
        const uniforms = [];
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, 
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    );

    const displayShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a * 0.85);
        }
    );

    const splatShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
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
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    );

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            gl_FragColor = dissipation * texture2D(uSource, coord);
            gl_FragColor.a = 1.0;
        }
    );

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
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
        }
    );

    const curlShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    );

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
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
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
    );

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    );

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, 
        precision highp float;
        precision highp sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    );

    const displayProgram = new Program(baseVertexShader, displayShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

    function createFBO(w, h, internalFormat, format, type, param) {
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
        return { texture, fbo, width: w, height: h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
        let fbo1 = createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(w, h, internalFormat, format, type, param);
        return {
            width: w, height: h,
            get read() { return fbo1; },
            set read(value) { fbo1 = value; },
            get write() { return fbo2; },
            set write(value) { fbo2 = value; },
            swap() { const temp = fbo1; fbo1 = fbo2; fbo2 = temp; }
        };
    }

    let density, velocity, divergence, curl, pressure;
    function initFramebuffers() {
        const simRes = getResolution(config.SIM_RESOLUTION);
        const dyeRes = getResolution(config.DYE_RESOLUTION);
        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA;
        const rg = ext.formatRG;
        const r = ext.formatR;
        const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

        density = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
        divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    }

    function getResolution(resolution) {
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
        const min = Math.round(resolution);
        const max = Math.round(resolution * aspectRatio);
        if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
        return { width: min, height: max };
    }

    const blit = (() => {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        return (target) => {
            if (!target) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
                gl.viewport(0, 0, target.width, target.height);
            }
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
    })();

    function resizeCanvas() {
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initFramebuffers();
        }
    }

    function splat(x, y, dx, dy, color) {
        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(splatProgram.uniforms.point, x, y);
        gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(splatProgram.uniforms.uTarget, density.read.attach(0));
        gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
        blit(density.write);
        density.swap();
    }

    let colorIdx = 0;
    function multipleSplats(amount) {
        for (let i = 0; i < amount; i++) {
            const color = config.COLOR_PALETTE[colorIdx++ % config.COLOR_PALETTE.length];
            const x = Math.random();
            const y = Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            splat(x, y, dx, dy, color);
        }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 初始生成多股浓墨流体
    multipleSplats(5);

    // 周期性自动轻微吐墨 (Autonomous Ink Drift)
    let lastAutoSplat = Date.now();

    // 鼠标与触摸水墨交互
    let lastMouseX = 0, lastMouseY = 0;
    window.addEventListener('mousemove', e => {
        const x = e.clientX / window.innerWidth;
        const y = 1.0 - e.clientY / window.innerHeight;
        const dx = (e.clientX - lastMouseX) * config.SPLAT_FORCE;
        const dy = (lastMouseY - e.clientY) * config.SPLAT_FORCE;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        const speed = Math.hypot(dx, dy);
        if (speed > 10) {
            const color = config.COLOR_PALETTE[colorIdx++ % config.COLOR_PALETTE.length];
            splat(x, y, dx * 0.1, dy * 0.1, color);
        }
    });

    window.addEventListener('touchmove', e => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const x = touch.clientX / window.innerWidth;
            const y = 1.0 - touch.clientY / window.innerHeight;
            const dx = (touch.clientX - lastMouseX) * config.SPLAT_FORCE;
            const dy = (lastMouseY - touch.clientY) * config.SPLAT_FORCE;
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
            const color = config.COLOR_PALETTE[colorIdx++ % config.COLOR_PALETTE.length];
            splat(x, y, dx * 0.1, dy * 0.1, color);
        }
    }, { passive: true });

    let lastTime = Date.now();
    function update() {
        const now = Date.now();
        let dt = Math.min((now - lastTime) / 1000, 0.016);
        lastTime = now;

        // 定时优雅水墨吐纳
        if (now - lastAutoSplat > 2500) {
            const color = config.COLOR_PALETTE[colorIdx++ % config.COLOR_PALETTE.length];
            const x = 0.2 + Math.random() * 0.6;
            const y = 0.2 + Math.random() * 0.6;
            splat(x, y, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, color);
            lastAutoSplat = now;
        }

        // 1. Curl
        curlProgram.bind();
        gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
        blit(curl);

        // 2. Vorticity
        vorticityProgram.bind();
        gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
        gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt, dt);
        blit(velocity.write);
        velocity.swap();

        // 3. Divergence
        divergenceProgram.bind();
        gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergence);

        // 4. Pressure
        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        // 5. Gradient Subtract
        gradSubtractProgram.bind();
        gl.uniform2f(gradSubtractProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(gradSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(gradSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        // 6. Advection
        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / velocity.width, 1.0 / velocity.height);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advectionProgram.uniforms.uSource, density.read.attach(1));
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(density.write);
        density.swap();

        // 7. Display
        displayProgram.bind();
        gl.uniform1i(displayProgram.uniforms.uTexture, density.read.attach(0));
        blit(null);

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
})();
