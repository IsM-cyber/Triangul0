// ========== FUNCIONES DEL JUEGO ==========

function calculateDirectionalSpeed(moveAngle, lookAngle) {
    let angleDiff = Math.abs(moveAngle - lookAngle);
    
    if (angleDiff > Math.PI) {
        angleDiff = (2 * Math.PI) - angleDiff;
    }
    
    let angleDeg = angleDiff * (180 / Math.PI);
    let baseSpeed = gameState.playerSpeed;
    let speedMultiplier;
    
    if (angleDeg <= 45) {
        speedMultiplier = 1.5 - (angleDeg / 45) * 0.5;
    } else if (angleDeg <= 135) {
        const t = (angleDeg - 45) / 90;
        speedMultiplier = 1.0 - t * 0.5;
    } else {
        const t = (angleDeg - 135) / 45;
        speedMultiplier = 0.5 + t * 0.25;
    }
    
    return baseSpeed * speedMultiplier;
}

function checkPlayerCollisionAtPosition(x, y) {
    const playerRadius = 12;
    
    // Spatial hash: solo obstáculos cerca de la posición (antes barría los ~3000)
    const nearby = obstacleGrid.getNearbyObstacles(x, y, 100);
    for (let obstacle of nearby) {
        if (!obstacle.isBlack && !obstacle.isDestructible) continue;
        
        const closestX = Math.max(obstacle.left, Math.min(x, obstacle.right));
        const closestY = Math.max(obstacle.top, Math.min(y, obstacle.bottom));
        const dx = x - closestX;
        const dy = y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < playerRadius) {
            return { collided: true, obstacle: obstacle, distance: distance, dx: dx, dy: dy };
        }
    }
    
    return { collided: false };
}

function updateHealthBar() {
    if (!healthBar) return;
    const healthPercent = (gameState.playerLives / MAX_LIVES) * 100;
    healthBar.style.width = `${healthPercent}%`;
    healthBar.style.transform = 'scale(1.05)';
    setTimeout(() => {
        if (healthBar) healthBar.style.transform = 'scale(1)';
    }, 200);
}

function updateTurboBar() {
    if (!turboBar) return;
    const turboPercent = (gameState.turboCurrent / gameState.turboMax) * 100;
    turboBar.style.width = `${turboPercent}%`;
    
    if (turboPercent > 50) {
        turboBar.style.background = 'linear-gradient(to right, #ffcc00, #ff9900)';
    } else if (turboPercent > 20) {
        turboBar.style.background = 'linear-gradient(to right, #ff9900, #ff6600)';
    } else {
        turboBar.style.background = 'linear-gradient(to right, #ff6600, #ff3300)';
    }
}

function updateTurbo() {
    const now = Date.now();
    const deltaTime = (now - gameState.lastTurboUpdate) / 1000;
    gameState.lastTurboUpdate = now;
    
    if (gameState.turboRunning) {
        if (gameState.turboCurrent > 0) {
            gameState.turboCurrent -= gameState.turboDepletionRate * deltaTime;
            if (gameState.turboCurrent <= 0) {
                gameState.turboCurrent = 0;
                gameState.turboRunning = false;
                gameState.turboActive = false;
                gameState.turboMode = false;
                player.classList.remove('turbo-active');
            }
        } else {
            gameState.turboRunning = false;
            gameState.turboActive = false;
            gameState.turboMode = false;
            player.classList.remove('turbo-active');
        }
    } else {
        if (gameState.turboCurrent < gameState.turboMax) {
            gameState.turboCurrent += gameState.turboRechargeRate * deltaTime;
            if (gameState.turboCurrent > gameState.turboMax) {
                gameState.turboCurrent = gameState.turboMax;
            }
        }
    }
    
    updateTurboBar();
}

function formatScore(score) {
    return score.toString().padStart(4, '0');
}

function updateScoreDisplay() {
    if (scoreDisplay) scoreDisplay.textContent = formatScore(gameState.score);
}

function updateCamera() {
    gameState.cameraX = gameState.playerX - REGION_WIDTH / 2;
    gameState.cameraY = gameState.playerY - REGION_HEIGHT / 2;
    
    worldContainer.style.transform = `translate(${-gameState.cameraX}px, ${-gameState.cameraY}px)`;
    updateCurrentRegion();
    // El minimap se actualiza de forma cacheada (solo se reconstruye al cambiar de región)
    updateMinimapCached();
}

// Caché para el minimap: las 26 celdas (25 regiones + jugador) se construyen
// UNA SOLA VEZ y se reutilizan. Evita reconstruir el DOM del minimap cada frame
// (que mataba `innerHTML` y recreaba ~26 nodos 60 veces/segundo = reflow continuo).
let minimapRegionCache = null;   // { centerX, centerY, elements: [divs...] }
let minimapPlayerEl = null;      // div del indicador del jugador (se mueve a mano)

function updateMinimapCached() {
    if (!gameState.minimapVisible || !minimap) return;
    
    const centerX = gameState.currentRegionX;
    const centerY = gameState.currentRegionY;
    
    // 1) Reconstruir las 25 regiones SOLO si cambió la región central
    if (!minimapRegionCache || minimapRegionCache.centerX !== centerX || minimapRegionCache.centerY !== centerY) {
        // Limpiar todo y reconstruir las regiones fijas
        minimap.innerHTML = '';
        
        const regionEls = [];
        for (let y = centerY - 2; y <= centerY + 2; y++) {
            for (let x = centerX - 2; x <= centerX + 2; x++) {
                const region = document.createElement('div');
                region.className = 'minimap-region';
                region.style.cssText = `
                    width:20px;
                    height:20px;
                    left:${(x - (centerX - 2)) * 22 + 10}px;
                    top:${(y - (centerY - 2)) * 22 + 10}px;
                `;
                
                if (x === centerX && y === centerY) {
                    region.classList.add('active');
                }
                
                if (isRegionLoaded(x, y)) {
                    region.style.backgroundColor = 'rgba(12,192,223,0.3)';
                }
                
                minimap.appendChild(region);
                regionEls.push({ region, x, y });
            }
        }
        
        // Crear (o re-crear) el indicador del jugador al final (queda encima de las regiones)
        minimapPlayerEl = document.createElement('div');
        minimapPlayerEl.className = 'minimap-player';
        minimap.appendChild(minimapPlayerEl);
        
        // Guardar caché
        minimapRegionCache = {
            centerX, centerY,
            elements: regionEls
        };
    }
    
    // 2) Posicionar el indicador del jugador (se mueve cada frame, barato: un solo style)
    if (!minimapPlayerEl || !minimap.contains(minimapPlayerEl)) {
        minimapPlayerEl = document.createElement('div');
        minimapPlayerEl.className = 'minimap-player';
        minimap.appendChild(minimapPlayerEl);
    }
    const playerRelX = (gameState.playerX % REGION_WIDTH) / REGION_WIDTH;
    const playerRelY = (gameState.playerY % REGION_HEIGHT) / REGION_HEIGHT;
    minimapPlayerEl.style.left = `${(2 * 22 + 10) + playerRelX * 20}px`;
    minimapPlayerEl.style.top = `${(2 * 22 + 10) + playerRelY * 20}px`;
}

function updateCurrentRegion() {
    const regionX = Math.floor(gameState.playerX / REGION_WIDTH);
    const regionY = Math.floor(gameState.playerY / REGION_HEIGHT);
    gameState.currentRegionX = regionX;
    gameState.currentRegionY = regionY;
}

function updateMinimap() {
    if (!gameState.minimapVisible || !minimap) return;
    minimap.innerHTML = '';
    
    const centerX = gameState.currentRegionX;
    const centerY = gameState.currentRegionY;
    
    for (let y = centerY - 2; y <= centerY + 2; y++) {
        for (let x = centerX - 2; x <= centerX + 2; x++) {
            const region = document.createElement('div');
            region.className = 'minimap-region';
            region.style.cssText = `
                width:20px;
                height:20px;
                left:${(x - (centerX - 2)) * 22 + 10}px;
                top:${(y - (centerY - 2)) * 22 + 10}px;
            `;
            
            if (x === centerX && y === centerY) {
                region.classList.add('active');
            }
            
            if (isRegionLoaded(x, y)) {
                region.style.backgroundColor = 'rgba(12,192,223,0.3)';
            }
            
            minimap.appendChild(region);
        }
    }
    
    const playerIndicator = document.createElement('div');
    playerIndicator.className = 'minimap-player';
    
    const playerRelX = (gameState.playerX % REGION_WIDTH) / REGION_WIDTH;
    const playerRelY = (gameState.playerY % REGION_HEIGHT) / REGION_HEIGHT;
    
    playerIndicator.style.left = `${(2 * 22 + 10) + playerRelX * 20}px`;
    playerIndicator.style.top = `${(2 * 22 + 10) + playerRelY * 20}px`;
    minimap.appendChild(playerIndicator);
}

function createCollisionEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'collision-effect';
    effect.style.cssText = `left:${x - 15}px;top:${y - 15}px`;
    worldContainer.appendChild(effect);
    setTimeout(() => effect.remove(), 300);
}

