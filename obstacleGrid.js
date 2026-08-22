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
    }
};