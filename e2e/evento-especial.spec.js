// e2e/evento-especial.spec.js — regresión del evento de fusión de enemigos.
const { test, expect } = require('@playwright/test');

test('el evento especial termina y libera el estado de fusión', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await page.goto('/');
  await page.click('#start-button');
  await page.waitForFunction(() => {
    return typeof startSpecialEvent === 'function' &&
      typeof gameState !== 'undefined' &&
      gameState.gameStarted === true &&
      gameState.gameActive === true;
  });

  const duringEvent = await page.evaluate(() => {
    // Aislar la animación de una partida inicializada: sin enemigos heredados
    // que updateEnemyActivity pueda volver a activar.
    gameState.enemies.length = 0;
    gameState.currentEnemyCount = 0;
    gameState.isSpecialEvent = false;
    gameState.mergingEnemies = false;
    gameState.fuchsiaEnemiesCount = 0;

    for (let i = 0; i < 3; i++) {
      const enemy = createEnemy(
        'orange',
        gameState.playerX + 10 + i * 10,
        gameState.playerY
      );
      enemy.active = true;
    }

    startSpecialEvent();
    // Una llamada repetida no debe encadenar una segunda animación.
    startSpecialEvent();

    return {
      lightnings: document.querySelectorAll('.special-event-lightning').length,
      bolts: document.querySelectorAll('.special-event-bolt').length,
    };
  });

  // El aviso eléctrico recién debe aparecer cuando termina la fusión.
  expect(duringEvent.lightnings).toBe(0);
  expect(duringEvent.bolts).toBe(0);

  // waitForSelector usa la mutación del DOM y no depende del RAF lento del
  // headless; captura la onda en el instante en que se crea al finalizar.
  await page.waitForSelector('.special-event-lightning', {
    state: 'attached',
    timeout: 10000,
  });

  const visual = await page.evaluate(() => {
    const lightning = document.querySelector('.special-event-lightning');
    const core = document.querySelector('.special-event-lightning-core');
    const ring = document.querySelector('.special-event-lightning-ring');
    const halo = document.querySelector('.special-event-lightning-halo');
    const bolt = document.querySelector('.special-event-bolt');
    
    return {
      lightnings: document.querySelectorAll('.special-event-lightning').length,
      bolts: document.querySelectorAll('.special-event-bolt').length,
      notifications: document.querySelectorAll('.special-event-notification').length,
      lightningSize: lightning?.getBoundingClientRect().width || 0,
      coreSize: core?.getBoundingClientRect().width || 0,
      ringSize: ring?.getBoundingClientRect().width || 0,
      boltSize: bolt?.getBoundingClientRect().width || 0,
      coreAnimation: core ? getComputedStyle(core).animationName : '',
      ringAnimation: ring ? getComputedStyle(ring).animationName : '',
      boltAnimation: bolt ? getComputedStyle(bolt).animationName : '',
      boltStroke: bolt ? getComputedStyle(bolt).stroke : '',
      boltLineJoin: bolt ? getComputedStyle(bolt).strokeLinejoin : '',
boltDashArray: bolt ? getComputedStyle(bolt).strokeDasharray : '',
ringDashArray: ring ? getComputedStyle(ring).strokeDasharray : '',
      primaryStrokeWidth: bolt ? parseFloat(getComputedStyle(bolt).strokeWidth) : 0,
      secondaryStrokeWidth: (() => {
        const secondary = document.querySelector('.special-event-bolt.secondary');
        return secondary ? parseFloat(getComputedStyle(secondary).strokeWidth) : 0;
      })(),
      secondaryDashArray: (() => {
        const secondary = document.querySelector('.special-event-bolt.secondary');
        return secondary ? getComputedStyle(secondary).strokeDasharray : '';
      })(),
      primarySegmentCount: bolt ? (bolt.getAttribute('d').match(/L/g) || []).length : 0,
      branchCount: [...document.querySelectorAll('.special-event-bolt')].filter(pathElement =>
        !pathElement.getAttribute('d').trim().startsWith('M 0 0')
      ).length,
      haloFill: halo ? getComputedStyle(halo).fill : '',
    };
  });

  expect(visual.lightnings).toBe(1);
  expect(visual.bolts).toBeGreaterThanOrEqual(8);
  expect(visual.notifications).toBe(0);
  expect(visual.lightningSize).toBeGreaterThan(0);
  expect(visual.coreSize).toBeGreaterThan(0);
  expect(visual.ringSize).toBeGreaterThan(0);
  expect(visual.boltSize).toBeGreaterThan(0);
  expect(visual.coreAnimation).toBe('specialEventCore');
  expect(visual.ringAnimation).toBe('specialEventRing');
  expect(visual.boltAnimation).toBe('specialEventBolt');
  expect(visual.boltStroke).toContain('255, 255, 255');
  expect(visual.boltLineJoin).toBe('miter');
expect(visual.boltDashArray).toBe('none');
expect(visual.ringDashArray).toBe('none');
  expect(visual.primaryStrokeWidth).toBeLessThanOrEqual(1.25);
  expect(visual.secondaryStrokeWidth).toBeLessThanOrEqual(0.85);
  expect(visual.secondaryDashArray).toBe('none');
  expect(visual.primarySegmentCount).toBeGreaterThanOrEqual(10);
  expect(visual.branchCount).toBeGreaterThanOrEqual(4);
  expect(visual.haloFill).toContain('30, 144, 255');

  // Measure the ray group without the short-lived wrapper animation. The
  // electric effect remains visible, but the rays must stay compact.
  const boltExtent = await page.evaluate(() => {
    const lightning = document.querySelector('.special-event-lightning');
    const bolts = [...document.querySelectorAll('.special-event-bolt')];
    lightning.style.animation = 'none';
    lightning.style.transform = 'translate(-50%, -50%) scale(1)';
    const localExtents = bolts.map(bolt => {
      const bounds = bolt.getBBox();
      return Math.max(bounds.width, bounds.height);
    });
    const groupTransform = document.querySelector('.special-event-bolts')?.getAttribute('transform') || '';
    const scaleMatch = groupTransform.match(/scale\(([-\d.]+)\)/);
    const scale = scaleMatch ? Number(scaleMatch[1]) : 1;
    return {
      max: Math.max(...localExtents) * scale,
      groupTransform,
    };
  });
  expect(boltExtent.max).toBeLessThan(90);
  expect(boltExtent.groupTransform).toContain('0.42');

  const estado = await page.evaluate(() => ({
    special: gameState.isSpecialEvent,
    merging: gameState.mergingEnemies,
    enemiesLeftMerging: gameState.enemies.filter(enemy => enemy.merging).length,
    fuchsiaCount: gameState.fuchsiaEnemiesCount,
  }));

  expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
  expect(estado.special).toBe(false);
  expect(estado.merging).toBe(false);
  expect(estado.enemiesLeftMerging).toBe(0);
  expect(estado.fuchsiaCount).toBe(1);;
});


