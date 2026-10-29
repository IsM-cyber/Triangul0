// e2e/cadaver.spec.js — PRUEBA DE MUERTE: cuando un enemigo muere, su
// cadaver crea su propio div en el DOM (commit 8ce1808) y queda marcado
// con deadClass para que la colision con el jugador siga funcionando.
//
// Se fabrican dos enemigos "de mentira" LEJOS del jugador (x+3000) para no
// interferir con la partida: uno fucsia (radius 12) y uno verde (radius 40).
// Lo que se verifica es el CONTRATO del sistema, no una partida real.
const { test, expect } = require('@playwright/test');

// Helper: abrir el juego como jugador real y vigilar la consola
async function abrirJuego(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error') errores.push(m.text());
  });
  await page.goto('/');
  await page.click('#start-button');
  await page.waitForFunction(() => {
    return typeof gameState !== 'undefined' && gameState.gameActive === true;
  }, null, { timeout: 30000 });
  return errores;
}

test('un enemigo muerto crea su div de cadaver sin dejar divs de vivos', async ({ page }) => {
  const errores = await abrirJuego(page);

  // 1) Fabricar 2 enemigos muertos: fucsia (chico) y verde (grande)
  const marcas = await page.evaluate(() => {
    const baseX = gameState.playerX + 3000;  // lejos del jugador
    const baseY = gameState.playerY + 3000;

    const fucsia = { x: baseX, y: baseY, radius: 12, element: null };
    const verde = { x: baseX + 60, y: baseY + 60, radius: 40, element: null };

    DIRECTED_CORPSE_SYSTEM.transformEnemyToCorpse(fucsia, 0);
    DIRECTED_CORPSE_SYSTEM.transformEnemyToCorpse(verde, 0);

    return {
      fucsiaDeadClass: fucsia.deadClass,   // el sistema de colision lo lee
      verdeDeadClass: verde.deadClass,
    };
  });

  // 2) Contar los divs reales que quedaron en el DOM
  const divs = await page.evaluate(() => ({
    vivos: document.querySelectorAll('.enemy:not(.dead-green):not(.dead-fuxia)').length,
    cadaveresFucsia: document.querySelectorAll('.enemy.dead-fuxia').length,
    cadaveresVerdes: document.querySelectorAll('.enemy.dead-green').length,
  }));

  // 3) Aserciones
  expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
  expect(marcas.fucsiaDeadClass).toBe('fuxia');   // colision jugador usa deadClass
  expect(marcas.verdeDeadClass).toBe('green');
  expect(divs.vivos).toBe(0);                      // enemigo vivo: cero divs
  expect(divs.cadaveresFucsia).toBe(1);            // cadaver crea su div
  expect(divs.cadaveresVerdes).toBe(1);
});