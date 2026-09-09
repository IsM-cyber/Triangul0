// ========== OBJECT POOL SYSTEM ==========
// Generic object pool for DOM elements and game objects

class ObjectPool {
    constructor(createFn, resetFn, initialSize = 0) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.available = [];
        this.inUse = [];
        
        // Pre-warm pool (but don't call createFn yet - wait for first acquire)
        this.initialSize = initialSize;
        this.initialized = false;
    }
    
    ensureInitialized() {
        if (this.initialized) return;
        for (let i = 0; i < this.initialSize; i++) {
            this.available.push(this.createFn());
        }
        this.initialized = true;
    }
    
    acquire(...args) {
        this.ensureInitialized();
        let obj;
        if (this.available.length > 0) {
            obj = this.available.pop();
        } else {
            obj = this.createFn();
        }
        this.inUse.push(obj);
        if (this.resetFn) this.resetFn(obj, ...args);
        return obj;
    }
    
    release(obj) {
        const idx = this.inUse.indexOf(obj);
        if (idx !== -1) {
            this.inUse.splice(idx, 1);
            this.available.push(obj);
        }
    }
    
    releaseAll() {
        // Properly deactivate all in-use objects
        for (const obj of this.inUse) {
            if (obj.element) {
                obj.element.style.display = 'none';
            }
            obj.active = false;
        }
        this.available.push(...this.inUse);
        this.inUse = [];
    }
    
    getAvailableCount() { return this.available.length; }
    getInUseCount() { return this.inUse.length; }
    getTotalCount() { return this.available.length + this.inUse.length; }
}

// Stain pool - organic orange stains
function createStainElement() {
    const stain = document.createElement('div');
    stain.className = 'organic-stain';
    stain.style.display = 'none';
    getWorldContainer().appendChild(stain);
    return { element: stain, createdAt: 0, type: 'orange', x: 0, y: 0 };
}

function resetStain(obj, x, y, size = 'medium') {
    const stain = obj.element;
    stain.className = 'organic-stain';
    stain.style.display = 'block';
    
    let width, height, opacity, blur;
    if (size === 'small') { width = 3; height = 3; opacity = 0.3; blur = 0.5; }
    else if (size === 'large') { width = 8; height = 8; opacity = 0.4; blur = 1; }
    else { width = 5; height = 5; opacity = 0.35; blur = 0.8; }
    
    stain.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;opacity:${opacity};filter:blur(${blur}px);display:block`;
    obj.x = x;
    obj.y = y;
    obj.createdAt = Date.now();
    obj.type = 'orange';
}

function releaseStain(obj) {
    obj.element.style.display = 'none';
}

function acquireStain(x, y, size) {
    return STAIN_POOL.acquire(x, y, size);
}

function releaseStainObj(obj) {
    STAIN_POOL.releaseFn(obj);
    STAIN_POOL.release(obj);
}

// Bullet pool
function createBulletElement() {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.display = 'none';
    getWorldContainer().appendChild(bullet);
    return { element: bullet, x: 0, y: 0, angle: 0, speed: 0, damage: 0, type: 'rifle', distance: 0 };
}

function resetBullet(obj, x, y, angle, speed, damage, type) {
    const bullet = obj.element;
    bullet.className = type === 'shotgun' ? 'pellet' : type === 'machinegun' ? 'machinegun-bullet' : type === 'minigun' ? 'minigun-bullet' : 'bullet';
    bullet.style.cssText = `left:${x}px;top:${y}px;display:block`;
    obj.x = x;
    obj.y = y;
    obj.angle = angle;
    obj.speed = speed;
    obj.damage = damage;
    obj.type = type;
    obj.distance = 0;
}

function releaseBullet(obj) {
    obj.element.style.display = 'none';
}

function acquireBullet(x, y, angle, speed, damage, type) {
    return BULLET_POOL.acquire(x, y, angle, speed, damage, type);
}

function releaseBulletObj(obj) {
    BULLET_POOL.releaseFn(obj);
    BULLET_POOL.release(obj);
}

// Particle pool
function createParticleElement() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.display = 'none';
    getWorldContainer().appendChild(particle);
    return { element: particle, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '', size: 1 };
}

function resetParticle(obj, x, y, vx, vy, life, color, size) {
    const particle = obj.element;
    particle.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};display:block`;
    obj.x = x;
    obj.y = y;
    obj.vx = vx;
    obj.vy = vy;
    obj.life = life;
    obj.color = color;
    obj.size = size;
}

function releaseParticle(obj) {
    obj.element.style.display = 'none';
}

function acquireParticle(x, y, vx, vy, life, color, size) {
    return PARTICLE_POOL.acquire(x, y, vx, vy, life, color, size);
}

function releaseParticleObj(obj) {
    PARTICLE_POOL.releaseFn(obj);
    PARTICLE_POOL.release(obj);
}