// La tecla T dispara el evento para poder revisar el efecto electrico
// sin depender de matar enemigos naranjas.
test('la tecla T dispara el evento especial sin enemigos naranjas', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await page.goto('/');
  await page.click('#start-button');
  await page.waitForFunction(() => {
    return typeof startSpecialEvent === 'function' &&
      typeof gameState !== 'undefined' &&
      gameState.gameStarted === true &&
      gameState.gameActive === true;
  });

  const before = await page.evaluate(() => {
    // Sin enemigos naranjas: la tecla debe alcanzar el pipeline del
    // evento por si sola, sin depender de un kill previo.
    gameState.enemies.length = 0;
    gameState.currentEnemyCount = 0;
    gameState.isSpecialEvent = false;
    gameState.mergingEnemies = false;
    gameState.fuchsiaEnemiesCount = 0;

    // El evento dura ~500ms (espera del merge). Leer las banderas desde
    // afuera compite contra ese reloj y se rompe cuando la maquina esta
    // cargada, asi que se registran DENTRO de la pagina en el instante en
    // que el evento arranca.
    window.__specialEventObserved = null;
    const originalStartSpecialEvent = window.startSpecialEvent;
    window.startSpecialEvent = function () {
      const result = originalStartSpecialEvent.apply(this, arguments);
      if (window.__specialEventObserved === null) {
        window.__specialEventObserved = {
          isSpecialEvent: gameState.isSpecialEvent === true,
          mergingEnemies: gameState.mergingEnemies === true,
        };
      }
      return result;
    };

    return { fuchsiaCount: gameState.fuchsiaEnemiesCount };
  });
  expect(before.fuchsiaCount).toBe(0);

  await page.keyboard.press('t');

  // El evento arranca de inmediato: no requiere tocar ningun enemigo.
  await page.waitForFunction(() => window.__specialEventObserved !== null, undefined, {
    timeout: 15000,
    polling: 25,
  });
  const started = await page.evaluate(() => window.__specialEventObserved);
  expect(started.isSpecialEvent).toBe(true);
  expect(started.mergingEnemies).toBe(true);

  // Y la descarga electrica aparece igualmente al finalizar la fusion vacia.
  await page.waitForSelector('.special-event-lightning', {
    state: 'attached',
    timeout: 10000,
  });

  const after = await page.evaluate(() => ({
    isSpecialEvent: gameState.isSpecialEvent,
    mergingEnemies: gameState.mergingEnemies,
    fuchsiaCount: gameState.fuchsiaEnemiesCount,
    // Ningun enemigo quedo esperando fusion: la tecla no dejo el evento colgado.
    leftMerging: gameState.enemies.filter(e => e.merging).length,
  }));

  expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
  expect(after.isSpecialEvent).toBe(false);
  expect(after.mergingEnemies).toBe(false);
  expect(after.fuchsiaCount).toBe(1);
  expect(after.leftMerging).toBe(0);
});


