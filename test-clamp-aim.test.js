// test-clamp-aim.test.js
// Automatización del testing del clamp de la mira.
// Correr: node --test test-clamp-aim.test.js (Node 18+)
//
// MODELO DEL LAYOUT REAL (styles.css + main.js handleResize):
// body flex centrado; #game-wrapper mide el contenido (600x600) y se centra en el
// viewport; main.js aplica transform scale(s) con transform-origin center → el
// CENTRO del container queda fijo en el centro del viewport.
const test = require('node:test');
const assert = require('node:assert/strict');
const { clampAim, calcularLimitesVisibles } = require('./aimClamp.js');

function scaleFor(viewportW, viewportH) {
    return Math.max(viewportW, viewportH) / 600 * 1.15;
}

function rectFromLayout(viewportW, viewportH) {
    const s = scaleFor(viewportW, viewportH);
    return {
        left: viewportW / 2 - (600 * s) / 2,
        top: viewportH / 2 - (600 * s) / 2,
        width: 600 * s,
        height: 600 * s
    };
}

const GEOMETRIES = [
    { name: 'desktop 1920x1080', w: 1920, h: 1080 },
    { name: 'movil portrait 360x640', w: 360, h: 640 },
    { name: 'movil landscape 640x360', w: 640, h: 360 },
    { name: 'tablet portrait 768x1024', w: 768, h: 1024 },
    { name: 'ventana chica 480x800', w: 480, h: 800 },
];

test('la mira toca el borde visible en las 4 direcciones (todas las geometrías)', () => {
    for (const g of GEOMETRIES) {
        const rect = rectFromLayout(g.w, g.h);

        // Borde visible REAL del container ∩ viewport (px de pantalla)
        const expected = {
            left: Math.max(0, rect.left),
            right: Math.min(g.w, rect.left + rect.width),
            top: Math.max(0, rect.top),
            bottom: Math.min(g.h, rect.top + rect.height),
        };

        const FRAMES = 2000; // mantener el joystick clavado muchísimo
        const SPEED = 15; // aimSpeed máx (pixels por frame, igual que el juego)

        const dirs = [
            ['izquierda', -1, 0, r => Math.abs(r.screenX - expected.left) < 0.01],
            ['derecha', 1, 0, r => Math.abs(r.screenX - expected.right) < 0.01],
            ['arriba', 0, -1, r => Math.abs(r.screenY - expected.top) < 0.01],
            ['abajo', 0, 1, r => Math.abs(r.screenY - expected.bottom) < 0.01],
            ['diag. arriba-izq', -0.7071, -0.7071, r => Math.abs(r.screenX - expected.left) < 0.01 && Math.abs(r.screenY - expected.top) < 0.01],
            ['diag. abajo-der', 0.7071, 0.7071, r => Math.abs(r.screenX - expected.right) < 0.01 && Math.abs(r.screenY - expected.bottom) < 0.01],
        ];

        for (const [dir, aX, aY, check] of dirs) {
            // mismísimo flujo que el juego: acumular relativo + clamp por frame
            let x = 300, y = 300;
            for (let i = 0; i < FRAMES; i++) {
                const r = clampAim(x + aX * SPEED, y + aY * SPEED, rect, g.w, g.h);
                x = r.x;
                y = r.y;
            }
            const final = clampAim(x, y, rect, g.w, g.h);
            assert.ok(
                check(final),
                `${g.name} · no toca el borde ${dir}: pantalla=(${final.screenX.toFixed(2)}, ${final.screenY.toFixed(2)}) ` +
                `esperado left=${expected.left.toFixed(2)} right=${expected.right.toFixed(2)} top=${expected.top.toFixed(2)} bottom=${expected.bottom.toFixed(2)}`
            );
        }
    }
});

test('la mira nunca queda fuera del viewport (puntos extremos aleatorios)', () => {
    for (const g of GEOMETRIES) {
        const rect = rectFromLayout(g.w, g.h);
        const rng = (n) => {
            const x = Math.sin(n * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };
        for (let i = 0; i < 500; i++) {
            const x = (rng(i) - 0.5) * 12000;
            const y = (rng(i * 7 + 3) - 0.5) * 12000;
            const r = clampAim(x, y, rect, g.w, g.h);
            assert.ok(r.screenX >= -1e-9 && r.screenX <= g.w + 1e-9,
                `${g.name} · x de pantalla fuera de rango: ${r.screenX}`);
            assert.ok(r.screenY >= -1e-9 && r.screenY <= g.h + 1e-9,
                `${g.name} · y de pantalla fuera de rango: ${r.screenY}`);
            assert.ok(r.x >= r.bounds.minX && r.x <= r.bounds.maxX &&
                r.y >= r.bounds.minY && r.y <= r.bounds.maxY,
                `${g.name} · devuelve coords lógicas fuera de sus límites`);
        }
    }
});

test('límites lógicos coherentes en todas las geometrías', () => {
    for (const g of GEOMETRIES) {
        const rect = rectFromLayout(g.w, g.h);
        const L = calcularLimitesVisibles(rect, g.w, g.h);
        assert.ok(L.minX <= L.maxX && L.minY <= L.maxY, `${g.name}: minX<=maxX y minY<=maxY`);
        assert.ok(L.minX >= -1e-9 && L.minY >= -1e-9, `${g.name}: mínimos no negativos`);
        assert.ok(L.maxX <= 600 + 1e-9 && L.maxY <= 600 + 1e-9, `${g.name}: máximos dentro de lo lógico (<=600)`);
        assert.ok(L.scaleFactor > 0, `${g.name}: scaleFactor > 0`);
    }
});