// Fragment pool
function createFragmentElement() {
    const frag = document.createElement('div');
    frag.className = 'organic-fragment';
    frag.style.display = 'none';
    getWorldContainer().appendChild(frag);
    return { element: frag, x: 0, y: 0, vx: 0, vy: 0, rotation: 0, life: 0 };
}

function resetFragment(obj, x, y, vx, vy, rotation) {
    const frag = obj.element;
    frag.style.cssText = `left:${x}px;top:${y}px;transform:rotate(${rotation}deg);display:block`;
    obj.x = x;
    obj.y = y;
    obj.vx = vx;
    obj.vy = vy;
    obj.rotation = rotation;
    obj.life = 600;
}

function releaseFragment(obj) {
    obj.element.style.display = 'none';
}

function acquireFragment(x, y, vx, vy, rotation) {
    return FRAGMENT_POOL.acquire(x, y, vx, vy, rotation);
}

function releaseFragmentObj(obj) {
    FRAGMENT_POOL.releaseFn(obj);
    FRAGMENT_POOL.release(obj);
}

// Enemy pool
function createEnemyElement() {
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    // Con canvas render: ocultar desde creación
    if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
        enemy.style.display = 'none';
    } else {
        enemy.style.display = 'none';
    }
    getWorldContainer().appendChild(enemy);
    return { 
        element: enemy, 
        x: 0, y: 0, vx: 0, vy: 0,
        hp: 1, maxHp: 1, type: 'orange', radius: 12,
        active: false, id: 0, merging: false, hitsTaken: 0, hitsRequired: 1,
        prevX: 0, prevY: 0, slowZonesCount: 0, regionX: 0, regionY: 0,
        tentacleWavePhase: 0, tentacleSlowApplied: false
    };
}

function resetEnemy(obj, x, y, type, id) {
    console.log('[Pool] resetEnemy called:', {x, y, type, id, xType: typeof x, yType: typeof y, element: obj.element});
    const enemy = obj.element;
    // Ensure element is in DOM
    const wc = getWorldContainer();
    if (!enemy.parentNode) {
        wc.appendChild(enemy);
        console.log('[Pool] Re-appended enemy to worldContainer');
    }
    // Con canvas render: NO mostrar el div (el canvas lo dibuja)
    const useCanvas = (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER);
    enemy.style.display = useCanvas ? 'none' : 'block';
    // CSS uses .enemy.special for fuchsia (not .enemy.fuchsia)
    const cssClass = type === 'fuchsia' ? 'special' : type;
    enemy.className = 'enemy ' + cssClass;
    
    // Use correct radii and position from top-left like original
    let radius;
    if (type === 'orange') { obj.hp = obj.maxHp = 1; radius = 10; }
    else if (type === 'fuchsia') { obj.hp = obj.maxHp = 25; radius = 20; }
    else if (type === 'green') { obj.hp = obj.maxHp = 100; radius = 80; }
    
    // DEFENSIVE: ensure x,y are valid numbers
    const safeX = (typeof x === 'number' && !isNaN(x)) ? x : 900;
    const safeY = (typeof y === 'number' && !isNaN(y)) ? y : 900;
    
    enemy.style.left = `${safeX - radius}px`;
    enemy.style.top = `${safeY - radius}px`;
    enemy.style.display = useCanvas ? 'none' : 'block';
    enemy.style.width = `${radius * 2}px`;
    enemy.style.height = `${radius * 2}px`;
    enemy.style.position = 'absolute';
    obj.x = safeX;
    obj.y = safeY;
    obj.speedX = (Math.random() - 0.5) * (type === 'fuchsia' ? 1.8 : type === 'green' ? 1.0 : 2.0);
    obj.speedY = (Math.random() - 0.5) * (type === 'fuchsia' ? 1.8 : type === 'green' ? 1.0 : 2.0);
    obj.type = type;
    obj.id = id;
    obj.active = true;
    obj.radius = radius;
    obj.merging = false;
    obj.hitsTaken = 0;
    obj.hitsRequired = obj.maxHp;
    obj.prevX = safeX;
    obj.prevY = safeY;
    obj.slowZonesCount = 0;
    obj.regionX = Math.floor(safeX / 600);
    obj.regionY = Math.floor(safeY / 600);
    obj.tentacleWavePhase = Math.random() * Math.PI * 2;
    obj.tentacleSlowApplied = false;
    console.log('[Pool] resetEnemy done, enemy:', {x: obj.x, y: obj.y, active: obj.active, type: obj.type, radius: obj.radius});
}

function releaseEnemy(obj) {
    obj.element.style.display = 'none';
    obj.active = false;
}

function acquireEnemy(x, y, type, id) {
    return ENEMY_POOL.acquire(x, y, type, id);
}

