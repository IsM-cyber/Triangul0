// ========== SISTEMA DE REGIONES INFINITAS ==========
const regionState = {
    loadedRegions: new Map(),
    lastUpdate: 0
};

function getRegionKey(x, y) {
    return `${x},${y}`;
}

function getRegionFromWorldCoords(worldX, worldY) {
    return {
        x: Math.floor(worldX / REGION_WIDTH),
        y: Math.floor(worldY / REGION_HEIGHT)
    };
}

function isRegionLoaded(regionX, regionY) {
    return regionState.loadedRegions.has(getRegionKey(regionX, regionY));
}

function loadRegion(regionX, regionY) {
    const regionKey = getRegionKey(regionX, regionY);
    
    if (regionState.loadedRegions.has(regionKey)) {
        return;
    }
    
    regionState.loadedRegions.set(regionKey, {
        x: regionX,
        y: regionY,
        loadedAt: Date.now()
    });
    
    const playerRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
    if (regionX === playerRegion.x && regionY === playerRegion.y) {
        gameState.exploredRegions.add(regionKey);
    }
    
    createRegionContent(regionX, regionY);
}

function getScaleFactorForRegion(regionX, regionY) {
    const distanceFromOrigin = Math.abs(regionX) + Math.abs(regionY);
    return 1.0 + (distanceFromOrigin * 0.5);
}

function createRegionContent(regionX, regionY) {
    const scaleFactor = getScaleFactorForRegion(regionX, regionY);
    
    if (gameState.centralRegionTemplate.obstacles.length === 0) {
        createCentralRegionTemplate();
    }
    
    const currentLevel = gameState.currentLevel;
    const regionColor = COLOR_SYSTEM.getColorForLevel(currentLevel);
    const regionColorString = COLOR_SYSTEM.rgbToString(regionColor);
    
    const regionBg = document.createElement('div');
    regionBg.className = 'region-bg';
    regionBg.style.cssText = `
        left:${regionX * REGION_WIDTH}px;
        top:${regionY * REGION_HEIGHT}px;
        width:${REGION_WIDTH}px;
        height:${REGION_HEIGHT}px;
        background-color:${regionColorString};
        transition:background-color ${COLOR_SYSTEM.TRANSITION_SPEED}s ease;
    `;
    worldContainer.appendChild(regionBg);
    
    gameState.regionBackgrounds.push({
        element: regionBg,
        regionX: regionX,
        regionY: regionY
    });
    
    gameState.centralRegionTemplate.obstacles.forEach(obstacleTemplate => {
        if (obstacleTemplate.isSlow) {
            createScaledObstacleFromTemplate(obstacleTemplate, regionX, regionY, scaleFactor);
        }
    });
    
    gameState.centralRegionTemplate.obstacles.forEach(obstacleTemplate => {
        if (obstacleTemplate.isBrickWall) {
            createBrickWallFromDefinition(obstacleTemplate, regionX, regionY, scaleFactor);
        }
    });
    
    gameState.centralRegionTemplate.obstacles.forEach(obstacleTemplate => {
        if (obstacleTemplate.isBlack) {
            createScaledObstacleFromTemplate(obstacleTemplate, regionX, regionY, scaleFactor);
        }
    });
    
    const enemyCount = Math.floor(Math.random() * 8) + 4;
    for (let i = 0; i < enemyCount; i++) {
        createEnemyInRegion('orange', regionX, regionY);
    }
    
    if (Math.random() < 0.3) {
        createEnemyInRegion('fuchsia', regionX, regionY);
    }
    
    const distanceFromCenter = Math.abs(regionX) + Math.abs(regionY);
    if (distanceFromCenter >= 2 && Math.random() < 0.1) {
        createEnemyInRegion('green', regionX, regionY);
    }
    
    createRegionVisuals(regionX, regionY);
}