function createOrangeStain(x, y, size = 'medium') {
    if (gameState.stains.length >= 1500) {
        cleanupExcessStains();
    }
    
    const stain = document.createElement('div');
    stain.className = 'organic-stain';
    
    if (size === 'small') {
        stain.classList.add('small-stain');
    } else if (size === 'large') {
        stain.classList.add('large-stain');
    } else {
        stain.classList.add('medium-stain');
    }
    
    const orangeColors = ['#ff9900', '#ff6600', '#ff3300', '#ff9933', '#ffcc00', '#ff9966', '#ff6633'];
    stain.style.backgroundColor = orangeColors[Math.floor(Math.random() * orangeColors.length)];
    
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    stain.style.left = `${x + offsetX}px`;
    stain.style.top = `${y + offsetY}px`;
    stain.classList.add('stain-fade-out');
    
    worldContainer.appendChild(stain);
    
    const stainObj = {
        element: stain,
        createdAt: Date.now(),
        type: 'orange',
        x: x + offsetX,
        y: y + offsetY
    };
    
    gameState.stains.push(stainObj);
    return stainObj;
}

function cleanupExcessStains() {
    const orangeStains = gameState.stains.filter(stain => stain.type === 'orange');
    
    if (orangeStains.length > 800) {
        orangeStains.sort((a, b) => a.createdAt - b.createdAt);
        
        const toRemove = orangeStains.slice(0, 200);
        toRemove.forEach(stain => {
            const index = gameState.stains.findIndex(s => s === stain);
            if (index !== -1) {
                if (stain.element && worldContainer.contains(stain.element)) {
                    stain.element.remove();
                }
                gameState.stains.splice(index, 1);
            }
        });
    }
}

function createOrganicOrangeExplosion(x, y, radius = 10) {
    const shockwave = document.createElement('div');
    shockwave.className = 'organic-shockwave';
    shockwave.style.cssText = `left:${x}px;top:${y}px;width:${radius * 4}px;height:${radius * 4}px`;
    worldContainer.appendChild(shockwave);
    
    const fragmentCount = Math.floor(Math.random() * 5) + 8;
    for (let i = 0; i < fragmentCount; i++) {
        const fragment = document.createElement('div');
        fragment.className = 'organic-fragment';
        const size = Math.random() * 3 + 3;
        fragment.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        
        const orangeColors = ['#ff9900', '#ff6600', '#ff3300', '#ff9933', '#ffcc00', '#ff9966', '#ff6633'];
        fragment.style.backgroundColor = orangeColors[Math.floor(Math.random() * orangeColors.length)];
        
        const fragmentShapes = ['fragment-triangle', 'fragment-irregular1', 'fragment-irregular2', 'fragment-irregular3', 'fragment-blob1', 'fragment-blob2', 'fragment-blob3', 'fragment-spike'];
        fragment.classList.add(fragmentShapes[Math.floor(Math.random() * fragmentShapes.length)]);
        
        const angle = Math.random() * Math.PI * 2;
        const speedVariation = Math.random() * 0.7 + 0.3;
        const distance = Math.random() * 30 + 20;
        const tx = Math.cos(angle) * distance * speedVariation;
        const ty = Math.sin(angle) * distance * speedVariation;
        const rotation = Math.random() * 720 - 360;
        
        fragment.style.setProperty('--frag-tx', `${tx}px`);
        fragment.style.setProperty('--frag-ty', `${ty}px`);
        fragment.style.setProperty('--frag-rotate', `${rotation}deg`);
        
        worldContainer.appendChild(fragment);
        
        setTimeout(() => {
            createOrangeStain(x + tx, y + ty, size > 5 ? 'large' : (size > 3.5 ? 'medium' : 'small'));
            setTimeout(() => fragment.remove(), 2000);
        }, 600);
    }
    
    createOrangeStain(x, y, 'large');
    
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 15;
        createOrangeStain(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 'small');
    }
    
    gameContainer.classList.add('orange-screen-shake');
    setTimeout(() => gameContainer.classList.remove('orange-screen-shake'), 300);
    
    setTimeout(() => shockwave.remove(), 600);
}

function createGreenExplosion(x, y, radius) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion green-explosion';
    explosion.style.cssText = `left:${x}px;top:${y}px;width:${radius * 4}px;height:${radius * 4}px`;
    worldContainer.appendChild(explosion);
    
    const shockwave = document.createElement('div');
    shockwave.className = 'explosion-shockwave';
    shockwave.style.cssText = `left:${x}px;top:${y}px;width:${radius * 2}px;height:${radius * 2}px`;
    worldContainer.appendChild(shockwave);
    
    gameContainer.classList.add('screen-shake');
    setTimeout(() => gameContainer.classList.remove('screen-shake'), 500);
    
    setTimeout(() => {
        explosion.remove();
        shockwave.remove();
    }, 800);
    
    return explosion;
}

function cleanupOldStains() {
    const now = Date.now();
    const maxAge = 3000000;
    
    for (let i = gameState.stains.length - 1; i >= 0; i--) {
        const stain = gameState.stains[i];
        if (now - stain.createdAt > maxAge) {
            if (stain.element && worldContainer.contains(stain.element)) {
                stain.element.remove();
            }
            gameState.stains.splice(i, 1);
        }
    }
}

function createCentralRegionTemplate() {
    gameState.centralRegionTemplate.obstacles = [];
    obstacleGrid.clear();
    
    const slowObstacleCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < slowObstacleCount; i++) {
        const width = (Math.random() * 15 + 10) * 3;
        const height = (Math.random() * 15 + 10) * 3;
        
        let relX, relY;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
            relX = Math.random() * 0.7 + 0.15;
            relY = Math.random() * 0.7 + 0.15;
            attempts++;
            
            const distanceToCenter = Math.sqrt(Math.pow(relX - 0.5, 2) + Math.pow(relY - 0.5, 2));
            
            if (distanceToCenter > 0.25) {
                break;
            }
        } while (attempts < maxAttempts);
        
        const obstacle = {
            isBlack: false,
            isSlow: true,
            width: width,
            height: height,
            relX: relX,
            relY: relY
        };
        
        gameState.centralRegionTemplate.obstacles.push(obstacle);
        
        const worldX = 0 * REGION_WIDTH + relX * REGION_WIDTH;
        const worldY = 0 * REGION_HEIGHT + relY * REGION_HEIGHT;
        const gridObstacle = {
            x: worldX,
            y: worldY,
            width: width,
            height: height,
            left: worldX - width / 2,
            right: worldX + width / 2,
            top: worldY - height / 2,
            bottom: worldY + height / 2,
            isBlack: false,
            isSlow: true
        };
        obstacleGrid.addObstacle(gridObstacle);
    }
    
    const brickWallCount = Math.floor(Math.random() * 6) + 10;
    
    for (let i = 0; i < brickWallCount; i++) {
        const isPrincipal = Math.random() > 0.5;
        const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        
        let relX, relY;
        let attempts = 0;
        const maxAttempts = 15;
        
        do {
            relX = Math.random() * 0.7 + 0.15;
            relY = Math.random() * 0.7 + 0.15;
            attempts++;
            
            const distanceToCenter = Math.sqrt(Math.pow(relX - 0.5, 2) + Math.pow(relY - 0.5, 2));
            
            if (distanceToCenter > 0.2) {
                break;
            }
        } while (attempts < maxAttempts);
        
        const wallDef = {
            isDestructible: true,
            isBrickWall: true,
            wallType: isPrincipal ? 'principal' : 'menor',
            orientation: orientation,
            length: isPrincipal ? 
                Math.random() * (BRICK_SYSTEM.PRINCIPAL_MAX_LENGTH - BRICK_SYSTEM.PRINCIPAL_MIN_LENGTH) + BRICK_SYSTEM.PRINCIPAL_MIN_LENGTH :
                Math.random() * (BRICK_SYSTEM.MENOR_MAX_LENGTH - BRICK_SYSTEM.MENOR_MIN_LENGTH) + BRICK_SYSTEM.MENOR_MIN_LENGTH,
            relX: relX,
            relY: relY
        };
        
        gameState.centralRegionTemplate.obstacles.push(wallDef);
        
        const worldX = 0 * REGION_WIDTH + wallDef.relX * REGION_WIDTH;
        const worldY = 0 * REGION_HEIGHT + wallDef.relY * REGION_HEIGHT;
        
        const tempObstacle = {
            x: worldX,
            y: worldY,
            width: wallDef.length,
            height: isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS,
            left: worldX - wallDef.length / 2,
            right: worldX + wallDef.length / 2,
            top: worldY - (isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS) / 2,
            bottom: worldY + (isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS) / 2,
            isBrickWall: true
        };
        
        if (orientation === 'vertical') {
            tempObstacle.width = isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS;
            tempObstacle.height = wallDef.length;
            tempObstacle.left = worldX - (isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS) / 2;
            tempObstacle.right = worldX + (isPrincipal ? BRICK_SYSTEM.PRINCIPAL_THICKNESS : BRICK_SYSTEM.MENOR_THICKNESS) / 2;
            tempObstacle.top = worldY - wallDef.length / 2;
            tempObstacle.bottom = worldY + wallDef.length / 2;
        }
        
        obstacleGrid.addObstacle(tempObstacle);
    }
    
    const blackObstacleCount = Math.floor(Math.random() * 5) + 7;
    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = 150;
    
    while (placedCount < blackObstacleCount && attempts < maxAttempts) {
        attempts++;
        
        const width = (Math.random() * 15 + 10) * 3;
        const height = (Math.random() * 15 + 10) * 3;
        
        let relX, relY;
        let localAttempts = 0;
        const localMaxAttempts = 10;
        
        do {
            relX = Math.random() * 0.7 + 0.15;
            relY = Math.random() * 0.7 + 0.15;
            localAttempts++;
            
            const distanceToCenter = Math.sqrt(Math.pow(relX - 0.5, 2) + Math.pow(relY - 0.5, 2));
            
            if (distanceToCenter > 0.3) {
                break;
            }
        } while (localAttempts < localMaxAttempts);
        
        const worldX = 0 * REGION_WIDTH + relX * REGION_WIDTH;
        const worldY = 0 * REGION_HEIGHT + relY * REGION_HEIGHT;
        
        const tempObstacle = {
            x: worldX,
            y: worldY,
            width: width,
            height: height,
            left: worldX - width / 2,
            right: worldX + width / 2,
            top: worldY - height / 2,
            bottom: worldY + height / 2,
            isBlack: true
        };
        
        let hasCollision = false;
        const startCellX = Math.floor(tempObstacle.left / obstacleGrid.cellSize);
        const endCellX = Math.floor(tempObstacle.right / obstacleGrid.cellSize);
        const startCellY = Math.floor(tempObstacle.top / obstacleGrid.cellSize);
        const endCellY = Math.floor(tempObstacle.bottom / obstacleGrid.cellSize);
        
        for (let cellX = startCellX; cellX <= endCellX; cellX++) {
            for (let cellY = startCellY; cellY <= endCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                const obstaclesInCell = obstacleGrid.grid.get(key);
                if (obstaclesInCell) {
                    for (const existingObstacle of obstaclesInCell) {
                        if (tempObstacle.left < existingObstacle.right + MIN_OBSTACLE_DISTANCE && 
                            tempObstacle.right > existingObstacle.left - MIN_OBSTACLE_DISTANCE && 
                            tempObstacle.top < existingObstacle.bottom + MIN_OBSTACLE_DISTANCE && 
                            tempObstacle.bottom > existingObstacle.top - MIN_OBSTACLE_DISTANCE) {
                            hasCollision = true;
                            break;
                        }
                    }
                }
                if (hasCollision) break;
            }
            if (hasCollision) break;
        }
        
        if (hasCollision) {
            continue;
        }
        
        const obstacle = {
            isBlack: true,
            isDestructible: false,
            width: width,
            height: height,
            relX: relX,
            relY: relY
        };
        
        gameState.centralRegionTemplate.obstacles.push(obstacle);
        placedCount++;
        obstacleGrid.addObstacle(tempObstacle);
    }
}

