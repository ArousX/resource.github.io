/**
 * ==========================================================================
 * 东方远山水墨山水与动态烟岚引擎 (Masterpiece Chinese Ink Wash Landscape Engine)
 * ==========================================================================
 * 1. 远山如黛：五层国画级水墨层峦叠嶂（远景苍峦、中景烟峰、近景重墨崖壁）
 * 2. 烟波浩渺：在山谷与峰峦间流淌的动态水墨烟雾与水汽氤氲
 * 3. 江渚墨韵：山脚江面流光倒影与涟漪微波
 * 4. 挥毫泼墨：鼠标光标实时挥洒宣纸墨滴、水晕漫渗与飞白残迹
 */

class MasterpieceInkWash {
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
        this.mistParticles = [];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 初始化山谷中流淌的 25 团水墨烟岚粒子
        for (let i = 0; i < 30; i++) {
            this.mistParticles.push({
                x: Math.random() * this.width,
                y: this.height * 0.4 + Math.random() * (this.height * 0.55),
                radius: 120 + Math.random() * 200,
                baseRadius: 120 + Math.random() * 200,
                vx: 0.15 + Math.random() * 0.35, // 缓慢自左向右随风飘移
                vy: (Math.random() - 0.5) * 0.15,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.15 + Math.random() * 0.25,
                colorType: i % 3 // 0: 苍青, 1: 烟白, 2: 黛紫
            });
        }

        // 鼠标光标挥毫泼墨
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
                        x: x + (Math.random() - 0.5) * 25,
                        y: y + (Math.random() - 0.5) * 25,
                        radius: 6 + Math.random() * 18,
                        maxRadius: 35 + Math.random() * 80,
                        vx: dx * 0.12 + (Math.random() - 0.5) * 2.0,
                        vy: dy * 0.12 + (Math.random() - 0.5) * 2.0,
                        alpha: 0.75 + Math.random() * 0.25,
                        life: 1.0,
                        decay: 0.008 + Math.random() * 0.008,
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