function createBrickWallFromDefinition(wallDef, regionX, regionY, scaleFactor) {
    const bricks = BRICK_SYSTEM.createBricksFromWall(wallDef, regionX, regionY, scaleFactor);
    
    bricks.forEach(brickData => {
        const brick = document.createElement('div');
        brick.className = 'obstacle brick';
        brick.classList.add(wallDef.orientation);
        
        if (wallDef.wallType === 'principal') {
            brick.style.zIndex = '6';
        } else {
            brick.style.zIndex = '5';
        }
        
        const left = brickData.x - brickData.width / 2;
        const top = brickData.y - brickData.height / 2;
        
        brick.style.cssText = `width:${brickData.width}px;height:${brickData.height}px;left:${left}px;top:${top}px`;
        brick.style.backgroundColor = BRICK_SYSTEM.DAMAGE_COLORS[0];
        brick.classList.add('damaged-1');
        
        worldContainer.appendChild(brick);
        
        const brickObj = {
            element: brick,
            x: brickData.x,
            y: brickData.y,
            width: brickData.width,
            height: brickData.height,
            isBrick: true,
            isDestructible: true,
            health: brickData.health,
            isPrincipal: brickData.isPrincipal,
            orientation: brickData.orientation,
            left: left,
            top: top,
            right: left + brickData.width,
            bottom: top + brickData.height,
            regionX: regionX,
            regionY: regionY
        };
        
        gameState.obstacles.push(brickObj);
        obstacleGrid.addObstacle(brickObj);
    });
}

function createRegionVisuals(regionX, regionY) {
    const currentRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
    const distance = Math.abs(regionX - currentRegion.x) + Math.abs(regionY - currentRegion.y);
    
    if (distance <= 2) {
        const border = document.createElement('div');
        border.className = 'region-border';
        border.style.cssText = `
            left:${regionX * REGION_WIDTH}px;
            top:${regionY * REGION_HEIGHT}px;
            width:${REGION_WIDTH}px;
            height:${REGION_HEIGHT}px;
        `;
        worldContainer.appendChild(border);
    }
}

function createEnemyInRegion(type, regionX, regionY) {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        const worldX = regionX * REGION_WIDTH + Math.random() * (REGION_WIDTH - 40) + 20;
        const worldY = regionY * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 40) + 20;
        
        const distanceToPlayer = Math.sqrt((worldX - gameState.playerX)**2 + (worldY - gameState.playerY)**2);
        if (distanceToPlayer < 80) {
            attempts++;
            continue;
        }
        
        let positionValid = true;
        const enemyRadius = type === 'green' ? 80 : (type === 'fuchsia' ? 20 : 10);
        
        for (let obstacle of gameState.obstacles) {
            if (obstacle.isBlack || obstacle.isDestructible) {
                if (worldX + enemyRadius >= obstacle.left && worldX - enemyRadius <= obstacle.right && 
                    worldY + enemyRadius >= obstacle.top && worldY - enemyRadius <= obstacle.bottom) {
                    positionValid = false;
                    break;
                }
            }
        }
        
        if (!positionValid) {
            attempts++;
            continue;
        }
        
        let tooCloseToOtherEnemy = false;
        for (let existingEnemy of gameState.enemies) {
            const dx = worldX - existingEnemy.x;
            const dy = worldY - existingEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (enemyRadius + existingEnemy.radius + 15)) {
                tooCloseToOtherEnemy = true;
                break;
            }
        }
        
        if (tooCloseToOtherEnemy) {
            attempts++;
            continue;
        }
        
        const enemy = createEnemy(type, worldX, worldY);
        
        const playerRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
        if (regionX === playerRegion.x && regionY === playerRegion.y) {
            enemy.active = true;
        }
        
        return enemy;
    }
    
    const worldX = regionX * REGION_WIDTH + Math.random() * (REGION_WIDTH - 40) + 20;
    const worldY = regionY * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 40) + 20;
    const enemy = createEnemy(type, worldX, worldY);
    
    const playerRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
    if (regionX === playerRegion.x && regionY === playerRegion.y) {
        enemy.active = true;
    }
    
    return enemy;
}

