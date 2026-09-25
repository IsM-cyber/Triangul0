// ========== CACHE DE ELEMENTOS DOM ==========
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const worldContainer = document.getElementById('world-container');
const gameWrapper = document.getElementById('game-wrapper');
const startButton = document.getElementById('start-button');
const player = document.getElementById('player');
const cursor = document.getElementById('cursor');
const scoreDisplay = document.getElementById('score-display');
const healthBar = document.getElementById('health-bar');
const turboBar = document.getElementById('turbo-bar');
const levelBar = document.getElementById('level-bar');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const gameOverMessage = document.getElementById('game-over-message');
const restartButton = document.getElementById('restart-button');
const minimap = document.getElementById('minimap');
const instructionsToggle = document.getElementById('instructions-toggle');
const instructionsBox = document.getElementById('instructions-box');
const cooldownIndicator = document.getElementById('cooldown-indicator');
const cooldownBar = document.getElementById('cooldown-bar');
const cooldownText = document.getElementById('cooldown-text');
const weaponIcon = document.getElementById('weapon-icon');
const weaponName = document.getElementById('weapon-name');
const ammoContainer = document.getElementById('ammo-container');
const ammoIndicator = document.getElementById('ammo-indicator');
const ammoBar = document.getElementById('ammo-bar');

// Ensure window.gameState reference exists for touch controls
window.gameState = window.gameState || {};

// ========== CANVAS RENDER (feature flag) ==========
// Cuando está activo, enemigos y proyectiles se dibujan en canvas y NO tocan el DOM
const USE_CANVAS_RENDER = true;

// ========== INICIALIZACIÓN ==========

