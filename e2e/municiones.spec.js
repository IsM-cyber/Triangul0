// municiones.spec.js — MUNICION INDEPENDIENTE POR ARMA.
// Reporte del usuario: "si gasto un disparo en la escopeta y paso a la
// ametralladora, no debe iniciar con 29 en lugar de 30".
// Antes: un solo contador global de disparos -> al cambiar de arma la nueva
// heredaba el gasto de la anterior en el HUD. Ahora cada arma guarda el suyo.
const { test, expect } = require('@playwright/test');

async function abrirJuego(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  await page.goto('/');
  await page.click('#start-button');
  // Esperar partida ACTIVA **y completamente inicializada**: el reset de partida
  // llama WEAPON_SYSTEM.init() (currentWeapon = RIFLE). Si cambiamos de arma
  // antes de ese init, el arranque legitimo nos revierte la seleccion.
  await page.waitForFunction(() => {
    return typeof gameState !== 'undefined' &&
      gameState.gameActive === true &&
      typeof WEAPON_SYSTEM !== 'undefined' &&
      WEAPON_SYSTEM.currentWeapon !== null;
  }, null, { timeout: 30000 });
  // Dar un margen para que ningún timer de arranque tardio corra después
  await page.waitForTimeout(400);
  return errores;
}

// Cambiar de arma por JS (el teclado es flaky en headless: el foco no siempre
// llega al manejador; switchWeapon directo es determinístico). Verifica que
// quedó seleccionada y reintenta si algún arranque tardío la revirtió.
async function cambiarArma(page, id, nombre) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate((wid) => WEAPON_SYSTEM.switchWeapon(wid), id);
    await page.waitForTimeout(250);
    const actual = await page.evaluate(() => WEAPON_SYSTEM.currentWeapon?.name);
    if (actual === nombre) return;
  }
  throw new Error('no se pudo cambiar a ' + nombre);
}

async function dispararUno(page) {
  const rect = await page.evaluate(() => document.getElementById('game-container').getBoundingClientRect());
  await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 2);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
  await page.waitForTimeout(100);
}

async function hudAmmo(page) {
  return page.evaluate(() => ({
    actual: document.getElementById('current-ammo')?.textContent ?? null,
    max: document.getElementById('max-ammo')?.textContent ?? null,
    arma: WEAPON_SYSTEM.currentWeapon?.name
  }));
}

test('cada arma guarda su propia municion al cambiar de arma', async ({ page }) => {
  const errores = await abrirJuego(page);

  // ESCOPETA (4/4): Gastar 1 disparo -> 3/4
  await cambiarArma(page, 2, 'ESCOPETA');
  await dispararUno(page);
  let hud = await hudAmmo(page);
  expect(hud.arma).toBe('ESCOPETA');
  expect(hud.actual).toBe('3');
  expect(hud.max).toBe('4');

  // AMETRALLADORA (30/30): debe iniciar en 30, NO en 29
  await cambiarArma(page, 3, 'AMETRALLADORA');
  hud = await hudAmmo(page);
  expect(hud.arma).toBe('AMETRALLADORA');
  expect(hud.actual).toBe('30');   // antes del fix: 29 (heredaba el gasto)
  expect(hud.max).toBe('30');

  // Estados internos: cada tipo con su contador
  const estados = await page.evaluate(() => ({
    escopeta: COOLDOWN_SYSTEM.getShots('shotgun'),
    ametralladora: COOLDOWN_SYSTEM.getShots('machinegun')
  }));
  expect(estados.escopeta).toBe(1);
  expect(estados.ametralladora).toBe(0);

  // Volver a la escopeta: sigue en 3/4 (no se reseteo al cambiar)
  await cambiarArma(page, 2, 'ESCOPETA');
  hud = await hudAmmo(page);
  expect(hud.actual).toBe('3');
  expect(hud.max).toBe('4');
  expect(await page.evaluate(() => COOLDOWN_SYSTEM.getShots('shotgun'))).toBe(1);

  expect(errores).toEqual([]);
});

test('la recarga de un arma no altera la municion de las otras', async ({ page }) => {
  const errores = await abrirJuego(page);

  // ESCOPETA (4/4): gastar los 4 disparos -> 0/4 y recarga activa
  await cambiarArma(page, 2, 'ESCOPETA');
  for (let i = 0; i < 4; i++) {
    await dispararUno(page);
  }
  let hud = await hudAmmo(page);
  expect(hud.actual).toBe('0');
  expect(hud.max).toBe('4');

  // Durante la recarga de la escopeta, la ametralladora sigue intacta: 30/30
  await cambiarArma(page, 3, 'AMETRALLADORA');
  hud = await hudAmmo(page);
  expect(hud.actual).toBe('30');
  expect(hud.max).toBe('30');
  expect(await page.evaluate(() => COOLDOWN_SYSTEM.getShots('machinegun'))).toBe(0);

  // Cuando la escopeta termina de recargar (6s), vuelve a 4/4
  await cambiarArma(page, 2, 'ESCOPETA');
  await page.waitForTimeout(6500);
  hud = await hudAmmo(page);
  expect(hud.actual).toBe('4');
  expect(hud.max).toBe('4');
  expect(await page.evaluate(() => COOLDOWN_SYSTEM.getShots('shotgun'))).toBe(0);

  expect(errores).toEqual([]);
});