function createScaledObstacleFromTemplate(template, regionX, regionY, scaleFactor) {
    // Con canvas render activo, black/slow son estáticos (nunca cambian de estado visual)
    // y el canvas los dibuja directo. NO creamos su div en el DOM: esto elimina de verdad
    // esos nodos (memoria) y evita que acompañen al world-container al mover la cámara.
    const useCanvas = USE_CANVAS_RENDER && window.CANVAS_RENDER;
    
    const scaledWidth = template.width * scaleFactor;
    const scaledHeight = template.height * scaleFactor;
    
    const worldX = regionX * REGION_WIDTH + template.relX * REGION_WIDTH;
    const worldY = regionY * REGION_HEIGHT + template.relY * REGION_HEIGHT;
    
    const left = worldX - scaledWidth / 2;
    const top = worldY - scaledHeight / 2;
    
    let obstacle = null;
    if (!useCanvas) {
        obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        
        if (template.isBlack) {
            obstacle.classList.add('black');
        } else if (template.isSlow) {
            obstacle.classList.add('slow');
        }
        
        obstacle.style.cssText = `width:${scaledWidth}px;height:${scaledHeight}px;left:${left}px;top:${top}px`;
        
        if (template.isBlack) {
            obstacle.style.zIndex = '7';
        } else if (template.isSlow) {
            obstacle.style.zIndex = '3';
        }
        
        worldContainer.appendChild(obstacle);
    }
    
    const obstacleObj = {
        element: obstacle,  // null con canvas activo
        x: worldX,
        y: worldY,
        width: scaledWidth,
        height: scaledHeight,
        isBlack: template.isBlack || false,
        isDestructible: false,
        isSlow: template.isSlow || false,
        left: left,
        top: top,
        right: left + scaledWidth,
        bottom: top + scaledHeight,
        overlapCount: 0,
        regionX: regionX,
        regionY: regionY
    };
    
    gameState.obstacles.push(obstacleObj);
    
    // Indexar en el spatial hash para que las colisiones espaciales lo detecten
    if (useCanvas) {
        // Con canvas, el objeto no tiene element; el canvas lo dibuja por datos
    }
    obstacleGrid.addObstacle(obstacleObj);
    
    return obstacleObj;
}

function createEnemy(type = 'orange', x = null, y = null) {
    // Con canvas render el enemigo vivo NO crea div (el canvas lo dibuja por datos).
    // El cadaver DOM crea su propio div al morir (directedCorpseSystem.transformEnemyVisual).
    const useCanvasNow = (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER);
    const enemy = useCanvasNow ? null : document.createElement('div');
    if (enemy) enemy.className = 'enemy';
    
    let radius, hitsRequired;
    switch(type) {
        case 'orange':
            radius = 10;
            hitsRequired = 1;
            break;
        case 'fuchsia':
            if (enemy) enemy.classList.add('special');
            radius = 20;
            hitsRequired = 25;
            break;
        case 'green':
            if (enemy) enemy.classList.add('green');
            radius = 80;
            hitsRequired = 100;
            break;
    }
    
    let enemyX, enemyY;
    
    if (x !== null && y !== null) {
        enemyX = x;
        enemyY = y;
    } else {
            const region = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
            let enemyX, enemyY;
            let attempts = 0;
            const maxAttempts = 50;
            // Ensure enemy doesn't spawn on top of player
            do {
                enemyX = region.x * REGION_WIDTH + Math.random() * (REGION_WIDTH - 40) + 20;
                enemyY = region.y * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 40) + 20;
                attempts++;
                const distanceToPlayer = Math.sqrt((enemyX - gameState.playerX)**2 + (enemyY - gameState.playerY)**2);
                if (distanceToPlayer >= 150 || attempts >= maxAttempts) break;
            } while (true);
        }
    
    if (enemy) {
        enemy.style.cssText = `left:${enemyX - radius}px;top:${enemyY - radius}px`;
        worldContainer.appendChild(enemy);
    }
    
    let baseSpeed;
    switch(type) {
        case 'orange':
            baseSpeed = 2.5 * 1.25;
            break;
        case 'fuchsia':
            baseSpeed = 1.5 * 1.25;
            break;
        case 'green':
            baseSpeed = 0.4 * 1.25;
            break;
    }
    
    const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enemyObj = {
        id: enemyId,
        element: enemy,
        x: enemyX,
        y: enemyY,
        radius: radius,
        type: type,
        speedX: (Math.random() - 0.5) * baseSpeed,
        speedY: (Math.random() - 0.5) * baseSpeed,
        merging: false,
        hitsTaken: 0,
        hitsRequired: hitsRequired,
        prevX: enemyX,
        prevY: enemyY,
        slowZonesCount: 0,
        active: false,
        regionX: Math.floor(enemyX / REGION_WIDTH),
        regionY: Math.floor(enemyY / REGION_HEIGHT),
        tentacleWavePhase: 0,
        tentacleSlowApplied: false
    };
    
    gameState.enemies.push(enemyObj);
    gameState.currentEnemyCount++;
    
    if (type === 'green') {
        TENTACLE_SYSTEM.createTentaclesForGreenEnemy(enemyObj);
        enemyObj.tentacleWavePhase = Math.random() * Math.PI * 2;
        TENTACLE_SYSTEM.updateTentacles(enemyObj, 0);
    }
    
    return enemyObj;
}

function shouldCreateGreenEnemy() {
    let fuchsiaCount = gameState.enemies.filter(e => e.type === 'fuchsia').length;
    return fuchsiaCount >= 3 && gameState.greenEnemiesCount === 0;
}

