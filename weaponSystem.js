// ========== SISTEMA DE ARMAS ==========
const WEAPON_SYSTEM = {
    RIFLE: {
        id: 1,
        name: "RIFLE",
        type: "rifle",
        damagePerShot: 1,
        projectileCount: 1,
        speed: 24,
        maxDistance: 333,
        spreadAngle: 0,
        projectileClass: "bullet",
        projectileSize: 2,
        projectileColor: "#222222",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 0,
        cooldownShots: 15,
        cooldownDuration: 2000
    },
    
    SHOTGUN: {
        id: 2,
        name: "ESCOPETA",
        type: "shotgun",
        damagePerShot: 1,
        projectileCount: 8,
        speed: 18,
        maxDistance: 166,
        spreadAngle: 35 * (Math.PI / 180),
        projectileClass: "pellet",
        projectileSize: 3,
        projectileColor: "#ffcc00",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 0,
        cooldownShots: 4,
        cooldownDuration: 6000
    },
    
    MACHINEGUN: {
        id: 3,
        name: "AMETRALLADORA",
        type: "machinegun",
        damagePerShot: 1,
        projectileCount: 1,
        speed: 22,
        maxDistance: 300,
        spreadAngle: 2 * (Math.PI / 180),
        projectileClass: "machinegun-bullet",
        projectileSize: 2,
        projectileWidth: 2,
        projectileHeight: 4,
        projectileColor: "#ff3333",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 200,
        cooldownShots: 30,
        cooldownDuration: 3000
    },

    SNIPER: {
        id: 4,
        name: "SNIPER",
        type: "sniper",
        damagePerShot: 28,
        projectileCount: 1,
        speed: 50,
        maxDistance: 2400,
        spreadAngle: 0,
        projectileClass: "sniper-bullet",
        projectileSize: 1,
        projectileLength: 12,
        projectileColor: "#00ff00",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 0,
        cooldownShots: 1,
        cooldownDuration: 12000
    },

    BAZOOKA: {
        id: 5,
        name: "BAZOOKA",
        type: "bazooka",
        damagePerShot: 37,
        areaDamage: 11,
        explosionRadius: 60,
        projectileCount: 1,
        speed: 16,
        maxDistance: 260,
        spreadAngle: 0,
        projectileClass: "bazooka-rocket",
        projectileSize: 8,
        projectileWidth: 8,
        projectileHeight: 4,
        projectileColor: "#ff00ff",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 0,
        cooldownShots: 1,
        cooldownDuration: 6000
    },
    
    MINIGUN: {
        id: 6,
        name: "MINIGUN",
        type: "minigun",
        damagePerShot: 8,
        projectileCount: 1,
        speed: 30,
        maxDistance: 600,
        baseSpreadAngle: 5 * (Math.PI / 180),
        maxSpreadAngle: 23 * (Math.PI / 180),
        projectileClass: "minigun-bullet",
        projectileSize: 3,
        projectileWidth: 3,
        projectileHeight: 6,
        projectileColor: "#ff00ff",
        cooldownFactor: 1,
        usesPerShot: 1,
        fireRate: 22,
        cooldownShots: 500,
        cooldownDuration: 33000,
        heatPerShot: 2,
        maxHeat: 1000,
        heatDecayRate: 5
    },
    
    currentWeapon: null,
    rifleShots: 0,
    shotgunShots: 0,
    machinegunShots: 0,
    minigunShots: 0,
    isMouseDown: false,
    machinegunInterval: null,
    minigunInterval: null,
    lastMachinegunShot: 0,
    lastMinigunShot: 0,
    minigunHeat: 0,
    
    init() {
        this.currentWeapon = this.RIFLE;
        this.minigunHeat = 0;
        this.updateWeaponDisplay();
        this.updateAmmoDisplay();
    },
    
    switchWeapon(weaponId) {
        if (this.currentWeapon.type === 'machinegun' && this.machinegunInterval) {
            this.stopMachinegun();
        }
        
        if (this.currentWeapon.type === 'minigun' && this.minigunInterval) {
            this.stopMinigun();
        }
        
        if (weaponId === 1) {
            this.currentWeapon = this.RIFLE;
        } else if (weaponId === 2) {
            this.currentWeapon = this.SHOTGUN;
        } else if (weaponId === 3) {
            this.currentWeapon = this.MACHINEGUN;
        } else if (weaponId === 4) {
            this.currentWeapon = this.SNIPER;
        } else if (weaponId === 5) {
            this.currentWeapon = this.BAZOOKA;
        } else if (weaponId === 6) {
            this.currentWeapon = this.MINIGUN;
        }
        this.updateWeaponDisplay();
        this.updateAmmoDisplay();
    },
    
    updateWeaponDisplay() {
        const weaponIcon = document.getElementById('weapon-icon');
        const weaponName = document.getElementById('weapon-name');
        
        if (weaponIcon && weaponName) {
            weaponIcon.className = 'weapon-icon';
            weaponIcon.classList.add(this.currentWeapon.type);
            weaponName.textContent = this.currentWeapon.name;
            
            let color = '#0cc0df';
            if (this.currentWeapon.type === 'shotgun') color = '#ff9900';
            if (this.currentWeapon.type === 'machinegun') color = '#ff3333';
            if (this.currentWeapon.type === 'sniper') color = '#00ff00';
            if (this.currentWeapon.type === 'bazooka') color = '#ff00ff';
            if (this.currentWeapon.type === 'minigun') color = '#00ffff';
            
            weaponIcon.style.borderColor = color;
            weaponName.style.color = color;
            
            weaponIcon.style.transform = 'scale(1.2)';
            
            setTimeout(() => {
                weaponIcon.style.transform = 'scale(1)';
            }, 200);
        }
    },
    
    updateAmmoDisplay() {
        const ammoContainer = document.getElementById('ammo-container');
        const ammoIndicator = document.getElementById('ammo-indicator');
        const ammoBar = document.getElementById('ammo-bar');
        
        if (!ammoContainer || !ammoIndicator || !ammoBar) return;
        
        const weapon = this.currentWeapon;
        
        if (weapon.type === 'minigun') {
            ammoContainer.style.display = 'flex';
            const remainingShots = Math.max(0, weapon.cooldownShots - COOLDOWN_SYSTEM.currentCooldownShots);
            const ammoPercent = (remainingShots / weapon.cooldownShots) * 100;
            
            ammoIndicator.innerHTML = `<span id="current-ammo">${remainingShots}</span>/<span id="max-ammo">${weapon.cooldownShots}</span>`;
            ammoBar.style.width = `${ammoPercent}%`;
            
            if (ammoPercent > 50) {
                ammoBar.style.background = 'linear-gradient(to right, #ff00ff, #cc00cc)';
            } else if (ammoPercent > 20) {
                ammoBar.style.background = 'linear-gradient(to right, #ff00aa, #cc0088)';
            } else {
                ammoBar.style.background = 'linear-gradient(to right, #ff0066, #cc0055)';
                if (ammoPercent < 10 && Date.now() % 500 < 250) {
                    ammoBar.style.opacity = '0.5';
                } else {
                    ammoBar.style.opacity = '1';
                }
            }
        } else {
            ammoContainer.style.display = 'none';
        }
    },
    
    startMachinegun() {
        if (this.currentWeapon.type !== 'machinegun') return;
        if (this.machinegunInterval) return;
        
        this.lastMachinegunShot = Date.now();
        this.machinegunInterval = setInterval(() => {
            if (this.isMouseDown && gameState.gameActive && !gameState.mergingEnemies && gameState.canShoot) {
                this.shootMachinegun();
            }
        }, this.currentWeapon.fireRate);
    },
    
    stopMachinegun() {
        if (this.machinegunInterval) {
            clearInterval(this.machinegunInterval);
            this.machinegunInterval = null;
        }
    },
    
    shootMachinegun() {
        const now = Date.now();
        if (now - this.lastMachinegunShot < this.currentWeapon.fireRate) return;
        
        this.lastMachinegunShot = now;
        const projectiles = this.shoot(gameState.playerX, gameState.playerY, 
                                   gameState.mouseX + gameState.cameraX, 
                                   gameState.mouseY + gameState.cameraY);
        gameState.projectiles.push(...projectiles);
        
        const weapon = this.currentWeapon;
        COOLDOWN_SYSTEM.incrementShots(weapon.type);
    },
    
    startMinigun() {
        if (this.currentWeapon.type !== 'minigun') return;
        if (this.minigunInterval) return;
        
        this.lastMinigunShot = Date.now();
        this.minigunInterval = setInterval(() => {
            if (this.isMouseDown && gameState.gameActive && !gameState.mergingEnemies && gameState.canShoot) {
                this.shootMinigun();
            }
        }, this.currentWeapon.fireRate);
    },
    
    stopMinigun() {
        if (this.minigunInterval) {
            clearInterval(this.minigunInterval);
            this.minigunInterval = null;
        }
    },
    
    shootMinigun() {
        const now = Date.now();
        if (now - this.lastMinigunShot < this.currentWeapon.fireRate) return;
        
        this.lastMinigunShot = now;
        const projectiles = this.shoot(gameState.playerX, gameState.playerY, 
                                   gameState.mouseX + gameState.cameraX, 
                                   gameState.mouseY + gameState.cameraY);
        gameState.projectiles.push(...projectiles);
        
        const weapon = this.currentWeapon;
        COOLDOWN_SYSTEM.incrementShots(weapon.type);
        
        this.updateAmmoDisplay();
    },
    
    shoot(fromX, fromY, targetX, targetY) {
        const weapon = this.currentWeapon;
        const projectiles = [];
        
        if (weapon.type === "rifle") {
            this.rifleShots++;
        } else if (weapon.type === "shotgun") {
            this.shotgunShots++;
        } else if (weapon.type === "machinegun") {
            this.machinegunShots++;
        } else if (weapon.type === "sniper") {
            this.sniperShots++;
        } else if (weapon.type === "bazooka") {
            this.bazookaShots++;
        } else if (weapon.type === "minigun") {
            this.minigunShots++;
        }
        
        if (weapon.type === "rifle" || weapon.type === "machinegun" || weapon.type === "sniper" || weapon.type === "bazooka" || weapon.type === "minigun") {
            const angle = Math.atan2(targetY - fromY, targetX - fromX);
            let finalAngle = angle;
            
            if (weapon.type === "machinegun" && weapon.spreadAngle > 0) {
                const spread = (Math.random() - 0.5) * weapon.spreadAngle;
                finalAngle = angle + spread;
            }
            
            const projectile = this.createProjectile(
                fromX, fromY, finalAngle, weapon, 0
            );
            projectiles.push(projectile);
            
            if (weapon.type === "machinegun") {
                this.createMachinegunMuzzleFlash(fromX, fromY, finalAngle);
            } else if (weapon.type === "sniper") {
                this.createSniperMuzzleEffect(fromX, fromY, finalAngle);
            } else if (weapon.type === "bazooka") {
                this.createBazookaMuzzleEffect(fromX, fromY, finalAngle);
            }        
        } else if (weapon.type === "shotgun") {
            const baseAngle = Math.atan2(targetY - fromY, targetX - fromX);
            const angleStep = weapon.spreadAngle / (weapon.projectileCount - 1);
            const startAngle = baseAngle - (weapon.spreadAngle / 2);
            
            for (let i = 0; i < weapon.projectileCount; i++) {
                const angle = startAngle + (angleStep * i);
                const randomOffset = (Math.random() - 0.5) * (weapon.spreadAngle / 8);
                const finalAngle = angle + randomOffset;
                
                const projectile = this.createProjectile(
                    fromX, fromY, finalAngle, weapon, i
                );
                projectiles.push(projectile);
            }
            
            this.createShotgunRecoilEffect(fromX, fromY, baseAngle);
        }
        
        return projectiles;
    },
    
    createProjectile(x, y, angle, weapon, index) {
        const projectile = document.createElement('div');
        projectile.className = weapon.projectileClass;
        
        if (weapon.type === "machinegun") {
            projectile.style.cssText = `
                width:${weapon.projectileWidth}px;
                height:${weapon.projectileHeight}px;
                background-color:${weapon.projectileColor};
                left:${x}px;
                top:${y}px;
                position:absolute;
                border-radius:1px;
                z-index:5;
                pointer-events:none;
                transform:translate(-50%, -50%) rotate(${angle}rad);
                box-shadow:0 0 4px rgba(255,51,51,0.8);
            `;
        } else if (weapon.type === "sniper") {
            projectile.style.cssText = `
                width:${weapon.projectileSize}px;
                height:${weapon.projectileLength}px;
                background-color:${weapon.projectileColor};
                left:${x}px;
                top:${y}px;
                position:absolute;
                border-radius:0;
                z-index:6;
                pointer-events:none;
                transform:translate(-50%, -50%) rotate(${angle}rad);
                box-shadow:0 0 6px #00ff00, 0 0 12px #00ff00;
                animation: sniperTrail 0.5s linear forwards;
            `;
        } else if (weapon.type === "bazooka") {
            projectile.style.cssText = `
                width:${weapon.projectileWidth}px;
                height:${weapon.projectileHeight}px;
                background-color:${weapon.projectileColor};
                left:${x}px;
                top:${y}px;
                position:absolute;
                border-radius:2px;
                z-index:6;
                pointer-events:none;
                transform:translate(-50%, -50%) rotate(${angle}rad);
                box-shadow:0 0 8px #ff00ff, 0 0 16px #ff00ff;
                animation: rocketTrail 0.3s linear forwards;
            `;
        } else if (weapon.type === "minigun") {
            projectile.style.cssText = `
                width:${weapon.projectileWidth}px;
                height:${weapon.projectileHeight}px;
                background-color:${weapon.projectileColor};
                left:${x}px;
                top:${y}px;
                position:absolute;
                border-radius:1px;
                z-index:5;
                pointer-events:none;
                transform:translate(-50%, -50%) rotate(${angle}rad);
                box-shadow:0 0 6px rgba(255,0,255,0.9);
            `;
        } else {
            projectile.style.cssText = `
                width:${weapon.projectileSize}px;
                height:${weapon.projectileSize}px;
                background-color:${weapon.projectileColor};
                left:${x}px;
                top:${y}px;
                position:absolute;
                border-radius:50%;
                z-index:5;
                pointer-events:none;
                transform:translate(-50%, -50%);
            `;
            
            if (weapon.type === "shotgun") {
                projectile.style.boxShadow = '0 0 4px rgba(255,204,0,0.8)';
                const sizeVariation = 0.8 + Math.random() * 0.4;
                projectile.style.width = `${weapon.projectileSize * sizeVariation}px`;
                projectile.style.height = `${weapon.projectileSize * sizeVariation}px`;
            }
        }
        
        document.getElementById('world-container').appendChild(projectile);
        
        return {
            element: projectile,
            x: x,
            y: y,
            speedX: Math.cos(angle) * weapon.speed,
            speedY: Math.sin(angle) * weapon.speed,
            distanceTraveled: 0,
            maxDistance: weapon.maxDistance,
            weaponType: weapon.type,
            damage: weapon.damagePerShot,
            originalAngle: angle
        };
    },
    
    createMachinegunMuzzleFlash(x, y, angle) {
        for (let i = 0; i < 3; i++) {
            const flash = document.createElement('div');
            flash.className = 'explosion-particle';
            flash.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 3 + 2}px;
                height:${Math.random() * 3 + 2}px;
                background-color: #ff9900;
                border-radius: 50%;
                opacity: 0.7;
                position: absolute;
                z-index: 4;
            `;
            
            const flashAngle = angle + (Math.random() - 0.5) * 0.3;
            const flashSpeed = Math.random() * 1 + 0.5;
            const tx = Math.cos(flashAngle) * flashSpeed * 5;
            const ty = Math.sin(flashAngle) * flashSpeed * 5;
            
            flash.style.setProperty('--tx', `${tx}px`);
            flash.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(flash);
            setTimeout(() => {
                if (flash.parentNode) flash.remove();
            }, 300);
        }
        
        const playerElement = document.getElementById('player');
        if (playerElement) {
            playerElement.style.transform = 
                `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) ` +
                `translate(${Math.cos(angle + Math.PI) * 1}px, ${Math.sin(angle + Math.PI) * 1}px)`;
            
            setTimeout(() => {
                playerElement.style.transform = 
                    `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
            }, 50);
        }
    },
    
    createMinigunMuzzleFlash(x, y, angle) {
        for (let i = 0; i < 5; i++) {
            const flash = document.createElement('div');
            flash.className = 'explosion-particle';
            flash.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 4 + 3}px;
                height:${Math.random() * 4 + 3}px;
                background-color: #ff00ff;
                border-radius: 50%;
                opacity: 0.8;
                position: absolute;
                z-index: 4;
            `;
            
            const flashAngle = angle + (Math.random() - 0.5) * 0.5;
            const flashSpeed = Math.random() * 2 + 1;
            const tx = Math.cos(flashAngle) * flashSpeed * 8;
            const ty = Math.sin(flashAngle) * flashSpeed * 8;
            
            flash.style.setProperty('--tx', `${tx}px`);
            flash.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(flash);
            setTimeout(() => {
                if (flash.parentNode) flash.remove();
            }, 200);
        }
        
        const playerElement = document.getElementById('player');
        if (playerElement) {
            const recoilAngle = angle + Math.PI;
            const recoilDistance = 2;
            
            playerElement.style.transform = 
                `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) ` +
                `translate(${Math.cos(recoilAngle) * recoilDistance}px, ${Math.sin(recoilAngle) * recoilDistance}px)`;
            
            setTimeout(() => {
                playerElement.style.transform = 
                    `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
            }, 30);
        }
    },
    
    createShotgunRecoilEffect(x, y, angle) {
        for (let i = 0; i < 5; i++) {
            const smoke = document.createElement('div');
            smoke.className = 'explosion-particle';
            smoke.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 3 + 2}px;
                height:${Math.random() * 3 + 2}px;
                background-color: #ff9900;
                border-radius: 50%;
                opacity: 0.7;
                position: absolute;
                z-index: 4;
            `;
            
            const smokeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
            const smokeSpeed = Math.random() * 2 + 1;
            const tx = Math.cos(smokeAngle) * smokeSpeed * 10;
            const ty = Math.sin(smokeAngle) * smokeSpeed * 10;
            
            smoke.style.setProperty('--tx', `${tx}px`);
            smoke.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(smoke);
            setTimeout(() => {
                if (smoke.parentNode) smoke.remove();
            }, 800);
        }
        
        const playerElement = document.getElementById('player');
        if (playerElement) {
            const recoilAngle = angle + Math.PI;
            const recoilDistance = 3;
            
            playerElement.style.transform = 
                `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) ` +
                `translate(${Math.cos(recoilAngle) * recoilDistance}px, ${Math.sin(recoilAngle) * recoilDistance}px)`;
            
            setTimeout(() => {
                playerElement.style.transform = 
                    `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
            }, 100);
        }
    },

    createSniperMuzzleEffect(x, y, angle) {
        for (let i = 0; i < 5; i++) {
            const flash = document.createElement('div');
            flash.className = 'explosion-particle';
            flash.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 4 + 3}px;
                height:${Math.random() * 4 + 3}px;
                background-color: #00ff00;
                border-radius: 50%;
                opacity: 0.8;
                position: absolute;
                z-index: 4;
            `;
            
            const flashAngle = angle + (Math.random() - 0.5) * 0.2;
            const flashSpeed = Math.random() * 2 + 1;
            const tx = Math.cos(flashAngle) * flashSpeed * 8;
            const ty = Math.sin(flashAngle) * flashSpeed * 8;
            
            flash.style.setProperty('--tx', `${tx}px`);
            flash.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(flash);
            setTimeout(() => {
                if (flash.parentNode) flash.remove();
            }, 400);
        }
        
        const shockwave = document.createElement('div');
        shockwave.className = 'brick-shockwave';
        shockwave.style.cssText = `
            left:${x}px;
            top:${y}px;
            width:40px;
            height:40px;
            border-color: #00ff00;
            position: absolute;
            z-index: 3;
        `;
        document.getElementById('world-container').appendChild(shockwave);
        setTimeout(() => {
            if (shockwave.parentNode) shockwave.remove();
        }, 400);
        
        const playerElement = document.getElementById('player');
        if (playerElement) {
            const recoilAngle = angle + Math.PI;
            const recoilDistance = 8;
            
            playerElement.style.transform = 
                `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) ` +
                `translate(${Math.cos(recoilAngle) * recoilDistance}px, ${Math.sin(recoilAngle) * recoilDistance}px)`;
            
            setTimeout(() => {
                playerElement.style.transform = 
                    `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
            }, 150);
        }
    },

    createBazookaMuzzleEffect(x, y, angle) {
        for (let i = 0; i < 8; i++) {
            const flash = document.createElement('div');
            flash.className = 'explosion-particle';
            flash.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 5 + 4}px;
                height:${Math.random() * 5 + 4}px;
                background-color: #ff00ff;
                border-radius: 50%;
                opacity: 0.9;
                position: absolute;
                z-index: 4;
            `;
            
            const flashAngle = angle + (Math.random() - 0.5) * 0.3;
            const flashSpeed = Math.random() * 3 + 2;
            const tx = Math.cos(flashAngle) * flashSpeed * 10;
            const ty = Math.sin(flashAngle) * flashSpeed * 10;
            
            flash.style.setProperty('--tx', `${tx}px`);
            flash.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(flash);
            setTimeout(() => {
                if (flash.parentNode) flash.remove();
            }, 500);
        }
        
        for (let i = 0; i < 6; i++) {
            const smoke = document.createElement('div');
            smoke.className = 'explosion-particle';
            smoke.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 4 + 3}px;
                height:${Math.random() * 4 + 3}px;
                background-color: #990099;
                border-radius: 50%;
                opacity: 0.7;
                position: absolute;
                z-index: 3;
            `;
            
            const smokeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
            const smokeSpeed = Math.random() * 1.5 + 0.5;
            const tx = Math.cos(smokeAngle) * smokeSpeed * 15;
            const ty = Math.sin(smokeAngle) * smokeSpeed * 15;
            
            smoke.style.setProperty('--tx', `${tx}px`);
            smoke.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(smoke);
            setTimeout(() => {
                if (smoke.parentNode) smoke.remove();
            }, 1000);
        }
        
        const playerElement = document.getElementById('player');
        if (playerElement) {
            const recoilAngle = angle + Math.PI;
            const recoilDistance = 12;
            
            playerElement.style.transform = 
                `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) ` +
                `translate(${Math.cos(recoilAngle) * recoilDistance}px, ${Math.sin(recoilAngle) * recoilDistance}px)`;
            
            setTimeout(() => {
                playerElement.style.transform = 
                    `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`;
            }, 200);
        }
        
        document.getElementById('game-container').classList.add('screen-shake');
        setTimeout(() => {
            document.getElementById('game-container').classList.remove('screen-shake');
        }, 300);
    },
    
    updateProjectile(projectile) {
        projectile.x += projectile.speedX;
        projectile.y += projectile.speedY;
        projectile.distanceTraveled += Math.sqrt(
            projectile.speedX * projectile.speedX + 
            projectile.speedY * projectile.speedY
        );
        
        projectile.element.style.left = `${projectile.x}px`;
        projectile.element.style.top = `${projectile.y}px`;
        
        if (projectile.weaponType === "machinegun" || projectile.weaponType === "minigun") {
            const angle = Math.atan2(projectile.speedY, projectile.speedX);
            projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
            
            const fadeStart = projectile.maxDistance * 0.7;
            if (projectile.distanceTraveled > fadeStart) {
                const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                projectile.element.style.opacity = (1 - fadeAmount * 0.8).toString();
            }
        } else if (projectile.weaponType === "shotgun") {
            const fadeStart = projectile.maxDistance * 0.7;
            if (projectile.distanceTraveled > fadeStart) {
                const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                projectile.element.style.opacity = (1 - fadeAmount * 0.8).toString();
            }
        } else if (projectile.weaponType === "sniper") {
            const angle = Math.atan2(projectile.speedY, projectile.speedX);
            projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
            
            const fadeStart = projectile.maxDistance * 0.9;
            if (projectile.distanceTraveled > fadeStart) {
                const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                projectile.element.style.opacity = (1 - fadeAmount * 0.5).toString();
            }
        } 
        else if (projectile.weaponType === "bazooka") {
            const angle = Math.atan2(projectile.speedY, projectile.speedX);
            projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
            
            if (Math.random() < 0.3) {
                const trail = document.createElement('div');
                trail.className = 'explosion-particle';
                trail.style.cssText = `
                    left:${projectile.x}px;
                    top:${projectile.y}px;
                    width:${Math.random() * 3 + 2}px;
                    height:${Math.random() * 3 + 2}px;
                    background-color: #ff66ff;
                    border-radius: 50%;
                    opacity: 0.6;
                    position: absolute;
                    z-index: 4;
                `;
                
                const trailAngle = angle + Math.PI + (Math.random() - 0.5) * 0.2;
                const trailSpeed = Math.random() * 1 + 0.5;
                const tx = Math.cos(trailAngle) * trailSpeed * 5;
                const ty = Math.sin(trailAngle) * trailSpeed * 5;
                
                trail.style.setProperty('--tx', `${tx}px`);
                trail.style.setProperty('--ty', `${ty}px`);
                
                document.getElementById('world-container').appendChild(trail);
                setTimeout(() => {
                    if (trail.parentNode) trail.remove();
                }, 400);
            }
            
            const fadeStart = projectile.maxDistance * 0.8;
            if (projectile.distanceTraveled > fadeStart) {
                const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                projectile.element.style.opacity = (1 - fadeAmount * 0.7).toString();
            }
        }
        
        return projectile.distanceTraveled >= projectile.maxDistance;
    },
    
    removeProjectile(projectile) {
        if (projectile.element && projectile.element.parentNode) {
            projectile.element.remove();
        }
    },

    createBazookaExplosion(x, y, radius) {
        const explosion = document.createElement('div');
        explosion.className = 'bazooka-explosion';
        explosion.style.cssText = `
            left:${x}px;
            top:${y}px;
            width:${radius * 2}px;
            height:${radius * 2}px;
        `;
        document.getElementById('world-container').appendChild(explosion);
        
        const shockwave = document.createElement('div');
        shockwave.className = 'bazooka-shockwave';
        shockwave.style.cssText = `
            left:${x}px;
            top:${y}px;
            width:${radius}px;
            height:${radius}px;
        `;
        document.getElementById('world-container').appendChild(shockwave);
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 4 + 2}px;
                height:${Math.random() * 4 + 2}px;
                background-color: ${Math.random() > 0.5 ? '#ff00ff' : '#cc00cc'};
                border-radius: 50%;
                opacity: 0.9;
            `;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            const tx = Math.cos(angle) * speed * 10;
            const ty = Math.sin(angle) * speed * 10;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(particle);
            setTimeout(() => {
                if (particle.parentNode) particle.remove();
            }, 1200);
        }
        
        document.getElementById('game-container').classList.add('screen-shake');
        setTimeout(() => {
            document.getElementById('game-container').classList.remove('screen-shake');
        }, 500);
        
        setTimeout(() => {
            if (explosion.parentNode) explosion.remove();
            if (shockwave.parentNode) shockwave.remove();
        }, 1000);
        
        return explosion;
    },

    applyBazookaAreaDamage(x, y, radius, areaDamage) {
        const explosion = this.createBazookaExplosion(x, y, radius);
        
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius + enemy.radius) {
                enemy.hitsTaken += areaDamage;
                gameState.hits += areaDamage;
                
                this.createAreaDamageEffect(enemy.x, enemy.y);
                
                if (enemy.type === 'orange' && enemy.hitsTaken >= 1) {
                    createOrganicOrangeExplosion(enemy.x, enemy.y, enemy.radius);
                    enemy.element.remove();
                    gameState.enemies.splice(i, 1);
                    gameState.currentEnemyCount--;
                    gameState.score += 100;
                    updateScoreDisplay();
                    gameState.orangeEnemiesToCreate++;
                    
                    let currentOrangeCount = gameState.enemies.filter(e => e.type === 'orange').length;
                    let enemiesToCreate = gameState.orangeEnemiesToCreate - currentOrangeCount;
                    for (let k = 0; k < enemiesToCreate; k++) {
                        createEnemy('orange');
                    }
                } else if (enemy.type === 'fuchsia' && enemy.hitsTaken >= 25) {
                    gameState.enemies.splice(i, 1);
                    gameState.currentEnemyCount--;
                    gameState.score += 500;
                    updateScoreDisplay();
                    gameState.specialHits++;
                    gameState.fuchsiaEnemiesCount++;
                    
                    for (let k = 0; k < 2; k++) {
                        createEnemy('fuchsia');
                    }
                } else if (enemy.type === 'green' && enemy.hitsTaken >= 100) {
                    createGreenExplosion(enemy.x, enemy.y, enemy.radius);
                    enemy.element.remove();
                    gameState.enemies.splice(i, 1);
                    gameState.currentEnemyCount--;
                    gameState.greenEnemiesCount--;
                    gameState.score += 2000;
                    updateScoreDisplay();
                    gameState.greenHits++;
                    gameState.fuchsiaEnemiesCount++;
                    
                    for (let k = 0; k < 2; k++) {
                        createEnemy('fuchsia');
                    }
                }
                
                if (gameState.hits % 25 === 0 && gameState.hits > 0) {
                    startSpecialEvent();
                }
                
                if (shouldCreateGreenEnemy()) {
                    createGreenEnemy();
                }
            }
        }
        
        for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
            const obstacle = gameState.obstacles[i];
            if (!obstacle.isBrick) continue;
            
            const dx = obstacle.x - x;
            const dy = obstacle.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius + Math.max(obstacle.width, obstacle.height) / 2) {
                obstacle.health -= areaDamage * 2;
                
                if (obstacle.health <= 0) {
                    BRICK_SYSTEM.destroyBrick(obstacle, i);
                }
            }
        }
        
        return explosion;
    },

    createAreaDamageEffect(x, y) {
        const ring = document.createElement('div');
        ring.className = 'bazooka-shockwave';
        ring.style.cssText = `
            left:${x}px;
            top:${y}px;
            width:${this.BAZOOKA.explosionRadius * 1.5}px;
            height:${this.BAZOOKA.explosionRadius * 1.5}px;
            border-color: rgba(255, 100, 255, 0.6);
        `;
        document.getElementById('world-container').appendChild(ring);
        
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 3 + 2}px;
                height:${Math.random() * 3 + 2}px;
                background-color: #ff66ff;
                border-radius: 50%;
                opacity: 0.7;
            `;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            const tx = Math.cos(angle) * speed * 8;
            const ty = Math.sin(angle) * speed * 8;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(particle);
            setTimeout(() => {
                if (particle.parentNode) particle.remove();
            }, 600);
        }
        
        setTimeout(() => {
            if (ring.parentNode) ring.remove();
        }, 1000);
    },
    
    getCurrentWeapon() {
        return this.currentWeapon;
    },
    
    resetStats() {
        this.rifleShots = 0;
        this.shotgunShots = 0;
        this.machinegunShots = 0;
        this.minigunShots = 0;
        this.stopMachinegun();
        this.stopMinigun();
        this.isMouseDown = false;
        this.minigunHeat = 0;
    }
};