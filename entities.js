// ========== SoA (Structure of Arrays) ENTITIES ==========
// Better cache locality: separate arrays per field instead of array of objects

const EntitySoA = {
    // Enemy arrays
    enemies: {
        count: 0,
        capacity: 120,
        active: [],
        x: [],
        y: [],
        vx: [],
        vy: [],
        radius: [],
        hp: [],
        maxHp: [],
        type: [],           // 'orange', 'fuchsia', 'green'
        element: [],
        merging: [],
        hitsTaken: [],
        hitsRequired: [],
        prevX: [],
        prevY: [],
        slowZonesCount: [],
        regionX: [],
        regionY: [],
        tentacleWavePhase: [],
        tentacleSlowApplied: [],
        deadClass: [],      // 'dead-fuxia', 'dead-green', or ''
        
        init(capacity = 120) {
            this.capacity = capacity;
            this.count = 0;
            this.active = new Array(capacity);
            this.x = new Float32Array(capacity);
            this.y = new Float32Array(capacity);
            this.vx = new Float32Array(capacity);
            this.vy = new Float32Array(capacity);
            this.radius = new Float32Array(capacity);
            this.hp = new Float32Array(capacity);
            this.maxHp = new Float32Array(capacity);
            this.type = new Array(capacity);
            this.element = new Array(capacity);
            this.merging = new Uint8Array(capacity);
            this.hitsTaken = new Uint16Array(capacity);
            this.hitsRequired = new Uint16Array(capacity);
            this.prevX = new Float32Array(capacity);
            this.prevY = new Float32Array(capacity);
            this.slowZonesCount = new Uint8Array(capacity);
            this.regionX = new Int16Array(capacity);
            this.regionY = new Int16Array(capacity);
            this.tentacleWavePhase = new Float32Array(capacity);
            this.tentacleSlowApplied = new Uint8Array(capacity);
            this.deadClass = new Array(capacity);
        },
        
        spawn(x, y, type, element) {
            const i = this.count;
            if (i >= this.capacity) return -1;
            
            this.active[i] = true;
            this.x[i] = x;
            this.y[i] = y;
            this.vx[i] = (Math.random() - 0.5) * this.getBaseSpeed(type);
            this.vy[i] = (Math.random() - 0.5) * this.getBaseSpeed(type);
            this.type[i] = type;
            this.element[i] = element;
            this.merging[i] = 0;
            this.hitsTaken[i] = 0;
            this.tentacleWavePhase[i] = Math.random() * Math.PI * 2;
            this.tentacleSlowApplied[i] = 0;
            this.deadClass[i] = '';
            
            const config = this.getTypeConfig(type);
            this.radius[i] = config.radius;
            this.hp[i] = config.hp;
            this.maxHp[i] = config.hp;
            this.hitsRequired[i] = config.hp;
            this.prevX[i] = x;
            this.prevY[i] = y;
            this.slowZonesCount[i] = 0;
            this.regionX[i] = Math.floor(x / 600);
            this.regionY[i] = Math.floor(y / 600);
            
            // Position element
            if (element) {
                element.style.cssText = `left:${x - config.radius}px;top:${y - config.radius}px;display:block`;
                element.className = `enemy ${type}`;
                element.style.width = `${config.radius * 2}px`;
                element.style.height = `${config.radius * 2}px`;
            }
            
            this.count++;
            return i;
        },
        
        getTypeConfig(type) {
            switch(type) {
                case 'fuchsia': return { radius: 20, hp: 25 };
                case 'green': return { radius: 80, hp: 100 };
                default: return { radius: 10, hp: 1 }; // orange
            }
        },
        
        getBaseSpeed(type) {
            switch(type) {
                case 'fuchsia': return 1.8;
                case 'green': return 1.0;
                default: return 2.0;
            }
        },
        
        kill(i, deadClass) {
            if (i < 0 || i >= this.count) return;
            this.active[i] = false;
            this.deadClass[i] = deadClass || '';
            if (this.element[i]) {
                this.element[i].style.display = 'none';
                this.element[i].className = `enemy ${deadClass}`;
            }
        },
        
        // Get active indices (for iteration)
        getActiveIndices() {
            const indices = [];
            for (let i = 0; i < this.count; i++) {
                if (this.active[i]) indices.push(i);
            }
            return indices;
        },
        
        // Update position from physics
        updatePosition(i) {
            if (!this.active[i]) return;
            this.prevX[i] = this.x[i];
            this.prevY[i] = this.y[i];
            this.x[i] += this.vx[i];
            this.y[i] += this.vy[i];
            
            // Update region
            this.regionX[i] = Math.floor(this.x[i] / 600);
            this.regionY[i] = Math.floor(this.y[i] / 600);
            
            // Update element position
            if (this.element[i]) {
                this.element[i].style.cssText = `left:${this.x[i] - this.radius[i]}px;top:${this.y[i] - this.radius[i]}px`;
            }
        },
        
        // Batch update all active enemies' DOM positions
        updateAllPositions() {
            for (let i = 0; i < this.count; i++) {
                if (this.active[i] && this.element[i] && !this.deadClass[i]) {
                    this.element[i].style.cssText = `left:${this.x[i] - this.radius[i]}px;top:${this.y[i] - this.radius[i]}px`;
                }
            }
        }
    },
    
    // Bullet arrays
    bullets: {
        count: 0,
        capacity: 200,
        active: [],
        x: [],
        y: [],
        vx: [],
        vy: [],
        damage: [],
        type: [],           // 'rifle', 'shotgun', 'machinegun', 'minigun'
        element: [],
        distanceTraveled: [],
        maxDistance: [],
        
        init(capacity = 200) {
            this.capacity = capacity;
            this.count = 0;
            this.active = new Array(capacity);
            this.x = new Float32Array(capacity);
            this.y = new Float32Array(capacity);
            this.vx = new Float32Array(capacity);
            this.vy = new Float32Array(capacity);
            this.damage = new Float32Array(capacity);
            this.type = new Array(capacity);
            this.element = new Array(capacity);
            this.distanceTraveled = new Float32Array(capacity);
            this.maxDistance = new Float32Array(capacity);
        },
        
        spawn(x, y, angle, speed, damage, bulletType, element, maxDist = 333) {
            const i = this.count;
            if (i >= this.capacity) return -1;
            
            this.active[i] = true;
            this.x[i] = x;
            this.y[i] = y;
            this.vx[i] = Math.cos(angle) * speed;
            this.vy[i] = Math.sin(angle) * speed;
            this.damage[i] = damage;
            this.type[i] = bulletType;
            this.element[i] = element;
            this.distanceTraveled[i] = 0;
            this.maxDistance[i] = maxDist;
            
            if (element) {
                element.style.cssText = `left:${x}px;top:${y}px;display:block`;
            }
            
            this.count++;
            return i;
        },
        
        kill(i) {
            if (i < 0 || i >= this.count) return;
            this.active[i] = false;
            if (this.element[i]) {
                this.element[i].style.display = 'none';
            }
        },
        
        update(i, deltaTime) {
            if (!this.active[i]) return false; // false = still alive
            
            const dt = deltaTime * 60; // normalize to 60fps
            this.x[i] += this.vx[i] * dt;
            this.y[i] += this.vy[i] * dt;
            this.distanceTraveled[i] += Math.hypot(this.vx[i] * dt, this.vy[i] * dt);
            
            if (this.element[i]) {
                this.element[i].style.cssText = `left:${this.x[i]}px;top:${this.y[i]}px;display:block`;
            }
            
            return this.distanceTraveled[i] >= this.maxDistance[i];
        }
    },
    
    // Particle arrays
    particles: {
        count: 0,
        capacity: 500,
        active: [],
        x: [],
        y: [],
        vx: [],
        vy: [],
        life: [],
        maxLife: [],
        color: [],
        size: [],
        element: [],
        
        init(capacity = 500) {
            this.capacity = capacity;
            this.count = 0;
            this.active = new Array(capacity);
            this.x = new Float32Array(capacity);
            this.y = new Float32Array(capacity);
            this.vx = new Float32Array(capacity);
            this.vy = new Float32Array(capacity);
            this.life = new Float32Array(capacity);
            this.maxLife = new Float32Array(capacity);
            this.color = new Array(capacity);
            this.size = new Float32Array(capacity);
            this.element = new Array(capacity);
        },
        
        spawn(x, y, vx, vy, life, color, size, element) {
            const i = this.count;
            if (i >= this.capacity) return -1;
            
            this.active[i] = true;
            this.x[i] = x;
            this.y[i] = y;
            this.vx[i] = vx;
            this.vy[i] = vy;
            this.life[i] = life;
            this.maxLife[i] = life;
            this.color[i] = color;
            this.size[i] = size;
            this.element[i] = element;
            
            if (element) {
                element.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};display:block`;
            }
            
            this.count++;
            return i;
        },
        
        kill(i) {
            if (i < 0 || i >= this.count) return;
            this.active[i] = false;
            if (this.element[i]) {
                this.element[i].style.display = 'none';
            }
        },
        
        update(i, deltaTime) {
            if (!this.active[i]) return false;
            
            this.x[i] += this.vx[i] * deltaTime * 60;
            this.y[i] += this.vy[i] * deltaTime * 60;
            this.life[i] -= deltaTime;
            
            if (this.element[i]) {
                const alpha = this.life[i] / this.maxLife[i];
                this.element[i].style.cssText = `left:${this.x[i]}px;top:${this.y[i]}px;width:${this.size[i]}px;height:${this.size[i]}px;background:${this.color[i]};opacity:${alpha};display:block`;
            }
            
            return this.life[i] <= 0;
        }
    }
};

// Initialize all
EntitySoA.enemies.init(120);
EntitySoA.bullets.init(200);
EntitySoA.particles.init(500);

// Export
window.EntitySoA = EntitySoA;