function createGreenEnemy() {
    gameState.greenEnemiesCount++;
    
    const notification = document.createElement('div');
    notification.className = 'green-event-notification';
    notification.textContent = '¡BESTIA VERDE INMINENTE!';
    notification.style.opacity = '1';
    worldContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.style.left = `${gameState.playerX}px`;
        notification.style.top = `${gameState.playerY}px`;
    }, 0);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 1000);
    }, 3000);
    
    let greenEnemy = null;
    let attempts = 0;
    const maxAttempts = 200;
    
    while (!greenEnemy && attempts < maxAttempts) {
        const region = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
        let posX = region.x * REGION_WIDTH + Math.random() * (REGION_WIDTH - 160) + 80;
        let posY = region.y * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 160) + 80;
        
        const distanceToPlayer = Math.sqrt((posX - gameState.playerX)**2 + (posY - gameState.playerY)**2);
        if (distanceToPlayer < 200) {
            attempts++;
            continue;
        }
        
        let positionValid = true;
        const radius = 80;
        for (let obstacle of gameState.obstacles) {
            if (obstacle.isBlack || obstacle.isDestructible) {
                if (posX + radius >= obstacle.left && posX - radius <= obstacle.right && 
                    posY + radius >= obstacle.top && posY - radius <= obstacle.bottom) {
                    positionValid = false;
                    break;
                }
            }
        }
        
        if (positionValid) {
            greenEnemy = createEnemy('green', posX, posY);
            
            const explosionRadius = radius * 1.5;
            const affectedObstacles = [];
            
            for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
                const obstacle = gameState.obstacles[i];
                if (!obstacle.isDestructible) continue;
                
                const dx = obstacle.x - posX;
                const dy = obstacle.y - posY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < explosionRadius + Math.max(obstacle.width, obstacle.height) / 2) {
                    affectedObstacles.push({
                        obstacle: obstacle,
                        index: i
                    });
                }
            }
            
            if (affectedObstacles.length > 0) {
                createGreenExplosion(posX, posY, radius);
                
                for (const affected of affectedObstacles) {
                    BRICK_SYSTEM.destroyBrick(affected.obstacle, affected.index);
                }
                
                gameState.score += affectedObstacles.length * 50;
                updateScoreDisplay();
            }
        }
        attempts++;
    }
    
    if (!greenEnemy) {
        const region = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
        let posX = region.x * REGION_WIDTH + Math.random() * (REGION_WIDTH - 160) + 80;
        let posY = region.y * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 160) + 80;
        greenEnemy = createEnemy('green', posX, posY);
    }
}

function startSpecialEvent() {
    gameState.isSpecialEvent = true;
    gameState.mergingEnemies = true;
    gameState.fuchsiaEnemiesCount++;
    
    const notification = document.createElement('div');
    notification.className = 'special-event-notification';
    notification.textContent = '¡EVENTO ESPECIAL!';
    notification.style.opacity = '1';
    worldContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.style.left = `${gameState.playerX}px`;
        notification.style.top = `${gameState.playerY}px`;
    }, 0);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 1000);
    }, 2000);
    
    gameState.enemies.forEach(enemy => {
        if (enemy.type === 'orange' && enemy.active) {
            if (enemy.element) enemy.element.classList.add('merging');
            enemy.merging = true;
        }
    });
    
    setTimeout(mergeEnemiesToCenter, 500);
}

function mergeEnemiesToCenter() {
    const mergeSpeed = 3;
    let enemiesToRemove = [];
    
    const activeEnemies = getActiveEnemies();
    
    activeEnemies.forEach((enemy, index) => {
        if (enemy.type === 'orange' && enemy.merging) {
            const dx = gameState.playerX - enemy.x;
            const dy = gameState.playerY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                enemy.x += (dx / distance) * mergeSpeed;
                enemy.y += (dy / distance) * mergeSpeed;
                if (enemy.element) {
                    enemy.element.style.left = `${enemy.x - enemy.radius}px`;
                    enemy.element.style.top = `${enemy.y - enemy.radius}px`;
                }
            } else {
                enemiesToRemove.push(enemy);
            }
        }
    });
    
    for (let enemy of enemiesToRemove) {
        const index = gameState.enemies.indexOf(enemy);
        if (index !== -1 && gameState.enemies[index] && gameState.enemies[index].element) {
            gameState.enemies[index].element.remove();
            gameState.enemies.splice(index, 1);
            gameState.currentEnemyCount--;
        }
    }
    
    const stillMerging = activeEnemies.some(enemy => enemy.type === 'orange' && enemy.merging);
    
    if (!stillMerging) {
        finishSpecialEvent();
    } else {
        requestAnimationFrame(mergeEnemiesToCenter);
    }
}

function finishSpecialEvent() {
    gameState.isSpecialEvent = false;
    gameState.mergingEnemies = false;
    
    let existingFuchsiaCount = gameState.enemies.filter(e => e.type === 'fuchsia').length;
    let fuchsiaToCreate = gameState.fuchsiaEnemiesCount - existingFuchsiaCount;
    
    for (let i = 0; i < fuchsiaToCreate; i++) {
        let fuchsiaEnemy = null;
        let attempts = 0;
        
        while (!fuchsiaEnemy && attempts < 80) {
            const region = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
            let posX = region.x * REGION_WIDTH + Math.random() * (REGION_WIDTH - 40) + 20;
            let posY = region.y * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 40) + 20;
            const radius = 20;
            
            let positionValid = true;
            for (let obstacle of gameState.obstacles) {
                if (obstacle.isBlack || obstacle.isDestructible) {
                    if (posX + radius >= obstacle.left && posX - radius <= obstacle.right && 
                        posY + radius >= obstacle.top && posY - radius <= obstacle.bottom) {
                        positionValid = false;
                        break;
                    }
                }
            }
            
            if (positionValid) {
                fuchsiaEnemy = createEnemy('fuchsia', posX, posY);
            }
            attempts++;
        }
        
        if (!fuchsiaEnemy) {
            const region = getRegionFromWorldCoords(gameState.playerX, gameState.playerY);
            let posX = region.x * REGION_WIDTH + Math.random() * (REGION_WIDTH - 40) + 20;
            let posY = region.y * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 40) + 20;
            fuchsiaEnemy = createEnemy('fuchsia', posX, posY);
        }
    }
    
    gameState.orangeEnemiesToCreate = 2;
    for (let i = 0; i < gameState.orangeEnemiesToCreate; i++) {
        createEnemy('orange');
    }
    
    if (shouldCreateGreenEnemy()) {
        createGreenEnemy();
    }
}

function detectBorderCollisions() {
    // En mundo infinito, no hay bordes del mundo
}

function detectEnemyCollisions() {
    const activeEnemies = getActiveEnemies();
    
    activeEnemies.forEach(enemy => {
        enemy.prevX = enemy.x;
        enemy.prevY = enemy.y;
    });
    
    activeEnemies.forEach(enemy => {
        if (!gameState.mergingEnemies) {
            let speedFactor = 1;
            if (enemy.slowZonesCount > 0) {
                speedFactor = Math.pow(0.5, enemy.slowZonesCount);
            }
            enemy.x += enemy.speedX * speedFactor;
            enemy.y += enemy.speedY * speedFactor;
        }
    });
}

function detectObstacleCollisions() {
    const activeEnemies = getActiveEnemies();
    
    for (let enemy of activeEnemies) {
        // Usar spatial hash: solo obstáculos en las celdas alrededor del enemigo,
        // en vez de barrer los ~3000 obstáculos completos cada frame.
        // El radio cubre el tamaño máximo de enemigo + margen de celda.
        const radius = Math.max(enemy.radius || 10, 80) + 40;
        const nearby = obstacleGrid.getNearbyObstacles(enemy.x, enemy.y, radius);
        
        for (let obstacle of nearby) {
            if (!obstacle.isBlack && !obstacle.isDestructible) continue;
            
            const closestX = Math.max(obstacle.left, Math.min(enemy.x, obstacle.right));
            const closestY = Math.max(obstacle.top, Math.min(enemy.y, obstacle.bottom));
            const dx = enemy.x - closestX;
            const dy = enemy.y - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.radius) {
                const overlap = enemy.radius - distance;
                const separationX = (dx / distance) * overlap * 1.1;
                const separationY = (dy / distance) * overlap * 1.1;
                enemy.x += separationX;
                enemy.y += separationY;
            }
        }
    }
}

// ========== SPATIAL HASH COLLISION SYSTEM ==========
// Sistema paralelo para colisiones O(n) usando spatial hash grid
// Se activa con gameState.useSpatialHash = true
// NOTA: Original detectEnemyCollisions() NO hace enemy-enemy collision,
// solo mueve enemigos. Este sistema replica ese comportamiento exacto.

function detectEnemyCollisions_Spatial() {
    // Rebuild grid cada frame
    SPATIAL_HASH.clear();
    const activeEnemies = getActiveEnemies();
    
    // Insert all alive enemies into grid
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        SPATIAL_HASH.insert(i, enemy.x, enemy.y);
        enemy.prevX = enemy.x;
        enemy.prevY = enemy.y;
    }
    
    // Move enemies (NO enemy-enemy collision, matching original behavior)
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        if (gameState.mergingEnemies) continue;
        
        let speedFactor = 1;
        if (enemy.slowZonesCount > 0) {
            speedFactor = Math.pow(0.5, enemy.slowZonesCount);
        }
        
        // Just move, no collision check - matching original exactly
        enemy.x += enemy.speedX * speedFactor;
        enemy.y += enemy.speedY * speedFactor;
    }
}