// La onda expansiva solo debe cobrar una vez a cada enemigo alcanzado.
test('la onda expansiva daña una sola vez a los enemigos que alcanza', async ({ page }) => {
    const errores = [];
    page.on('pageerror', e => errores.push(String(e)));
    page.on('console', m => {
        if (m.type() === 'error') errores.push(m.text());
    });

    await page.goto('/');
    await page.click('#start-button');
    await page.waitForFunction(() => {
        return typeof startSpecialEvent === 'function' &&
            typeof gameState !== 'undefined' &&
            gameState.gameStarted === true &&
            gameState.gameActive === true;
    });

    const setup = await page.evaluate(() => {
        gameState.enemies.length = 0;
        gameState.currentEnemyCount = 0;
        gameState.isSpecialEvent = false;
        gameState.mergingEnemies = false;
        gameState.fuchsiaEnemiesCount = 0;
        gameState.greenEnemiesCount = 0;
        gameState.hits = 0;

        const nearEnemy = createEnemy(
            'green',
            gameState.playerX + 60,
            gameState.playerY
        );
        const farEnemy = createEnemy(
            'green',
            gameState.playerX + 420,
            gameState.playerY
        );
        const available = typeof applySpecialEventWaveDamage === 'function';
        if (available) {
            applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
        }

        return {
            available,
            nearId: nearEnemy.id,
            farId: farEnemy.id,
        };
    });

    // La bandera no existe en el generador antiguo; en ese caso el test
    // sigue evaluando la aserción de daño y falla de forma observable.
    await page.waitForFunction(() => {
        return typeof specialEventWaveActive === 'undefined' ||
            specialEventWaveActive === false;
    }, undefined, { timeout: 2000, polling: 50 });

    const hits = await page.evaluate(({ nearId, farId }) => {
        const nearEnemy = gameState.enemies.find(enemy => enemy.id === nearId);
        const farEnemy = gameState.enemies.find(enemy => enemy.id === farId);
        return {
            nearHits: nearEnemy ? nearEnemy.hitsTaken : -1,
            farHits: farEnemy ? farEnemy.hitsTaken : -1,
            expectedDamage: typeof SPECIAL_EVENT_WAVE_DAMAGE === 'number'
                ? SPECIAL_EVENT_WAVE_DAMAGE
                : 14,
        };
    }, setup);

    expect(setup.available).toBe(true);
    expect(hits.nearHits).toBe(hits.expectedDamage);
    expect(hits.farHits).toBe(0);
    expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
});


// La descarga real del evento debe usar la misma onda que el helper directo.
test('la onda del evento especial daña a un enemigo cercano', async ({ page }) => {
    const errores = [];
    page.on('pageerror', e => errores.push(String(e)));
    page.on('console', m => {
        if (m.type() === 'error') errores.push(m.text());
    });

    await page.goto('/');
    await page.click('#start-button');
    await page.waitForFunction(() => {
        return typeof startSpecialEvent === 'function' &&
            typeof gameState !== 'undefined' &&
            gameState.gameStarted === true &&
            gameState.gameActive === true;
    });

    const setup = await page.evaluate(() => {
        gameState.enemies.length = 0;
        gameState.currentEnemyCount = 0;
        gameState.isSpecialEvent = false;
        gameState.mergingEnemies = false;
        gameState.fuchsiaEnemiesCount = 0;
        gameState.greenEnemiesCount = 0;
        gameState.hits = 0;

        const nearEnemy = createEnemy(
            'green',
            gameState.playerX + 60,
            gameState.playerY
        );
        return {
            nearId: nearEnemy.id,
        };
    });

    await page.keyboard.press('t');
    await page.waitForSelector('.special-event-lightning', {
        state: 'attached',
        timeout: 10000,
    });
    await page.waitForFunction(() => {
        return typeof specialEventWaveActive === 'undefined' ||
            specialEventWaveActive === false;
    }, undefined, { timeout: 3000, polling: 50 });

    const hits = await page.evaluate(({ nearId }) => {
        const nearEnemy = gameState.enemies.find(enemy => enemy.id === nearId);
        return {
            nearHits: nearEnemy ? nearEnemy.hitsTaken : -1,
            expectedDamage: typeof SPECIAL_EVENT_WAVE_DAMAGE === 'number'
                ? SPECIAL_EVENT_WAVE_DAMAGE
                : 14,
            // La onda del evento tiene que pegar el doble que la onda de la
            // bazooka. Es un contrato, no un numero suelto: si alguien
            // reequilibra la bazooka, la relacion se tiene que ver sola.
            bazookaDamage: WEAPON_SYSTEM.BAZOOKA.areaDamage,
        };
    }, setup);

    expect(hits.nearHits).toBe(hits.expectedDamage);
    expect(hits.bazookaDamage * 2).toBe(hits.expectedDamage);
});


