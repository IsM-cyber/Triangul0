// ========== MINIMAP CACHE SYSTEM ==========
// Reuses DOM elements instead of recreating every frame

const MinimapCache = {
    regions: [],
    playerIndicator: null,
    initialized: false,
    lastUpdate: 0,
    updateInterval: 100, // ms

    init() {
        if (this.initialized) return;
        
        const minimap = document.getElementById('minimap');
        if (!minimap) return;
        
        // Create 25 region divs (5x5 grid)
        for (let i = 0; i < 25; i++) {
            const regionDiv = document.createElement('div');
            regionDiv.className = 'minimap-region';
            regionDiv.style.cssText = `
                position: absolute;
                width: 20%;
                height: 20%;
                border: 1px solid rgba(0, 255, 0, 0.2);
                box-sizing: border-box;
                pointer-events: none;
            `;
            minimap.appendChild(regionDiv);
            this.regions.push({
                element: regionDiv,
                x: i % 5,
                y: Math.floor(i / 5),
                hasObstacles: false,
                hasEnemies: false,
                explored: false
            });
        }
        
        // Create player indicator
        this.playerIndicator = document.createElement('div');
        this.playerIndicator.className = 'minimap-player';
        this.playerIndicator.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: #00ffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 4px #00ffff;
        `;
        minimap.appendChild(this.playerIndicator);
        
        this.initialized = true;
    },

    update(playerX, playerY, gameState) {
        if (!this.initialized) this.init();
        if (!this.initialized) return;
        
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = now;
        
        const minimap = document.getElementById('minimap');
        if (!minimap) return;
        
        const REGION_WIDTH = 600;
        const REGION_HEIGHT = 600;
        const MINIMAP_SIZE = 150; // CSS width/height of minimap
        const REGIONS_PER_SIDE = 5;
        
        // Update player position on minimap
        const playerRegionX = Math.floor(playerX / REGION_WIDTH);
        const playerRegionY = Math.floor(playerY / REGION_HEIGHT);
        const playerLocalX = (playerX % REGION_WIDTH) / REGION_WIDTH;
        const playerLocalY = (playerY % REGION_HEIGHT) / REGION_HEIGHT;
        
        const minimapX = ((playerRegionX + playerLocalX) / REGIONS_PER_SIDE) * MINIMAP_SIZE;
        const minimapY = ((playerRegionY + playerLocalY) / REGIONS_PER_SIDE) * MINIMAP_SIZE;
        
        this.playerIndicator.style.left = `${minimapX}px`;
        this.playerIndicator.style.top = `${minimapY}px`;
        
        // Update region states - use regionState.loadedRegions
        const loadedRegions = (typeof regionState !== 'undefined' && regionState.loadedRegions) ? regionState.loadedRegions : new Map();
        const exploredRegions = gameState.exploredRegions || new Set();
        
        this.regions.forEach(region => {
            const regionKey = `${region.x},${region.y}`;
            const explored = exploredRegions.has(regionKey);
            const regionData = loadedRegions.get(regionKey);
            
            let className = 'minimap-region';
            let bgColor = 'transparent';
            
            if (region.x === playerRegionX && region.y === playerRegionY) {
                className += ' current';
                bgColor = 'rgba(0, 255, 255, 0.3)';
            } else if (explored) {
                className += ' explored';
                if (regionData?.enemies?.length > 0) {
                    bgColor = 'rgba(255, 0, 255, 0.2)';
                } else if (regionData?.obstacles?.length > 0) {
                    bgColor = 'rgba(100, 100, 100, 0.3)';
                } else {
                    bgColor = 'rgba(0, 255, 0, 0.1)';
                }
            }
            
            region.element.className = className;
            region.element.style.backgroundColor = bgColor;
        });
    },

    reset() {
        this.regions.forEach(r => {
            r.element.className = 'minimap-region';
            r.element.style.backgroundColor = 'transparent';
        });
        if (this.playerIndicator) {
            this.playerIndicator.style.left = '0px';
            this.playerIndicator.style.top = '0px';
        }
    }
};

// Export for use in main.js
window.MinimapCache = MinimapCache;