function updateProjectileCollisions_Spatial() {
    const projectiles = gameState.projectiles;
    if (!projectiles || projectiles.length === 0) return;
    
    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) return;
    
    // Rebuild grid with current enemy positions
    SPATIAL_HASH.clear();
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        SPATIAL_HASH.insert(i, enemy.x, enemy.y);
    }
    
    // Check each projectile against nearby enemies
    for (let p = projectiles.length - 1; p >= 0; p--) {
        const projectile = projectiles[p];
        if (!projectile.active) continue;
        
        const nearby = SPATIAL_HASH.getNearby(projectile.x, projectile.y);
        
        for (const eIdx of nearby) {
            const enemy = activeEnemies[eIdx];
            if (!enemy) continue;
            
            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;
            const distSq = dx * dx + dy * dy;
            const hitRadius = enemy.radius + 8; // projectile radius ~8px
            
            if (distSq < hitRadius * hitRadius) {
                // HIT!
                damageEnemy(enemy, projectile.damage, projectile);
                projectile.active = false;
                
                // Remove projectile from array
                projectiles.splice(p, 1);
                break; // One projectile = one hit
            }
        }
    }
}

// Validation helper: run both systems and compare
function validateSpatialHashRegression() {
    if (!window.SPATIAL_HASH) return { error: 'SPATIAL_HASH not loaded' };
    
    const mismatches = [];
    const testFrames = 50;
    
    // Save original state
    const originalUseSpatialHash = gameState.useSpatialHash;
    
    for (let frame = 0; frame < testFrames; frame++) {
        // Backup enemy positions
        const activeEnemies = getActiveEnemies();
        const backup = activeEnemies.map(e => ({ x: e.x, y: e.y, speedX: e.speedX, speedY: e.speedY }));
        
        // Run OLD system
        gameState.useSpatialHash = false;
        detectEnemyCollisions();
        const oldPositions = activeEnemies.map(e => ({ x: e.x, y: e.y }));
        
        // Restore
        for (let i = 0; i < activeEnemies.length; i++) {
            activeEnemies[i].x = backup[i].x;
            activeEnemies[i].y = backup[i].y;
            activeEnemies[i].speedX = backup[i].speedX;
            activeEnemies[i].speedY = backup[i].speedY;
        }
        
        // Run NEW system
        gameState.useSpatialHash = true;
        detectEnemyCollisions_Spatial();
        const newPositions = activeEnemies.map(e => ({ x: e.x, y: e.y }));
        
        // Compare
        for (let i = 0; i < activeEnemies.length; i++) {
            const dx = oldPositions[i].x - newPositions[i].x;
            const dy = oldPositions[i].y - newPositions[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.5) { // Tolerancia 0.5px
                mismatches.push({ frame, enemyIndex: i, dist, old: oldPositions[i], new: newPositions[i] });
            }
        }
        
        // Step simulation forward
        stepSimulationFrame();
    }
    
    // Restore flag
    gameState.useSpatialHash = originalUseSpatialHash;
    
    return { 
        passed: mismatches.length === 0, 
        mismatches,
        totalFrames: testFrames
    };
}

function stepSimulationFrame() {
    // Minimal step to advance game state for validation
    if (gameState.gameActive && !gameState.mergingEnemies) {
        updateProjectiles();
        updateEnemies(1/60);
    }
}

function detectSlowZones() {
    gameState.playerSlowZonesCount = 0;
    
    // Recolectar las slow-zones cercanas al player UNA sola vez por frame.
    // Los enemigos están cerca del jugador, así que reutilizamos el mismo array
    // para todos en vez de crear un getNearbyObstacles por enemigo (evita ~200 arrays/frame).
    const nearbyObstacles = obstacleGrid.getNearbyObstacles(gameState.playerX, gameState.playerY, 400);
    const slowZones = [];
    for (let i = 0; i < nearbyObstacles.length; i++) {
        const obstacle = nearbyObstacles[i];
        if (obstacle.isSlow) {
            slowZones.push(obstacle);
        }
    }
    
    // Jugador
    for (let obstacle of slowZones) {
        if (gameState.playerX >= obstacle.left && gameState.playerX <= obstacle.right && 
            gameState.playerY >= obstacle.top && gameState.playerY <= obstacle.bottom) {
            gameState.playerSlowZonesCount++;
        }
    }
    
    // Cap: el CSS solo define slowed (≥1) y slowed2 (≥3). Más de 3 no tiene sentido visual
    // ni de gameplay: 0.5^3 = 12.5% velocidad mínima. Evita acumulación excesiva en zonas
    // con muchos solapados (antes llegaba a 6 = 1.56% velocidad = "no se mueve").
    if (gameState.playerSlowZonesCount > 3) gameState.playerSlowZonesCount = 3;
    
    player.classList.remove('slowed', 'slowed2');
    if (gameState.playerSlowZonesCount >= 3) {
        player.classList.add('slowed2');
    } else if (gameState.playerSlowZonesCount >= 1) {
        player.classList.add('slowed');
    }
    
    const activeEnemies = getActiveEnemies();
    
    for (let enemy of activeEnemies) {
        enemy.slowZonesCount = 0;
        // Chequear contra las slow-zones ya recolectadas (sin crear arrays por enemigo)
        for (let obstacle of slowZones) {
            if (enemy.x >= obstacle.left && enemy.x <= obstacle.right && 
                enemy.y >= obstacle.top && enemy.y <= obstacle.bottom) {
                enemy.slowZonesCount++;
            }
        }
        
        if (enemy.element) {
            enemy.element.classList.remove('slowed', 'slowed2');
            if (enemy.slowZonesCount >= 3) {
                enemy.element.classList.add('slowed2');
            } else if (enemy.slowZonesCount >= 1) {
                enemy.element.classList.add('slowed');
            }
        }
    }
}

function detectAndApplyRubbleEffect() {
    const now = Date.now();
    
    if (now - gameState.lastRubbleCheck < 50) {
        return;
    }
    
    gameState.lastRubbleCheck = now;
    
    const isOnRubble = RUBBLE_SYSTEM.checkPlayerOnRubble(gameState.playerX, gameState.playerY);
    gameState.isOnRubble = isOnRubble;
    
    if (gameState.turboActive) {
        gameState.rubbleDeviationX = 0;
        gameState.rubbleDeviationY = 0;
        return;
    }
    
    if (isOnRubble) {
        const deviation = RUBBLE_SYSTEM.applyUnstableEffect(gameState.playerX, gameState.playerY, gameState.playerSpeed);
        gameState.rubbleDeviationX = deviation.x;
        gameState.rubbleDeviationY = deviation.y;
        gameState.rubbleEffectActive = true;
    } else {
        if (gameState.rubbleEffectActive) {
            gameState.rubbleDeviationX *= 0.8;
            gameState.rubbleDeviationY *= 0.8;
            
            if (Math.abs(gameState.rubbleDeviationX) < 0.01 && Math.abs(gameState.rubbleDeviationY) < 0.01) {
                gameState.rubbleDeviationX = 0;
                gameState.rubbleDeviationY = 0;
                gameState.rubbleEffectActive = false;
            }
        }
    }
}

function detectAndApplyCorpseEffect() {
    const isInCorpse = DIRECTED_CORPSE_SYSTEM.checkPlayerInCorpse(gameState.playerX, gameState.playerY);
    gameState.isInCorpse = isInCorpse;
    
    if (isInCorpse) {
        if (!player.classList.contains('pestilent')) {
            player.classList.add('pestilent');
        }
    } else {
        if (player.classList.contains('pestilent') && !gameState.isOnRubble) {
            player.classList.remove('pestilent');
        }
    }
}

function detectPlayerObstacleCollision() {
    gameState.playerPrevX = gameState.playerX;
    gameState.playerPrevY = gameState.playerY;
    
    // Spatial hash: solo obstáculos cerca del jugador (antes barría los ~3000)
    const nearby = obstacleGrid.getNearbyObstacles(gameState.playerX, gameState.playerY, 100);
    for (let obstacle of nearby) {
        if (!obstacle.isBlack && !obstacle.isDestructible) continue;
        
        const closestX = Math.max(obstacle.left, Math.min(gameState.playerX, obstacle.right));
        const closestY = Math.max(obstacle.top, Math.min(gameState.playerY, obstacle.bottom));
        const dx = gameState.playerX - closestX;
        const dy = gameState.playerY - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const playerRadius = 12;
        
        if (distance < playerRadius) {
            const overlap = playerRadius - distance;
            if (overlap > 0) {
                // Evitar división por cero en colNormal (NaN) cuando el jugador está
                // exactamente en el centro del obstáculo (distance === 0)
                let colNormalX = 0, colNormalY = 0;
                if (distance > 0) {
                    colNormalX = dx / distance;
                    colNormalY = dy / distance;
                }
                const playerDX = gameState.playerX - gameState.playerPrevX;
                const playerDY = gameState.playerY - gameState.playerPrevY;
                
                if (playerDX !== 0 || playerDY !== 0) {
                    const moveMagnitude = Math.sqrt(playerDX * playerDX + playerDY * playerDY);
                    const moveNormalX = playerDX / moveMagnitude;
                    const moveNormalY = playerDY / moveMagnitude;
                    const dot = moveNormalX * colNormalX + moveNormalY * colNormalY;
                    
                    if (dot > 0) {
                        gameState.playerX -= moveNormalX * overlap * 1.1;
                        gameState.playerY -= moveNormalY * overlap * 1.1;
                    } else if (distance > 0) {
                        gameState.playerX += colNormalX * overlap * 1.1;
                        gameState.playerY += colNormalY * overlap * 1.1;
                    } else {
                        // distance === 0: empujar en dirección aleatoria estable por magnitud
                        gameState.playerX -= moveNormalX * overlap * 1.1;
                        gameState.playerY -= moveNormalY * overlap * 1.1;
                    }
                } else if (distance > 0) {
                    gameState.playerX += colNormalX * overlap * 1.1;
                    gameState.playerY += colNormalY * overlap * 1.1;
                }
                
                if (gameState.turboActive) {
                    createCollisionEffect(gameState.playerX, gameState.playerY);
                    gameState.turboRunning = false;
                    gameState.turboActive = false;
                    gameState.turboMode = false;
                    player.classList.remove('turbo-active');
                }
            }
        }
    }
}