function initGame() {
    console.log("Iniciando juego...");
    
    if (worldContainer) worldContainer.innerHTML = '';
    
    // Inicializar canvas render (enemigos + proyectiles)
    if (USE_CANVAS_RENDER && window.CANVAS_RENDER) {
        CANVAS_RENDER.init();
    }
    
    // Estado inicial completo - expose on window for touch controls
    window.gameState = gameState = {
        playerX: 900,
        playerY: 900,
        playerRotation: 0,
        playerSpeed: 3.75,
        turboMode: false,
        turboActive: false,
        turboCurrent: 12.0,
        turboMax: 12.0,
        turboDepletionRate: 0.5,
        turboRechargeRate: 0.25,
        turboAngle: 0,
        score: 0,
        hits: 0,
        wallsDestroyed: 0,
        specialHits: 0,
        greenHits: 0,
        pestilenceDamageReceived: 0,
        splashDamageReceived: 0,
        tentacleDamageReceived: 0,
        tentaclesDestroyed: 0,
        rifleShots: 0,
        shotgunShots: 0,
        machinegunShots: 0,
        minigunShots: 0,
        mouseX: 300,
        mouseY: 300,
        gameStarted: true,
        gameActive: true,
        playerLives: 99,
        playerSlowZonesCount: 0,
        cameraX: 0,
        cameraY: 0,
        currentRegionX: 1,
        currentRegionY: 1,
        isSpecialEvent: false,
        mergingEnemies: false,
        currentEnemyCount: 0,
        orangeEnemiesToCreate: 30,
        fuchsiaEnemiesCount: 0,
        greenEnemiesCount: 0,
        keys: {},
        projectiles: [],
        enemies: [],
        obstacles: [],
        playerPrevX: 900,
        playerPrevY: 900,
        stains: [],
        minimapVisible: false,
        centralRegionTemplate: {
            obstacles: [],
            enemies: []
        },
        shotsFired: 0,
        canShoot: true,
        isCooldownActive: false,
        cooldownTimer: null,
        lastTurboUpdate: Date.now(),
        turboRequested: false,
        turboRunning: false,
        currentLevel: 0,
        previousLevel: 0,
        maxLevelReached: 0,
        regionBackgrounds: [],
        levelUpdateCooldown: 0,
        exploredRegions: new Set(),
        isOnRubble: false,
        rubbleDeviationX: 0,
        rubbleDeviationY: 0,
        rubbleEffectActive: false,
        lastRubbleCheck: 0,
        isInCorpse: false,
        lastCorpseDamage: 0,
        cooldownWeaponType: null
    };
    
    WEAPON_SYSTEM.init();
    WEAPON_SYSTEM.resetStats();
    COOLDOWN_SYSTEM.init();
    RUBBLE_SYSTEM.reset();
    DIRECTED_CORPSE_SYSTEM.clearAllCorpses();
    TENTACLE_SYSTEM.clearAllTentacles();
    
    regionState.loadedRegions.clear();
    regionState.lastUpdate = 0;
    
    obstacleGrid.clear();
    
    if (minimap) minimap.style.display = 'none';
    if (cooldownIndicator) cooldownIndicator.style.display = 'none';
    if (cooldownBar) cooldownBar.style.transform = 'scaleX(1)';
    if (cooldownText) cooldownText.textContent = 'RECARGANDO...';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (ammoContainer) ammoContainer.style.display = 'none';
    
    if (player) {
        player.classList.remove('slowed', 'slowed2', 'turbo-active', 'unstable', 'pestilent', 'splash-hit');
        player.style.opacity = '1';
        player.style.setProperty('--player-rotation', '0deg');
        player.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    }
    
    updateScoreDisplay();
    updateHealthBar();
    updateTurboBar();
    
    const startColor = COLOR_SYSTEM.getColorForLevel(0);
    updateGameContainerColor(startColor);
    COLOR_SYSTEM.updateVisualProgress(0);
    
    if (cursor) cursor.style.display = 'block';
    
    createCentralRegionTemplate();
    
    const startRegion = {x: 1, y: 1};
    
    loadRegion(startRegion.x, startRegion.y);
    
    gameState.exploredRegions.add(getRegionKey(startRegion.x, startRegion.y));
    
    for (let y = startRegion.y - LOAD_RADIUS; y <= startRegion.y + LOAD_RADIUS; y++) {
        for (let x = startRegion.x - LOAD_RADIUS; x <= startRegion.x + LOAD_RADIUS; x++) {
            if (x !== startRegion.x || y !== startRegion.y) {
                loadRegion(x, y);
            }
        }
    }
    
    const safePosition = findSafeStartPosition();
    gameState.playerX = safePosition.x;
    gameState.playerY = safePosition.y;
    gameState.playerPrevX = safePosition.x;
    gameState.playerPrevY = safePosition.y;
    
    gameState.currentRegionX = Math.floor(gameState.playerX / REGION_WIDTH);
    gameState.currentRegionY = Math.floor(gameState.playerY / REGION_HEIGHT);
    
    for (let i = 0; i < 30; i++) {
        createEnemy('orange');
    }
    
    createEnemy('fuchsia');
    createEnemy('fuchsia');
    createEnemy('fuchsia');
    
    updateEnemyActivity();
    
    updateCamera();
    
    const playerScreenX = gameState.playerX - gameState.cameraX;
    const playerScreenY = gameState.playerY - gameState.cameraY;
    if (player) {
        player.style.cssText = `left:${playerScreenX}px;top:${playerScreenY}px;transform:translate(-50%,-50%) rotate(${gameState.playerRotation}deg)`;
    }
    
    console.log("Juego reiniciado correctamente. Posición segura:", gameState.playerX, gameState.playerY);
    }

    function toggleInstructions() {
        if (instructionsBox && instructionsToggle) {
            instructionsBox.classList.toggle('expanded');
            instructionsToggle.textContent = instructionsBox.classList.contains('expanded') ? 'OCULTAR INSTRUCCIONES' : 'VER INSTRUCCIONES';
        }
    }

    let lastTime = 0;

    function gameLoop(timestamp) {
                if (!lastTime) lastTime = timestamp;
                const deltaTime = (timestamp - lastTime) / 1000;
                lastTime = timestamp;
   
                if (gameState.gameActive) {
                    updateTurbo();
                    updatePlayerPosition();
                    updateProjectiles();
                    updateEnemies(deltaTime);
       
                    updateDynamicLoading();
       
                    if (shouldCreateGreenEnemy() && gameState.greenEnemiesCount === 0) {
                        createGreenEnemy();
                    }
       
                    if (Math.random() < 0.01) {
                        cleanupOldStains();
                    }
                }
    
                // Render en canvas (enemigos + proyectiles) cuando está activo
                if (USE_CANVAS_RENDER && window.CANVAS_RENDER) {
                    CANVAS_RENDER.render(deltaTime);
                }
    
                // Flush render batch at end of frame
                if (gameState.useRenderBatching && window.RENDER_BATCH) {
                    RENDER_BATCH.flush();
                }
    
                requestAnimationFrame(gameLoop);
            }

    // ========== EVENT LISTENERS ==========

