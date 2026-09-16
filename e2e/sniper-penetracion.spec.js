import { test, expect } from '@playwright/test';

// PENETRACIÓN:
//  - SNIPER: atraviesa paredes Y enemigos con daño decreciente (28 -> 21 -> 14 -> 7):
//    una bala con 28 de daño rompe 3 paredes de 5 de vida y mata lo que hay detrás.
//  - Rifle (no-regresión): la munición normal MUERE en la primera pared.

// Escenario 100% controlado (sopa limpia): se vacían los obstáculos y enemigos
// del mapa procedural (que provocan flakiness por posición aleatoria) y se
// construye la escena en coordenadas fijas:
//   player (400,400) -> f1 (500,400) -> f2 (515,400) -> f3 (530,400) -> fucsia (570,400)
// El mouse se fija en coords de mundo y se dispara vía shoot() directo
// (el mousemove real es flaky en headless).

async function abrirJuego(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  await page.goto('http://localhost:8000/');
  await page.click('#start-button');
  // la carrera de arranque: currentWeapon arranca null y se setea en startGame
  await page.waitForFunction(() => gameState.gameActive === true && WEAPON_SYSTEM.currentWeapon !== null, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  return errores;
}

async function cambiarArma(page, id, nombre) {
  let current = null;
  for (let i = 0; i < 3; i++) {
    await page.evaluate(id => WEAPON_SYSTEM.switchWeapon(id), id);
    await page.waitForTimeout(250);
    current = await page.evaluate(() => WEAPON_SYSTEM.currentWeapon.type);
    if (current === nombre) break;
  }
  expect(current, `arma debería ser ${nombre}`).toBe(nombre);
}

async function limpiarMundo(page, { bricks, hpBrick, enemigo }) {
  return await page.evaluate(({ bricks, hpBrick, enemigo }) => {
    // mundo controlado: sin obstáculos del mapa ni enemigos reales
    gameState.obstacles = [];
    gameState.enemies = [];
    // El cadáver vive 20s por defecto; en headless el test puede leer tarde
    // (frames a 0.3fps) y ya no encontrarlo. Estirarlo quita el race.
    // OJO: DIRECTED_CORPSE_SYSTEM es `const` a nivel global -> NO está en window.
    if (typeof DIRECTED_CORPSE_SYSTEM !== 'undefined') DIRECTED_CORPSE_SYSTEM.CORPSE_DURATION = 120000;
    // Congelar el mundo: las olas/respawns/regiones re-spawnean enemigos y
    // paredes en la línea de tiro mientras la bala viaja (flakiness real).
    // createEnemy a no-op bloquea olas/respawns/regiones; createEnemyInRegion
    // aparte porque dereferencia el retorno (enemy.active) — si ahi devolvemos
    // null, TypeError y el bucle del juego muere (bala congelada = timeout).
    window.createEnemy = () => null;
    window.createEnemyInRegion = () => null;
    const pushOriginal = Array.prototype.push;
    gameState.obstacles.push = function (o) {
      if (o && o.wallType === 'probe') pushOriginal.call(this, o);
    };

    const px = 400, py = 400;
    gameState.playerX = px;
    gameState.playerY = py;
    // La cámara recién se sincroniza en el siguiente frame (lento en headless):
    // fijarla garantiza que el wrapper shoot() apunte al mundo correcto
    gameState.cameraX = px - 300;
    gameState.cameraY = py - 300;

    const f1x = px + 100;                     // primera pared (objetivo del aim)
    const mkBrick = (xx, yy) => {
      const ob = {
        x: xx, y: yy, width: 20, height: 20,
        left: xx - 10, right: xx + 10, top: yy - 10, bottom: yy + 10,
        isBrick: true, isDestructible: true, health: hpBrick, element: null, wallType: 'probe'
      };
      gameState.obstacles.push(ob);
      return ob;
    };
    const creados = [];
    for (let k = 0; k < bricks; k++) creados.push(mkBrick(f1x + k * 15, py));

    if (enemigo) {
      const fx = f1x + bricks * 15 + 25;      // la fucsia queda detrás de la fila
      gameState.enemies.push(Object.assign(
        {
          type: 'fuchsia', x: fx, y: py, radius: 12, hitsTaken: 23,
          speedX: 0, speedY: 0, active: true, element: null,
          merging: false, stunned: false, __test: true
        },
        { id: enemigo }
      ));
      window.__m = { fucsia: { x: fx, y: py } };
    } else {
      window.__m = {};
    }

    // aim en coords de mundo: mouseWorld = mouse + camera -> apunta a (f1x, py)
    window.__m.worldX = f1x - gameState.cameraX;
    window.__m.worldY = py - gameState.cameraY;
    window.__m.bricks = creados.map(b => ({ x: b.x, y: b.y }));
    return { ok: true };
  }, { bricks, hpBrick, enemigo });
}

async function disparar(page) {
  await page.evaluate(() => {
    gameState.mouseX = window.__m.worldX;
    gameState.mouseY = window.__m.worldY;
    shoot();
  });
  // Esperar el desenlace REAL (regla de contratos: condicion, no clock).
  // El mundo vive: los enemigos reales recién spawneados pueden cruzar la
  // línea de tiro y falsear el escenario -> el poll los limpia en cada
  // evaluación, preservando solo los fakes del test (__test).
  try {
    await page.waitForFunction(() => {
      gameState.enemies = gameState.enemies.filter(e => e.__test);
      return gameState.projectiles.length === 0;
    }, null, { timeout: 120000 });
  } catch (e) {
    // DIAG reducido por si el desenlace vuelve a no llegar (flakiness futura)
    const diag = await page.evaluate(() => ({
      gameActive: gameState.gameActive,
      hits: gameState.hits,
      specialHits: gameState.specialHits,
      wallsDestroyed: gameState.wallsDestroyed,
      fucsiaCount: gameState.fuchsiaEnemiesCount,
      score: gameState.score,
      ativa: gameState.enemies.map(en => ({
        id: en.id, x: Math.round(en.x), y: Math.round(en.y),
        active: en.active, hitsTaken: en.hitsTaken, radius: en.radius
      })),
      proj: gameState.projectiles.map(p => ({
        x: Math.round(p.x), y: Math.round(p.y),
        damage: p.damage, dTravel: Math.round(p.distanceTraveled), maxDist: p.maxDistance
      })),
      ob: gameState.obstacles.map(o => ({
        x: o.x, y: o.y, h: o.health, wt: o.wallType, isBrick: o.isBrick
      })),
      stage: window.__m ? window.__m : null
    }));
    console.log('DIAG TIMEOUT: ' + JSON.stringify(diag));
    throw e;
  }
}

test('sniper: una bala rompe 3 paredes en fila y mata lo que hay detras', async ({ page }) => {
  const errores = await abrirJuego(page);
  await cambiarArma(page, 4, 'sniper');
  const setup = await limpiarMundo(page, { bricks: 3, hpBrick: 5, enemigo: 'fucsia-probe' });
  expect(setup.ok).toBe(true);
  await disparar(page);

  const resultado = await page.evaluate(() => {
    // Muerte real: la fucsia-probe fue CREADA con __test:true y el poll la
    // preserva; si ya no existe en el array, es porque murió (handleEnemyHit
    // la spliqueó) y transformEnemyToCorpse dejó su cadáver en el DOM.
    const fucMuerta = !gameState.enemies.some(e => e.id === 'fucsia-probe');
    const cadaveres = document.querySelectorAll('.dead-fuxia').length;
    const clasesDivs = Array.from(document.querySelectorAll('#world-container div')).map(d => d.className);
    const corpsActivos = (typeof DIRECTED_CORPSE_SYSTEM !== 'undefined') ? DIRECTED_CORPSE_SYSTEM.activeCorpses.length : 'no-sistema';
    const corpsInfo = (typeof DIRECTED_CORPSE_SYSTEM !== 'undefined') ? DIRECTED_CORPSE_SYSTEM.activeCorpses.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), isActive: c.isActive, clase: c.transformedEnemy ? c.transformedEnemy.className : 'sin-div' })) : [];
    const nuevas = gameState.enemies.map(e => e.type);
    const proyectiles = gameState.projectiles.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), dmg: p.damage, pen: p.penetrating }));
    return {
      fucMuerta,
      nuevas,
      cadaveresFucsia: cadaveres,
      corpsInfo,
      clasesDivs,
      corpsActivos,
      balasVivas: proyectiles.length,
      proyectiles
    };
  });

  // daño 28 -> 21 -> 14 -> 7: rompe las paredes (5 de vida c/u) y el
  // último tramo mata a la fucsia (23/25 golpes previos: 23+7=30 >= 25).
  // La muerte se ve por ausencia del array + cadáver .dead-fuxia en el DOM.
  console.log('SNIPER RESULTADO: ' + JSON.stringify(resultado));
  console.log('SNIPER ERRORES: ' + JSON.stringify(errores));
  expect(resultado.fucMuerta, `SNIPER RESULTADO: ${JSON.stringify(resultado)}`).toBe(true);
  expect(resultado.cadaveresFucsia, `SNIPER RESULTADO: ${JSON.stringify(resultado)}`).toBeGreaterThanOrEqual(1);
  expect(resultado.balasVivas, `SNIPER RESULTADO: ${JSON.stringify(resultado)}`).toBe(0);
  expect(errores, `SNIPER ERRORES: ${JSON.stringify(errores)} // RESULTADO: ${JSON.stringify(resultado)}`).toEqual([]);
});

