// ========== SISTEMA DE VERIFICACIÓN DE SUPERPOSICIÓN ==========
const obstacleGrid = {
    cellSize: 60,
    grid: new Map(),
    
    clear() {
        this.grid.clear();
    },
    
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    },
    
    addObstacle(obstacle) {
        const left = obstacle.x - obstacle.width / 2;
        const right = obstacle.x + obstacle.width / 2;
        const top = obstacle.y - obstacle.height / 2;
        const bottom = obstacle.y + obstacle.height / 2;
        
        const startCellX = Math.floor(left / this.cellSize);
        const endCellX = Math.floor(right / this.cellSize);
        const startCellY = Math.floor(top / this.cellSize);
        const endCellY = Math.floor(bottom / this.cellSize);
        
        for (let cellX = startCellX; cellX <= endCellX; cellX++) {
            for (let cellY = startCellY; cellY <= endCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(obstacle);
            }
        }
    },

    // Devuelve los obstáculos en las celdas alrededor de un punto (radio en px).
    // Reemplaza el barrido completo O(N) por una búsqueda en celdas vecinas.
    getNearbyObstacles(x, y, radius) {
        const minCellX = Math.floor((x - radius) / this.cellSize);
        const maxCellX = Math.floor((x + radius) / this.cellSize);
        const minCellY = Math.floor((y - radius) / this.cellSize);
        const maxCellY = Math.floor((y + radius) / this.cellSize);
        
        const result = [];
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const cell = this.grid.get(`${cellX},${cellY}`);
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        result.push(cell[i]);
                    }
                }
            }
        }
        return result;
    },

    // Elimina un obstáculo del grid (necesario cuando se destruye un brick)
    removeObstacle(obstacle) {
        if (!obstacle) return;
        const left = obstacle.x - obstacle.width / 2;
        const right = obstacle.x + obstacle.width / 2;
        const top = obstacle.y - obstacle.height / 2;
        const bottom = obstacle.y + obstacle.height / 2;
        
        const startCellX = Math.floor(left / this.cellSize);
        const endCellX = Math.floor(right / this.cellSize);
        const startCellY = Math.floor(top / this.cellSize);
        const endCellY = Math.floor(bottom / this.cellSize);
        
        for (let cellX = startCellX; cellX <= endCellX; cellX++) {
            for (let cellY = startCellY; cellY <= endCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                const cell = this.grid.get(key);
                if (cell) {
                    const idx = cell.indexOf(obstacle);
                    if (idx !== -1) {
                        cell.splice(idx, 1);
                    }
                }
            }
        }
    }
};