// La onda debe expandirse paso a paso. Un enemigo fuera del primer frente
// no puede dañarse en el instante inicial aunque el radio final lo alcance:
// si no, una implementación que aplicase todo el radio de golpe pasaría
// los mismos probes que un frente que sí viaja.
// El frente tiene que EXPANDIRSE: un enemigo se daña en el paso cuyo radio lo
// alcanza, no todos en el mismo instante. La prueba dispara los seis pasos a
// mano y no mira el reloj: en una maquina de 2 nucleos saturada un timer puede
// retrasarse un segundo, y comparar tiempos de pared daria falsos negativos.
test('la onda se expande paso a paso y respeta el radio de cada enemigo',
    async ({ page }) => {
        const errores = [];
        page.on('pageerror', e => errores.push(String(e)));
        page.on('console', m => {
            if (m.type() === 'error') errores.push(m.text());
        });

        await page.goto('/');
        await page.click('#start-button');
        await page.waitForFunction(() => {
            return typeof applySpecialEventWaveDamage === 'function' &&
                typeof gameState !== 'undefined' &&
                gameState.gameStarted === true &&
                gameState.gameActive === true;
        });

        // Aislar la onda del render por software del headless y capturar sus
        // seis timers en vez de programarlos.
        await page.evaluate(() => {
            // Se captura CUALQUIER timer pedido durante la llamada a la onda, sin
            // filtrar por delay: asi un frente que se reprograma a 0ms (burst) se
            // ve en el log en vez de pasar desapercibido.
            window.requestAnimationFrame = () => 0;
            gameState.gameActive = false;
            window.__waveSteps = [];
            window.__capturing = true;
            const realSetTimeout = window.setTimeout;
            let lastId = 200000;
            window.setTimeout = function (callback, delay) {
                if (window.__capturing) {
                    window.__waveSteps.push({ delay, callback });
                    return ++lastId;
                }
                return realSetTimeout.apply(this, arguments);
            };

            gameState.enemies.length = 0;
            gameState.currentEnemyCount = 0;
            gameState.isSpecialEvent = false;
            gameState.mergingEnemies = false;
            gameState.fuchsiaEnemiesCount = 0;
            gameState.greenEnemiesCount = 0;
            gameState.hits = 0;

            // Radio del verde = 80. El cercano (60) entra en el primer frente
            // (25 + 80 = 105). El lejano (200) necesita front >= 120, o sea el
            // quinto paso (125 + 80 = 205): antes de eso esta intacto.
            window.__far = createEnemy('green', gameState.playerX + 200, gameState.playerY);
            window.__near = createEnemy('green', gameState.playerX + 60, gameState.playerY);
            applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
            window.__capturing = false;
        });

        const result = await page.evaluate(() => {
            const far = window.__far;
            const near = window.__near;
            const farHitAt = [];
            const nearHitAt = [];

            window.__waveSteps.forEach((step, index) => {
                const farBefore = far.hitsTaken;
                const nearBefore = near.hitsTaken;
                step.callback();
                if (far.hitsTaken > farBefore) farHitAt.push(index + 1);
                if (near.hitsTaken > nearBefore) nearHitAt.push(index + 1);
            });

            return {
                delays: window.__waveSteps.map(step => step.delay),
                farHitAt,
                nearHitAt,
                farHits: far.hitsTaken,
                nearHits: near.hitsTaken,
                waveActive: specialEventWaveActive === true,
                expectedDamage: typeof SPECIAL_EVENT_WAVE_DAMAGE === 'number'
                    ? SPECIAL_EVENT_WAVE_DAMAGE
                    : 14,
            };
        });

        // Los seis pasos estan repartidos en 360ms: no es una burst de un tick.
        expect(result.delays).toEqual([60, 120, 180, 240, 300, 360]);

        // Cada enemigo se dana una sola vez, cuando el frente lo alcanza.
        expect(result.nearHitAt).toEqual([1]);
        expect(result.farHitAt).toEqual([5]);
        expect(result.nearHits).toBe(result.expectedDamage);
        expect(result.farHits).toBe(result.expectedDamage);
        expect(result.waveActive).toBe(false);

        await page.waitForFunction(() => specialEventWaveActive === false, undefined, {
            timeout: 20000,
            polling: 50,
        });
        expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
    });

