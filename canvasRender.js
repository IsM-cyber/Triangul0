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
        // Insertar antes del cursor para que el HUD quede encima
        container.insertBefore(this.canvas, container.firstChild);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    // Ajusta el tamaño del canvas a su contenedor (con devicePixelRatio para nitidez)
    resize() {
        if (!this.canvas) return;
        // El game-container es 600x600 lógico (el wrapper lo escala con transform).
        // El canvas debe dibujar en el MISMO espacio lógico 600x600 que los divs del
        // world-container, para que el render en canvas coincida 1:1 con las colisiones.
        // `getBoundingClientRect` devuelve el tamaño ESCALADO (por el transform del wrapper),
        // por eso usamos 600 fijo como espacio lógico de dibujo.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const logicalW = 600;
        const logicalH = 600;
        this.canvas.width = logicalW * dpr;
        this.canvas.height = logicalH * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Guardamos el tamaño lógico (sin dpr) para dibujar coordenadas screen
        this.logicalW = logicalW;
        this.logicalH = logicalH;
        // CSS no cambia: width/height 100% hace que el canvas ocupe el game-container.
        // El <canvas> de 600*dpr px se comprime a 100% (600px) por CSS = escala correcta.
    },

    // Convierte un punto del mundo (coordeada de gameState, ej: enemy.x) a pantalla
    worldToScreen(wx, wy) {
        const camX = gameState.cameraX || 0;
        const camY = gameState.cameraY || 0;
        // El mundo-container se desplaza con translate(-cameraX, -cameraY) dentro del contenedor
        // El canvas está a la misma escala que worldContainer (1:1 dentro del game-container 600x600)
        return {
            sx: wx - camX,
            sy: wy - camY
        };
    },

    // Dibuja un enemigo como círculo con su color y pulso
    drawEnemy(e) {
        if (!e || e.deadClass) return;
        const ctx = this.ctx;
        const pos = this.worldToScreen(e.x, e.y);
        const r = e.radius;

        // Fuera de pantalla (con margen) → no dibujar
        if (pos.sx + r < 0 || pos.sx - r > this.logicalW ||
            pos.sy + r < 0 || pos.sy - r > this.logicalH) return;

        let color, glow;
        switch (e.type) {
            case 'fuchsia': color = '#ff00ff'; glow = 'rgba(255,0,255,0.6)'; break;
            case 'green':  color = '#00ff00'; glow = 'rgba(0,255,0,0.6)'; break;
            default:       color = '#ff9a00'; glow = 'rgba(255,154,0,0.6)'; break;
        }

        // Pulso suave (replica animation del CSS)
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

    // Dibuja un proyectil según su tipo (replica weaponSystem)
    drawProjectile(p) {
        if (!p) return;
        const ctx = this.ctx;
        const pos = this.worldToScreen(p.x, p.y);
        const ang = p.originalAngle !== undefined ? p.originalAngle : Math.atan2(p.speedY, p.speedX);

        ctx.save();
        ctx.translate(pos.sx, pos.sy);
        ctx.rotate(ang);

        const type = p.weaponType;
        let color, w, h, glow;

        switch (type) {
            case 'machinegun':
                color = '#ff3333'; w = 2; h = 4; glow = 'rgba(255,51,51,0.8)'; break;
            case 'sniper':
                color = '#00ff00'; w = 1; h = 12; glow = '#00ff00'; break;
            case 'bazooka':
                color = '#ff00ff'; w = 8; h = 4; glow = '#ff00ff'; break;
            case 'minigun':
                color = '#ff00ff'; w = 3; h = 6; glow = 'rgba(255,0,255,0.9)'; break;
            case 'shotgun':
                color = '#ffcc00';
                w = h = 3 * (0.8 + 0.4 * ((p.sizeVariation) || 0.5));
                glow = 'rgba(255,204,0,0.8)'; break;
            default: // rifle
                color = '#222222'; w = 2; h = 2; glow = 'rgba(34,34,34,0.6)'; break;
        }

        ctx.shadowColor = glow;
        ctx.shadowBlur = 4;
        ctx.fillStyle = color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
    },

    // Dibuja un obstáculo (black/slow/brick) replicando su CSS
    drawObstacle(o) {
        if (!o) return;
        const ctx = this.ctx;
        const pos = this.worldToScreen(o.x, o.y);
        const w = o.width, h = o.height;
        const left = pos.sx - w / 2;
        const top = pos.sy - h / 2;

        // Frustum culling: solo dibujar si es visible en pantalla
        if (left + w < 0 || left > this.logicalW || top + h < 0 || top > this.logicalH) return;

        // Colores según tipo y estado de daño (replica styles.css)
        let fill, border, borderW = 2, radius = 6;
        const element = o.element;

        if (o.isBrick || (element && element.classList && element.classList.contains('brick'))) {
            // Ladrillo según nivel de daño
            const dmg = o.damageLevel || 0;
            const brickColors = ['#888888','#888888','#999999','#aaaaaa','#cccccc','#eeeeee','#ffffff'];
            fill = brickColors[Math.min(dmg, 6)] || '#888888';
            border = null;
            radius = 1;
            borderW = 0;
            // Crítico: pulso naranja (replica criticalPulse)
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
            // roundRect puede no existir en navegadores viejos; usar fallback manual
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(left, top, w, h, radius);
            } else {
                // Fallback: rect con esquinas ligeramente redondeadas via arcs
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
        // Limpiar sombra después
        ctx.shadowBlur = 0;
    },

    // Dibuja todos los obstáculos visibles (frustum). Oculta sus divs del DOM.
    drawObstacles() {
        const obstacles = gameState.obstacles || [];
        const camX = gameState.cameraX || 0;
        const camY = gameState.cameraY || 0;
        for (let i = 0; i < obstacles.length; i++) {
            const o = obstacles[i];
            // Ocultar SIEMPRE el div del DOM (evita doble render y que el world-container
            // re-componga 3.000+ divs al mover la cámara). Los fuera de pantalla se esconden
            // igual; el canvas dibuja solo los visibles.
            if (o.element && o.element.style.display !== 'none') {
                o.element.style.display = 'none';
            }
            // Frustum: dibujar solo los dentro del viewport expandido
            if (o.x + o.width < camX || o.x - o.width > camX + this.logicalW) continue;
            if (o.y + o.height < camY || o.y - o.height > camY + this.logicalH) continue;
            this.drawObstacle(o);
        }
    },

    // ========== SISTEMA DE PARTÍCULAS (efectos efímeros en canvas) ==========
    // Array de partículas: {x, y, vx, vy, life, maxLife, size, color, alphaDecay, gravity}
    // Reemplaza los divs efímeros (sparks, debris, muzzles) por datos numéricos dibujados.
    // No toca stains/efectos persistentes (siguen en DOM).
    particles: [],

    // Crea una partícula. Coords en ESPACIO MUNDO (se convierten en drawParticles).
    spawnParticle(opts) {
        if (!USE_CANVAS_RENDER) return;
        this.particles.push({
            x: opts.x, y: opts.y,
            vx: opts.vx || 0, vy: opts.vy || 0,
            life: opts.life || 0.5,
            maxLife: opts.life || 0.5,
            size: opts.size || 2,
            color: opts.color || '#ffffff',
            alphaDecay: opts.alphaDecay !== undefined ? opts.alphaDecay : 1,
            gravity: opts.gravity || 0,
            shape: opts.shape || 'circle'  // 'circle' | 'rect' | 'shockwave' | 'glow'
        });
    },

    // Avanza y purga partículas. Llamado al inicio de drawParticles.
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

    // Dibuja todas las partículas vivas.
    drawParticles(deltaTime) {
        this.updateParticles(deltaTime);
        const ctx = this.ctx;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const pos = this.worldToScreen(p.x, p.y);
            // Frustum
            if (pos.sx < -20 || pos.sx > this.logicalW + 20 || pos.sy < -20 || pos.sy > this.logicalH + 20) continue;
            const alpha = Math.max(0, p.life / p.maxLife) * p.alphaDecay;
            ctx.save();
            ctx.globalAlpha = alpha;
            if (p.shape === 'shockwave') {
                // Anillo expansivo
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

    // Render principal: limpia y dibuja obstáculos (fondo) + enemigos + proyectiles + partículas
    render(deltaTime) {
        if (!this.ctx || !gameState) return;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.logicalW, this.logicalH);
        ctx.shadowBlur = 0;

        // 1) Obstáculos (fondo) — solo los visibles
        this.drawObstacles();

        // 2) Enemigos
        const enemies = gameState.enemies || [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.element && e.active && e.element.style.display !== 'none') {
                e.element.style.display = 'none';
            }
            this.drawEnemy(e);
        }

        // 3) Proyectiles
        const projectiles = gameState.projectiles || [];
        for (let i = 0; i < projectiles.length; i++) {
            const p = projectiles[i];
            if (p.element && p.element.style.display !== 'none') {
                p.element.style.display = 'none';
            }
            this.drawProjectile(p);
        }

        // 4) Partículas (efectos efímeros) — encima de todo
        this.drawParticles(deltaTime);
    },

    // Loop del canvas
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