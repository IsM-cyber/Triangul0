// ========== CANVAS RENDER LAYER ==========
    // Reemplaza el render DOM de enemigos y proyectiles por un solo <canvas>
    // Mejora el rendimiento en CPUs débiles: un solo dibujado por frame en vez de cientos de divs
    //
    // Estrategia:
    // - Un único <canvas> superpuesto #game-canvas
    // - Cada frame (requestAnimationFrame) se repinta con los datos de gameState
    // - Enemigos y proyectiles ya NO tocan el DOM (no createElement, no style.cssText)
    // - La lógica (colisiones, IA, armas, regiones) sigue intacta — solo cambia el dibujo
    //
    // El minimap y los efectos especiales quedan en DOM (como pediste).
    
    const CANVAS_RENDER = {
        canvas: null,
        ctx: null,
        running: false,
        lastTime: 0,
    
        // Crea el canvas y lo inserta dentro de game-container (antes del world-container)
        init() {
            if (this.canvas) return;
            const container = document.getElementById('game-container');
            if (!container) return;
    
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'game-canvas';
            this.canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 5;
                pointer-events: none;
            `;
            container.insertBefore(this.canvas, container.firstChild);
            this.ctx = this.canvas.getContext('2d');
    
            this.resize();
            window.addEventListener('resize', () => this.resize());
        },
    
        resize() {
            if (!this.canvas) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const logicalW = 600;
            const logicalH = 600;
            this.canvas.width = logicalW * dpr;
            this.canvas.height = logicalH * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.logicalW = logicalW;
            this.logicalH = logicalH;
        },
    
        worldToScreen(wx, wy) {
            const camX = gameState.cameraX || 0;
            const camY = gameState.cameraY || 0;
            return {
                sx: wx - camX,
                sy: wy - camY
            };
        },
    
        drawEnemy(e) {
            if (!e || e.deadClass) return;
            const ctx = this.ctx;
            const pos = this.worldToScreen(e.x, e.y);
            const r = e.radius;
    
            if (pos.sx + r < 0 || pos.sx - r > this.logicalW ||
                pos.sy + r < 0 || pos.sy - r > this.logicalH) return;
    
            let color, glow;
            switch (e.type) {
                case 'fuchsia': color = '#ff00ff'; glow = 'rgba(255,0,255,0.6)'; break;
                case 'green':  color = '#00ff00'; glow = 'rgba(0,255,0,0.6)'; break;
                default:       color = '#ff9a00'; glow = 'rgba(255,154,0,0.6)'; break;
            }
    
            const pulse = 1 + 0.03 * Math.sin(Date.now() / 300 + e.x * 0.01);
    
            ctx.save();
            ctx.shadowColor = glow;
            ctx.shadowBlur = 8;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.sx, pos.sy, r * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },
    
        drawProjectile(p) {
            if (!p) return;
            const ctx = this.ctx;
            // Si es un rayo (bolt), delegar en el módulo RAYO
            if (p.shape === 'bolt' && typeof RAYO !== 'undefined' && RAYO.dibujarBolt) {
                RAYO.dibujarBolt(ctx, p, (wx, wy) => this.worldToScreen(wx, wy), this.logicalW, this.logicalH);
                return;
            }
            const pos = this.worldToScreen(p.x, p.y);
            const ang = p.originalAngle !== undefined ? p.originalAngle : Math.atan2(p.speedY, p.speedX);
    
            ctx.save();
            ctx.translate(pos.sx, pos.sy);
            ctx.rotate(ang);
    
            const type = p.weaponType;
            let color, len, thick, glow, blur = 4;
    
            switch (type) {
                case 'machinegun':
                    color = '#ff3333'; len = 4; thick = 2; glow = 'rgba(255,51,51,0.8)'; break;
                case 'sniper':
                    color = '#00ff00'; len = 12; thick = 1; glow = '#00ff00'; blur = 1; break;
                case 'bazooka':
                    color = '#ff00ff'; len = 8; thick = 4; glow = '#ff00ff'; break;
                case 'minigun':
                    color = '#ff00ff'; len = 6; thick = 3; glow = 'rgba(255,0,255,0.9)'; break;
                case 'shotgun':
                    color = '#ffcc00';
                    len = thick = 3 * (0.8 + 0.4 * ((p.sizeVariation) || 0.5));
                    glow = 'rgba(255,204,0,0.8)'; break;
                default: // rifle
                    color = '#222222'; len = thick = 2; glow = 'rgba(34,34,34,0.6)'; break;
            }
    
            ctx.shadowColor = glow;
            ctx.shadowBlur = blur;
            ctx.fillStyle = color;
            ctx.fillRect(-len / 2, -thick / 2, len, thick);
            ctx.restore();
        },
    
        drawObstacle(o) {
            if (!o) return;
            const ctx = this.ctx;
            const pos = this.worldToScreen(o.x, o.y);
            const w = o.width, h = o.height;
            const left = pos.sx - w / 2;
            const top = pos.sy - h / 2;
    
            if (left + w < 0 || left > this.logicalW || top + h < 0 || top > this.logicalH) return;
    
            let fill, border, borderW = 2, radius = 6;
            const element = o.element;
    
            if (o.isBrick || (element && element.classList && element.classList.contains('brick'))) {
                    const dmg = o.damageLevel != null
                        ? o.damageLevel
                        : BRICK_SYSTEM.BRICK_HEALTH - (o.health != null ? o.health : BRICK_SYSTEM.BRICK_HEALTH);
                const brickColors = ['#888888','#888888','#999999','#aaaaaa','#cccccc','#eeeeee','#ffffff'];
                fill = brickColors[Math.min(dmg, 6)] || '#888888';
                border = null;
                radius = 1;
                borderW = 0;
                if (o.isCritical || (element && element.classList && element.classList.contains('critical'))) {
                    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                    ctx.shadowColor = '#ff9900';
                    ctx.shadowBlur = 6 * pulse + 2;
                }
            } else if (o.isBlack || (element && element.classList && element.classList.contains('black'))) {
                fill = '#000000';
                border = '#333333';
                borderW = 2;
                radius = 6;
                ctx.shadowColor = 'rgba(0,0,0,0.9)';
                ctx.shadowBlur = 10;
            } else if (o.isSlow || (element && element.classList && element.classList.contains('slow'))) {
                fill = '#0f3460';
                border = '#0cc0df';
                borderW = 2;
                radius = 6;
                ctx.shadowColor = 'rgba(12,192,223,0.6)';
                ctx.shadowBlur = 12;
            } else {
                fill = '#0f3460';
                border = '#0cc0df';
                borderW = 2;
                radius = 6;
            }
    
            ctx.save();
            ctx.fillStyle = fill;
            ctx.beginPath();
            if (radius > 0) {
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(left, top, w, h, radius);
                } else {
                    const r = Math.min(radius, w / 2, h / 2);
                    ctx.moveTo(left + r, top);
                    ctx.arcTo(left + w, top, left + w, top + h, r);
                    ctx.arcTo(left + w, top + h, left, top + h, r);
                    ctx.arcTo(left, top + h, left, top, r);
                    ctx.arcTo(left, top, left + w, top, r);
                    ctx.closePath();
                }
            } else {
                ctx.rect(left, top, w, h);
            }
            ctx.fill();
            if (border) {
                ctx.strokeStyle = border;
                ctx.lineWidth = borderW;
                ctx.stroke();
            }
            ctx.restore();
            ctx.shadowBlur = 0;
        },
    
        drawObstacles() {
            const obstacles = gameState.obstacles || [];
            const camX = gameState.cameraX || 0;
            const camY = gameState.cameraY || 0;
            for (let i = 0; i < obstacles.length; i++) {
                const o = obstacles[i];
                if (o.element && o.element.style.display !== 'none') {
                    o.element.style.display = 'none';
                }
                if (o.x + o.width < camX || o.x - o.width > camX + this.logicalW) continue;
                if (o.y + o.height < camY || o.y - o.height > camY + this.logicalH) continue;
                this.drawObstacle(o);
            }
        },
    
        drawStains() {
            const stains = gameState.stains || [];
            const camX = gameState.cameraX || 0;
            const camY = gameState.cameraY || 0;
            const ctx = this.ctx;
            for (let i = 0; i < stains.length; i++) {
                const s = stains[i];
                if (s.type !== 'brick' && s.type !== 'brick-fragment') continue;
                const sx = s.x - camX;
                const sy = s.y - camY;
                if (sx < -15 || sx > this.logicalW + 15 || sy < -15 || sy > this.logicalH + 15) continue;
                let sz = s.size || 0.5;
                sz = 2 + sz * 6;
                if (s.grayValue === undefined) {
                    s.grayValue = 100 + Math.floor(Math.random() * 80);
                }
                const gray = s.grayValue;
                ctx.fillStyle = 'rgba(' + gray + ',' + gray + ',' + gray + ',0.5)';
                if ((s.shape || 0.5) > 0.5) {
                    ctx.fillRect(sx - sz/2, sy - sz/2, sz, sz);
                } else {
                    ctx.beginPath();
                    ctx.arc(sx, sy, sz/2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        },
    
        // ========== SISTEMA DE PARTÍCULAS ==========
        particles: [],
    
        // Crea una partícula. Coords en ESPACIO MUNDO.
        // ← FIX: preservar points/branches/strokeWidth para los bolts, y angle para los shards.
        spawnParticle(opts) {
            if (!(window.USE_CANVAS_RENDER || USE_CANVAS_RENDER)) return;
            const p = {
                x: opts.x, y: opts.y,
                vx: opts.vx || 0, vy: opts.vy || 0,
                life: opts.life || 0.5,
                maxLife: opts.life || 0.5,
                size: opts.size || 2,
                color: opts.color || '#ffffff',
                alphaDecay: opts.alphaDecay !== undefined ? opts.alphaDecay : 1,
                gravity: opts.gravity || 0,
                shape: opts.shape || 'circle'
            };
            // Preservar geometría del bolt (rayo)
            if (opts.shape === 'bolt') {
                p.points = opts.points;
                p.branches = opts.branches;
                p.strokeWidth = opts.strokeWidth;
                p.flicker = opts.flicker;
                p.angle = opts.angle;
            }
            // Preservar ángulo del shard (chispa)
            if (opts.shape === 'shard') {
                p.angle = opts.angle;
            }
            this.particles.push(p);
        },
    
        updateParticles(deltaTime) {
            const arr = this.particles;
            for (let i = arr.length - 1; i >= 0; i--) {
                const p = arr[i];
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.vy += p.gravity * deltaTime;
                p.life -= deltaTime;
                if (p.life <= 0) {
                    arr.splice(i, 1);
                }
            }
        },
    
        drawParticles(deltaTime) {
            this.updateParticles(deltaTime);
            const ctx = this.ctx;
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                
                // Si es un rayo (bolt), delegar en el módulo RAYO
                if (p.shape === 'bolt' && typeof RAYO !== 'undefined' && RAYO.dibujarBolt) {
                    RAYO.dibujarBolt(ctx, p, (wx, wy) => this.worldToScreen(wx, wy), this.logicalW, this.logicalH);
                    continue;
                }
    
                const pos = this.worldToScreen(p.x, p.y);
                if (pos.sx < -20 || pos.sx > this.logicalW + 20 || pos.sy < -20 || pos.sy > this.logicalH + 20) continue;
                const alpha = Math.max(0, p.life / p.maxLife) * p.alphaDecay;
                ctx.save();
                ctx.globalAlpha = alpha;
                if (p.shape === 'shockwave') {
                    const progress = 1 - (p.life / p.maxLife);
                    const radius = p.size * (0.3 + progress * 3);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(pos.sx, pos.sy, radius, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (p.shape === 'glow') {
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(pos.sx, pos.sy, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'shard') {
                    // ← Chispas: astillas lineales (no círculos)
                    const ang = p.angle || 0;
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1, p.size * 0.6);
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.moveTo(pos.sx, pos.sy);
                    ctx.lineTo(
                        pos.sx + Math.cos(ang) * p.size * 2.5,
                        pos.sy + Math.sin(ang) * p.size * 2.5
                    );
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    if (p.shape === 'rect') {
                        ctx.fillRect(pos.sx - p.size / 2, pos.sy - p.size / 2, p.size, p.size);
                    } else {
                        ctx.beginPath();
                        ctx.arc(pos.sx, pos.sy, p.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
        },
    
        render(deltaTime) {
            if (!this.ctx || !gameState) return;
            const ctx = this.ctx;
    
            ctx.clearRect(0, 0, this.logicalW, this.logicalH);
            ctx.shadowBlur = 0;
    
            this.drawStains();
            this.drawObstacles();
    
            const enemies = gameState.enemies || [];
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (e.element && e.active && e.element.style.display !== 'none') {
                    e.element.style.display = 'none';
                }
                this.drawEnemy(e);
            }
    
            const projectiles = gameState.projectiles || [];
            for (let i = 0; i < projectiles.length; i++) {
                const p = projectiles[i];
                if (p.element && p.element.style.display !== 'none') {
                    p.element.style.display = 'none';
                }
                this.drawProjectile(p);
            }
    
            this.drawParticles(deltaTime);
        },
    
        start() {
            if (this.running) return;
            this.running = true;
            this.lastTime = performance.now();
            const loop = (time) => {
                if (!this.running) return;
                const deltaTime = (time - this.lastTime) / 1000;
                this.lastTime = time;
                this.render(deltaTime);
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        },
    
        stop() {
            this.running = false;
            if (this.ctx) this.ctx.clearRect(0, 0, this.logicalW, this.logicalH);
        }
    };
    
    window.CANVAS_RENDER = CANVAS_RENDER;