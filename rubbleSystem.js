// ========== SISTEMA DE INESTABILIDAD POR ESCOMBROS ==========
const RUBBLE_SYSTEM = {
    UNSTABLE_RADIUS: 18,
            MAX_DEVIATION_FORCE: 0.5,
            BASE_DEVIATION_FORCE: 0.3,
            UNSTABLE_DURATION: 300,
    
    currentUnstableTime: 0,
    isUnstable: false,
    lastRubbleContact: 0,
    activeRubbleEffects: [],
    
    checkPlayerOnRubble(playerX, playerY) {
        const now = Date.now();
        let onRubble = false;
        this.activeRubbleEffects = [];
        
        for (let stain of gameState.stains) {
            if (stain.type === 'brick' || stain.type === 'brick-fragment') {
                const dx = stain.x - playerX;
                const dy = stain.y - playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.UNSTABLE_RADIUS) {
                                onRubble = true;
                                this.lastRubbleContact = now;
                    
                                this.activeRubbleEffects.push({
                                    stain: stain,
                                    distance: distance,
                                    intensity: 1 - (distance / this.UNSTABLE_RADIUS)
                                });
                    
                                if (stain.element && !stain.element.classList.contains('player-on-rubble')) {
                                    stain.element.classList.add('player-on-rubble');
                                    this.createRubbleEffectIndicator(stain.x, stain.y);
                                } else if (!stain.element) {
                                    // Canvas stain: crear indicador de partícula cada poco
                                    if (Math.random() < 0.15) this.createRubbleEffectIndicator(stain.x, stain.y);
                                }
                            } else {
                                if (stain.element && stain.element.classList.contains('player-on-rubble')) {
                                    stain.element.classList.remove('player-on-rubble');
                                }
                }
            }
        }
        
        if (onRubble) {
            this.isUnstable = true;
            this.currentUnstableTime = this.UNSTABLE_DURATION;
        } else if (this.currentUnstableTime > 0) {
            this.currentUnstableTime -= (now - (this.lastRubbleContact || now));
            if (this.currentUnstableTime <= 0) {
                this.isUnstable = false;
                this.currentUnstableTime = 0;
            }
        } else {
            this.isUnstable = false;
        }
        
        return this.isUnstable;
    },
    
    applyUnstableEffect(playerX, playerY, currentSpeed) {
        if (!this.isUnstable || gameState.turboActive) return { x: 0, y: 0 };
        
        let totalDeviationX = 0;
        let totalDeviationY = 0;
        let totalIntensity = 0;
        
        for (let effect of this.activeRubbleEffects) {
                    const intensity = effect.intensity;
                    const stain = effect.stain;

                    const angle = Math.atan2(playerY - stain.y, playerX - stain.x) + (Math.random() - 0.5) * Math.PI;
                    const force = this.BASE_DEVIATION_FORCE * intensity * (currentSpeed / gameState.playerSpeed);

                    totalDeviationX += Math.cos(angle) * force;
                    totalDeviationY += Math.sin(angle) * force;
                    totalIntensity += intensity;
                }
        
        if (totalIntensity > 0) {
            return {
                x: totalDeviationX / totalIntensity,
                y: totalDeviationY / totalIntensity
            };
        }
        
        return { x: 0, y: 0 };
    },
    
    createRubbleEffectIndicator(x, y) {
        if (typeof USE_CANVAS_RENDER !== 'undefined' && USE_CANVAS_RENDER && window.CANVAS_RENDER) {
            CANVAS_RENDER.spawnParticle({ x, y, life: 0.5, size: 3, color: '#aaa', shape: 'circle' });
            return;
        }
        const indicator = document.createElement('div');
        indicator.className = 'rubble-effect-indicator';
        indicator.style.cssText = `left:${x}px;top:${y}px`;
        document.getElementById('world-container').appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode === document.getElementById('world-container')) {
                indicator.remove();
            }
        }, 500);
    },
    
    reset() {
        this.currentUnstableTime = 0;
        this.isUnstable = false;
        this.lastRubbleContact = 0;
        this.activeRubbleEffects = [];
    }
};