// La onda tampoco es solo para enemigos: el frente tiene que derribar las
// paredes de ladrillo que alcanza, igual que hace la explosion de la bazooka.
// Cada muro recibe UN solo golpe por onda (el frente pasa una vez), asi que un
// ladrillo con vida alta no puede finishing el doble.
test('la onda del evento derriba los muros de ladrillo que alcanza',
  async ({ page }) => {
    const errores = [];
    page.on('pageerror', e => errores.push(String(e)));
    page.on('console', m => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await page.goto('/');
    await page.click('#start-button');
    await page.waitForFunction(() => {
      return typeof applySpecialEventWaveDamage === 'function' &&
        typeof BRICK_SYSTEM !== 'undefined' &&
        gameState.gameStarted === true &&
        gameState.gameActive === true;
    });

    // Capturar los seis timers de la onda y dispararlos a mano: en una maquina
    // de 2 nucleos saturada los timers del navegador llegan tarde y cualquier
    // comparacion por reloj de pared daria falsos negativos.
    await page.evaluate(() => {
      window.requestAnimationFrame = () => 0;
      gameState.gameActive = false;
      gameState.enemies.length = 0;
      gameState.currentEnemyCount = 0;
      gameState.isSpecialEvent = false;
      gameState.mergingEnemies = false;
      gameState.obstacles = [];
      obstacleGrid.clear();
      gameState.wallsDestroyed = 0;
      gameState.score = 0;

      const brick = (dx, health) => ({
        x: gameState.playerX + dx,
        y: gameState.playerY,
        width: 40,
        height: 12,
        left: gameState.playerX + dx - 20,
        right: gameState.playerX + dx + 20,
        top: gameState.playerY - 6,
        bottom: gameState.playerY + 6,
        isDestructible: true,
        isBrick: true,
        health,
      });

      // 100px: lo alcanza el frente en el paso 4 (100 de radio). Con vida
      // alta para ver cuanto dano le mete UNA sola vez.
      window.__toughBrick = brick(100, 50);
      // 100px pero con vida de ladrillo normal: tiene que caer.
      window.__doomedBrick = brick(100, BRICK_SYSTEM.BRICK_HEALTH);
      // 400px: fuera del frente final (150).
      window.__farBrick = brick(400, BRICK_SYSTEM.BRICK_HEALTH);
      // 100px pero no destructible: ni un rasguno.
      window.__solidWall = Object.assign(brick(100, 5), { isDestructible: false });

      // Ladrillo generado por el sistema real y movido al frente. Los ladrillos
      // reales solo traen x/y/width/height (sin left/right), asi que este caso
      // cubre el camino de compatibilidad de la caja.
      const wallDef = BRICK_SYSTEM.createWallDefinition('menor', 'horizontal', 0, 0);
      const generated = BRICK_SYSTEM.createBricksFromWall(wallDef, 0, 0, 1);
      window.__realBrick = generated[0];
      window.__realBrick.x = gameState.playerX + 100;
      window.__realBrick.y = gameState.playerY;
      window.__realBrickHasBounds = 'left' in window.__realBrick;

      const all = [
        window.__toughBrick,
        window.__doomedBrick,
        window.__farBrick,
        window.__solidWall,
        window.__realBrick,
      ];
      gameState.obstacles.push(...all);
      all.forEach(obstacle => obstacleGrid.addObstacle(obstacle));

      window.__waveSteps = [];
      window.__capturing = true;
      const realSetTimeout = window.setTimeout;
      let lastId = 300000;
      window.setTimeout = function (callback, delay) {
        if (window.__capturing) {
          window.__waveSteps.push({ delay, callback });
          return ++lastId;
        }
        return realSetTimeout.apply(this, arguments);
      };
      applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
      window.__capturing = false;
    });

    const result = await page.evaluate(() => {
      const healthBefore = window.__toughBrick.health;
      window.__waveSteps.forEach(step => step.callback());
      return {
        steps: window.__waveSteps.length,
        toughBefore: healthBefore,
        toughAfter: window.__toughBrick.health,
        toughInWorld: gameState.obstacles.includes(window.__toughBrick),
        doomedInWorld: gameState.obstacles.includes(window.__doomedBrick),
        doomedHealth: window.__doomedBrick.health,
        farInWorld: gameState.obstacles.includes(window.__farBrick),
        farHealth: window.__farBrick.health,
        solidInWorld: gameState.obstacles.includes(window.__solidWall),
        realBrickInWorld: gameState.obstacles.includes(window.__realBrick),
        realBrickHasBounds: window.__realBrickHasBounds,
        realBrickInGrid: obstacleGrid.getNearbyObstacles(
          gameState.playerX, gameState.playerY, 200
        ).some(obstacle => obstacle === window.__realBrick),
        wallsDestroyed: gameState.wallsDestroyed,
        expectedDamage: SPECIAL_EVENT_WAVE_DAMAGE,
      };
    });

    expect(result.steps).toBe(6);

    // El ladrillo resistente recibe el daño del frente UNA vez, no una por paso.
    expect(result.toughBefore - result.toughAfter).toBe(result.expectedDamage);
    expect(result.toughInWorld).toBe(true);

    // El de vida normal se derrumba y sale del mundo.
    expect(result.doomedInWorld).toBe(false);
    expect(result.doomedHealth).toBeLessThanOrEqual(0);

    // Un ladrillo real (sin left/right) tambien cae y sale del grid: si se
    // quedara en el obstacleGrid seria un muro fantasma.
    expect(result.realBrickHasBounds).toBe(false);
    expect(result.realBrickInWorld).toBe(false);
    expect(result.realBrickInGrid).toBe(false);
    expect(result.wallsDestroyed).toBe(2);

    // Lo que esta fuera de alcance no se toca.
    expect(result.farInWorld).toBe(true);
    expect(result.farHealth).toBe(5);

    // Y las paredes indestructibles ni se miran.
    expect(result.solidInWorld).toBe(true);

    await page.waitForFunction(() => specialEventWaveActive === false, undefined, {
      timeout: 20000,
      polling: 50,
    });
    expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
  });

test('reiniciar en medio de la onda no daña la partida nueva ni bloquea el evento',
    async ({ page }) => {
        const errores = [];
        page.on('pageerror', e => errores.push(String(e)));
        page.on('console', m => {
            if (m.type() === 'error') errores.push(m.text());
        });

        await page.goto('/');
        await page.click('#start-button');
        await page.waitForFunction(() => {
            return typeof applySpecialEventWaveDamage === 'function' &&
                typeof gameState !== 'undefined' &&
                gameState.gameStarted === true &&
                gameState.gameActive === true;
        });

        await page.evaluate(() => {
            gameState.enemies.length = 0;
            createEnemy('green', gameState.playerX + 60, gameState.playerY);
            applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
        });

        // Reinicio con la onda todavia en curso.
        await page.waitForTimeout(80);
        await page.evaluate(() => initGame());

        // Margen para que corran todos los pasos viejos de la onda anterior.
        await page.waitForTimeout(1200);

        const result = await page.evaluate(() => ({
            damagedInNewRun: gameState.enemies.filter(e => e.hitsTaken > 0).length,
            waveActive: specialEventWaveActive,
            wavePending: specialEventWavePending,
        }));

        expect(result.damagedInNewRun).toBe(0);
        expect(result.waveActive).toBe(false);
        expect(result.wavePending).toBe(false);

        // El evento especial tiene que seguir disponible en la partida nueva.
        const stillUsable = await page.evaluate(() => {
            gameState.isSpecialEvent = false;
            gameState.mergingEnemies = false;
            startSpecialEvent();
            return gameState.isSpecialEvent === true;
        });
        expect(stillUsable).toBe(true);
        expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
    });

// Una onda vieja que llega tarde no puede limpiar las banderas de la onda que ya
// arranco en la partida reiniciada: si lo hiciera, un T o un hito de 25 impactos
// podria abrir un segundo evento en paralelo mientras el frente sigue en curso.
test('una onda vieja no puede limpiar las banderas de la onda nueva',
    async ({ page }) => {
        const errores = [];
        page.on('pageerror', e => errores.push(String(e)));
        page.on('console', m => {
            if (m.type() === 'error') errores.push(m.text());
        });

        await page.goto('/');
        await page.click('#start-button');
        await page.waitForFunction(() => {
            return typeof applySpecialEventWaveDamage === 'function' &&
                typeof gameState !== 'undefined' &&
                gameState.gameStarted === true &&
                gameState.gameActive === true;
        });

        // Los seis timers de cada onda se capturan en vez de programarse y se
        // disparan a mano. En una maquina de 2 nucleos saturada los timers del
        // juego se estiran de 360ms a segundos, asi que un entrelazado por reloj
        // de pared no es reproducible; disparar los pasos en el orden exacto si
        // lo es.
        await page.evaluate(() => {
            const WAVE_DELAYS = new Set([60, 120, 180, 240, 300, 360]);
            window.__queues = { A: [], B: [] };
            window.__capturing = null;
            const realSetTimeout = window.setTimeout;
            let lastId = 100000;
            window.setTimeout = function (callback, delay) {
                if (window.__capturing !== null && WAVE_DELAYS.has(delay)) {
                    window.__queues[window.__capturing].push({ delay, callback });
                    return ++lastId;
                }
                return realSetTimeout.apply(this, arguments);
            };
        });

        await page.evaluate(() => {
            window.__capturing = 'A';
            applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
            window.__capturing = null;
        });

        // Reinicio y arranque de la onda B; los pasos de A quedan pendientes.
        await page.evaluate(() => {
            initGame();
            window.__capturing = 'B';
            applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);
            window.__capturing = null;
        });

        const result = await page.evaluate(() => {
            const flag = () => specialEventWaveActive === true;
            const waveA = window.__queues.A.slice();
            const waveB = window.__queues.B.slice();

            // Tres pasos rezagados de la onda vieja se ejecutan ahora, cuando la
            // onda nueva ya es dueña de la bandera.
            const duringStale = [];
            for (const step of waveA.slice(0, 3)) {
                step.callback();
                duringStale.push(flag());
            }

            // Y despues la onda nueva completa su frente.
            const duringB = [];
            for (const step of waveB) {
                step.callback();
                duringB.push(flag());
            }

            return {
                queueA: waveA.length,
                queueB: waveB.length,
                duringStale,
                duringB,
                pending: specialEventWavePending === true,
            };
        });

        // Captura completa de los dos frentes.
        expect(result.queueA).toBe(6);
        expect(result.queueB).toBe(6);

        // Ningun paso rezagado puede bajar una bandera que ya es de otra onda.
        expect(result.duringStale).toEqual([true, true, true]);

        // La onda nueva solo baja su bandera en el ultimo paso.
        expect(result.duringB).toEqual([true, true, true, true, true, false]);
        expect(result.pending).toBe(false);
        expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
    });

