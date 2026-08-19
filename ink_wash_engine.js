/**
 * 东方动态水墨山水与烟岚流光引擎 (Chinese Ink Wash & Landscape Dynamic Engine)
 * 特性：
 * 1. 远山如黛：多层动态水墨山峦剪影（水墨层峦叠嶂）
 * 2. 烟岚漫渗：实时流动的浓墨、淡墨与水汽氤氲烟团
 * 3. 挥毫泼墨：鼠标光标实时挥洒墨滴、宣纸水晕与墨迹扩散
 */
class ChineseInkWash {
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
        this.ctx = this.canvas.getContext('2d');
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.time = 0;
        this.mouse = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0 };
        this.inkDrops = [];
        this.smokeClouds = [];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 初始化 12 团大型水墨烟云
        for (let i = 0; i < 12; i++) {
            this.smokeClouds.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: 220 + Math.random() * 260,
                baseRadius: 220 + Math.random() * 260,
                vx: (Math.random() - 0.5) * 0.45,
                vy: (Math.random() - 0.5) * 0.35,
                phase: Math.random() * Math.PI * 2,
                type: i % 3 // 0: 苍青流光, 1: 烟白素雪, 2: 黛紫微岚
            });
        }

        // 鼠标挥毫泼墨
        const onMove = (x, y) => {
            const dx = x - this.mouse.lastX;
            const dy = y - this.mouse.lastY;
            this.mouse.speed = Math.hypot(dx, dy);
            this.mouse.x = x;
            this.mouse.y = y;
            this.mouse.lastX = x;
            this.mouse.lastY = y;

            if (this.mouse.speed > 2) {
                const count = Math.min(Math.floor(this.mouse.speed / 3) + 1, 5);
                for (let k = 0; k < count; k++) {
                    this.inkDrops.push({
                        x: x + (Math.random() - 0.5) * 20,
                        y: y + (Math.random() - 0.5) * 20,
                        radius: 8 + Math.random() * 20,
                        maxRadius: 40 + Math.random() * 90,
                        vx: dx * 0.15 + (Math.random() - 0.5) * 1.5,
                        vy: dy * 0.15 + (Math.random() - 0.5) * 1.5,
                        alpha: 0.7 + Math.random() * 0.3,
                        life: 1.0,
                        decay: 0.009 + Math.random() * 0.009,
                        colorType: Math.random() > 0.4 ? 'blue' : (Math.random() > 0.5 ? 'white' : 'purple')
                    });
                }
            }
        };

        window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', e => {
            if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    // 绘制水墨山峦层峦 (Procedural Ink Wash Mountains)
    drawMountains() {
        const w = this.width;
        const h = this.height;

        // 山峦图层定义 (从远到近：远山浅黛 -> 中景烟峦 -> 近景重墨)
        const layers = [
            { baseY: h * 0.58, amp: 70, freq: 0.0018, speed: 0.05, alpha: 0.15, color: '30, 41, 59' },   // 远景素山
            { baseY: h * 0.68, amp: 90, freq: 0.0025, speed: 0.09, alpha: 0.22, color: '15, 23, 42' },   // 中景黛山
            { baseY: h * 0.80, amp: 110, freq: 0.0035, speed: 0.14, alpha: 0.35, color: '10, 15, 26' },  // 近景重峦
        ];

        for (let l = 0; l < layers.length; l++) {
            const layer = layers[l];
            this.ctx.beginPath();
            this.ctx.moveTo(0, h);

            for (let x = 0; x <= w; x += 15) {
                const wave1 = Math.sin(x * layer.freq + this.time * layer.speed) * layer.amp;
                const wave2 = Math.sin(x * layer.freq * 2.1 - this.time * layer.speed * 0.8) * (layer.amp * 0.4);
                const wave3 = Math.cos(x * layer.freq * 0.5 + this.time * 0.02) * (layer.amp * 0.3);
                const y = layer.baseY + wave1 + wave2 + wave3;
                this.ctx.lineTo(x, y);
            }

            this.ctx.lineTo(w, h);
            this.ctx.closePath();

            // 山峦渐变（顶部带水墨虚化白雾，底部浓墨沉底）
            const grad = this.ctx.createLinearGradient(0, layer.baseY - layer.amp, 0, h);
            grad.addColorStop(0, 
gba(, 0));
            grad.addColorStop(0.35, 
gba(, ));
            grad.addColorStop(1, 
gba(, ));

            this.ctx.fillStyle = grad;
            this.ctx.fill();
        }
    }

    animate() {
        this.time += 0.015;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. 先绘制底层水墨远山
        this.ctx.globalCompositeOperation = 'source-over';
        this.drawMountains();

        // 2. 绘制流动的水墨烟岚与云雾 (Screen 柔光模式)
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.smokeClouds.length; i++) {
            const c = this.smokeClouds[i];

            // 自主水墨漂移
            c.x += c.vx + Math.sin(this.time * 0.6 + c.phase) * 0.6;
            c.y += c.vy + Math.cos(this.time * 0.5 + c.phase) * 0.5;

            // 边缘循环
            if (c.x < -c.radius) c.x = this.width + c.radius;
            if (c.x > this.width + c.radius) c.x = -c.radius;
            if (c.y < -c.radius) c.y = this.height + c.radius;
            if (c.y > this.height + c.radius) c.y = -c.radius;

            // 鼠标排斥微扰动
            const mdx = c.x - this.mouse.x;
            const mdy = c.y - this.mouse.y;
            const dist = Math.hypot(mdx, mdy);
            if (dist < 320 && dist > 0) {
                const force = (1 - dist / 320) * 1.6;
                c.x += (mdx / dist) * force;
                c.y += (mdy / dist) * force;
            }

            // 呼吸水晕
            const r = c.baseRadius + Math.sin(this.time + c.phase) * 45;
            const grad = this.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);

            if (c.type === 0) { // 苍青黛蓝
                grad.addColorStop(0, 'rgba(59, 130, 246, 0.32)');
                grad.addColorStop(0.4, 'rgba(30, 64, 175, 0.18)');
                grad.addColorStop(0.8, 'rgba(15, 23, 42, 0.05)');
            } else if (c.type === 1) { // 烟岚素白
                grad.addColorStop(0, 'rgba(186, 230, 253, 0.28)');
                grad.addColorStop(0.35, 'rgba(147, 197, 253, 0.14)');
                grad.addColorStop(0.75, 'rgba(30, 58, 138, 0.04)');
            } else { // 黛紫微岚
                grad.addColorStop(0, 'rgba(147, 51, 234, 0.25)');
                grad.addColorStop(0.4, 'rgba(88, 28, 135, 0.12)');
                grad.addColorStop(0.8, 'rgba(15, 23, 42, 0.03)');
            }
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 3. 绘制鼠标挥洒的水墨粒子与水晕 (Lighter 模式)
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = this.inkDrops.length - 1; i >= 0; i--) {
            const p = this.inkDrops[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.radius += (p.maxRadius - p.radius) * 0.05;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.inkDrops.splice(i, 1);
                continue;
            }

            const currentAlpha = p.alpha * p.life;
            const pGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);

            if (p.colorType === 'blue') {
                pGrad.addColorStop(0, 
gba(96, 165, 250, ));
                pGrad.addColorStop(0.4, 
gba(37, 99, 235, ));
            } else if (p.colorType === 'white') {
                pGrad.addColorStop(0, 
gba(224, 231, 255, ));
                pGrad.addColorStop(0.4, 
gba(147, 197, 253, ));
            } else {
                pGrad.addColorStop(0, 
gba(192, 132, 252, ));
                pGrad.addColorStop(0.4, 
gba(126, 34, 206, ));
            }
            pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = pGrad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(() => this.animate());
    }
}

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.chineseInkWash = new ChineseInkWash(); });
    } else {
        window.chineseInkWash = new ChineseInkWash();
    }
}
