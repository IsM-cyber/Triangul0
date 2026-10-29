// collisionSystem.js
// Pure swept collision helpers shared by the browser game and Node tests.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.CollisionSystem = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const EPSILON = 1e-6;
    const SAFE_T_EPSILON = 1e-4;

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function getObstacleBounds(obstacle) {
        if (!obstacle) return null;

        if ([obstacle.left, obstacle.top, obstacle.right, obstacle.bottom].every(isFiniteNumber)) {
            return {
                left: obstacle.left,
                top: obstacle.top,
                right: obstacle.right,
                bottom: obstacle.bottom,
            };
        }

        if ([obstacle.x, obstacle.y, obstacle.width, obstacle.height].every(isFiniteNumber)) {
            return {
                left: obstacle.x - obstacle.width / 2,
                top: obstacle.y - obstacle.height / 2,
                right: obstacle.x + obstacle.width / 2,
                bottom: obstacle.y + obstacle.height / 2,
            };
        }

        return null;
    }

    // Slab test for a segment intersecting an axis-aligned rectangle.
    // Returns the normalized entry time in [0, 1], or -1 when there is no hit.
    function segmentRectEnterTime(prevX, prevY, x, y, left, top, right, bottom) {
        if (![prevX, prevY, x, y, left, top, right, bottom].every(isFiniteNumber)) {
            return -1;
        }

        let tEnter = 0;
        let tExit = 1;
        const dx = x - prevX;
        const dy = y - prevY;

        if (dx === 0) {
            if (prevX < left || prevX > right) return -1;
        } else {
            let t1 = (left - prevX) / dx;
            let t2 = (right - prevX) / dx;
            if (t1 > t2) {
                const swap = t1;
                t1 = t2;
                t2 = swap;
            }
            if (t1 > tEnter) tEnter = t1;
            if (t2 < tExit) tExit = t2;
            if (tEnter > tExit) return -1;
        }

        if (dy === 0) {
            if (prevY < top || prevY > bottom) return -1;
        } else {
            let t1 = (top - prevY) / dy;
            let t2 = (bottom - prevY) / dy;
            if (t1 > t2) {
                const swap = t1;
                t1 = t2;
                t2 = swap;
            }
            if (t1 > tEnter) tEnter = t1;
            if (t2 < tExit) tExit = t2;
            if (tEnter > tExit) return -1;
        }

        if (tExit < 0 || tEnter > 1) return -1;
        return Math.max(0, Math.min(tEnter, 1));
    }

    // Resolve a circle that is already overlapping a solid rectangle.
    // The result is a corrected center position, or null when no correction is needed.
    function resolveCirclePenetration(x, y, radius, obstacle) {
        if (![x, y, radius].every(isFiniteNumber) || radius < 0) return null;
        const bounds = getObstacleBounds(obstacle);
        if (!bounds) return null;

        const closestX = Math.max(bounds.left, Math.min(x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(y, bounds.bottom));
        const dx = x - closestX;
        const dy = y - closestY;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = radius * radius;

        if (distanceSquared > radiusSquared) return null;

        if (distanceSquared > EPSILON * EPSILON) {
            const distance = Math.sqrt(distanceSquared);
            const correction = radius - distance + EPSILON;
            return {
                x: x + (dx / distance) * correction,
                y: y + (dy / distance) * correction,
            };
        }

        // The center is inside the rectangle (or exactly on an edge). Choose the
        // nearest face so the correction is deterministic and never produces NaN.
        const faces = [
            { distance: x - bounds.left, normalX: -1, normalY: 0 },
            { distance: bounds.right - x, normalX: 1, normalY: 0 },
            { distance: y - bounds.top, normalX: 0, normalY: -1 },
            { distance: bounds.bottom - y, normalX: 0, normalY: 1 },
        ];
        let nearest = faces[0];
        for (let i = 1; i < faces.length; i++) {
            if (faces[i].distance < nearest.distance) nearest = faces[i];
        }

        const correction = nearest.distance + radius + EPSILON;
        return {
            x: x + nearest.normalX * correction,
            y: y + nearest.normalY * correction,
        };
    }

    function sweepCircleAgainstObstacle(prevX, prevY, x, y, radius, obstacle) {
        if (![prevX, prevY, x, y, radius].every(isFiniteNumber) || radius < 0) return null;
        const bounds = getObstacleBounds(obstacle);
        if (!bounds) return null;

        const dx = x - prevX;
        const dy = y - prevY;
        const a = dx * dx + dy * dy;

        let bestT = 1.1;
        let bestNormal = null;

        // Check faces
        // If moving right (dx > 0), can hit left side (bounds.left - radius)
        if (dx > 0) {
            const t = (bounds.left - radius - prevX) / dx;
            if (t >= 0 && t < bestT) {
                const hitY = prevY + t * dy;
                if (hitY >= bounds.top && hitY <= bounds.bottom) {
                    bestT = t;
                    bestNormal = { x: -1, y: 0 };
                }
            }
        }
        // If moving left (dx < 0), can hit right side (bounds.right + radius)
        if (dx < 0) {
            const t = (bounds.right + radius - prevX) / dx;
            if (t >= 0 && t < bestT) {
                const hitY = prevY + t * dy;
                if (hitY >= bounds.top && hitY <= bounds.bottom) {
                    bestT = t;
                    bestNormal = { x: 1, y: 0 };
                }
            }
        }
        // If moving down (dy > 0), can hit top side (bounds.top - radius)
        if (dy > 0) {
            const t = (bounds.top - radius - prevY) / dy;
            if (t >= 0 && t < bestT) {
                const hitX = prevX + t * dx;
                if (hitX >= bounds.left && hitX <= bounds.right) {
                    bestT = t;
                    bestNormal = { x: 0, y: -1 };
                }
            }
        }
        // If moving up (dy < 0), can hit bottom side (bounds.bottom + radius)
        if (dy < 0) {
            const t = (bounds.bottom + radius - prevY) / dy;
            if (t >= 0 && t < bestT) {
                const hitX = prevX + t * dx;
                if (hitX >= bounds.left && hitX <= bounds.right) {
                    bestT = t;
                    bestNormal = { x: 0, y: 1 };
                }
            }
        }

        // Check corners
        if (a > 0) {
            const corners = [
                { x: bounds.left, y: bounds.top },
                { x: bounds.right, y: bounds.top },
                { x: bounds.left, y: bounds.bottom },
                { x: bounds.right, y: bounds.bottom },
            ];

            for (const corner of corners) {
                const ocX = prevX - corner.x;
                const ocY = prevY - corner.y;
                const b = 2 * (dx * ocX + dy * ocY);
                const c = ocX * ocX + ocY * ocY - radius * radius;
                const discriminant = b * b - 4 * a * c;

                if (discriminant >= 0) {
                    const sqrtD = Math.sqrt(discriminant);
                    const t = (-b - sqrtD) / (2 * a);
                    if (t >= 0 && t < bestT) {
                        const hitX = prevX + t * dx;
                        const hitY = prevY + t * dy;
                        bestT = t;
                        bestNormal = { x: (hitX - corner.x) / radius, y: (hitY - corner.y) / radius };
                    }
                }
            }
        }

        if (bestT > 1) return null;

        const hitX = prevX + bestT * dx;
        const hitY = prevY + bestT * dy;
        const safeT = bestT > 0 ? Math.max(0, bestT - SAFE_T_EPSILON) : 0;

        return {
            obstacle,
            t: bestT,
            hitX,
            hitY,
            normalX: bestNormal.x,
            normalY: bestNormal.y,
            safeX: prevX + safeT * dx,
            safeY: prevY + safeT * dy,
        };
    }

    // Move a circle from its previous center to its requested center. The
    // analytic face/corner test covers the whole segment, so a fast entity
    // cannot jump over a thin wall between two frames.
    function sweepCircleAgainstObstacles(prevX, prevY, x, y, radius, obstacles) {
        if (![prevX, prevY, x, y, radius].every(isFiniteNumber) || radius < 0) {
            return { x, y, collision: false, obstacle: null };
        }

        const uniqueObstacles = [];
        const seen = new Set();
        for (const obstacle of obstacles || []) {
            if (!obstacle || seen.has(obstacle)) continue;
            seen.add(obstacle);
            uniqueObstacles.push(obstacle);
        }

        let currentX = prevX;
        let currentY = prevY;
        let initialCollision = null;

        // Correct an already-overlapping start before sweeping. A second pass
        // handles two adjacent walls without leaving the entity between them.
        for (let pass = 0; pass < 2; pass++) {
            let corrected = false;
            for (const obstacle of uniqueObstacles) {
                const correction = resolveCirclePenetration(currentX, currentY, radius, obstacle);
                if (!correction) continue;
                if (!initialCollision) {
                    initialCollision = {
                        obstacle,
                        t: 0,
                        hitX: currentX,
                        hitY: currentY,
                        safeX: correction.x,
                        safeY: correction.y,
                    };
                }
                currentX = correction.x;
                currentY = correction.y;
                corrected = true;
            }
            if (!corrected) break;
        }

        let firstHit = null;
        for (const obstacle of uniqueObstacles) {
            const hit = sweepCircleAgainstObstacle(
                currentX,
                currentY,
                x,
                y,
                radius,
                obstacle
            );
            if (hit && (!firstHit || hit.t < firstHit.t)) firstHit = hit;
        }

        if (firstHit) {
            return {
                x: firstHit.safeX,
                y: firstHit.safeY,
                collision: true,
                obstacle: firstHit.obstacle,
                t: firstHit.t,
                hitX: firstHit.hitX,
                hitY: firstHit.hitY,
            };
        }

        return {
            x,
            y,
            collision: Boolean(initialCollision),
            obstacle: initialCollision ? initialCollision.obstacle : null,
            t: initialCollision ? 0 : null,
            hitX: initialCollision ? initialCollision.hitX : null,
            hitY: initialCollision ? initialCollision.hitY : null,
        };
    }

    // Compatibility wrapper for the original helper shape used by the project.
    function solveSweptCollision(entity, obstacles) {
        const prevX = entity.prevX ?? entity.x;
        const prevY = entity.prevY ?? entity.y;
        const nextX = entity.nextX ?? entity.x;
        const nextY = entity.nextY ?? entity.y;
        return sweepCircleAgainstObstacles(
            prevX,
            prevY,
            nextX,
            nextY,
            entity.radius,
            obstacles
        );
    }

    return {
        getObstacleBounds,
        segmentRectEnterTime,
        resolveCirclePenetration,
        sweepCircleAgainstObstacle,
        sweepCircleAgainstObstacles,
        solveSweptCollision,
    };
});
