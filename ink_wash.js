/**
 * Dynamic Chinese Ink Wash (动态水墨流光引擎)
 * High-performance, zero-dependency Canvas fluid ink wash with organic blooming & mouse interaction.
 */
class InkWashBackground {
    constructor(canvasId = 'ink-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            this.canvas.style.position = 'fixed';
            this.canvas.style.inset = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '0';
            this.canvas.style.opacity = '0.75';
            document.body.prepend(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.nodes = [];
        this.drops = [];
        this.mouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0 };
        this.time = 0;
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', e => this.onMouseMove(e));
        window.addEventListener('touchmove', e => {
            if (e.touches.length > 0) {
                this.onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        }, { passive: true });

        // 生成 7 个多层核心水墨涡流团 (浓墨、淡墨、青黛、烟岚)
        const colors = [
            { r: 24, g: 30, b: 46, a: 0.55 },   // 黛蓝浓墨
            { r: 18, g: 22, b: 34, a: 0.65 },   // 焦墨
            { r: 35, g: 45, b: 65, a: 0.45 },   // 苍青淡墨
            { r: 40, g: 30, b: 55, a: 0.40 },   // 紫烟微岚
            { r: 15, g: 25, b: 40, a: 0.50 },   // 深潭墨韵
            { r: 50, g: 70, b: 95, a: 0.30 },   // 远山素烟
        ];

        for (let i = 0; i < 9; i++) {
            this.nodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: 180 + Math.random() * 240,
                baseRadius: 180 + Math.random() * 240,
                angle: Math.random() * Math.PI * 2,
                speed: 0.002 + Math.random() * 0.003,
                driftX: (Math.random() - 0.5) * 0.4,
                driftY: (Math.random() - 0.5) * 0.4,
                color: colors[i % colors.length],
                phase: Math.random() * 10
            });
        }

        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    onMouseMove(e) {
        const dx = e.clientX - this.mouse.lastX;
        const dy = e.clientY - this.mouse.lastY;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.vx = dx;
        this.mouse.vy = dy;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;

        // 鼠标移动时产生细微扩散的水墨小水滴
        const speed = Math.hypot(dx, dy);
        if (speed > 2 && Math.random() < 0.4) {
            this.drops.push({
                x: e.clientX,
                y: e.clientY,
                radius: 15 + Math.random() * 35,
                maxRadius: 60 + Math.random() * 70,
                alpha: 0.35 + Math.random() * 0.25,
                life: 1.0,
                decay: 0.008 + Math.random() * 0.008,
                vx: dx * 0.15 + (Math.random() - 0.5) * 0.5,
                vy: dy * 0.15 + (Math.random() - 0.5) * 0.5,
                color: Math.random() > 0.5 ? 'rgba(59, 130, 246, ' : 'rgba(147, 197, 253, '
            });
        }
    }

    animate() {
        this.time += 0.015;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. 渲染主水墨晕染团（多层重叠有机流动）
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            
            // 物理漂移与有机摆动 (Organic harmonic motion)
            n.x += n.driftX + Math.sin(this.time * 0.8 + n.phase) * 0.6;
            n.y += n.driftY + Math.cos(this.time * 0.6 + n.phase) * 0.6;

            // 边缘循环穿越
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;

            // 鼠标斥力微交互 (Ink avoids/flows around cursor)
            const mdx = n.x - this.mouse.x;
            const mdy = n.y - this.mouse.y;
            const mdist = Math.hypot(mdx, mdy);
            if (mdist < 300) {
                const force = (1 - mdist / 300) * 1.5;
                n.x += (mdx / mdist) * force;
                n.y += (mdy / mdist) * force;
            }

            // 动态水墨羽化半径呼吸 (Breathing ink bloom)
            const curRadius = n.baseRadius + Math.sin(this.time + n.phase) * 45;

            // 径向水墨渐变
            const grad = this.ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, curRadius);
            const { r, g, b, a } = n.color;
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
            grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${a * 0.6})`);
            grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${a * 0.3})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, curRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 2. 渲染互动水墨微粒与涟漪 (Interactive Ink Bleed Drops)
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.x += d.vx;
            d.y += d.vy;
            d.radius += (d.maxRadius - d.radius) * 0.04;
            d.life -= d.decay;

            if (d.life <= 0) {
                this.drops.splice(i, 1);
                continue;
            }

            const currentAlpha = d.alpha * d.life;
            const dropGrad = this.ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius);
            dropGrad.addColorStop(0, `${d.color}${currentAlpha})`);
            dropGrad.addColorStop(0.6, `${d.color}${currentAlpha * 0.5})`);
            dropGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = dropGrad;
            this.ctx.beginPath();
            this.ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(() => this.animate());
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.inkWash = new InkWashBackground();
    });
}
