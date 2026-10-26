// rayoElectrico.js
// ============================================================
// Modulo autonomo del rayo electrico del arma de contacto.
// Estetica inspirada en el relampago del evento especial (tecla T):
//   - zigzag agresivo con ramificaciones laterales
//   - glow azul claro con nucleo blanco
//   - 3 pasadas para el efecto electrico
//
// API publica (window.RAYO):
//   RAYO.generarArcoBolt(ox, oy, dx, dy, opts)
//   RAYO.crearBolt(startX, startY, endX, endY, opts)
//   RAYO.crearChispas(x, y, dx, dy, count, opts)
//   RAYO.dibujarBolt(ctx, bolt, worldToScreen, lw, lh)
// ============================================================

const RAYO = (function() {
    'use strict';

    const CFG = {
        COLOR_NUCLEO:   '#aaddff',   // azul claro del nucleo
        COLOR_MEDIO:    '#88ccff',   // azul medio del halo
        COLOR_BLANCO:   '#ffffff',   // blanco del centro brillante
        COLOR_CHISPA:   '#ffffcc',   // amarillo palido de las astillas
        ESPESOR:        0.5,         // grosor base
        DESVIACION:     2.0,         // zigzag agresivo (arco voltaico)
        SEGMENTOS:      4,           // puntos del arco
        VIDA:           0.18,        // segundos de vida
        CHISPAS:        5,           // astillas por golpe
    };

    // ----------------------------------------------------------------
    // 1) Generacion de geometria: zigzag + bifurcaciones.
    // ----------------------------------------------------------------

    function generarArcoBolt(ox, oy, dx, dy, opts) {
        opts = Object.assign({}, CFG, opts);
        const { SEGMENTOS, DESVIACION } = opts;

        const ax = ox, ay = oy;
        const bx = ox + dx, by = oy + dy;
        const len = Math.hypot(dx, dy);
        if (len <= 0.5) return { puntos: [{ x: ax, y: ay }], ramas: [] };

        const step = len / SEGMENTOS;
        const baseAngle = Math.atan2(dy, dx);
        const perpX = Math.cos(baseAngle + Math.PI / 2);
        const perpY = Math.sin(baseAngle + Math.PI / 2);

        // Arco dentado con zigzag marcado
        const puntos = [{ x: ax, y: ay }];
        for (let i = 1; i < SEGMENTOS; i++) {
            const t = i / SEGMENTOS;
            const x = ax + dx * t;
            const y = ay + dy * t;
            // Alternar el signo para zigzag real (no ruido)
            const signo = (i % 2 === 0) ? 1 : -1;
            const offset = signo * DESVIACION * (0.5 + Math.random() * 0.5);
            puntos.push({ x: x + perpX * offset, y: y + perpY * offset });
        }
        puntos.push({ x: bx, y: by });

        // Bifurcaciones: ramales de 3 puntos que salen del arco
        const ramas = [];
        const internos = [];
        for (let i = 1; i < puntos.length - 1; i++) internos.push(i);

        const anadeRamal = (idx, sign) => {
            const from = puntos[idx];
            const ang = baseAngle + sign * (0.7 + Math.random() * 0.8);
            const largo = step * (1.4 + Math.random() * 1.6);
            const medioAng = ang + (Math.random() - 0.5) * 0.6;
            const medio = {
                x: from.x + Math.cos(medioAng) * largo * 0.5,
                y: from.y + Math.sin(medioAng) * largo * 0.5,
            };
            const punta = {
                x: from.x + Math.cos(ang) * largo,
                y: from.y + Math.sin(ang) * largo,
            };
            ramas.push(from, medio, punta);
        };

        // Ramas desde varios puntos del arco
        if (internos.length > 0) {
            const centro = internos[Math.floor(internos.length / 2)];
            anadeRamal(centro, -1);
            anadeRamal(centro, 1);
        }
        if (internos.length > 2) {
            anadeRamal(internos[1], Math.random() < 0.5 ? -1 : 1);
            anadeRamal(internos[internos.length - 1], Math.random() < 0.5 ? -1 : 1);
        }

        return { puntos, ramas };
    }

    function generarPuntosBolt(x1, y1, x2, y2, segments, jitter) {
        const dx = x2 - x1, dy = y2 - y1;
        return generarArcoBolt(x1, y1, dx, dy, {
            SEGMENTOS: segments || CFG.SEGMENTOS,
            DESVIACION: jitter || CFG.DESVIACION,
        });
    }

    // ----------------------------------------------------------------
    // 2) Creacion de particulas
    // ----------------------------------------------------------------

    function crearBolt(startX, startY, endX, endY, opts) {
        opts = Object.assign({}, CFG, opts);
        const dx = endX - startX, dy = endY - startY;
        const { puntos, ramas } = generarArcoBolt(startX, startY, dx, dy, opts);

        return {
            shape: 'bolt',
            x: startX, y: startY,
            vx: 0, vy: 0,
            color: opts.COLOR_NUCLEO,
            points: puntos,
            branches: ramas,
            strokeWidth: opts.ESPESOR,
            flicker: true,
            life: opts.VIDA,
            maxLife: opts.VIDA,
            size: opts.ESPESOR,
            angle: 0,
            alphaDecay: 1,
            gravity: 0,
        };
    }

    /*function crearChispas(x, y, dx, dy, count, opts) {
        opts = Object.assign({}, CFG, opts);
        if (count === undefined) count = opts.CHISPAS;
        const angBase = Math.atan2(dy, dx);
        const chispas = [];
        for (let i = 0; i < count; i++) {
            const ang = angBase + (Math.random() - 0.5) * 2.2;
            chispas.push({
                shape: 'shard',
                x: x + Math.random() * 8,
                y: y + Math.random() * 8,
                color: opts.COLOR_CHISPA,
                size: 2.5,
                angle: ang,
                life: opts.VIDA * 0.8,
                maxLife: opts.VIDA * 0.8,
                alphaDecay: 1,
                gravity: 0,
            });
        }
        return chispas;
    }*/

    function crearChispas(x, y, dx, dy, count, opts) {
        opts = Object.assign({}, CFG, opts);
        if (count === undefined) count = opts.CHISPAS;
        const angBase = Math.atan2(dy, dx);
        const chispas = [];
        for (let i = 0; i < count; i++) {
            // Ángulo mucho más abierto (antes era ±1.1 rad)
            const ang = angBase + (Math.random() - 0.5) * 2.6;
            // Velocidad para que VUELEN desde la punta y se separen
            const speed = 40 + Math.random() * 50;   // 40-90 px/s
            // Vida variable para que no se apaguen todas juntas
            const vida = 0.10 + Math.random() * 0.10;
            chispas.push({
                shape: 'shard',
                // Offset aleatorio más amplio para que no salgan del mismo pixel
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                color: opts.COLOR_CHISPA,
                size: 1.0 + Math.random() * 1.5,   // tamaño variado (más chicas)
                angle: ang,
                life: vida,
                maxLife: vida,
                alphaDecay: 1,
                gravity: 0,
            });
        }
        return chispas;
    }

    // ----------------------------------------------------------------
    // 3) Dibujado en canvas 2D
    // ----------------------------------------------------------------

    function dibujarBolt(ctx, bolt, worldToScreen, logicalW, logicalH) {
        logicalW = logicalW || 600;
        logicalH = logicalH || 600;
        if (!worldToScreen) {
            const gs = typeof window !== 'undefined' ? window.gameState : null;
            const camX = (gs && gs.cameraX) || 0;
            const camY = (gs && gs.cameraY) || 0;
            worldToScreen = function(wx, wy) { return { sx: wx - camX, sy: wy - camY }; };
        }
        if (!bolt || !bolt.points || bolt.points.length < 2) return;

        ctx.save();
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        const trazar = (ptsMundo) => {
            ctx.beginPath();
            const o = worldToScreen(ptsMundo[0].x, ptsMundo[0].y);
            ctx.moveTo(o.sx, o.sy);
            for (let k = 1; k < ptsMundo.length; k++) {
                const q = worldToScreen(ptsMundo[k].x, ptsMundo[k].y);
                ctx.lineTo(q.sx, q.sy);
            }
            ctx.stroke();
        };

        const hayRamas = bolt.branches && bolt.branches.length >= 3;
        const vidaRatio = Math.max(0, bolt.life / bolt.maxLife);

        // 3 pasadas para efecto electrico (igual al evento T):
        // 1) halo exterior azul ancho y tenue
        // 2) halo medio azul claro
        // 3) nucleo blanco brillante
        const passes = [
            { color: bolt.color,           w: bolt.strokeWidth * 6, blur: 14, a: 0.35 },
            { color: CFG.COLOR_MEDIO,      w: bolt.strokeWidth * 2.5, blur: 6, a: 0.8 },
            { color: CFG.COLOR_BLANCO,     w: bolt.strokeWidth, blur: 3, a: 1 },
        ];

        for (const pass of passes) {
            ctx.globalAlpha = vidaRatio * pass.a;
            ctx.strokeStyle = pass.color;
            ctx.lineWidth = pass.w;
            ctx.shadowColor = pass.color;
            ctx.shadowBlur = pass.blur;
            trazar(bolt.points);

            if (hayRamas) {
                ctx.globalAlpha = vidaRatio * pass.a * 0.7;
                ctx.lineWidth = pass.w * 0.45;
                for (let b = 0; b + 2 < bolt.branches.length; b += 3) {
                    trazar([bolt.branches[b], bolt.branches[b + 1], bolt.branches[b + 2]]);
                }
            }
        }

        ctx.restore();
    }

    return {
        CFG: CFG,
        generarArcoBolt: generarArcoBolt,
        generarPuntosBolt: generarPuntosBolt,
        crearBolt: crearBolt,
        crearChispas: crearChispas,
        dibujarBolt: dibujarBolt,
    };
})();

if (typeof window !== 'undefined') {
    window.RAYO = RAYO;
}