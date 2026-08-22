// ========== SISTEMA DE ENFRIAMIENTO PERSONALIZADO ==========
const COOLDOWN_SYSTEM = {
    currentCooldownShots: 0,
    currentCooldownType: null,
    
    init() {
        this.currentCooldownShots = 0;
        this.currentCooldownType = null;
    },
    
    incrementShots(weaponType) {
        if (this.currentCooldownType !== weaponType) {
            this.currentCooldownShots = 0;
            this.currentCooldownType = weaponType;
        }
        
        this.currentCooldownShots++;
        
        const weapon = WEAPON_SYSTEM.getCurrentWeapon();
        
        WEAPON_SYSTEM.updateAmmoDisplay();
        
        if (this.currentCooldownShots >= weapon.cooldownShots) {
            this.startCooldown(weapon.cooldownDuration, weapon.type);
            return true;
        }
        return false;
    },
    
    startCooldown(duration, weaponType) {
        gameState.canShoot = false;
        gameState.isCooldownActive = true;
        gameState.cooldownWeaponType = weaponType;
        
        if (cooldownIndicator) {
            cooldownIndicator.style.display = 'block';
            cooldownBar.style.transform = 'scaleX(0)';
            
            if (weaponType === 'shotgun') {
                cooldownIndicator.style.borderColor = '#ff9900';
                cooldownBar.style.backgroundColor = '#ff9900';
                cooldownText.style.color = '#ff9900';
            } else if (weaponType === 'machinegun') {
                cooldownIndicator.style.borderColor = '#ff3333';
                cooldownBar.style.backgroundColor = '#ff3333';
                cooldownText.style.color = '#ff3333';
            } else if (weaponType === 'minigun') {
                cooldownIndicator.style.borderColor = '#ff00ff';
                cooldownBar.style.backgroundColor = '#ff00ff';
                cooldownText.style.color = '#ff00ff';
                cooldownText.textContent = '¡MINIGUN RECARGANDO! 33 SEGUNDOS';
            } else {
                cooldownIndicator.style.borderColor = '#0cc0df';
                cooldownBar.style.backgroundColor = '#0cc0df';
                cooldownText.style.color = '#0cc0df';
            }
        }
        
        let startTime = Date.now();
        const animateCooldown = () => {
            if (!gameState.isCooldownActive) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (cooldownBar) cooldownBar.style.transform = `scaleX(${progress})`;
            
            if (progress < 1) {
                requestAnimationFrame(animateCooldown);
            }
        };
        
        requestAnimationFrame(animateCooldown);
        
        gameState.cooldownTimer = setTimeout(() => {
            this.endCooldown();
        }, duration);
    },
    
    endCooldown() {
        gameState.canShoot = true;
        gameState.isCooldownActive = false;
        
        this.currentCooldownShots = 0;
        gameState.cooldownWeaponType = null;
        
        if (cooldownIndicator) {
            cooldownIndicator.style.display = 'none';
            cooldownBar.style.transform = 'scaleX(1)';
            cooldownText.textContent = 'RECARGANDO...';
        }
        
        WEAPON_SYSTEM.updateAmmoDisplay();
        
        if (gameState.cooldownTimer) {
            clearTimeout(gameState.cooldownTimer);
            gameState.cooldownTimer = null;
        }
    },
    
    reset() {
        this.currentCooldownShots = 0;
        this.currentCooldownType = null;
        if (gameState.cooldownTimer) {
            clearTimeout(gameState.cooldownTimer);
            gameState.cooldownTimer = null;
        }
        gameState.canShoot = true;
        gameState.isCooldownActive = false;
        gameState.cooldownWeaponType = null;
    }
};