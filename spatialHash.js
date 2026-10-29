// ========== SPATIAL HASH GRID ==========
// División espacial para colisiones O(n) en lugar de O(n²)
// Cell size: 100px (≈ 3x radio promedio enemigo)

const SPATIAL_HASH = {
    cellSize: 100,
    grid: new Map(),
    worldW: 1800,
    worldH: 1800,
    
    // Convierte coordenadas mundo a clave de celda "cx,cy"
    getKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        // Clamp a límites de grilla
        const maxCx = Math.floor(this.worldW / this.cellSize);
        const maxCy = Math.floor(this.worldH / this.cellSize);
        const clampedCx = Math.max(0, Math.min(cx, maxCx));
        const clampedCy = Math.max(0, Math.min(cy, maxCy));
        return `${clampedCx},${clampedCy}`;
    },
    
    // Limpia la grilla (llamar al inicio de cada frame)
    clear() {
        this.grid.clear();
    },
    
    // Inserta índice de entidad en su celda
    insert(entityIdx, x, y) {
        const key = this.getKey(x, y);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(entityIdx);
    },
    
    // Obtiene índices de entidades en celda propia + 8 vecinas
    getNearby(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const nearby = [];
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                const cell = this.grid.get(key);
                if (cell) nearby.push(...cell);
            }
        }
        return nearby;
    },
    
    // Debug: dibuja la grilla (opcional)
    debugDraw(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,0,0.08)';
        ctx.lineWidth = 0.5;
        const cols = Math.floor(this.worldW / this.cellSize);
        const rows = Math.floor(this.worldH / this.cellSize);
        
        for (let i = 0; i <= cols; i++) {
            const x = i * this.cellSize - cameraX;
            ctx.beginPath();
            ctx.moveTo(x, -cameraY);
            ctx.lineTo(x, this.worldH - cameraY);
            ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
            const y = j * this.cellSize - cameraY;
            ctx.beginPath();
            ctx.moveTo(-cameraX, y);
            ctx.lineTo(this.worldW - cameraX, y);
            ctx.stroke();
        }
        ctx.restore();
    },
    
    // Stats para debug
    getStats() {
        let totalEntities = 0;
        let nonEmptyCells = 0;
        for (const [, entities] of this.grid) {
            if (entities.length > 0) nonEmptyCells++;
            totalEntities += entities.length;
        }
        return { totalEntities, nonEmptyCells, totalCells: this.grid.size };
    }
};

window.SPATIAL_HASH = SPATIAL_HASH;