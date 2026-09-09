// ========== PHYSICS WORKER v3 - ESCALABLE ==========
// Uses transferable Float32Array (zero-copy) + Spatial Hash broadphase
// Designed for 1000+ entities

// ========== CONSTANTS (must match main thread) ==========
const REGION_WIDTH = 600;
const REGION_HEIGHT = 600;
const CELL_SIZE = 100; // Spatial hash cell size
const ENEMY_BASE_SPEED = 0.8;
const ENEMY_FUSCHIA_SPEED = 1.2;
const ENEMY_GREEN_SPEED = 0.4;
const ENEMY_GREEN_RADIUS = 80;

// ========== SPATIAL HASH ==========
class SpatialHash {
    constructor(cellSize = CELL_SIZE) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }
    
    clear() {
        this.cells.clear();
    }
    
    getKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }
    
    insert(entity) {
        const key = this.getKey(entity.x, entity.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
    }
    
    getNearby(x, y, radius = 0) {
        const key = this.getKey(x, y);
        const results = [];
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const range = Math.ceil(radius / this.cellSize);
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const neighborKey = `${cx + dx},${cy + dy}`;
                const cell = this.cells.get(neighborKey);
                if (cell) results.push(...cell);
            }
        }
        return results;
    }
    
    getAll() {
        const all = [];
        for (const cell of this.cells.values()) {
            all.push(...cell);
        }
        return all;
    }
}

// ========== WORKER STATE ==========
let spatialHash = new SpatialHash(CELL_SIZE);
let obstacleBuffer = null; // Float32Array [left, right, top, bottom, isBlack, isDestructible] * count
let obstacleCount = 0;

// ========== HELPERS ==========
function getBaseSpeed(type) {
    switch (type) {
        case 'fuchsia': return ENEMY_FUSCHIA_SPEED;
        case 'green': return ENEMY_GREEN_SPEED;
        default: return ENEMY_BASE_SPEED;
    }
}

function distanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