// El hito de 25 impactos se cumple dentro de la propia onda. La onda no puede
// encadenar un evento en medio de su frente, pero el hito tampoco puede
// perderse: el evento se dispara en cuanto la onda termina.
test('el evento de 25 impactos no se pierde durante la onda', async ({ page }) => {
    const errores = [];
    page.on('pageerror', e => errores.push(String(e)));
    page.on('console', m => {
        if (m.type() === 'error') errores.push(m.text());
    });

    await page.goto('/');
    await page.click('#start-button');
    await page.waitForFunction(() => {
        return typeof applySpecialEventWaveDamage === 'function' &&
            typeof gameState !== 'undefined' &&
            gameState.gameStarted === true &&
            gameState.gameActive === true;
    });

    const setup = await page.evaluate(() => {
        gameState.enemies.length = 0;
        gameState.currentEnemyCount = 0;
        gameState.isSpecialEvent = false;
        gameState.mergingEnemies = false;
        gameState.fuchsiaEnemiesCount = 0;
        gameState.greenEnemiesCount = 0;
        gameState.orangeEnemiesToCreate = 0;
        // Un impacto por debajo del hito: el naranja alcanzado por el segundo
        // paso de la onda (50 + 10 >= 60) completa los 25.
        gameState.hits = 24;

        createEnemy('orange', gameState.playerX + 60, gameState.playerY);
        applySpecialEventWaveDamage(gameState.playerX, gameState.playerY);

        return { hitsBefore: gameState.hits };
    });

    expect(setup.hitsBefore).toBe(24);

    await page.waitForFunction(() => {
        return typeof specialEventWaveActive === 'undefined' ||
            specialEventWaveActive === false;
    }, undefined, { timeout: 20000, polling: 50 });

    const estado = await page.evaluate(() => ({
        hits: gameState.hits,
        isSpecialEvent: gameState.isSpecialEvent,
        mergingEnemies: gameState.mergingEnemies,
    }));

    expect(estado.hits).toBe(25);
    expect(estado.isSpecialEvent).toBe(true);
    expect(estado.mergingEnemies).toBe(true);
    expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
});