// Colision por SEGMENTO (slab method): chequea el trayecto del proyectil entre
// su posicion previa y la actual contra el rectangulo del obstaculo.
// Antes solo se chequeaba el punto final -> el proyectil avanzaba 16-50px por
// frame y las paredes miden 2-4px, asi que las atravesaba (tunneling).
// Devuelve el tiempo de entrada t (0..1) o -1 si el segmento no cruza el rect.
function segmentRectEnterTime(prevX, prevY, x, y, left, top, right, bottom) {
    let tEnter = 0;
    let tExit = 1;
    const dx = x - prevX;
    const dy = y - prevY;
    
    if (dx === 0) {
        if (prevX < left || prevX > right) return -1;
    } else {
        let t1 = (left - prevX) / dx;
        let t2 = (right - prevX) / dx;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tEnter) tEnter = t1;
        if (t2 < tExit) tExit = t2;
        if (tEnter > tExit) return -1;
    }
    
    if (dy === 0) {
        if (prevY < top || prevY > bottom) return -1;
    } else {
        let t1 = (top - prevY) / dy;
        let t2 = (bottom - prevY) / dy;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tEnter) tEnter = t1;
        if (t2 < tExit) tExit = t2;
        if (tEnter > tExit) return -1;
    }
    
    if (tExit < 0 || tEnter > 1) return -1;
    return Math.max(0, Math.min(tEnter, 1));
}

function detectProjectileObstacleCollision(projectile, prevX, prevY) {
    // Devuelve: -1 sin impacto | 0 impacto destructible (daño aplicado) | 1 impacto indestructible (bloquea)
    let hitDestructible = false;

    // Ladrillos destructibles (paredes): daño en el punto real de impacto
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        if (!obstacle.isBrick) continue;
        
        const tEnter = segmentRectEnterTime(
            prevX, prevY, projectile.x, projectile.y,
            obstacle.left, obstacle.top, obstacle.right, obstacle.bottom
        );
        if (tEnter < 0) continue;
        
        const hitX = prevX + (projectile.x - prevX) * tEnter;
        const hitY = prevY + (projectile.y - prevY) * tEnter;
        
        obstacle.health -= projectile.damage;
        
        BRICK_SYSTEM.createBrickImpactEffect(hitX, hitY, BRICK_SYSTEM.BRICK_HEALTH - obstacle.health);
        BRICK_SYSTEM.applyDamageVisual(obstacle.element, BRICK_SYSTEM.BRICK_HEALTH - obstacle.health);
        
        if (obstacle.health <= 0) {
            BRICK_SYSTEM.destroyBrick(obstacle, i);
        }
        
        hitDestructible = true;
        
        if (!projectile.penetrating) {
            // Munición normal: impacta y muere en el primer obstáculo
            return 0;
        }
            // Sniper penetrante: atraviesa; seguir chequeando el resto del frame
    }
    
    // Paredes negras indestructibles: bloquean SIEMPRE (incluso al sniper)
    for (let obstacle of gameState.obstacles) {
        if (obstacle.isBlack && !obstacle.isDestructible) {
            const tEnter = segmentRectEnterTime(
                prevX, prevY, projectile.x, projectile.y,
                obstacle.left, obstacle.top, obstacle.right, obstacle.bottom
            );
            if (tEnter >= 0) {
                createCollisionEffect(projectile.x, projectile.y);
                return 1;
            }
        }
    }
    return hitDestructible ? 0 : -1;
}

