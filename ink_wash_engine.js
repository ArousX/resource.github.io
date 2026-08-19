/**
 * ==========================================================================
 * 东方高对比度动态水墨山水画卷引擎 (High-Contrast Masterpiece Ink Wash Engine)
 * ==========================================================================
 * 特性：
 * 1. 远山如黛：清晰可见的高耸水墨奇峰，带国画勾勒金/银/青白山脊线
 * 2. 苍山叠翠：多重远近山峦层次，浓淡相宜，水气氤氲
 * 3. 寒江残月：夜空高悬的清雅明月与拂面云气
 * 4. 烟岚漫瀚：在峰峦山谷间持续流动的动态水墨白烟与青岚
 * 5. 挥毫泼墨：鼠标在屏幕上划过时，即刻挥洒高亮墨滴与宣纸漫渗水晕
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
        this.ctx = this.canvas.getContext('2d');
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.time = 0;
        this.mouse = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0 };
        this.inkDrops = [];
        this.mistClouds = [];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 初始化 35 团流淌在山峦间的动态水墨烟云
        for (let i = 0; i < 35; i++) {
            this.mistClouds.push({
                x: Math.random() * this.width,
                y: this.height * 0.2 + Math.random() * (this.height * 0.7),
                radius: 140 + Math.random() * 220,
                baseRadius: 140 + Math.random() * 220,
                vx: 0.2 + Math.random() * 0.45,
                vy: (Math.random() - 0.5) * 0.15,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.25 + Math.random() * 0.35,
                type: i % 4 // 0: 苍青流光, 1: 烟白素雪, 2: 黛紫微光, 3: 银灰墨岚
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
                const count = Math.min(Math.floor(this.mouse.speed / 3) + 1, 6);
                for (let k = 0; k < count; k++) {
                    this.inkDrops.push({
                        x: x + (Math.random() - 0.5) * 30,
                        y: y + (Math.random() - 0.5) * 30,
                        radius: 8 + Math.random() * 22,
                        maxRadius: 45 + Math.random() * 90,
                        vx: dx * 0.15 + (Math.random() - 0.5) * 2.5,
                        vy: dy * 0.15 + (Math.random() - 0.5) * 2.5,
                        alpha: 0.85 + Math.random() * 0.15,
                        life: 1.0,
                        decay: 0.007 + Math.random() * 0.007,
                        color: Math.random() > 0.4 ? 'rgba(96, 165, 250,' : (Math.random() > 0.5 ? 'rgba(224, 231, 255,' : 'rgba(168, 85, 247,')
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

    // 1. 绘制水墨天幕与皓月
    drawSky() {
        const w = this.width;
        const h = this.height;

        // 深空渐变
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#04060d');
        bgGrad.addColorStop(0.4, '#080f20');
        bgGrad.addColorStop(1, '#050811');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // 皓月光晕 (High-contrast Moon Glow)
        const moonX = w * 0.82;
        const moonY = h * 0.18;
        const moonGrad = this.ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 220);
        moonGrad.addColorStop(0, 'rgba(186, 230, 253, 0.45)');
        moonGrad.addColorStop(0.2, 'rgba(96, 165, 250, 0.25)');
        moonGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.10)');
        moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = moonGrad;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, 220, 0, Math.PI * 2);
        this.ctx.fill();

        // 皎洁水墨圆月核心
        this.ctx.fillStyle = 'rgba(240, 249, 255, 0.65)';
        this.ctx.shadowColor = 'rgba(186, 230, 253, 0.8)';
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // 重置阴影
    }

    // 2. 单层水墨山峦绘制（带国画勾线与多重峰峦）
    drawMountainLayer(params) {
        const { baseY, peaks, colorTop, colorBottom, ridgeStroke, alpha, waveSpeed } = params;
        const w = this.width;
        const h = this.height;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);

        const points = [];
        for (let x = 0; x <= w + 10; x += 8) {
            let elevation = 0;
            for (let i = 0; i < peaks.length; i++) {
                const p = peaks[i];
                const shift = Math.sin(this.time * waveSpeed + p.phase) * 6;
                elevation += Math.sin(x * p.freq + p.phase) * p.amp + shift;
                elevation += Math.sin(x * p.freq * 2.4 + p.phase * 1.3) * (p.amp * 0.38);
                elevation += Math.cos(x * p.freq * 0.6 + this.time * 0.02) * (p.amp * 0.2);
            }
            const y = baseY - Math.abs(elevation);
            points.push({ x, y });
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(w, h);
        this.ctx.closePath();

        // 渐变填充
        const grad = this.ctx.createLinearGradient(0, baseY - 280, 0, h);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(0.35, colorTop);
        grad.addColorStop(1, colorBottom);

        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // 国画勾勒山脊线 (Calligraphic Ridge Highlight)
        this.ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            if (i === 0) this.ctx.moveTo(points[i].x, points[i].y);
            else this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.strokeStyle = ridgeStroke;
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();

        this.ctx.restore();
    }

    // 3. 绘制层峦叠嶂
    drawAllMountains() {
        const h = this.height;

        // 第 1 层：远天青黛奇峰（高达视口上部，月下孤峰挺拔）
        this.drawMountainLayer({
            baseY: h * 0.45,
            peaks: [
                { freq: 0.0011, amp: 220, phase: 0.4 },
                { freq: 0.0026, amp: 120, phase: 2.3 },
                { freq: 0.0007, amp: 180, phase: 4.8 }
            ],
            colorTop: '#38bdf8',
            colorBottom: '#0c1a3a',
            ridgeStroke: 'rgba(186, 230, 253, 0.75)',
            alpha: 0.55,
            waveSpeed: 0.02
        });

        // 第 2 层：中景苍峦叠嶂（青蓝水墨，山脊错落）
        this.drawMountainLayer({
            baseY: h * 0.62,
            peaks: [
                { freq: 0.0016, amp: 180, phase: 1.6 },
                { freq: 0.0032, amp: 110, phase: 3.4 },
                { freq: 0.0009, amp: 150, phase: 5.1 }
            ],
            colorTop: '#2563eb',
            colorBottom: '#071026',
            ridgeStroke: 'rgba(96, 165, 250, 0.70)',
            alpha: 0.70,
            waveSpeed: 0.04
        });

        // 第 3 层：中近景幽谷绝壁（深邃黛紫与焦墨，气势沉雄）
        this.drawMountainLayer({
            baseY: h * 0.78,
            peaks: [
                { freq: 0.0022, amp: 160, phase: 2.8 },
                { freq: 0.0041, amp: 95,  phase: 0.9 },
                { freq: 0.0013, amp: 130, phase: 2.1 }
            ],
            colorTop: '#4f46e5',
            colorBottom: '#040714',
            ridgeStroke: 'rgba(168, 85, 247, 0.65)',
            alpha: 0.85,
            waveSpeed: 0.07
        });

        // 第 4 层：近景焦墨岩壁（最底部沉稳基石）
        this.drawMountainLayer({
            baseY: h * 0.90,
            peaks: [
                { freq: 0.0028, amp: 120, phase: 4.2 },
                { freq: 0.0052, amp: 70,  phase: 1.8 },
                { freq: 0.0017, amp: 90,  phase: 3.5 }
            ],
            colorTop: '#1e293b',
            colorBottom: '#020307',
            ridgeStroke: 'rgba(224, 231, 255, 0.50)',
            alpha: 0.95,
            waveSpeed: 0.10
        });
    }

    // 4. 绘制山间漫溢流淌的水墨烟岚
    drawMist() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.mistClouds.length; i++) {
            const m = this.mistClouds[i];

            // 烟雾自左向右缓缓飘移
            m.x += m.vx;
            m.y += m.vy + Math.sin(this.time * 0.8 + m.phase) * 0.5;

            if (m.x > this.width + m.radius) m.x = -m.radius;

            // 鼠标附近云雾散开微扰动
            const mdx = m.x - this.mouse.x;
            const mdy = m.y - this.mouse.y;
            const dist = Math.hypot(mdx, mdy);
            if (dist < 300 && dist > 0) {
                const force = (1 - dist / 300) * 1.8;
                m.x += (mdx / dist) * force;
                m.y += (mdy / dist) * force;
            }

            // 烟雾呼吸
            const r = m.baseRadius + Math.sin(this.time * 1.2 + m.phase) * 40;
            const grad = this.ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);

            if (m.type === 0) { // 苍青水汽
                grad.addColorStop(0, 
gba(59, 130, 246, ));
                grad.addColorStop(0.4, 
gba(37, 99, 235, ));
            } else if (m.type === 1) { // 烟岚素白
                grad.addColorStop(0, 
gba(224, 231, 255, ));
                grad.addColorStop(0.4, 
gba(147, 197, 253, ));
            } else if (m.type === 2) { // 黛紫微光
                grad.addColorStop(0, 
gba(168, 85, 247, ));
                grad.addColorStop(0.4, 
gba(126, 34, 206, ));
            } else { // 银灰墨岚
                grad.addColorStop(0, 
gba(148, 163, 184, ));
                grad.addColorStop(0.4, 
gba(71, 85, 105, ));
            }
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    // 5. 绘制鼠标挥毫泼墨与水晕
    drawInkDrops() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = this.inkDrops.length - 1; i >= 0; i--) {
            const p = this.inkDrops[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.radius += (p.maxRadius - p.radius) * 0.06;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.inkDrops.splice(i, 1);
                continue;
            }

            const currentAlpha = p.alpha * p.life;
            const pGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            pGrad.addColorStop(0, ${p.color} ));
            pGrad.addColorStop(0.4, ${p.color} ));
            pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = pGrad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    animate() {
        this.time += 0.015;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. 夜空天幕与明月
        this.drawSky();

        // 2. 远山与水墨层峦
        this.drawAllMountains();

        // 3. 山谷流动云雾烟岚
        this.drawMist();

        // 4. 鼠标挥毫泼墨
        this.drawInkDrops();

        requestAnimationFrame(() => this.animate());
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