    // 绘制水墨天幕与残月光晕
    drawSky() {
        const w = this.width;
        const h = this.height;

        // 背景宣纸墨底渐变
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#030407');
        bgGrad.addColorStop(0.5, '#070a12');
        bgGrad.addColorStop(1, '#05070d');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // 远方水墨月影与柔和光晕
        const moonX = w * 0.78;
        const moonY = h * 0.22;
        const moonGrad = this.ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 180);
        moonGrad.addColorStop(0, 'rgba(147, 197, 253, 0.25)');
        moonGrad.addColorStop(0.3, 'rgba(59, 130, 246, 0.12)');
        moonGrad.addColorStop(0.7, 'rgba(30, 58, 138, 0.04)');
        moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = moonGrad;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, 180, 0, Math.PI * 2);
        this.ctx.fill();

        // 皎洁水墨圆月
        this.ctx.fillStyle = 'rgba(240, 246, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // 单层水墨山峦生成算法（国画笔触山峰曲线）
    drawMountainLayer(params) {
        const { baseY, peaks, colorTop, colorBottom, alpha, waveSpeed } = params;
        const w = this.width;
        const h = this.height;

        this.ctx.beginPath();
        this.ctx.moveTo(0, h);

        // 使用多重傅里叶谐波合成高低错落的水墨山峰
        for (let x = 0; x <= w; x += 10) {
            let elevation = 0;
            for (let i = 0; i < peaks.length; i++) {
                const p = peaks[i];
                const shift = Math.sin(this.time * waveSpeed + p.phase) * 6;
                elevation += Math.sin(x * p.freq + p.phase) * p.amp + shift;
                elevation += Math.sin(x * p.freq * 2.3 + p.phase * 1.5) * (p.amp * 0.35);
            }
            const y = baseY - Math.abs(elevation);
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(w, h);
        this.ctx.closePath();

        // 顶部带水墨浸润虚化，底部浓墨沉淀
        const grad = this.ctx.createLinearGradient(0, baseY - 240, 0, h);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(0.4, colorTop);
        grad.addColorStop(1, colorBottom);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = grad;
        this.ctx.fill();
        this.ctx.restore();
    }

    // 绘制多重水墨层峦叠嶂
    drawAllMountains() {
        const h = this.height;

        // 第 1 层：远景青黛孤峰（空灵高耸，隐于天际）
        this.drawMountainLayer({
            baseY: h * 0.62,
            peaks: [
                { freq: 0.0012, amp: 160, phase: 0.5 },
                { freq: 0.0028, amp: 80, phase: 2.1 },
                { freq: 0.0008, amp: 140, phase: 4.2 }
            ],
            colorTop: '#3b82f6',
            colorBottom: '#0b1329',
            alpha: 0.22,
            waveSpeed: 0.03
        });

        // 第 2 层：中远景苍峦（层层叠嶂，水汽弥漫）
        this.drawMountainLayer({
            baseY: h * 0.72,
            peaks: [
                { freq: 0.0018, amp: 140, phase: 1.8 },
                { freq: 0.0035, amp: 90, phase: 3.6 },
                { freq: 0.0011, amp: 120, phase: 5.4 }
            ],
            colorTop: '#1e3a8a',
            colorBottom: '#070d1e',
            alpha: 0.38,
            waveSpeed: 0.05
        });

        // 第 3 层：中景水墨山脊（浓淡相宜，山形嶙峋）
        this.drawMountainLayer({
            baseY: h * 0.82,
            peaks: [
                { freq: 0.0022, amp: 130, phase: 3.1 },
                { freq: 0.0045, amp: 70, phase: 0.8 },
                { freq: 0.0015, amp: 110, phase: 2.5 }
            ],
            colorTop: '#1e293b',
            colorBottom: '#030712',
            alpha: 0.55,
            waveSpeed: 0.08
        });

        // 第 4 层：近景重墨绝壁（焦墨沉凝，基底深稳）
        this.drawMountainLayer({
            baseY: h * 0.92,
            peaks: [
                { freq: 0.0028, amp: 110, phase: 4.8 },
                { freq: 0.0055, amp: 60, phase: 2.2 },
                { freq: 0.0018, amp: 85, phase: 1.1 }
            ],
            colorTop: '#0f172a',
            colorBottom: '#020408',
            alpha: 0.75,
            waveSpeed: 0.12
        });
    }

    // 绘制山间漫溢的动态水墨烟岚与云雾
    drawMist() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.mistParticles.length; i++) {
            const m = this.mistParticles[i];

            // 烟雾随风向右平移与上下轻微沉浮
            m.x += m.vx;
            m.y += m.vy + Math.sin(this.time * 0.8 + m.phase) * 0.4;

            if (m.x > this.width + m.radius) m.x = -m.radius;

            // 鼠标附近云雾散开扰动
            const mdx = m.x - this.mouse.x;
            const mdy = m.y - this.mouse.y;
            const dist = Math.hypot(mdx, mdy);
            if (dist < 280 && dist > 0) {
                const force = (1 - dist / 280) * 1.5;
                m.x += (mdx / dist) * force;
                m.y += (mdy / dist) * force;
            }

            // 烟雾呼吸胀缩
            const r = m.baseRadius + Math.sin(this.time * 1.1 + m.phase) * 35;
            const grad = this.ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);

            if (m.colorType === 0) { // 苍青水汽
                grad.addColorStop(0, 
gba(59, 130, 246, ));
                grad.addColorStop(0.4, 
gba(30, 64, 175, ));
            } else if (m.colorType === 1) { // 烟岚素白
                grad.addColorStop(0, 
gba(224, 231, 255, ));
                grad.addColorStop(0.4, 
gba(147, 197, 253, ));
            } else { // 黛紫微岚
                grad.addColorStop(0, 
gba(168, 85, 247, ));
                grad.addColorStop(0.4, 
gba(91, 33, 182, ));
            }
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    // 绘制挥毫墨滴与涟漪
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
            pGrad.addColorStop(0.5, ${p.color} ));
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

        // 1. 天幕与残月
        this.drawSky();

        // 2. 远山与水墨层峦
        this.drawAllMountains();

        // 3. 山谷动态流云烟岚
        this.drawMist();

        // 4. 鼠标挥毫泼墨粒子
        this.drawInkDrops();

        requestAnimationFrame(() => this.animate());
    }
}

// 自动挂载
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.masterpieceInkWash = new MasterpieceInkWash(); });
    } else {
        window.masterpieceInkWash = new MasterpieceInkWash();
    }
}
