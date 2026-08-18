/**
 * 动态水墨烟岚引擎 (Dynamic Chinese Ink Wash Canvas Engine)
 * 100% 浏览器兼容，零 WebGL 扩展依赖，原生 60FPS 极速渲染
 * 包含：浓墨晕染、烟岚流转、宣纸漫渗与鼠标水墨挥洒
 */
class InkWashEngine {
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

        this.inkClouds = [];
        this.inkParticles = [];
        this.mouse = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0 };
        this.time = 0;

        // 东方水墨与烟岚调色（苍青、黛蓝、素白、深墨、紫烟）
        this.palette = [
            { r: 59,  g: 130, b: 246, a: 0.35 }, // 苍青流光
            { r: 147, g: 197, b: 253, a: 0.28 }, // 烟岚素白
            { r: 139, g: 92,  b: 246, a: 0.25 }, // 黛紫微光
            { r: 30,  g: 58,  b: 138, a: 0.40 }, // 深潭焦墨
            { r: 96,  g: 165, b: 250, a: 0.30 }, // 霁蓝水晕
            { r: 224, g: 231, b: 255, a: 0.20 }  // 云雾清岚
        ];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 初始化 12 个大型水墨烟岚云团（全屏缓慢流转、层层晕染）
        for (let i = 0; i < 14; i++) {
            this.inkClouds.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: 200 + Math.random() * 260,
                baseRadius: 200 + Math.random() * 260,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                color: this.palette[i % this.palette.length],
                phase: Math.random() * Math.PI * 2,
                freq: 0.0015 + Math.random() * 0.002
            });
        }

        // 鼠标与触控挥毫水墨交互
        const onMove = (clientX, clientY) => {
            const dx = clientX - this.mouse.lastX;
            const dy = clientY - this.mouse.lastY;
            this.mouse.speed = Math.hypot(dx, dy);
            this.mouse.x = clientX;
            this.mouse.y = clientY;
            this.mouse.lastX = clientX;
            this.mouse.lastY = clientY;

            // 移动时挥洒动态水墨微粒
            if (this.mouse.speed > 2) {
                const count = Math.min(Math.floor(this.mouse.speed / 4) + 1, 4);
                for (let k = 0; k < count; k++) {
                    const color = this.palette[Math.floor(Math.random() * this.palette.length)];
                    this.inkParticles.push({
                        x: clientX + (Math.random() - 0.5) * 20,
                        y: clientY + (Math.random() - 0.5) * 20,
                        radius: 8 + Math.random() * 25,
                        maxRadius: 40 + Math.random() * 80,
                        vx: dx * 0.12 + (Math.random() - 0.5) * 1.5,
                        vy: dy * 0.12 + (Math.random() - 0.5) * 1.5,
                        color: color,
                        alpha: 0.6 + Math.random() * 0.3,
                        life: 1.0,
                        decay: 0.008 + Math.random() * 0.008
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

    animate() {
        this.time += 0.012;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. 渲染背景大幅水墨云烟（Screen 叠加模式，柔和发光）
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.inkClouds.length; i++) {
            const c = this.inkClouds[i];

            // 物理漂移与正弦水波摆动
            c.x += c.vx + Math.sin(this.time * 0.7 + c.phase) * 0.5;
            c.y += c.vy + Math.cos(this.time * 0.5 + c.phase) * 0.5;

            // 边界穿越
            if (c.x < -c.radius) c.x = this.width + c.radius;
            if (c.x > this.width + c.radius) c.x = -c.radius;
            if (c.y < -c.radius) c.y = this.height + c.radius;
            if (c.y > this.height + c.radius) c.y = -c.radius;

            // 鼠标附近水墨涟漪排斥与扰动
            const mdx = c.x - this.mouse.x;
            const mdy = c.y - this.mouse.y;
            const dist = Math.hypot(mdx, mdy);
            if (dist < 320 && dist > 0) {
                const force = (1 - dist / 320) * 1.8;
                c.x += (mdx / dist) * force;
                c.y += (mdy / dist) * force;
            }

            // 水墨呼吸晕染半径
            const r = c.baseRadius + Math.sin(this.time * 1.2 + c.phase) * 50;

            const grad = this.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
            const { r: cr, g: cg, b: cb, a: ca } = c.color;
            grad.addColorStop(0, 
gba(, , , ));
            grad.addColorStop(0.35, 
gba(, , , ));
            grad.addColorStop(0.7, 
gba(, , , ));
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 2. 渲染挥毫泼墨粒子 (Interactive Ink Particles)
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = this.inkParticles.length - 1; i >= 0; i--) {
            const p = this.inkParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.radius += (p.maxRadius - p.radius) * 0.04;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.inkParticles.splice(i, 1);
                continue;
            }

            const currentAlpha = p.alpha * p.life;
            const pGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            const { r: pr, g: pg, b: pb } = p.color;
            pGrad.addColorStop(0, 
gba(, , , ));
            pGrad.addColorStop(0.5, 
gba(, , , ));
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

// 自动挂载
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.inkWashEngine = new InkWashEngine(); });
    } else {
        window.inkWashEngine = new InkWashEngine();
    }
}