function updatePlayerPosition() {
    if (!gameState.gameActive || gameState.mergingEnemies) return;
    
    detectSlowZones();
    let currentSpeed = gameState.playerSpeed;
    
    detectAndApplyRubbleEffect();
    detectAndApplyCorpseEffect();
    
    const mouseWorldX = gameState.mouseX + gameState.cameraX;
    const mouseWorldY = gameState.mouseY + gameState.cameraY;
    const lookAngle = Math.atan2(mouseWorldY - gameState.playerY, mouseWorldX - gameState.playerX);
    
    gameState.playerRotation = lookAngle * (180 / Math.PI) + 90;
    
    if (gameState.turboActive) {
        currentSpeed *= 6;
        player.classList.add('turbo-active');
        
        const steps = 4;
        let stepSpeed = currentSpeed / steps;
        let collisionDetected = false;
        
        for (let i = 0; i < steps; i++) {
            const newX = gameState.playerX + Math.cos(gameState.turboAngle) * stepSpeed;
            const newY = gameState.playerY + Math.sin(gameState.turboAngle) * stepSpeed;
            
            const collisionCheck = checkPlayerCollisionAtPosition(newX, newY);
            
            if (collisionCheck.collided) {
                collisionDetected = true;
                
                createCollisionEffect(gameState.playerX, gameState.playerY);
                
                gameState.turboRunning = false;
                gameState.turboActive = false;
                gameState.turboMode = false;
                player.classList.remove('turbo-active');
                
                if (collisionCheck.distance > 0) {
                    const pushDistance = 12 - collisionCheck.distance + 2;
                    gameState.playerX -= (collisionCheck.dx / collisionCheck.distance) * pushDistance;
                    gameState.playerY -= (collisionCheck.dy / collisionCheck.distance) * pushDistance;
                }
                
                break;
            } else {
                gameState.playerX = newX;
                gameState.playerY = newY;
            }
        }
        
        gameState.playerRotation = gameState.turboAngle * (180 / Math.PI) + 90;
        
    } else {
        player.classList.remove('turbo-active');
        
        let moveX = 0;
        let moveY = 0;
        
        if (gameState.keys['w'] || gameState.keys['W']) {
            moveY -= 1;
        }
        if (gameState.keys['s'] || gameState.keys['S']) {
            moveY += 1;
        }
        if (gameState.keys['a'] || gameState.keys['A']) {
            moveX -= 1;
        }
        if (gameState.keys['d'] || gameState.keys['D']) {
            moveX += 1;
        }
        
        if (moveX !== 0 || moveY !== 0) {
            const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            const normalizedMoveX = moveX / moveMagnitude;
            const normalizedMoveY = moveY / moveMagnitude;
            
            const moveAngle = Math.atan2(normalizedMoveY, normalizedMoveX);
            
            currentSpeed = calculateDirectionalSpeed(moveAngle, lookAngle);
            
            if (gameState.playerSlowZonesCount > 0) {
                currentSpeed *= Math.pow(0.5, gameState.playerSlowZonesCount);
            }
            
            gameState.playerX += normalizedMoveX * currentSpeed;
            gameState.playerY += normalizedMoveY * currentSpeed;
            
            if (gameState.rubbleEffectActive) {
                gameState.playerX += gameState.rubbleDeviationX;
                gameState.playerY += gameState.rubbleDeviationY;
            }
        } else {
            if (gameState.rubbleEffectActive) {
                gameState.playerX += gameState.rubbleDeviationX * 0.5;
                gameState.playerY += gameState.rubbleDeviationY * 0.5;
            }
        }
    }
    
    detectPlayerObstacleCollision();
    
    updateCamera();
    
    const playerScreenX = gameState.playerX - gameState.cameraX;
    const playerScreenY = gameState.playerY - gameState.cameraY;
    
    if (gameState.useRenderBatching && window.RENDER_BATCH) {
        RENDER_BATCH.add(() => {
            player.style.cssText = `left:${playerScreenX}px;top:${playerScreenY}px;--player-rotation:${gameState.playerRotation}deg`;
        });
    } else {
        player.style.cssText = `left:${playerScreenX}px;top:${playerScreenY}px;--player-rotation:${gameState.playerRotation}deg`;
    }
    
    if (gameState.isOnRubble) {
        if (!player.classList.contains('unstable')) {
            player.classList.add('unstable');
        }
    } else {
        player.style.transform = `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
        if (player.classList.contains('unstable')) {
            player.classList.remove('unstable');
        }
    }
    
    if (gameState.turboActive) {
        player.style.borderBottomColor = '#ffcc00';
        player.style.filter = 'drop-shadow(0 0 15px rgba(255,204,0,0.9))';
    } else if (gameState.isOnRubble) {
        player.style.borderBottomColor = '#888888';
        player.style.filter = 'drop-shadow(0 0 8px rgba(136,136,136,0.7))';
    } else if (gameState.isInCorpse) {
        player.style.borderBottomColor = '#ff6b9d';
        player.style.filter = 'drop-shadow(0 0 10px rgba(255,107,157,0.9))';
    } else {
        player.style.borderBottomColor = '#e94560';
        player.style.filter = 'drop-shadow(0 0 6px rgba(233,69,96,0.8))';
    }
}

// Daño/muerte común para cualquier fuente: proyectil directo u onda expansiva.
// Replica exactamente el comportamiento por tipo que tenía el loop de
// proyectiles. Devuelve true si el enemigo murió (el llamador hace el splice).
function handleEnemyHit(enemy, amount, impactAngle) {
    if (enemy.type === 'orange') {
        enemy.hitsTaken += amount;
        gameState.hits++;
        createOrganicOrangeExplosion(enemy.x, enemy.y, enemy.radius);
        if (enemy.element) enemy.element.remove();
        gameState.score += 100;
        updateScoreDisplay();
        gameState.orangeEnemiesToCreate++;
        
        let currentOrangeCount = gameState.enemies.filter(e => e.type === 'orange').length;
        let enemiesToCreate = gameState.orangeEnemiesToCreate - currentOrangeCount;
        for (let k = 0; k < enemiesToCreate; k++) {
            createEnemy('orange');
        }
        
        if (gameState.hits % 25 === 0 && gameState.hits > 0) {
            startSpecialEvent();
        }
        
        if (shouldCreateGreenEnemy()) {
            createGreenEnemy();
        }
        return true;
    }
    
    if (enemy.type === 'fuchsia') {
        enemy.hitsTaken += amount;
        gameState.hits += amount;
        if (enemy.hitsTaken >= 25) {
            DIRECTED_CORPSE_SYSTEM.transformEnemyToCorpse(enemy, impactAngle);
            gameState.score += 500;
            updateScoreDisplay();
            gameState.specialHits++;
            gameState.fuchsiaEnemiesCount++;
            
            for (let k = 0; k < 2; k++) {
                createEnemy('fuchsia');
            }
            
            if (gameState.hits % 25 === 0 && gameState.hits > 0) {
                startSpecialEvent();
            }
            
            if (shouldCreateGreenEnemy()) {
                createGreenEnemy();
            }
            return true;
        }
        return false;
    }
    
    if (enemy.type === 'green') {
        enemy.hitsTaken += amount;
        gameState.hits += amount;
        if (enemy.hitsTaken >= 100) {
            TENTACLE_SYSTEM.removeAllTentaclesForEnemy(enemy.id);
            DIRECTED_CORPSE_SYSTEM.transformEnemyToCorpse(enemy, impactAngle);
            gameState.score += 2000;
            updateScoreDisplay();
            gameState.greenHits++;
            gameState.greenEnemiesCount--;
            gameState.fuchsiaEnemiesCount++;
            
            for (let k = 0; k < 2; k++) {
                createEnemy('fuchsia');
            }
            
            if (shouldCreateGreenEnemy()) {
                createGreenEnemy();
            }
            
            if (gameState.hits % 25 === 0 && gameState.hits > 0) {
                startSpecialEvent();
            }
            return true;
        }
        return false;
    }
    
    // Otros tipos: solo acumulan daño (misma regla que tenía el juego antes)
    enemy.hitsTaken += amount;
    return false;
}

function updateProjectiles() {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        
        // Posicion previa del frame: la colision con obstaculos se chequea por
        // SEGMENTO (previo -> actual) para que los proyectiles rapidos no
        // atraviesen las paredes finas (16-50px/frame vs grosores de 2-4px).
        const prevX = projectile.x;
        const prevY = projectile.y;
        
        const shouldRemove = WEAPON_SYSTEM.updateProjectile(projectile);
        
        if (shouldRemove) {
            if (projectile.weaponType === "bazooka") {
                WEAPON_SYSTEM.applyBazookaAreaDamage(
                    projectile.x, 
                    projectile.y, 
                    projectile.explosionRadius || 60, 
                    projectile.areaDamage || 11
                );
            }
            WEAPON_SYSTEM.removeProjectile(projectile);
            gameState.projectiles.splice(i, 1);
            continue;
        }
        
        const obstacleHit = detectProjectileObstacleCollision(projectile, prevX, prevY);
        if (obstacleHit !== -1) {
            if (projectile.penetrating && obstacleHit === 0) {
                // Sniper: la bala atraviesa el obstaculo; pierde energia y sigue
                projectile.damage -= projectile.penetrationLoss;
                if (projectile.damage <= 0) {
                    WEAPON_SYSTEM.removeProjectile(projectile);
                    gameState.projectiles.splice(i, 1);
                    continue;
                }
            } else {
                // Impacto bloqueante (pared negra) o municion normal
                if (projectile.weaponType === "bazooka") {
                    WEAPON_SYSTEM.applyBazookaAreaDamage(
                        projectile.x, 
                        projectile.y, 
                        projectile.explosionRadius || 60, 
                        projectile.areaDamage || 11
                    );
                }
                WEAPON_SYSTEM.removeProjectile(projectile);
                gameState.projectiles.splice(i, 1);
                continue;
            }
        }
        
        if (projectile.weaponType === "bazooka" && projectile.distanceTraveled >= projectile.maxDistance) {
            WEAPON_SYSTEM.applyBazookaAreaDamage(projectile.x, projectile.y, projectile.explosionRadius, projectile.areaDamage);
            WEAPON_SYSTEM.removeProjectile(projectile);
            gameState.projectiles.splice(i, 1);
            continue;
        }
        
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            // La bala penetrante no vuelve a golpear al mismo enemigo
            if (projectile.hitEnemies && projectile.hitEnemies.has(enemy)) continue;
            const dx = projectile.x - enemy.x;
            const dy = projectile.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionDistance = (projectile.weaponType === "shotgun" ? 1.5 : 0.5) + enemy.radius;
            
            let impactado = false;
            if (projectile.penetrating) {
                // Balas penetrantes: detección swept (segmento-círculo). El sniper
                // avanza 50px/frame y el chequeo punto-final le hace saltarse
                // enemigos pequeños entre frames (tunneling de enemigos)
                const segDx = projectile.x - prevX;
                const segDy = projectile.y - prevY;
                const len2 = segDx * segDx + segDy * segDy;
                let pr = len2 > 0 ? ((enemy.x - prevX) * segDx + (enemy.y - prevY) * segDy) / len2 : 0;
                pr = Math.max(0, Math.min(1, pr));
                const closerX = prevX + segDx * pr;
                const closerY = prevY + segDy * pr;
                const dx = enemy.x - closerX;
                const dy = enemy.y - closerY;
                impactado = dx * dx + dy * dy < collisionDistance * collisionDistance;
            } else {
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                impactado = Math.sqrt(dx * dx + dy * dy) < collisionDistance;
            }
            
            if (impactado) {
                const impactAngle = Math.atan2(projectile.speedY, projectile.speedX);
                const enemyDied = handleEnemyHit(enemy, projectile.damage, impactAngle);
                if (enemyDied) {
                    gameState.enemies.splice(j, 1);
                    gameState.currentEnemyCount--;
                }
                if (projectile.penetrating) {
                    // Sniper: sigue atravesando; pierde energia con cada enemigo
                    projectile.hitEnemies.add(enemy);
                    projectile.damage -= projectile.penetrationLoss;
                    if (projectile.damage <= 0) {
                        WEAPON_SYSTEM.removeProjectile(projectile);
                        gameState.projectiles.splice(i, 1);
                        break;
                    }
                } else {
                    WEAPON_SYSTEM.removeProjectile(projectile);
                    gameState.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
}

function updateEnemies(deltaTime) {
    if (gameState.mergingEnemies) return;
    
    // Spatial Hash collision system (feature flag)
    if (gameState.useSpatialHash) {
        detectEnemyCollisions_Spatial();
        updateProjectileCollisions_Spatial();
    } else {
        detectEnemyCollisions();
    }
    
    detectObstacleCollisions();
    detectBorderCollisions();
    
    const activeEnemies = getActiveEnemies();
    
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        
        if (enemy.element && !enemy.element.classList.contains('dead-fuxia') && !enemy.element.classList.contains('dead-green')) {
            // Con canvas render: NO escribir al DOM (el canvas lo dibuja)
            if (!(USE_CANVAS_RENDER && window.CANVAS_RENDER)) {
                if (gameState.useRenderBatching && window.RENDER_BATCH) {
                    RENDER_BATCH.add(() => {
                        if (enemy.element) enemy.element.style.cssText = `left:${enemy.x - enemy.radius}px;top:${enemy.y - enemy.radius}px`;
                    });
                } else {
                    enemy.element.style.cssText = `left:${enemy.x - enemy.radius}px;top:${enemy.y - enemy.radius}px`;
                }
            }
        }
        
        if (enemy.type === 'green' && enemy.active) {
            TENTACLE_SYSTEM.updateTentacles(enemy, deltaTime);
        }
        
        const dx = gameState.playerX - enemy.x;
        const dy = gameState.playerY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = 12 + enemy.radius;
        
        if (distance < collisionDistance) {
            if (enemy.type === 'green') {
                TENTACLE_SYSTEM.removeAllTentaclesForEnemy(enemy.id);
                gameState.playerLives = 0;
            } else {
                gameState.playerLives--;
            }
            updateHealthBar();
            
            player.style.opacity = '0.5';
            setTimeout(() => {
                if (gameState.gameActive) player.style.opacity = '1';
            }, 200);
            
            if (!enemy.deadClass) {
                if (enemy.type === 'green') {
                    TENTACLE_SYSTEM.removeAllTentaclesForEnemy(enemy.id);
                }
                
                if (enemy.element) enemy.element.remove();
                const globalIndex = gameState.enemies.indexOf(enemy);
                if (globalIndex !== -1) {
                    gameState.enemies.splice(globalIndex, 1);
                }
                gameState.currentEnemyCount--;
                
                if (enemy.type === 'green') {
                    gameState.greenEnemiesCount--;
                }
                
                if (enemy.type === 'fuchsia') {
                    createEnemy('fuchsia');
                } else if (enemy.type === 'orange') {
                    let currentOrangeCount = gameState.enemies.filter(e => e.type === 'orange').length;
                    if (currentOrangeCount < gameState.orangeEnemiesToCreate * 3) {
                        createEnemy('orange');
                    }
                } else if (enemy.type === 'green') {
                    if (gameState.playerLives > 0 && shouldCreateGreenEnemy()) {
                        createGreenEnemy();
                    }
                }
            }
            
            if (gameState.playerLives <= 0) {
                endGame();
            }
            break;
        }
    }
}

function shoot() {
    if (!gameState.gameActive || gameState.mergingEnemies || !gameState.canShoot) return;
    
    const weapon = WEAPON_SYSTEM.getCurrentWeapon();
    const mouseWorldX = gameState.mouseX + gameState.cameraX;
    const mouseWorldY = gameState.mouseY + gameState.cameraY;
    
    const projectiles = WEAPON_SYSTEM.shoot(
        gameState.playerX, gameState.playerY, 
        mouseWorldX, mouseWorldY
    );
    
    gameState.projectiles.push(...projectiles);
    
    if (COOLDOWN_SYSTEM.incrementShots(weapon.type)) {
        // El enfriamiento se activó automáticamente
    }
    
    if (weapon.type === 'minigun') {
        WEAPON_SYSTEM.updateAmmoDisplay();
    }
}

function endGame() {
    gameState.gameActive = false;
    if (finalScoreElement) finalScoreElement.textContent = `Puntuación: ${formatScore(gameState.score)}`;
    if (document.getElementById('hits-final')) document.getElementById('hits-final').textContent = `Impactos: ${gameState.hits}`;
    if (document.getElementById('walls-destroyed')) document.getElementById('walls-destroyed').textContent = `Ladrillos destruidos: ${gameState.wallsDestroyed}`;
    if (document.getElementById('special-count')) document.getElementById('special-count').textContent = `Círculos fucsia eliminados: ${gameState.specialHits}`;
    if (document.getElementById('green-count')) document.getElementById('green-count').textContent = `Círculos verdes eliminados: ${gameState.greenHits}`;
    if (document.getElementById('pestilence-damage')) document.getElementById('pestilence-damage').textContent = `Daño por pestilencia recibido: ${gameState.pestilenceDamageReceived || 0}`;
    if (document.getElementById('splash-damage')) document.getElementById('splash-damage').textContent = `Daño por salpicadura recibido: ${DIRECTED_CORPSE_SYSTEM.splashDamageTotal || 0}`;
    if (document.getElementById('tentacle-damage')) document.getElementById('tentacle-damage').textContent = `Daño por tentáculos recibido: ${TENTACLE_SYSTEM.tentacleDamageTotal || 0}`;
    if (document.getElementById('tentacles-destroyed')) document.getElementById('tentacles-destroyed').textContent = `Tentáculos destruidos: ${TENTACLE_SYSTEM.tentaclesDestroyed || 0}`;
    if (document.getElementById('rifle-shots')) document.getElementById('rifle-shots').textContent = `Disparos de rifle: ${WEAPON_SYSTEM.rifleShots}`;
    if (document.getElementById('shotgun-shots')) document.getElementById('shotgun-shots').textContent = `Disparos de escopeta: ${WEAPON_SYSTEM.shotgunShots}`;
    if (document.getElementById('machinegun-shots')) document.getElementById('machinegun-shots').textContent = `Disparos de ametralladora: ${WEAPON_SYSTEM.machinegunShots}`;
    if (document.getElementById('minigun-shots')) document.getElementById('minigun-shots').textContent = `Disparos de minigun: ${WEAPON_SYSTEM.minigunShots}`;
    if (document.getElementById('max-level')) document.getElementById('max-level').textContent = `Nivel máximo alcanzado: ${gameState.maxLevelReached}`;
    
    if (gameOverMessage) {
        if (gameState.score < 1000) {
            gameOverMessage.textContent = "¡Sigue practicando!";
        } else if (gameState.score < 3000) {
            gameOverMessage.textContent = "¡Buen trabajo!";
        } else if (gameState.score < 6000) {
            gameOverMessage.textContent = "¡Excelente!";
        } else if (gameState.score < 10000) {
            gameOverMessage.textContent = "¡Increíble! ¡Eres un experto!";
        } else {
            gameOverMessage.textContent = "¡Leyenda! ¡Nivel maestro alcanzado!";
        }
    }
    
    if (gameOverScreen) gameOverScreen.style.display = 'block';
}

function toggleMinimap() {
    gameState.minimapVisible = !gameState.minimapVisible;
    if (minimap) minimap.style.display = gameState.minimapVisible ? 'block' : 'none';
    if (gameState.minimapVisible) {
        // Forzar reconstrucción al volver a mostrarlo (por si cambió de región mientras estaba oculto)
        minimapRegionCache = null;
        updateMinimapCached();
    }
}

function updateWorldColorBasedOnLevel() {
    let uniqueRegionsExplored = gameState.exploredRegions.size;
    let newLevel = Math.max(0, uniqueRegionsExplored - 1);
    newLevel = Math.min(newLevel, COLOR_SYSTEM.MAX_LEVEL);
    
    if (newLevel !== gameState.currentLevel) {
        gameState.previousLevel = gameState.currentLevel;
        gameState.currentLevel = newLevel;
        
        if (newLevel > gameState.maxLevelReached) {
            gameState.maxLevelReached = newLevel;
        }
        
        COLOR_SYSTEM.updateVisualProgress(newLevel);
        
        if (newLevel > gameState.previousLevel) {
            const targetColor = COLOR_SYSTEM.getColorForLevel(newLevel);
            COLOR_SYSTEM.applyColorTransition(targetColor);
            updateGameContainerColor(targetColor);
            updateExistingRegionBackgrounds();
        }
    }
}

function updateGameContainerColor(targetColor) {
    if (!gameContainer) return;
    const colorString = COLOR_SYSTEM.rgbToString(targetColor);
    gameContainer.style.backgroundColor = colorString;
    gameContainer.style.boxShadow = `0 0 40px rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.3)`;
}

function updateExistingRegionBackgrounds() {
    const currentLevel = gameState.currentLevel;
    const targetColor = COLOR_SYSTEM.getColorForLevel(currentLevel);
    const colorString = COLOR_SYSTEM.rgbToString(targetColor);
    
    gameState.regionBackgrounds.forEach(bg => {
        if (bg.element && worldContainer.contains(bg.element)) {
            bg.element.style.backgroundColor = colorString;
        }
    });
}

function findSafeStartPosition() {
    const regionX = Math.floor(900 / REGION_WIDTH);
    const regionY = Math.floor(900 / REGION_HEIGHT);
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        const worldX = regionX * REGION_WIDTH + Math.random() * (REGION_WIDTH - 100) + 50;
        const worldY = regionY * REGION_HEIGHT + Math.random() * (REGION_HEIGHT - 100) + 50;
        
        const playerRadius = 12;
        let positionValid = true;
        
        for (let obstacle of gameState.obstacles) {
            if (obstacle.isBlack) {
                if (worldX + playerRadius >= obstacle.left && 
                    worldX - playerRadius <= obstacle.right && 
                    worldY + playerRadius >= obstacle.top && 
                    worldY - playerRadius <= obstacle.bottom) {
                    positionValid = false;
                    break;
                }
            }
        }
        
        for (let obstacle of gameState.obstacles) {
            if (obstacle.isBrick) {
                if (worldX + playerRadius >= obstacle.left && 
                    worldX - playerRadius <= obstacle.right && 
                    worldY + playerRadius >= obstacle.top && 
                    worldY - playerRadius <= obstacle.bottom) {
                    positionValid = false;
                    break;
                }
            }
        }
        
        for (let enemy of gameState.enemies) {
            const dx = worldX - enemy.x;
            const dy = worldY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < playerRadius + enemy.radius + 50) {
                positionValid = false;
                break;
            }
        }
        
        if (positionValid) {
            return { x: worldX, y: worldY };
        }
        
        attempts++;
    }
    
    return { x: 900, y: 900 };
}