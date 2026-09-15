// aimClamp.js
// =========== LÓGICA PURA DEL CLAMP DE LA MIRA ===========
// Sin DOM ni window: se puede importar desde node para testear (node --test)
// y desde el navegador como global (se carga ANTES que touch-controls.js).
//
// PROBLEMA ORIGINAL: el game-container es 600x600 lógicos pero se escala
// (~1.15x min, con overflow por los lados). La mira vive en coordenadas lógicas
// (0..600) pero el clamp viejo usaba rect.width (px de pantalla) como límite,
// permitiendo que la mira escapara ~90px lógicos más allá del borde visible.
//
// SOLUCIÓN: clampear contra la intersección real container ∩ viewport,
// convertida a coordenadas lógicas.

// Rect = { left, top, width, height } en px de SCREEN (como getBoundingClientRect).
// viewportW/H = window.innerWidth/innerHeight.
// logicalSize = tamaño lógico del container (600).
function calcularLimitesVisibles(rect, viewportW, viewportH, logicalSize = 600) {
    // Escala real del container (px de pantalla por unidad lógica)
    const scaleFactor = rect.width / logicalSize;

    // Intersección del container con la pantalla visible (px de pantalla)
    const visibleLeft   = Math.max(0, rect.left);
    const visibleRight  = Math.min(viewportW, rect.left + rect.width);
    const visibleTop    = Math.max(0, rect.top);
    const visibleBottom = Math.min(viewportH, rect.top + rect.height);

    // Convertida a coordenadas lógicas del juego
    return {
        scaleFactor,
        minX: (visibleLeft - rect.left) / scaleFactor,
        maxX: (visibleRight - rect.left) / scaleFactor,
        minY: (visibleTop - rect.top) / scaleFactor,
        maxY: (visibleBottom - rect.top) / scaleFactor
    };
}

// Clampa (x, y) lógicos al área visible y devuelve también la posición
// resultante en px de pantalla (para verificar/posicionar el cursor).
function clampAim(x, y, rect, viewportW, viewportH, logicalSize = 600) {
    const L = calcularLimitesVisibles(rect, viewportW, viewportH, logicalSize);
    const cx = Math.max(L.minX, Math.min(L.maxX, x));
    const cy = Math.max(L.minY, Math.min(L.maxY, y));
    return {
        x: cx,
        y: cy,
        bounds: L,
        screenX: rect.left + cx * L.scaleFactor,
        screenY: rect.top + cy * L.scaleFactor
    };
}

// Exports condicionales: node (tests) y navegador (global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcularLimitesVisibles, clampAim };
}
if (typeof window !== 'undefined') {
    window.calcularLimitesVisibles = calcularLimitesVisibles;
    window.clampAim = clampAim;
}