document.addEventListener('keydown', (e) => {
    if (!gameState.gameActive || gameState.mergingEnemies) return;
    
    const key = e.key.toLowerCase();
    
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        gameState.keys[key] = true;
        e.preventDefault();
    }
    
    if (e.key === ' ') {
        if (!gameState.turboRunning && gameState.turboCurrent > 0) {
            gameState.turboRequested = true;
            gameState.turboRunning = true;
            gameState.turboActive = true;
            gameState.turboMode = true;
            
            const mouseWorldX = gameState.mouseX + gameState.cameraX;
            const mouseWorldY = gameState.mouseY + gameState.cameraY;
            const dx = mouseWorldX - gameState.playerX;
            const dy = mouseWorldY - gameState.playerY;
            gameState.turboAngle = Math.atan2(dy, dx);
        }
        e.preventDefault();
    }
    
    if (e.key === '1') {
        WEAPON_SYSTEM.switchWeapon(1);
    }
    
    if (e.key === '2') {
        WEAPON_SYSTEM.switchWeapon(2);
    }
    
    if (e.key === '3') {
        WEAPON_SYSTEM.switchWeapon(3);
    }

     if (e.key === '4') {
        WEAPON_SYSTEM.switchWeapon(4);
    }
    
    if (e.key === '5') {
        WEAPON_SYSTEM.switchWeapon(5);
    }
    
    if (e.key === '6') {
        WEAPON_SYSTEM.switchWeapon(6);
    }
    
    // T: atajo de prueba para ver el evento especial sin tener que
    // matar enemigos naranjas. Usa el mismo entry point que el juego.
    if (key === 't' && !e.repeat) {
        startSpecialEvent();
    }
    
    if (e.key === 'r' || e.key === 'R') {
        console.log("Reiniciando juego con tecla R...");
        initGame();
    }
    
    if (e.key === 'm' || e.key === 'M') {
        toggleMinimap();
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        gameState.keys[key] = false;
    }
});