// ========== PHYSICS STEP ==========
function physicsStep(data) {
    const {
        // Enemy arrays (transferable Float32Array)
        enemyCount,
        enemyX, enemyY, enemySpeedX, enemySpeedY,
        enemyRadius, enemyType, enemyActive, enemyMerging,
        enemySlowZonesCount, enemyRegionX, enemyRegionY,
        enemyPrevX, enemyPrevY,
        
        // Projectile arrays
        projectileCount,
        projX, projY, projActive, projDamage, projRadius,
        
        // Player
        playerX, playerY, playerRadius,
        
        // Obstacles (from shared buffer)
        obstacleCount: obsCount,
        
        // Timing
        deltaTime
    } = data;
    
    // Rebuild spatial hash
    spatialHash.clear();
    
    // Insert active enemies into spatial hash
    const activeEnemies = [];
    for (let i = 0; i < enemyCount; i++) {
        if (enemyActive[i]) {
            const enemy = {
                index: i,
                x: enemyX[i],
                y: enemyY[i],
                speedX: enemySpeedX[i],
                speedY: enemySpeedY[i],
                radius: enemyRadius[i],
                type: enemyType[i],
                merging: enemyMerging[i],
                slowZonesCount: enemySlowZonesCount[i],
                regionX: enemyRegionX[i],
                regionY: enemyRegionY[i],
                prevX: enemyPrevX[i],
                prevY: enemyPrevY[i]
            };
            activeEnemies.push(enemy);
            spatialHash.insert(enemy);
        }
    }
    
    // 1. UPDATE POSITIONS (seek player)
    for (const enemy of activeEnemies) {
        if (enemy.merging) continue;
        
        let speedFactor = 1;
        if (enemy.slowZonesCount > 0) {
            speedFactor = Math.pow(0.5, enemy.slowZonesCount);
        }
        
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            const baseSpeed = getBaseSpeed(enemy.type);
            const angle = Math.atan2(dy, dx);
            const randomAngle = (Math.random() - 0.5) * 0.5;
            
            enemy.speedX = Math.cos(angle + randomAngle) * baseSpeed * speedFactor;
            enemy.speedY = Math.sin(angle + randomAngle) * baseSpeed * speedFactor;
        }
        
        enemy.prevX = enemy.x;
        enemy.prevY = enemy.y;
        enemy.x += enemy.speedX * deltaTime * 60;
        enemy.y += enemy.speedY * deltaTime * 60;
        enemy.regionX = Math.floor(enemy.x / REGION_WIDTH);
        enemy.regionY = Math.floor(enemy.y / REGION_HEIGHT);
    }
    
    // Rebuild spatial hash after movement
    spatialHash.clear();
    for (const enemy of activeEnemies) {
        spatialHash.insert(enemy);
    }
    
    // 2. ENEMY-ENEMY COLLISION (spatial hash broadphase)
    for (const enemyA of activeEnemies) {
        const nearby = spatialHash.getNearby(enemyA.x, enemyA.y, enemyA.radius * 2);
        
        for (const enemyB of nearby) {
            if (enemyA.index >= enemyB.index) continue; // avoid duplicate pairs
            
            const dx = enemyB.x - enemyA.x;
            const dy = enemyB.y - enemyA.y;
            const distSq = dx * dx + dy * dy;
            const minDist = enemyA.radius + enemyB.radius;
            
            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                
                const totalMass = enemyA.radius + enemyB.radius;
                enemyA.x -= nx * overlap * (enemyB.radius / totalMass);
                enemyA.y -= ny * overlap * (enemyB.radius / totalMass);
                enemyB.x += nx * overlap * (enemyA.radius / totalMass);
                enemyB.y += ny * overlap * (enemyA.radius / totalMass);
            }
        }
    }
    
    // 3. ENEMY-OBSTACLE COLLISION
    for (const enemy of activeEnemies) {
        for (let o = 0; o < obsCount; o++) {
            const idx = o * 6;
            const left = obstacleBuffer[idx];
            const right = obstacleBuffer[idx + 1];
            const top = obstacleBuffer[idx + 2];
            const bottom = obstacleBuffer[idx + 3];
            const isBlack = obstacleBuffer[idx + 4];
            const isDestructible = obstacleBuffer[idx + 5];
            
            if (!isBlack && !isDestructible) continue;
            
            const closestX = Math.max(left, Math.min(enemy.x, right));
            const closestY = Math.max(top, Math.min(enemy.y, bottom));
            const dx = enemy.x - closestX;
            const dy = enemy.y - closestY;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < enemy.radius * enemy.radius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = enemy.radius - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                enemy.x += nx * overlap * 1.1;
                enemy.y += ny * overlap * 1.1;
            }
        }
    }
    
    // 4. PROJECTILE-ENEMY COLLISION (spatial hash)
    const projectileHits = [];
    
    for (let p = 0; p < projectileCount; p++) {
        if (!projActive[p]) continue;
        
        const nearby = spatialHash.getNearby(projX[p], projY[p], projRadius[p] + 80);
        
        for (const enemy of nearby) {
            const dx = projX[p] - enemy.x;
            const dy = projY[p] - enemy.y;
            const distSq = dx * dx + dy * dy;
            const hitDist = enemy.radius + projRadius[p];
            
            if (distSq < hitDist * hitDist) {
                projectileHits.push({
                    projectileIndex: p,
                    enemyIndex: enemy.index,
                    damage: projDamage[p]
                });
                break; // one hit per projectile
            }
        }
    }
    
    // 5. PLAYER-ENEMY COLLISION
    const playerHits = [];
    const playerHitDistSq = (playerRadius + 80) * (playerRadius + 80); // broadphase radius
    const nearbyPlayer = spatialHash.getNearby(playerX, playerY, playerRadius + 80);
    
    for (const enemy of nearbyPlayer) {
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const distSq = dx * dx + dy * dy;
        const collisionDist = playerRadius + enemy.radius;
        
        if (distSq < collisionDist * collisionDist) {
            playerHits.push({
                enemyIndex: enemy.index,
                enemyType: enemy.type
            });
        }
    }
    
    // Prepare output arrays (transferable)
    const positionUpdates = new Float32Array(activeEnemies.length * 8); // x, y, speedX, speedY, prevX, prevY, regionX, regionY
    for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        const base = i * 8;
        positionUpdates[base] = e.x;
        positionUpdates[base + 1] = e.y;
        positionUpdates[base + 2] = e.speedX;
        positionUpdates[base + 3] = e.speedY;
        positionUpdates[base + 4] = e.prevX;
        positionUpdates[base + 5] = e.prevY;
        positionUpdates[base + 6] = e.regionX;
        positionUpdates[base + 7] = e.regionY;
    }
    
    // Pack hits into simple arrays for transfer
    const projHitCount = projectileHits.length;
    const projHitData = new Int32Array(projHitCount * 3); // projectileIndex, enemyIndex, damage
    for (let i = 0; i < projHitCount; i++) {
        const h = projectileHits[i];
        projHitData[i * 3] = h.projectileIndex;
        projHitData[i * 3 + 1] = h.enemyIndex;
        projHitData[i * 3 + 2] = h.damage;
    }
    
    const playerHitCount = playerHits.length;
    const playerHitData = new Int32Array(playerHitCount * 2); // enemyIndex, typeCode (0=orange,1=fuchsia,2=green)
    for (let i = 0; i < playerHitCount; i++) {
        const h = playerHits[i];
        playerHitData[i * 2] = h.enemyIndex;
        playerHitData[i * 2 + 1] = h.enemyType === 'green' ? 2 : (h.enemyType === 'fuchsia' ? 1 : 0);
    }
    
    // Transfer ownership of buffers to main thread
    return {
        positionUpdates,
        projHitData,
        projHitCount,
        playerHitData,
        playerHitCount
    };
}

// ========== MESSAGE HANDLER ==========
self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    switch (type) {
        case 'init':
            // Receive obstacle buffer as transferable
            obstacleBuffer = payload.obstacleBuffer;
            obstacleCount = payload.obstacleCount;
            break;
            
        case 'step':
            const result = physicsStep(payload);
            // Transfer buffers back (zero-copy)
            self.postMessage(
                { type: 'result', payload: result },
                [result.positionUpdates.buffer, result.projHitData.buffer, result.playerHitData.buffer]
            );
            break;
            
        case 'setObstacles':
            obstacleBuffer = payload.obstacleBuffer;
            obstacleCount = payload.obstacleCount;
            break;
    }
};