function unloadRegion(regionX, regionY) {
    const regionKey = getRegionKey(regionX, regionY);
    const regionData = regionState.loadedRegions.get(regionKey);
    
    if (!regionData) return;
    
    gameState.enemies = gameState.enemies.filter(enemy => {
        const enemyRegion = getRegionFromWorldCoords(enemy.x, enemy.y);
        if (enemyRegion.x === regionX && enemyRegion.y === regionY) {
            if (enemy.type === 'green') {
                TENTACLE_SYSTEM.removeAllTentaclesForEnemy(enemy.id);
            }
            // Canvas guard: enemies rendered in canvas don't have DOM elements
            if (enemy.element && worldContainer.contains(enemy.element)) {
                enemy.element.remove();
            }
            return false;
        }
        return true;
    });
    
    gameState.obstacles = gameState.obstacles.filter(obstacle => {
        const obstacleRegion = getRegionFromWorldCoords(obstacle.x, obstacle.y);
        if (obstacleRegion.x === regionX && obstacleRegion.y === regionY) {
            // Canvas guard: some obstacles might not have DOM elements
            if (obstacle.element && worldContainer.contains(obstacle.element)) {
                obstacle.element.remove();
            }
            return false;
        }
        return true;
    });
    
    gameState.regionBackgrounds = gameState.regionBackgrounds.filter(bg => {
        if (bg.regionX === regionX && bg.regionY === regionY) {
            if (bg.element && worldContainer.contains(bg.element)) {
                bg.element.remove();
            }
            return false;
        }
        return true;
    });
    
    regionState.loadedRegions.delete(regionKey);
}

function unloadDistantRegions() {
    const currentRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
    
    for (const [regionKey, regionData] of regionState.loadedRegions) {
        const distanceX = Math.abs(regionData.x - currentRegion.x);
        const distanceY = Math.abs(regionData.y - currentRegion.y);
        
        if (distanceX > REGION_UNLOAD_DISTANCE || distanceY > REGION_UNLOAD_DISTANCE) {
            unloadRegion(regionData.x, regionData.y);
        }
    }
}

function updateDynamicLoading() {
    const now = Date.now();
    if (now - regionState.lastUpdate < 100) return;
    regionState.lastUpdate = now;
    
    const currentRegion = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
    
    const currentRegionKey = getRegionKey(currentRegion.x, currentRegion.y);
    if (!gameState.exploredRegions.has(currentRegionKey)) {
        gameState.exploredRegions.add(currentRegionKey);
    }
    
    for (let y = currentRegion.y - LOAD_RADIUS; y <= currentRegion.y + LOAD_RADIUS; y++) {
        for (let x = currentRegion.x - LOAD_RADIUS; x <= currentRegion.x + LOAD_RADIUS; x++) {
            loadRegion(x, y);
        }
    }
    
    unloadDistantRegions();
    updateEnemyActivity();
    
    if (gameState.levelUpdateCooldown <= 0) {
        updateWorldColorBasedOnLevel();
        gameState.levelUpdateCooldown = 10;
    } else {
        gameState.levelUpdateCooldown--;
    }
}

function updateEnemyActivity() {
    const playerRegionX = Math.floor(gameState.playerX / REGION_WIDTH);
    const playerRegionY = Math.floor(gameState.playerY / REGION_HEIGHT);
    
    gameState.enemies.forEach(enemy => {
        const enemyRegionX = Math.floor(enemy.x / REGION_WIDTH);
        const enemyRegionY = Math.floor(enemy.y / REGION_HEIGHT);
        
        const shouldBeActive = Math.abs(enemyRegionX - playerRegionX) <= 1 && 
                              Math.abs(enemyRegionY - playerRegionY) <= 1;
        
        enemy.active = shouldBeActive;
        
        if (enemy.element) {
            enemy.element.style.display = shouldBeActive ? 'block' : 'none';
        }
    });
}

function getActiveEnemies() {
    return gameState.enemies.filter(enemy => enemy.active);
}