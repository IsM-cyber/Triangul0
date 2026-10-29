const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  solveSweptCollision,
  sweepCircleAgainstObstacles,
  resolveCirclePenetration,
} = require('./collisionSystem');

function wall(left, top, right, bottom) {
  return { left, top, right, bottom, isBlack: true, isDestructible: false };
}

test('sweeps a circle into a thin wall and stops before penetration', () => {
  const result = sweepCircleAgainstObstacles(
    250, 300, 350, 300, 10,
    [wall(298, 200, 302, 400)]
  );

  assert.equal(result.collision, true);
  assert.ok(result.x >= 287.8 && result.x <= 288.1, `unexpected safe x: ${result.x}`);
  assert.equal(result.y, 300);
  assert.equal(result.obstacle.left, 298);
});

test('chooses the earliest wall when several obstacles are crossed', () => {
  const first = wall(298, 200, 302, 400);
  const second = wall(320, 200, 324, 400);
  const result = sweepCircleAgainstObstacles(250, 300, 350, 300, 10, [second, first]);

  assert.equal(result.collision, true);
  assert.ok(result.x < 302, `hit the later wall first: ${result.x}`);
  assert.equal(result.obstacle, first);
});

test('does not collide with a wall outside the swept path', () => {
  const result = sweepCircleAgainstObstacles(
    0, 0, 50, 50, 10,
    [wall(100, 100, 150, 150)]
  );

  assert.equal(result.collision, false);
  assert.equal(result.x, 50);
  assert.equal(result.y, 50);
});

test('resolves a circle already inside a wall without NaN', () => {
  const obstacle = wall(290, 290, 310, 310);
  const correction = resolveCirclePenetration(300, 300, 10, obstacle);

  assert.ok(correction);
  assert.ok(Number.isFinite(correction.x));
  assert.ok(Number.isFinite(correction.y));
  assert.ok(correction.x < 290 || correction.y < 290 || correction.x > 310 || correction.y > 310);

  const result = sweepCircleAgainstObstacles(300, 300, 350, 300, 10, [obstacle]);
  assert.ok(Number.isFinite(result.x));
  assert.ok(Number.isFinite(result.y));
  assert.notEqual(result.x, 350);
});

test('keeps the legacy helper contract while returning the safe position', () => {
  const result = solveSweptCollision(
    { prevX: 250, prevY: 300, nextX: 350, nextY: 300, radius: 10 },
    [wall(298, 200, 302, 400)]
  );

  assert.equal(result.collision, true);
  assert.ok(result.x < 302);
});

test('diagonal corner approach uses the exact contact distance', () => {
  // A square wall from 100,100 to 150,150.
  // A circle of radius 10 at 80,80 moving towards 120,120 first touches
  // the top-left corner at approximately (92.93, 92.93).
  const obstacle = wall(100, 100, 150, 150);
  const result = sweepCircleAgainstObstacles(80, 80, 120, 120, 10, [obstacle]);

  // An expanded-AABB approximation would report the false contact at
  // (90,90); the analytic face/corner solver should report ~92.93.
  assert.ok(result.x > 90, `contact must be later than the expanded AABB: ${result.x}`);
  assert.ok(result.x < 94, `should be close to 93, but was ${result.x}`);
});

test('zero-radius corner contact keeps finite hit coordinates', () => {
  const result = sweepCircleAgainstObstacles(
    -1, -1, 20, 20, 0,
    [wall(0, 0, 10, 10)]
  );

  assert.equal(result.collision, true);
  assert.ok(Number.isFinite(result.hitX));
  assert.ok(Number.isFinite(result.hitY));
});
