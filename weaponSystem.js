// ========== SISTEMA DE ARMAS (GitHub completo + Touch) ==========
    const WEAPON_SYSTEM = {
        // ============================================
        // ARMA 0: CONTACT (rayo eléctrico con cono)
        // ============================================
        CONTACT: {
            id: 0,
            name: "CONTACT",
            type: "contact",
            damagePerShot: 2,          // ← daño 2
            range: 25,                 // ← alcance 25px
            coneAngle: 45 * (Math.PI / 180),  // ← cono de 45° total
            cooldownDuration: 200
        },
    
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
            penetrationLoss: 7,
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
            heatDecayRate: 5,
            spinUpTime: 300
        },
    
        currentWeapon: null,
        rifleShots: 0,
        shotgunShots: 0,
        machinegunShots: 0,
        minigunShots: 0,
        sniperShots: 0,
        bazookaShots: 0,
        isMouseDown: false,
        machinegunInterval: null,
        minigunInterval: null,
        minigunSpinning: false,
        minigunHeat: 0,
        lastMachinegunShot: 0,
        lastMinigunShot: 0,
        lastContactShot: 0,
    
        init() {
            this.currentWeapon = this.CONTACT;
            this.minigunHeat = 0;
            this.updateWeaponDisplay();
            this.updateAmmoDisplay();
        },

        addAmmo(weaponType, amount) {
            if (!window.gameState || !window.gameState.ammoCount) return;
            if (window.gameState.ammoCount[weaponType] === undefined) return;
            window.gameState.ammoCount[weaponType] += amount;
            this.updateAmmoDisplay();
        },

        switchWeapon(weaponId) {
            if (this.currentWeapon.type === 'machinegun' && this.machinegunInterval) {
                this.stopMachinegun();
            }
            if (this.currentWeapon.type === 'minigun' && this.minigunInterval) {
                this.stopMinigun();
            }
    
            // IDs: 0=CONTACT, 1=RIFLE, 2=SHOTGUN, 3=MACHINEGUN, 4=SNIPER, 5=BAZOOKA, 6=MINIGUN
            if (weaponId === 0) this.currentWeapon = this.CONTACT;
            else if (weaponId === 1) this.currentWeapon = this.RIFLE;
            else if (weaponId === 2) this.currentWeapon = this.SHOTGUN;
            else if (weaponId === 3) this.currentWeapon = this.MACHINEGUN;
            else if (weaponId === 4) this.currentWeapon = this.SNIPER;
            else if (weaponId === 5) this.currentWeapon = this.BAZOOKA;
            else if (weaponId === 6) this.currentWeapon = this.MINIGUN;
    
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
                if (this.currentWeapon.type === 'contact') color = '#00ffcc';
    
                weaponIcon.style.borderColor = color;
                weaponName.style.color = color;
                weaponIcon.style.transform = 'scale(1.2)';
                setTimeout(() => weaponIcon.style.transform = 'scale(1)', 200);
            }
    
            // Update touch weapon button
            if (this.weaponButton && window.TouchControls) {
                const tc = window.TouchControls;
                const names = ['CT', 'R', 'S', 'M', 'SN', 'BZ', 'MG'];
                const colors = ['#00ffcc', '#222', '#ffaa00', '#ff4444', '#00ffff', '#ff00ff', '#ff8800'];
                if (tc.weaponButton) {
                    tc.weaponButton.textContent = names[this.currentWeapon.id];
                    tc.weaponButton.style.background = colors[this.currentWeapon.id];
                }
            }
        },
    
        updateAmmoDisplay() {
            const ammoContainer = document.getElementById('ammo-container');
            const ammoIndicator = document.getElementById('ammo-indicator');
            const ammoBar = document.getElementById('ammo-bar');
            if (!ammoContainer || !ammoIndicator || !ammoBar) return;
    
            const weapon = this.currentWeapon;
            const hasAmmo = ['shotgun', 'machinegun', 'sniper', 'bazooka', 'minigun'].includes(weapon.type);
    
            if (hasAmmo) {
                ammoContainer.style.display = 'flex';
                const currentAmmo = window.gameState?.ammoCount?.[weapon.type] ?? 0;
                const ammoPercent = (currentAmmo / weapon.cooldownShots) * 100;
                ammoIndicator.innerHTML = `<span id="current-ammo">${currentAmmo}</span>/<span id="max-ammo">${weapon.cooldownShots}</span>`;
                ammoBar.style.width = `${ammoPercent}%`;
    
                let color;
                if (weapon.type === 'shotgun') color = ['#ff9900', '#ffcc00'];
                else if (weapon.type === 'machinegun') color = ['#ff3333', '#ff6666'];
                else if (weapon.type === 'sniper') color = ['#00ff00', '#66ff66'];
                else if (weapon.type === 'bazooka') color = ['#ff00ff', '#ff66ff'];
                else if (weapon.type === 'minigun') color = ['#ff00ff', '#cc00cc'];
    
                if (ammoPercent > 50) ammoBar.style.background = `linear-gradient(to right, ${color[0]}, ${color[1]})`;
                else if (ammoPercent > 20) ammoBar.style.background = `linear-gradient(to right, ${color[1]}, ${color[0]})`;
                else {
                    ammoBar.style.background = `linear-gradient(to right, ${color[0]}, ${color[1]})`;
                    if (ammoPercent < 10 && Date.now() % 500 < 250) ammoBar.style.opacity = '0.5';
                    else ammoBar.style.opacity = '1';
                }
            } else {
                ammoContainer.style.display = 'none';
            }
        },
    
        startMachinegun() {
            if (this.currentWeapon.type !== 'machinegun') return;
            if (this.machinegunInterval) return;
            this.machinegunInterval = setInterval(() => {
                if (!this.isMouseDown || !gameState.gameActive || gameState.mergingEnemies || !gameState.canShoot) {
                    this.stopMachinegun();
                    return;
                }
                this.shootMachinegun();
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
                const projectiles = this.shoot(
                    gameState.playerX, gameState.playerY,
                    gameState.mouseX + gameState.cameraX,
                    gameState.mouseY + gameState.cameraY
                );
                gameState.projectiles.push(...projectiles);
                const weapon = this.currentWeapon;
                if (window.COOLDOWN_SYSTEM) COOLDOWN_SYSTEM.incrementShots(weapon.type);
                const angle = Math.atan2(gameState.mouseY + gameState.cameraY - gameState.playerY,
                                        gameState.mouseX + gameState.cameraX - gameState.playerX);
                this.createMachinegunMuzzleFlash(gameState.playerX, gameState.playerY, angle);
            },
    
        startMinigun() {
            if (this.currentWeapon.type !== 'minigun') return;
            if (this.minigunInterval) return;
            this.minigunSpinning = true;
            this.minigunHeat = 0;
            setTimeout(() => {
                if (!this.minigunSpinning) return;
                this.minigunInterval = setInterval(() => {
                    if (!this.isMouseDown || !gameState.gameActive || gameState.mergingEnemies || !gameState.canShoot || this.minigunHeat >= this.MINIGUN.maxHeat) {
                        this.stopMinigun();
                        return;
                    }
                    this.minigunHeat += this.MINIGUN.heatPerShot;
                    this.shootMinigun();
                    this.updateAmmoDisplay();
                }, this.currentWeapon.fireRate);
            }, this.MINIGUN.spinUpTime);
        },
    
        stopMinigun() {
            this.minigunSpinning = false;
            if (this.minigunInterval) {
                clearInterval(this.minigunInterval);
                this.minigunInterval = null;
            }
            const coolInterval = setInterval(() => {
                this.minigunHeat = Math.max(0, this.minigunHeat - this.MINIGUN.heatDecayRate);
                if (this.minigunHeat <= 0) clearInterval(coolInterval);
            }, 100);
        },
    
        shootMinigun() {
                const now = Date.now();
                if (now - this.lastMinigunShot < this.currentWeapon.fireRate) return;
                const currentMinigunAmmo = window.gameState?.ammoCount?.minigun ?? 0;
                if (currentMinigunAmmo <= 0) return;
                this.lastMinigunShot = now;
                const spread = this.minigunHeat / this.MINIGUN.maxHeat;
                const currentSpread = this.MINIGUN.baseSpreadAngle + spread * (this.MINIGUN.maxSpreadAngle - this.MINIGUN.baseSpreadAngle);
                const baseAngle = Math.atan2(gameState.mouseY + gameState.cameraY - gameState.playerY, gameState.mouseX + gameState.cameraX - gameState.playerX);
                const finalAngle = baseAngle + (Math.random() - 0.5) * currentSpread;
                const projectile = this.createProjectile(gameState.playerX, gameState.playerY, finalAngle, this.MINIGUN, 0);
                gameState.projectiles.push(projectile);
                window.gameState.ammoCount.minigun--;
                if (window.COOLDOWN_SYSTEM) COOLDOWN_SYSTEM.incrementShots('minigun');
                this.updateAmmoDisplay();
                this.createMachinegunMuzzleFlash(gameState.playerX, gameState.playerY, finalAngle);
            },
    
        shoot(fromX, fromY, targetX, targetY) {
            const weapon = this.currentWeapon;
            const projectiles = [];

            const ammoWeapons = ['rifle', 'shotgun', 'machinegun', 'sniper', 'bazooka', 'minigun'];
            if (ammoWeapons.includes(weapon.type)) {
                const currentAmmo = window.gameState?.ammoCount?.[weapon.type] ?? 0;
                if (currentAmmo <= 0) {
                    return [];
                }
            }

            if (weapon.type === "rifle") this.rifleShots++;
            else if (weapon.type === "shotgun") this.shotgunShots++;
            else if (weapon.type === "machinegun") this.machinegunShots++;
            else if (weapon.type === "sniper") this.sniperShots++;
            else if (weapon.type === "bazooka") this.bazookaShots++;
            else if (weapon.type === "minigun") this.minigunShots++;
            else if (weapon.type === "contact") {
                this.executeContactStrike();
                return [];
            }
    
            if (weapon.type === "rifle" || weapon.type === "machinegun" || weapon.type === "sniper" || weapon.type === "bazooka" || weapon.type === "minigun") {
                const angle = Math.atan2(targetY - fromY, targetX - fromX);
                let finalAngle = angle;
                if (weapon.type === "machinegun" && weapon.spreadAngle > 0) {
                    const spread = (Math.random() - 0.5) * weapon.spreadAngle;
                    finalAngle = angle + spread;
                }
                const projectile = this.createProjectile(fromX, fromY, finalAngle, weapon, 0);
                projectiles.push(projectile);
            } else if (weapon.type === "shotgun") {
                const baseAngle = Math.atan2(targetY - fromY, targetX - fromX);
                const angleStep = weapon.spreadAngle / (weapon.projectileCount - 1);
                const startAngle = baseAngle - (weapon.spreadAngle / 2);
                for (let i = 0; i < weapon.projectileCount; i++) {
                    const angle = startAngle + (angleStep * i);
                    const randomOffset = (Math.random() - 0.5) * (weapon.spreadAngle / 8);
                    const finalAngle = angle + randomOffset;
                    const projectile = this.createProjectile(fromX, fromY, finalAngle, weapon, i);
                    projectiles.push(projectile);
                }
                this.createShotgunRecoilEffect(fromX, fromY, baseAngle);
            }
            if (ammoWeapons.includes(weapon.type)) {
                window.gameState.ammoCount[weapon.type]--;
            }
            this.updateAmmoDisplay();
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
    
            if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
                projectile.style.display = 'none';
            }
    
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
                originalAngle: angle,
                areaDamage: weapon.areaDamage || 0,
                explosionRadius: weapon.explosionRadius || 0,
                penetrating: weapon.type === 'sniper',
                penetrationLoss: weapon.penetrationLoss || 0,
                hitEnemies: weapon.type === 'sniper' ? new Set() : null
            };
        },
    
        createMachinegunMuzzleFlash(x, y, angle) {
                if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
                    for (let i = 0; i < 3; i++) {
                        const flashAngle = angle + (Math.random() - 0.5) * 0.3;
                        const flashSpeed = (Math.random() * 1 + 0.5) * 5 * 3;
                        CANVAS_RENDER.spawnParticle({
                            x, y,
                            vx: Math.cos(flashAngle) * flashSpeed,
                            vy: Math.sin(flashAngle) * flashSpeed,
                            life: 0.3,
                            size: Math.random() * 3 + 2,
                            color: '#ff9900',
                            alphaDecay: 0.7
                        });
                    }
                    return;
                }
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
                setTimeout(() => { if (flash.parentNode) flash.remove(); }, 300);
            }
            const playerElement = document.getElementById('player');
            if (playerElement) {
                playerElement.style.transform = `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) translate(${Math.cos(angle + Math.PI) * 1}px, ${Math.sin(angle + Math.PI) * 1}px)`;
                setTimeout(() => { playerElement.style.transform = `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`; }, 50);
            }
        },
    
        createSniperMuzzleEffect(x, y, angle) {
            const flash = document.createElement('div');
            flash.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 30px;
                background: linear-gradient(to bottom, #00ff00, transparent);
                border-radius: 2px;
                opacity: 0.9;
                z-index: 6;
                transform: translate(-50%, -50%) rotate(${angle}rad);
            `;
            document.getElementById('world-container').appendChild(flash);
            setTimeout(() => { if (flash.parentNode) flash.remove(); }, 100);
        },
    
        createBazookaMuzzleEffect(x, y, angle) {
            for (let i = 0; i < 5; i++) {
                const flash = document.createElement('div');
                flash.className = 'explosion-particle';
                flash.style.cssText = `
                    left:${x}px;
                    top:${y}px;
                    width:${Math.random() * 6 + 4}px;
                    height:${Math.random() * 6 + 4}px;
                    background-color: #ff8800;
                    border-radius: 50%;
                    opacity: 0.8;
                    position: absolute;
                    z-index: 4;
                `;
                const flashAngle = angle + (Math.random() - 0.5) * 0.4;
                const flashSpeed = Math.random() * 2 + 1;
                const tx = Math.cos(flashAngle) * flashSpeed * 8;
                const ty = Math.sin(flashAngle) * flashSpeed * 8;
                flash.style.setProperty('--tx', `${tx}px`);
                flash.style.setProperty('--ty', `${ty}px`);
                document.getElementById('world-container').appendChild(flash);
                setTimeout(() => { if (flash.parentNode) flash.remove(); }, 400);
            }
        },
    
        createShotgunRecoilEffect(x, y, angle) {
                if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
                    for (let i = 0; i < 5; i++) {
                        const smokeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
                        const smokeSpeed = (Math.random() * 1 + 0.5) * 3;
                        CANVAS_RENDER.spawnParticle({
                            x, y,
                            vx: Math.cos(smokeAngle) * smokeSpeed,
                            vy: Math.sin(smokeAngle) * smokeSpeed,
                            life: 0.3,
                            size: Math.random() * 3 + 2,
                            color: '#ff9900',
                            alphaDecay: 0.7
                        });
                    }
                    return;
                }
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
                const smokeSpeed = Math.random() * 1 + 0.5;
                const tx = Math.cos(smokeAngle) * smokeSpeed * 5;
                const ty = Math.sin(smokeAngle) * smokeSpeed * 5;
                smoke.style.setProperty('--tx', `${tx}px`);
                smoke.style.setProperty('--ty', `${ty}px`);
                document.getElementById('world-container').appendChild(smoke);
                setTimeout(() => { if (smoke.parentNode) smoke.remove(); }, 300);
            }
            const playerElement = document.getElementById('player');
            if (playerElement) {
                const recoilAngle = angle + Math.PI;
                playerElement.style.transform = `translate(-50%, -50%) rotate(${gameState.playerRotation}deg) translate(${Math.cos(recoilAngle) * 2}px, ${Math.sin(recoilAngle) * 2}px)`;
                setTimeout(() => { playerElement.style.transform = `translate(-50%, -50%) rotate(${gameState.playerRotation}deg)`; }, 80);
            }
        },
    
        updateProjectile(projectile) {
            if (!projectile) return true;
    
            projectile.x += projectile.speedX;
            projectile.y += projectile.speedY;
            projectile.distanceTraveled += Math.sqrt(
                projectile.speedX * projectile.speedX +
                projectile.speedY * projectile.speedY
            );
    
                    const useCanvas = (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER);
                    if (!useCanvas && projectile.element && projectile.element.parentNode) {
                        projectile.element.style.left = `${projectile.x}px`;
                        projectile.element.style.top = `${projectile.y}px`;
                    }
    
            if (projectile.weaponType === "machinegun" || projectile.weaponType === "minigun") {
                const angle = Math.atan2(projectile.speedY, projectile.speedX);
                if (projectile.element) projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
                const fadeStart = projectile.maxDistance * 0.7;
                if (projectile.distanceTraveled > fadeStart && projectile.element) {
                    const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                    projectile.element.style.opacity = (1 - fadeAmount * 0.8).toString();
                }
            } else if (projectile.weaponType === "shotgun") {
                const fadeStart = projectile.maxDistance * 0.7;
                if (projectile.distanceTraveled > fadeStart && projectile.element) {
                    const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                    projectile.element.style.opacity = (1 - fadeAmount * 0.8).toString();
                }
            } else if (projectile.weaponType === "sniper") {
                const angle = Math.atan2(projectile.speedY, projectile.speedX);
                if (projectile.element) projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
                const fadeStart = projectile.maxDistance * 0.9;
                if (projectile.distanceTraveled > fadeStart && projectile.element) {
                    const fadeAmount = (projectile.distanceTraveled - fadeStart) / (projectile.maxDistance - fadeStart);
                    projectile.element.style.opacity = (1 - fadeAmount * 0.5).toString();
                }
            } else if (projectile.weaponType === "bazooka") {
                const angle = Math.atan2(projectile.speedY, projectile.speedX);
                if (projectile.element) projectile.element.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
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
                    document.getElementById('world-container').appendChild(trail);
                    setTimeout(() => { if (trail.parentNode) trail.remove(); }, 200);
                }
            }
    
            if (projectile.distanceTraveled >= projectile.maxDistance) {
                if (projectile.weaponType === "bazooka") {
                    this.applyBazookaAreaDamage(projectile.x, projectile.y, projectile.explosionRadius, projectile.areaDamage);
                }
                return true;
            }
    
            return false;
        },
    
        removeProjectile(projectile) {
            if (projectile.element && projectile.element.parentNode) {
                projectile.element.remove();
            }
            return true;
        },
    
        // ============================================
        // executeContactStrike: rayo + cono de daño de 45°
        //  - Alcance: 25px
        //  - Daño: 2 puntos
        //  - Cono: 45° total (22.5° a cada lado del rayo)
        //  - Aplica a TODO dentro del cono: enemigos y bricks
        //  - El rayo visual es un arco voltaico (zigzag + ramas)
        // ============================================
        executeContactStrike() {
            const now = Date.now();
            if (now - (this.lastContactShot || 0) < this.currentWeapon.cooldownDuration) return;
            this.lastContactShot = now;

            const angle = Math.atan2(
                gameState.mouseY + gameState.cameraY - gameState.playerY,
                gameState.mouseX + gameState.cameraX - gameState.playerX
            );

            // Origen: punta del triángulo (a 15px del jugador)
            const originX = gameState.playerX + Math.cos(angle) * 15;
            const originY = gameState.playerY + Math.sin(angle) * 15;

            const range = this.currentWeapon.range || 25;
            const halfCone = (this.currentWeapon.coneAngle || 45 * Math.PI / 180) / 2;

            // Destino visual del rayo: hasta el alcance máximo
            const endX = originX + Math.cos(angle) * range;
            const endY = originY + Math.sin(angle) * range;

            // 1) Colisión visual con obstáculos: acortar el rayo si choca con pared
            let visualEndX = endX;
            let visualEndY = endY;
            if (typeof obstacleGrid !== 'undefined' && typeof isSolidObstacle === 'function') {
                const midX = (originX + endX) / 2;
                const midY = (originY + endY) / 2;
                const obstacles = obstacleGrid.getNearbyObstacles(midX, midY, range + 20);
                let closestT = 1.0;
                for (const obs of obstacles) {
                    if (!isSolidObstacle(obs)) continue;
                    if (typeof segmentRectEnterTime === 'function') {
                        const t = segmentRectEnterTime(
                            originX, originY, endX, endY,
                            obs.left, obs.top, obs.right, obs.bottom
                        );
                        if (t >= 0 && t < closestT) closestT = t;
                    }
                }
                if (closestT < 1.0) {
                    visualEndX = originX + (endX - originX) * closestT;
                    visualEndY = originY + (endY - originY) * closestT;
                }
            }

            // 2) Crear el bolt visual (arco voltaico)
            if (typeof RAYO !== 'undefined' && window.CANVAS_RENDER) {
                const bolt = RAYO.crearBolt(originX, originY, visualEndX, visualEndY, { VIDA: 0.18 });
                CANVAS_RENDER.spawnParticle(bolt);

                // Chispas en el punto de impacto visual
                if (RAYO.crearChispas) {
                    const chispas = RAYO.crearChispas(
                        visualEndX, visualEndY,
                        Math.cos(angle), Math.sin(angle),
                        5,
                        { VIDA: 0.18 }
                    );
                    for (const c of chispas) CANVAS_RENDER.spawnParticle(c);
                }
            }

            // 3) Aplicar daño en CONO de 45° (22.5° a cada lado)
            //    - Enemigos dentro del cono reciben 2 de daño
            //    - Bricks dentro del cono reciben 2 de daño (y pueden destruirse)
            const damage = this.currentWeapon.damagePerShot || 2;
            const cosHalf = Math.cos(halfCone);

            // 3a) Enemigos
            if (window.handleEnemyHit && gameState.enemies) {
                for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                    const enemy = gameState.enemies[i];
                    if (!enemy.active) continue;
                    const dx = enemy.x - originX;
                    const dy = enemy.y - originY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > range + (enemy.radius || 10)) continue;
                    // Ángulo entre el vector enemigo y la dirección del rayo
                    const dot = (dx * Math.cos(angle) + dy * Math.sin(angle)) / (dist || 1);
                    if (dot < cosHalf) continue; // fuera del cono
                    if (window.handleEnemyHit(enemy, damage, angle)) {
                        gameState.enemies.splice(i, 1);
                        gameState.currentEnemyCount = Math.max(0, gameState.currentEnemyCount - 1);
                    }
                }
            }

            // 3b) Bricks (paredes destructibles)
            if (gameState.obstacles) {
                for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
                    const obs = gameState.obstacles[i];
                    if (!obs.isBrick) continue;
                    // Punto más cercano del rectángulo al origen
                    const closestX = Math.max(obs.left, Math.min(originX, obs.right));
                    const closestY = Math.max(obs.top, Math.min(originY, obs.bottom));
                    const dx = closestX - originX;
                    const dy = closestY - originY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > range + 2) continue;
                    // Ángulo desde el origen al punto más cercano del brick
                    const dot = (dx * Math.cos(angle) + dy * Math.sin(angle)) / (dist || 1);
                    if (dot < cosHalf) continue; // fuera del cono
                    // Aplicar daño
                    obs.health -= damage;
                    if (typeof BRICK_SYSTEM !== 'undefined') {
                        const dmgLevel = BRICK_SYSTEM.BRICK_HEALTH - obs.health;
                        BRICK_SYSTEM.createBrickImpactEffect(obs.x, obs.y, dmgLevel);
                        BRICK_SYSTEM.applyDamageVisual(obs.element, dmgLevel);
                        if (obs.health <= 0) {
                            BRICK_SYSTEM.destroyBrick(obs, i);
                        }
                    }
                }
            }
        },
    
        applyBazookaAreaDamage(x, y, radius, areaDamage) {
            const explosion = this.createBazookaExplosion(x, y, radius);
    
            for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
                const obstacle = gameState.obstacles[i];
                if (!obstacle.isDestructible) continue;
                
                const dx = obstacle.x - x;
                const dy = obstacle.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const halfSize = Math.max(obstacle.width || 8, obstacle.height || 8) / 2;
                
                if (distance < radius + halfSize) {
                    obstacle.health -= areaDamage;
                    BRICK_SYSTEM.createBrickImpactEffect(obstacle.x, obstacle.y, BRICK_SYSTEM.BRICK_HEALTH - obstacle.health);
                    BRICK_SYSTEM.applyDamageVisual(obstacle.element, BRICK_SYSTEM.BRICK_HEALTH - obstacle.health);
                    if (obstacle.health <= 0) {
                        BRICK_SYSTEM.destroyBrick(obstacle, i);
                    }
                }
            }
    
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                if (distance < radius + enemy.radius) {
                    const impactAngle = Math.atan2(enemy.y - y, enemy.x - x);
                    this.createAreaDamageEffect(enemy.x, enemy.y);
                    if (handleEnemyHit(enemy, areaDamage, impactAngle)) {
                        gameState.enemies.splice(i, 1);
                        gameState.currentEnemyCount--;
                    }
                }
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
                setTimeout(() => { if (particle.parentNode) particle.remove(); }, 1200);
            }
    
            const colors = ['#ff8800', '#ffaa00', '#ff4400', '#ff6600'];
            const ring = document.createElement('div');
            ring.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 0;
                height: 0;
                border: 4px solid ${colors[0]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 100;
                transform: translate(-50%, -50%);
                animation: explode-ring 0.5s ease-out forwards;
            `;
            document.getElementById('world-container').appendChild(ring);
    
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                const tx = Math.cos(angle) * speed * 12;
                const ty = Math.sin(angle) * speed * 12;
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: 8px;
                    height: 8px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 80;
                `;
                particle.style.setProperty('--tx', `${tx}px`);
                particle.style.setProperty('--ty', `${ty}px`);
                document.getElementById('world-container').appendChild(particle);
                setTimeout(() => { if (particle.parentNode) particle.remove(); }, 800);
            }
            setTimeout(() => { if (ring.parentNode) ring.remove(); }, 1000);
        },
    
        createAreaDamageEffect(x, y) {
                if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
                    for (let i = 0; i < 5; i++) {
                        const flashAngle = Math.random() * Math.PI * 2;
                        const flashSpeed = (Math.random() * 2 + 1) * 8 * 3;
                        CANVAS_RENDER.spawnParticle({
                            x, y,
                            vx: Math.cos(flashAngle) * flashSpeed,
                            vy: Math.sin(flashAngle) * flashSpeed,
                            life: 0.4,
                            size: Math.random() * 4 + 3,
                            color: '#00ff00',
                            alphaDecay: 0.8
                        });
                    }
                    return;
                }
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
                const flashAngle = Math.random() * Math.PI * 2;
                const flashSpeed = Math.random() * 2 + 1;
                const tx = Math.cos(flashAngle) * flashSpeed * 8;
                const ty = Math.sin(flashAngle) * flashSpeed * 8;
                flash.style.setProperty('--tx', `${tx}px`);
                flash.style.setProperty('--ty', `${ty}px`);
                document.getElementById('world-container').appendChild(flash);
                setTimeout(() => { if (flash.parentNode) flash.remove(); }, 400);
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
            setTimeout(() => { if (shockwave.parentNode) shockwave.remove(); }, 400);
        },
    
        getCurrentWeapon() {
            return this.currentWeapon;
        },
    
        resetStats() {
            this.rifleShots = 0;
            this.shotgunShots = 0;
            this.machinegunShots = 0;
            this.minigunShots = 0;
            this.sniperShots = 0;
            this.bazookaShots = 0;
            this.lastContactShot = 0;
            this.stopMachinegun();
            this.stopMinigun();
            this.isMouseDown = false;
            this.minigunHeat = 0;
        }
    };
    
    window.WEAPON_SYSTEM = WEAPON_SYSTEM;