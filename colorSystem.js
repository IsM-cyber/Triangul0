// ========== SISTEMA DE DEGRADADO PROGRESIVO AL NIVEL 32 ==========
const COLOR_SYSTEM = {
    MAP_START: { r: 22, g: 33, b: 62 },
    PLAYER_COLOR: { r: 233, g: 69, b: 96 },
    
    MAX_LEVEL: 32,
    TRANSITION_SPEED: 0.3,
    
    getColorForLevel(level) {
        const normalizedLevel = Math.max(0, Math.min(level, this.MAX_LEVEL));
        
        if (normalizedLevel === 0) {
            return this.MAP_START;
        }
        
        const factor = (normalizedLevel - 1) / (this.MAX_LEVEL - 1);
        return this.blendColors(this.MAP_START, this.PLAYER_COLOR, factor);
    },
    
    blendColors(color1, color2, factor) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * factor),
            g: Math.round(color1.g + (color2.g - color1.g) * factor),
            b: Math.round(color1.b + (color2.b - color1.b) * factor)
        };
    },
    
    rgbToString(rgb) {
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    },
    
    updateVisualProgress(level) {
        const levelBar = document.getElementById('level-bar');
        const normalizedLevel = Math.min(level, this.MAX_LEVEL);
        
        if (levelBar) {
            levelBar.style.width = `${(normalizedLevel / this.MAX_LEVEL) * 100}%`;
            
            if (normalizedLevel > gameState.previousLevel) {
                levelBar.style.animation = 'none';
                setTimeout(() => {
                    levelBar.style.animation = 'healthShine 1s';
                }, 10);
            }
        }
    },
    
    applyColorTransition(targetColor) {
        const transitionEffect = document.getElementById('color-transition');
        if (!transitionEffect) return;
        
        transitionEffect.style.background = `radial-gradient(circle at center, 
            rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.15) 0%, 
            transparent 70%)`;
        transitionEffect.style.opacity = '0.7';
        
        setTimeout(() => {
            transitionEffect.style.opacity = '0';
        }, 800);
    }
};