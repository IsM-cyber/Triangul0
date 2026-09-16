// test-collsweep.test.js — TUNNELING: colision de proyectiles por segmento.
// Espejo EXACTO de segmentRectEnterTime() en gameFunctions.js (mismo codigo,
// sin DOM) para poder testear la matematica pura con node --test.
//
// El bug: el proyectil avanzaba 16-50px por frame y las paredes miden 2-4px
// de grosor. El chequeo puntual (punto dentro del rect) nunca veia el cruce:
// en un frame estaba de un lado, en el otro ya del otro. La colision por
// segmento (slab method) chequea el trayecto completo.

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Copia espejo de gameFunctions.js — si cambias una, cambia la otra.
function segmentRectEnterTime(prevX, prevY, x, y, left, top, right, bottom) {
    let tEnter = 0;
    let tExit = 1;
    const dx = x - prevX;
    const dy = y - prevY;

    if (dx === 0) {
        if (prevX < left || prevX > right) return -1;
    } else {
        let t1 = (left - prevX) / dx;
        let t2 = (right - prevX) / dx;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tEnter) tEnter = t1;
        if (t2 < tExit) tExit = t2;
        if (tEnter > tExit) return -1;
    }

    if (dy === 0) {
        if (prevY < top || prevY > bottom) return -1;
    } else {
        let t1 = (top - prevY) / dy;
        let t2 = (bottom - prevY) / dy;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tEnter) tEnter = t1;
        if (t2 < tExit) tExit = t2;
        if (tEnter > tExit) return -1;
    }

    if (tExit < 0 || tEnter > 1) return -1;
    return Math.max(0, Math.min(tEnter, 1));
}

// Pared vertical de 4px de grosor (estilo PRINCIPAL_THICKNESS): x:100..104
const LEFT = 100, RIGHT = 104, TOP = 0, BOTTOM = 200;

test('tunneling clasico: paso de 100px perpendicular NO atraviesa (bug fixeado)', () => {
    // Antes: el punto en x=50 y luego en x=150 nunca queda dentro de [100,104]
    const t = segmentRectEnterTime(50, 100, 150, 100, LEFT, TOP, RIGHT, BOTTOM);
    assert.notEqual(t, -1, 'el segmento debe cruzar la pared');
});

test('trayectoria rasante (casi paralela) tambien choca con la pared', () => {
    const t = segmentRectEnterTime(50, 92, 150, 108, LEFT, TOP, RIGHT, BOTTOM);
    assert.notEqual(t, -1);
});

test('paralelo a la pared (linea al lado, nunca la cruza): no choca', () => {
    // Linea vertical en x=130, la pared esta en x=100..104 -> no hay cruce
    const t = segmentRectEnterTime(130, 0, 130, 300, LEFT, TOP, RIGHT, BOTTOM);
    assert.equal(t, -1);
});

test('proyectil sin moverse dentro de la pared: choca en el punto', () => {
    const t = segmentRectEnterTime(101, 100, 101, 100, LEFT, TOP, RIGHT, BOTTOM);
    assert.equal(t, 0);
});

test('proyectil sin moverse fuera: no choca', () => {
    const t = segmentRectEnterTime(14, 100, 14, 100, LEFT, TOP, RIGHT, BOTTOM);
    assert.equal(t, -1);
});

test('segmento corto que termina dentro de la pared: choca', () => {
    const t = segmentRectEnterTime(90, 100, 101, 100, LEFT, TOP, RIGHT, BOTTOM);
    const esperado = (LEFT - 90) / (101 - 90); // 0.9090...
    assert.equal(t, esperado);
});

test('el punto de impacto cae en la cara de entrada (para efectos)', () => {
    const t = segmentRectEnterTime(50, 100, 150, 100, LEFT, TOP, RIGHT, BOTTOM);
    const hitX = 50 + (150 - 50) * t;
    assert.equal(hitX, LEFT); // impacto en la cara x=100
});

test('pared detras del movimiento (el proyectil se aleja): no choca', () => {
    const t = segmentRectEnterTime(200, 100, 300, 100, LEFT, TOP, RIGHT, BOTTOM);
    assert.equal(t, -1);
});

test('bazooka lento (16px/frame) contra grosor de 2px: choca', () => {
    const t = segmentRectEnterTime(400, 50, 416, 50, 410, 40, 412, 60);
    assert.notEqual(t, -1);
});

test('minigun (50px/frame) contra pared principal de 4px: choca', () => {
    const t = segmentRectEnterTime(44, 100, 94, 100, 48, 0, 52, 200);
    assert.notEqual(t, -1);
});