test('rifle: la municion normal NO atraviesa (muere en la primera pared)', async ({ page }) => {
  const errores = await abrirJuego(page);
  await cambiarArma(page, 1, 'rifle');
  const setup = await limpiarMundo(page, { bricks: 2, hpBrick: 2, enemigo: null });
  expect(setup.ok).toBe(true);
  await disparar(page);

  const r2 = await page.evaluate(() => {
    const estadoFake = k => {
      const o = gameState.obstacles.find(o => o.isBrick && o.wallType === 'probe' && o.x === window.__m.bricks[k].x && o.y === window.__m.bricks[k].y);
      return o ? o.health : null;
    };
    return { f1: estadoFake(0), f2: estadoFake(1), balas: gameState.projectiles.length };
  });

  // el rifle hace 1 de daño: la primera pared recibe (2 -> 1) y la bala muere ahí
  expect(r2.f1, `RIFLE RESULTADO: ${JSON.stringify(r2)}`).toBe(1);
  expect(r2.f2, `RIFLE RESULTADO: ${JSON.stringify(r2)}`).toBe(2);   // no atraviesa
  expect(r2.balas, `RIFLE RESULTADO: ${JSON.stringify(r2)}`).toBe(0);
  expect(errores, `RIFLE ERRORES: ${JSON.stringify(errores)} // RESULTADO: ${JSON.stringify(r2)}`).toEqual([]);
});