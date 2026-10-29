const { test, expect } = require('@playwright/test');

test('el jugador y los enemigos no atraviesan paredes finas', async ({ page }) => {
  const errores = [];
  page.on('pageerror', error => errores.push(String(error)));

  await page.goto('/');
  await page.click('#start-button');
  await page.waitForFunction(() => {
    return typeof CollisionSystem !== 'undefined' &&
      typeof checkPlayerCollisionAtPosition === 'function' &&
      typeof detectPlayerObstacleCollision === 'function' &&
      typeof detectEnemyCollisions === 'function' &&
      typeof detectObstacleCollisions === 'function' &&
      gameState.gameStarted === true;
  });

  const result = await page.evaluate(() => {
    gameState.gameActive = false;
    gameState.mergingEnemies = false;
    gameState.obstacles = [];
    obstacleGrid.clear();

    const wall = {
      x: 300,
      y: 300,
      width: 4,
      height: 200,
      left: 298,
      right: 302,
      top: 200,
      bottom: 400,
      isBlack: true,
      isDestructible: false,
      isBrick: false,
    };
    gameState.obstacles.push(wall);
    obstacleGrid.addObstacle(wall);

    gameState.playerX = 250;
    gameState.playerY = 300;
    const playerCheck = checkPlayerCollisionAtPosition(350, 300, 250, 300);

    gameState.playerX = 350;
    gameState.playerY = 300;
    detectPlayerObstacleCollision(250, 300);
    const player = { x: gameState.playerX, y: gameState.playerY };

    const enemy = {
      id: 'collision-test-enemy',
      type: 'orange',
      x: 250,
      y: 300,
      radius: 10,
      speedX: 100,
      speedY: 0,
      active: true,
      prevX: 250,
      prevY: 300,
      slowZonesCount: 0,
      element: null,
      merging: false,
    };
    gameState.enemies = [enemy];
    gameState.currentEnemyCount = 1;
    detectEnemyCollisions();
    detectObstacleCollisions();

    // A stationary entity outside the wall must not be pushed by a stale
    // previous frame coordinate.
    gameState.playerX = 250;
    gameState.playerY = 300;
    detectPlayerObstacleCollision(250, 300);
    const stationaryPlayer = { x: gameState.playerX, y: gameState.playerY };

    // An entity that starts inside a wall must be resolved without NaN.
    gameState.playerX = 300;
    gameState.playerY = 300;
    detectPlayerObstacleCollision(300, 300);
    const initialPenetration = { x: gameState.playerX, y: gameState.playerY };

    // Turbo uses the same swept check in each substep. Give it enough speed
    // that the first substep would otherwise cross the 4px wall.
    gameState.gameActive = true;
    gameState.playerX = 250;
    gameState.playerY = 300;
    gameState.playerSpeed = 100;
    gameState.turboAngle = 0;
    gameState.turboActive = true;
    gameState.turboRunning = true;
    gameState.turboMode = true;
    gameState.rubbleEffectActive = false;
    gameState.playerSlowZonesCount = 0;
    updatePlayerPosition();
    const turbo = {
      x: gameState.playerX,
      y: gameState.playerY,
      active: gameState.turboActive,
    };
    gameState.gameActive = false;

    // Directed knockback must stop at the wall as well.
    gameState.gameActive = true;
    gameState.playerX = 285;
    gameState.playerY = 300;
    DIRECTED_CORPSE_SYSTEM.createDirectedKnockback(
      285,
      300,
      { x: 250, y: 300 },
      true
    );
    const knockback = { x: gameState.playerX, y: gameState.playerY };
    gameState.gameActive = false;

    return {
      playerCheck,
      player,
      enemy: { x: enemy.x, y: enemy.y },
      stationaryPlayer,
      initialPenetration,
      turbo,
      knockback,
    };
  });

  expect(result.playerCheck.collided).toBe(true);
  expect(result.player.x).toBeLessThan(290.01);
  expect(result.player.x).toBeGreaterThan(289.9);
  expect(result.enemy.x).toBeLessThan(288);
  expect(result.enemy.x).toBeGreaterThan(287.9);
  expect(result.stationaryPlayer).toEqual({ x: 250, y: 300 });
  expect(Number.isFinite(result.initialPenetration.x)).toBe(true);
  expect(Number.isFinite(result.initialPenetration.y)).toBe(true);
  expect(result.initialPenetration.x < 298 || result.initialPenetration.x > 302).toBe(true);
  expect(result.turbo.x).toBeLessThan(290.01);
  expect(result.turbo.x).toBeGreaterThan(289.9);
  expect(result.turbo.active).toBe(false);
  expect(result.knockback.x).toBeLessThan(290.01);
  expect(result.knockback.x).toBeGreaterThanOrEqual(285);
  expect(result.knockback.y).toBe(300);
  expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
});