function releaseEnemyObj(obj) {
    ENEMY_POOL.releaseFn(obj);
    ENEMY_POOL.release(obj);
}

// Explosion pool
function createExplosionElement() {
    const exp = document.createElement('div');
    exp.className = 'explosion';
    exp.style.display = 'none';
    getWorldContainer().appendChild(exp);
    return { element: exp, x: 0, y: 0, radius: 0, life: 0, maxLife: 0 };
}

function resetExplosion(obj, x, y, radius, type = 'normal') {
    const exp = obj.element;
    exp.className = 'explosion ' + (type === 'green' ? 'green-explosion' : '');
    exp.style.cssText = `left:${x}px;top:${y}px;width:${radius * 4}px;height:${radius * 4}px;display:block`;
    obj.x = x;
    obj.y = y;
    obj.radius = radius;
    obj.life = type === 'green' ? 800 : 600;
    obj.maxLife = obj.life;
}

function releaseExplosion(obj) {
    obj.element.style.display = 'none';
}

function acquireExplosion(x, y, radius, type) {
    return EXPLOSION_POOL.acquire(x, y, radius, type);
}

function releaseExplosionObj(obj) {
    EXPLOSION_POOL.releaseFn(obj);
    EXPLOSION_POOL.release(obj);
}

// Helper to get worldContainer dynamically
function getWorldContainer() {
    return document.getElementById('world-container');
}

// ========== POOL INSTANCES ==========
const STAIN_POOL = new ObjectPool(createStainElement, resetStain, 1500);
STAIN_POOL.releaseFn = releaseStain;

const BULLET_POOL = new ObjectPool(createBulletElement, resetBullet, 200);
BULLET_POOL.releaseFn = releaseBullet;

const PARTICLE_POOL = new ObjectPool(createParticleElement, resetParticle, 500);
PARTICLE_POOL.releaseFn = releaseParticle;

const FRAGMENT_POOL = new ObjectPool(createFragmentElement, resetFragment, 100);
FRAGMENT_POOL.releaseFn = releaseFragment;

const ENEMY_POOL = new ObjectPool(createEnemyElement, resetEnemy, 120);
ENEMY_POOL.releaseFn = releaseEnemy;

const EXPLOSION_POOL = new ObjectPool(createExplosionElement, resetExplosion, 20);
EXPLOSION_POOL.releaseFn = releaseExplosion;

// ========== HELPER FUNCTIONS ==========
function acquireStain(x, y, size) {
    return STAIN_POOL.acquire(x, y, size);
}

function releaseStainObj(obj) {
    STAIN_POOL.releaseFn(obj);
    STAIN_POOL.release(obj);
}

function acquireBullet(x, y, angle, speed, damage, type) {
    return BULLET_POOL.acquire(x, y, angle, speed, damage, type);
}

function releaseBulletObj(obj) {
    BULLET_POOL.releaseFn(obj);
    BULLET_POOL.release(obj);
}

function acquireParticle(x, y, vx, vy, life, color, size) {
    return PARTICLE_POOL.acquire(x, y, vx, vy, life, color, size);
}

function releaseParticleObj(obj) {
    PARTICLE_POOL.releaseFn(obj);
    PARTICLE_POOL.release(obj);
}

function acquireFragment(x, y, vx, vy, rotation) {
    return FRAGMENT_POOL.acquire(x, y, vx, vy, rotation);
}

function releaseFragmentObj(obj) {
    FRAGMENT_POOL.releaseFn(obj);
    FRAGMENT_POOL.release(obj);
}

function acquireEnemy(x, y, type, id) {
    return ENEMY_POOL.acquire(x, y, type, id);
}

function releaseEnemyObj(obj) {
    ENEMY_POOL.releaseFn(obj);
    ENEMY_POOL.release(obj);
}

function acquireExplosion(x, y, radius, type) {
    return EXPLOSION_POOL.acquire(x, y, radius, type);
}

function releaseExplosionObj(obj) {
    EXPLOSION_POOL.releaseFn(obj);
    EXPLOSION_POOL.release(obj);
}

function initPools() {
    // Force initialization of all pools
    STAIN_POOL.ensureInitialized();
    BULLET_POOL.ensureInitialized();
    PARTICLE_POOL.ensureInitialized();
    FRAGMENT_POOL.ensureInitialized();
    ENEMY_POOL.ensureInitialized();
    EXPLOSION_POOL.ensureInitialized();
    
    console.log('[Pools] Initialized:', {
        stains: STAIN_POOL.getTotalCount(),
        bullets: BULLET_POOL.getTotalCount(),
        particles: PARTICLE_POOL.getTotalCount(),
        fragments: FRAGMENT_POOL.getTotalCount(),
        enemies: ENEMY_POOL.getTotalCount(),
        explosions: EXPLOSION_POOL.getTotalCount()
    });
}