if (gameContainer) {
    gameContainer.addEventListener('mousemove', (e) => {
        // Skip if touch controls are active (right joystick controls aim)
        if (window.TouchControls && window.TouchControls.enabled && window.TouchControls.lookTouchId !== null) {
            return;
        }
        const rect = gameContainer.getBoundingClientRect();
        const scale = Math.max(window.innerWidth, window.innerHeight) / 600 * 1.15;
        gameState.mouseX = (e.clientX - rect.left) / scale;
        gameState.mouseY = (e.clientY - rect.top) / scale;
        if (cursor) cursor.style.cssText = `left:${gameState.mouseX}px;top:${gameState.mouseY}px;display:block`;
    });

    gameContainer.addEventListener('touchmove', (e) => {
            // When touch controls are enabled, ONLY the right joystick should control aim
            // Disable all screen touchmove aim updates
            if (window.TouchControls && window.TouchControls.enabled) {
                return;
            }
            // Allow single-touch mouse emulation for desktop-like behavior (only when touch controls disabled)
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = gameContainer.getBoundingClientRect();
                const scale = Math.max(window.innerWidth, window.innerHeight) / 600 * 1.15;
                gameState.mouseX = (touch.clientX - rect.left) / scale;
                gameState.mouseY = (touch.clientY - rect.top) / scale;
                if (cursor) cursor.style.cssText = `left:${gameState.mouseX}px;top:${gameState.mouseY}px;display:block`;
            }
        }, { passive: true });

        gameContainer.addEventListener('touchstart', (e) => {
            // Block touchstart on gameContainer if touch controls are enabled
            if (window.TouchControls && window.TouchControls.enabled) {
                e.preventDefault();
                return;
            }
        }, { passive: false });

        gameContainer.addEventListener('touchend', (e) => {
            // Block touchend on gameContainer if touch controls are enabled
            if (window.TouchControls && window.TouchControls.enabled) {
                e.preventDefault();
                return;
            }
        }, { passive: false });

    gameContainer.addEventListener('mousedown', () => {
        WEAPON_SYSTEM.isMouseDown = true;
        
        if (WEAPON_SYSTEM.currentWeapon.type === 'machinegun') {
            WEAPON_SYSTEM.startMachinegun();
        } else if (WEAPON_SYSTEM.currentWeapon.type === 'minigun') {
            WEAPON_SYSTEM.startMinigun();
        } else if (gameState.gameActive && !gameState.mergingEnemies && gameState.canShoot) {
            shoot();
        }
    });

    gameContainer.addEventListener('mouseup', () => {
        WEAPON_SYSTEM.isMouseDown = false;
        WEAPON_SYSTEM.stopMachinegun();
        WEAPON_SYSTEM.stopMinigun();
    });

    gameContainer.addEventListener('mouseenter', () => {
        if (cursor) cursor.style.display = 'block';
    });

    gameContainer.addEventListener('mouseleave', () => {
        if (cursor) cursor.style.display = 'none';
        WEAPON_SYSTEM.isMouseDown = false;
        WEAPON_SYSTEM.stopMachinegun();
        WEAPON_SYSTEM.stopMinigun();
    });
}

if (startButton) {
    const startGame = () => {
        startScreen.style.opacity = '0';
        startScreen.style.pointerEvents = 'none';
        // Enable touch controls now that game has started
        if (window.TouchControls) window.TouchControls.setEnabled(true);
        // Show HUD and minimap
        const topHud = document.getElementById('top-hud');
        const minimap = document.getElementById('minimap');
        if (topHud) topHud.style.display = 'flex';
        if (minimap) minimap.style.display = 'block';
        setTimeout(() => {
            startScreen.style.display = 'none';
            gameWrapper.style.display = 'flex';
            gameState.gameStarted = true;
            gameState.lastTurboUpdate = Date.now();
            initGame();
        }, 800);
    };
    startButton.addEventListener('click', startGame);
    startButton.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); }, { passive: false });
}

if (restartButton) {
    restartButton.addEventListener('click', () => {
        console.log("Reiniciando juego desde botón...");
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        // Show HUD and minimap on restart
        const topHud = document.getElementById('top-hud');
        const minimap = document.getElementById('minimap');
        if (topHud) topHud.style.display = 'flex';
        if (minimap) minimap.style.display = 'block';
        initGame();
    });
}

if (instructionsToggle) {
    instructionsToggle.addEventListener('click', toggleInstructions);
}

updateScoreDisplay();
updateHealthBar();
updateTurboBar();

// ========== RESPONSIVE: zoom IN to cover full screen ==========
function handleResize() {
    // Scale to cover entire screen (overflow on all 4 sides)
    const scale = Math.max(window.innerWidth, window.innerHeight) / 600 * 1.15;
    if (gameWrapper) {
        gameWrapper.style.transform = `scale(${scale})`;
        gameWrapper.style.transformOrigin = 'center center';
    }
}
window.addEventListener('resize', handleResize);
handleResize();

// Iniciar el bucle del juego
gameLoop();

// Mover game-over-screen al body para sacarlo del wrapper escalado
// (position:fixed se rompe dentro de un ancestro con transform:scale)
// y para que initGame() (worldContainer.innerHTML='') no lo borre.
if (gameOverScreen) {
    gameOverScreen.style.position = 'fixed';
    gameOverScreen.style.zIndex = '1000';
    document.body.appendChild(gameOverScreen);
}