// Cada descarga debe construir una forma arbolada nueva: todos los troncos
// nacen del centro, las ramas parten de vertices reales del tronco y dos
// descargas consecutivas nunca dibujan la misma geometria.
test('cada descarga genera una forma arbolada distinta', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-button');
  await page.waitForFunction(() => {
    return typeof createSpecialEventExplosion === 'function' &&
      typeof gameState !== 'undefined' &&
      gameState.gameActive === true;
  });

  const samples = await page.evaluate(() => {
    const parsePoints = (d) => {
      const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      const points = [];
      for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
      return points;
    };

    const sample = () => {
      createSpecialEventExplosion(gameState.playerX, gameState.playerY);
      const nodes = document.querySelectorAll('.special-event-lightning');
      const current = nodes[nodes.length - 1];
      const paths = [...current.querySelectorAll('.special-event-bolt')];
      const primary = paths
        .filter(path => !path.classList.contains('secondary'))
        .map(path => path.getAttribute('d'));
      const secondary = paths
        .filter(path => path.classList.contains('secondary'))
        .map(path => path.getAttribute('d'));

      const trunkVertices = primary.flatMap(parsePoints);
      const sitsOn = (vertices, [x, y]) => vertices.some(([vx, vy]) =>
        Math.abs(vx - x) <= 0.15 && Math.abs(vy - y) <= 0.15
      );

      const getTurnMetrics = (paths) => {
        let turnTotal = 0;
        let turnCount = 0;
        let sharpTurns = 0;
        let maxCoord = 0;

        for (const d of paths) {
          const points = parsePoints(d);
          let previousAngle = null;
          for (let i = 0; i < points.length; i++) {
            const [x, y] = points[i];
            maxCoord = Math.max(maxCoord, Math.abs(x), Math.abs(y));
            if (i === 0) continue;

            const angle = Math.atan2(
              points[i][1] - points[i - 1][1],
              points[i][0] - points[i - 1][0]
            );
            if (previousAngle !== null) {
              const turn = Math.abs(Math.atan2(
                Math.sin(angle - previousAngle),
                Math.cos(angle - previousAngle)
              ));
              turnTotal += turn;
              turnCount++;
              if (turn >= 0.55) sharpTurns++;
            }
            previousAngle = angle;
          }
        }

        return {
          meanTurn: turnCount ? turnTotal / turnCount : 0,
          sharpTurns,
          maxCoord,
          turnTotal,
          turnCount,
        };
      };

      // Cada path debe arrancar sobre un vertice de un path ANTERIOR (el
      // tronco, o la rama que lo genero). Contarse a si mismo no cuenta como
      // estar emparentado: asi el assert detecta un rayo realmente flotante.
      const priorVertices = trunkVertices.slice();
      let orphanBranches = 0;
      let deepBranches = 0;
      for (const d of secondary) {
        const points = parsePoints(d);
        if (!sitsOn(priorVertices, points[0])) orphanBranches++;
        if (!sitsOn(trunkVertices, points[0])) deepBranches++;
        priorVertices.push(...points);
      }

      // Estructura SVG valida: cada path dibuja al menos un segmento y no
      // contiene numeros no finitos.
      const invalidPaths = [...primary, ...secondary].filter((d) => {
        if (/NaN|undefined|Infinity/.test(d)) return true;
        const points = parsePoints(d);
        return points.length < 2 || points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y));
      }).length;
      const trunksNotFromCenter = primary.filter((d) => {
        const [x, y] = parsePoints(d)[0];
        return Math.abs(x) > 0.15 || Math.abs(y) > 0.15;
      }).length;
      const primaryMetrics = getTurnMetrics(primary);
      const secondaryMetrics = getTurnMetrics(secondary);
      const allMetrics = getTurnMetrics([...primary, ...secondary]);

      return {
        primaryCount: primary.length,
        secondaryCount: secondary.length,
        orphanBranches,
        deepBranches,
        invalidPaths,
        trunksNotFromCenter,
        meanTurn: primaryMetrics.meanTurn,
        sharpTurns: primaryMetrics.sharpTurns,
        maxCoord: allMetrics.maxCoord,
        turnTotal: primaryMetrics.turnTotal,
        turnCount: primaryMetrics.turnCount,
        secondaryMeanTurn: secondaryMetrics.meanTurn,
        secondaryTurnTotal: secondaryMetrics.turnTotal,
        secondaryTurnCount: secondaryMetrics.turnCount,
        signature: [...primary, ...secondary].join('|'),
      };
    };

    const first = sample();
    const second = sample();
    return {
      first,
      second,
      aggregate: {
        meanTurn: (first.turnTotal + second.turnTotal) /
          (first.turnCount + second.turnCount),
        sharpTurns: first.sharpTurns + second.sharpTurns,
        maxCoord: Math.max(first.maxCoord, second.maxCoord),
        secondaryMeanTurn: (first.secondaryTurnTotal + second.secondaryTurnTotal) /
          (first.secondaryTurnCount + second.secondaryTurnCount),
      },
    };
  });

  expect(samples.first.primaryCount).toBeGreaterThanOrEqual(6);
  expect(samples.first.secondaryCount).toBeGreaterThanOrEqual(4);
  expect(samples.first.invalidPaths).toBe(0);
  expect(samples.first.orphanBranches).toBe(0);
  expect(samples.first.trunksNotFromCenter).toBe(0);
  expect(samples.second.invalidPaths).toBe(0);
  expect(samples.second.orphanBranches).toBe(0);
  expect(samples.second.trunksNotFromCenter).toBe(0);
  // Al menos una de las dos descargas muestra un segundo nivel de bifurcacion.
  expect(Math.max(samples.first.deepBranches, samples.second.deepBranches)).toBeGreaterThanOrEqual(1);
  expect(samples.first.signature).not.toBe(samples.second.signature);
  expect.soft(
    samples.aggregate.meanTurn,
    `meanTurn=${samples.aggregate.meanTurn.toFixed(4)}`
  ).toBeGreaterThanOrEqual(0.25);
  expect.soft(
    samples.aggregate.sharpTurns,
    `sharpTurns=${samples.aggregate.sharpTurns}`
  ).toBeGreaterThanOrEqual(2);
  expect(samples.aggregate.maxCoord).toBeLessThanOrEqual(155);
  // Las ramas tambien deben ser caoticas: si se aplanaran en lineas rectas
  // el gate del tronco seguiria en verde.
  expect.soft(
    samples.aggregate.secondaryMeanTurn,
    `secondaryMeanTurn=${samples.aggregate.secondaryMeanTurn.toFixed(4)}`
  ).toBeGreaterThanOrEqual(0.09);
});
