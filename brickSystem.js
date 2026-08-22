// ========== SISTEMA DE LADRILLOS 8px FORTIFICADOS ==========
const BRICK_SYSTEM = {
    BRICK_HEALTH: 5,
    BRICK_SCORE: 20,
    
    BRICK_HORIZONTAL_WIDTH: 8,
    BRICK_VERTICAL_HEIGHT: 8,
    
    PRINCIPAL_THICKNESS: 4,
    MENOR_THICKNESS: 2,
    
    PRINCIPAL_MIN_LENGTH: 80,
    PRINCIPAL_MAX_LENGTH: 120,
    MENOR_MIN_LENGTH: 30,
    MENOR_MAX_LENGTH: 50,
    
    DAMAGE_COLORS: [
        '#888888',
        '#999999',
        '#aaaaaa',
        '#bbbbbb',
        '#cccccc',
        '#ffffff'
    ],
    
    createWallDefinition(type, orientation, regionX, regionY) {
        const isPrincipal = type === 'principal';
        
        let length;
        if (isPrincipal) {
            length = Math.random() * (this.PRINCIPAL_MAX_LENGTH - this.PRINCIPAL_MIN_LENGTH) + this.PRINCIPAL_MIN_LENGTH;
        } else {
            length = Math.random() * (this.MENOR_MAX_LENGTH - this.MENOR_MIN_LENGTH) + this.MENOR_MIN_LENGTH;
        }
        
        return {
            isDestructible: true,
            isBrickWall: true,
            wallType: type,
            orientation: orientation,
            length: length,
            relX: Math.random() * 0.7 + 0.15,
            relY: Math.random() * 0.7 + 0.15
        };
    },
    
    createBricksFromWall(wallDef, regionX, regionY, scaleFactor) {
        const bricks = [];
        const isPrincipal = wallDef.wallType === 'principal';
        const isHorizontal = wallDef.orientation === 'horizontal';
        
        let brickWidth, brickHeight;
        if (isHorizontal) {
            brickWidth = this.BRICK_HORIZONTAL_WIDTH * scaleFactor;
            brickHeight = (isPrincipal ? this.PRINCIPAL_THICKNESS : this.MENOR_THICKNESS) * scaleFactor;
        } else {
            brickWidth = (isPrincipal ? this.PRINCIPAL_THICKNESS : this.MENOR_THICKness) * scaleFactor;
            brickHeight = this.BRICK_VERTICAL_HEIGHT * scaleFactor;
        }
        
        const wallCenterX = regionX * REGION_WIDTH + wallDef.relX * REGION_WIDTH;
        const wallCenterY = regionY * REGION_HEIGHT + wallDef.relY * REGION_HEIGHT;
        
        const scaledLength = wallDef.length * scaleFactor;
        const brickCount = isHorizontal ? 
            Math.ceil(scaledLength / brickWidth) : 
            Math.ceil(scaledLength / brickHeight);
        
        const actualLength = isHorizontal ? brickCount * brickWidth : brickCount * brickHeight;
        
        for (let i = 0; i < brickCount; i++) {
            let brickX, brickY;
            
            if (isHorizontal) {
                const startX = wallCenterX - actualLength / 2;
                brickX = startX + (i * brickWidth) + (brickWidth / 2);
                brickY = wallCenterY;
            } else {
                const startY = wallCenterY - actualLength / 2;
                brickX = wallCenterX;
                brickY = startY + (i * brickHeight) + (brickHeight / 2);
            }
            
            bricks.push({
                x: brickX,
                y: brickY,
                width: brickWidth,
                height: brickHeight,
                isDestructible: true,
                isBrick: true,
                wallType: wallDef.wallType,
                orientation: wallDef.orientation,
                health: this.BRICK_HEALTH,
                isPrincipal: isPrincipal
            });
        }
        
        return bricks;
    },
    
    applyDamageVisual(brickElement, damage) {
        if (!brickElement) return;
        
        brickElement.classList.remove('damaged-1', 'damaged-2', 'damaged-3', 'damaged-4', 'damaged-5', 'damaged-6', 'critical');
        
        if (damage >= 5) {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[5];
            brickElement.classList.add('damaged-6', 'critical');
        } else if (damage >= 4) {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[4];
            brickElement.classList.add('damaged-5');
        } else if (damage >= 3) {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[3];
            brickElement.classList.add('damaged-4');
        } else if (damage >= 2) {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[2];
            brickElement.classList.add('damaged-3');
        } else if (damage >= 1) {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[1];
            brickElement.classList.add('damaged-2');
        } else {
            brickElement.style.backgroundColor = this.DAMAGE_COLORS[0];
            brickElement.classList.add('damaged-1');
        }
    },
    
    createBrickImpactEffect(x, y, damageLevel) {
        const spark = document.createElement('div');
        spark.className = 'brick-damage-indicator';
        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        document.getElementById('world-container').appendChild(spark);
        
        const crack = document.createElement('div');
        crack.className = 'brick-crack-effect';
        crack.style.left = `${x}px`;
        crack.style.top = `${y}px`;
        crack.style.setProperty('--crack-rotate', `${Math.random() * 360}deg`);
        document.getElementById('world-container').appendChild(crack);
        
        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            particle.className = 'brick-explosion-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            
            const grayValue = Math.floor(Math.random() * 80) + 150;
            particle.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 8 + 4;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--particle-tx', `${tx}px`);
            particle.style.setProperty('--particle-ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
        
        setTimeout(() => {
            spark.remove();
            crack.remove();
        }, 200);
    },
    
    destroyBrick(brick, index) {
        if (!brick.element) return;
        
        const x = brick.x;
        const y = brick.y;
        const width = brick.width;
        const height = brick.height;
        
        this.createDustCloud(x, y, Math.max(width, height) * 0.8);
        this.createShockwave(x, y);
        this.createGreyDebris(x, y, width, height);
        this.createPersistentBrickRubble(x, y, width, height);
        
        brick.element.remove();
        
        if (index >= 0 && index < gameState.obstacles.length) {
            gameState.obstacles.splice(index, 1);
        }
        
        gameState.score += this.BRICK_SCORE;
        gameState.wallsDestroyed++;
        updateScoreDisplay();
        
        if (document.getElementById('walls-destroyed')) {
            document.getElementById('walls-destroyed').textContent = `Ladrillos destruidos: ${gameState.wallsDestroyed}`;
        }
    },
    
    createDustCloud(x, y, size) {
        const cloud = document.createElement('div');
        cloud.className = 'brick-dust-cloud';
        cloud.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        document.getElementById('world-container').appendChild(cloud);
        
        setTimeout(() => {
            document.getElementById('game-container').classList.add('orange-screen-shake');
            setTimeout(() => document.getElementById('game-container').classList.remove('orange-screen-shake'), 150);
        }, 0);
        
        setTimeout(() => cloud.remove(), 600);
    },
    
    createShockwave(x, y) {
        const shockwave = document.createElement('div');
        shockwave.className = 'brick-shockwave';
        shockwave.style.cssText = `left:${x}px;top:${y}px;width:30px;height:30px`;
        document.getElementById('world-container').appendChild(shockwave);
        
        setTimeout(() => shockwave.remove(), 400);
    },
    
    createGreyDebris(x, y, width, height) {
        const fragmentCount = Math.floor((width + height) / 4) + 4;
        
        for (let i = 0; i < fragmentCount; i++) {
            const fragment = document.createElement('div');
            fragment.className = 'brick-fragment';
            
            const size = Math.random() * 1.2 + 0.8;
            fragment.style.width = `${size}px`;
            fragment.style.height = `${size}px`;
            
            const grayValue = Math.floor(Math.random() * 70) + 100;
            fragment.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
            
            if (Math.random() > 0.5) {
                fragment.style.borderRadius = '0';
            } else {
                fragment.style.borderRadius = '1px';
            }
            
            const fragX = x - width/2 + Math.random() * width;
            const fragY = y - height/2 + Math.random() * height;
            
            fragment.style.left = `${fragX}px`;
            fragment.style.top = `${fragY}px`;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const tx = Math.cos(angle) * speed * 8;
            const ty = Math.sin(angle) * speed * 8;
            const rotation = Math.random() * 360;
            
            fragment.style.setProperty('--frag-tx', `${tx}px`);
            fragment.style.setProperty('--frag-ty', `${ty}px`);
            fragment.style.setProperty('--frag-rotate', `${rotation}deg`);
            
            document.getElementById('world-container').appendChild(fragment);
            
            if (Math.random() > 0.7) {
                this.createFallingDebris(fragX, fragY);
            }
            
            setTimeout(() => fragment.remove(), 900);
        }
    },
    
    createPersistentBrickRubble(x, y, width, height) {
        const rubbleCount = Math.floor((width + height) / 4) + 3;
        
        for (let i = 0; i < rubbleCount; i++) {
            const rubbleType = Math.random();
            
            if (rubbleType < 0.7) {
                this.createBrickStain(x, y, width, height);
            } else {
                this.createBrickFragmentRubble(x, y, width, height);
            }
        }
    },
    
    createBrickStain(x, y, width, height) {
        if (gameState.stains.length >= 1500) {
            this.cleanupExcessBrickRubble();
        }
        
        const stain = document.createElement('div');
        stain.className = 'brick-rubble';
        
        const sizeType = Math.random();
        if (sizeType > 0.7) {
            stain.classList.add('large');
        } else if (sizeType > 0.4) {
            stain.classList.add('medium');
        } else {
            stain.classList.add('small');
        }
        
        const grayValue = Math.floor(Math.random() * 80) + 100;
        stain.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        
        const stainX = x - width/2 + Math.random() * width;
        const stainY = y - height/2 + Math.random() * height;
        
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetY = (Math.random() - 0.5) * 4;
        
        stain.style.left = `${stainX + offsetX}px`;
        stain.style.top = `${stainY + offsetY}px`;
        
        if (Math.random() > 0.5) {
            stain.style.borderRadius = '1px';
        } else {
            stain.style.borderRadius = '0';
        }
        
        stain.classList.add('fade-out');
        
        document.getElementById('world-container').appendChild(stain);
        
        gameState.stains.push({
            element: stain,
            createdAt: Date.now(),
            type: 'brick',
            x: stainX + offsetX,
            y: stainY + offsetY
        });
    },
    
    createBrickFragmentRubble(x, y, width, height) {
        const fragment = document.createElement('div');
        fragment.className = 'brick-rubble-fragment';
        
        const size = Math.random() * 0.5 + 0.5;
        fragment.style.width = `${size}px`;
        fragment.style.height = `${size}px`;
        
        const grayValue = Math.floor(Math.random() * 60) + 150;
        fragment.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        
        const fragX = x - width/2 + Math.random() * width;
        const fragY = y - height/2 + Math.random() * height;
        
        fragment.style.left = `${fragX}px`;
        fragment.style.top = `${fragY}px`;
        fragment.style.transform = `rotate(${Math.random() * 360}deg)`;
        fragment.classList.add('fade-out');
        
        document.getElementById('world-container').appendChild(fragment);
        
        gameState.stains.push({
            element: fragment,
            createdAt: Date.now(),
            type: 'brick-fragment',
            x: fragX,
            y: fragY
        });
    },
    
    cleanupExcessBrickRubble() {
        const brickRubble = gameState.stains.filter(stain => 
            stain.type === 'brick' || stain.type === 'brick-fragment'
        );
        
        if (brickRubble.length > 800) {
            brickRubble.sort((a, b) => a.createdAt - b.createdAt);
            
            const toRemove = brickRubble.slice(0, 200);
            toRemove.forEach(stain => {
                const index = gameState.stains.findIndex(s => s === stain);
                if (index !== -1) {
                    if (stain.element && document.getElementById('world-container').contains(stain.element)) {
                        stain.element.remove();
                    }
                    gameState.stains.splice(index, 1);
                }
            });
        }
    },
    
    createFallingDebris(x, y) {
        const debris = document.createElement('div');
        debris.className = 'brick-debris';
        debris.style.left = `${x}px`;
        debris.style.top = `${y}px`;
        
        const grayValue = Math.floor(Math.random() * 60) + 180;
        debris.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        
        const tx = (Math.random() - 0.5) * 15;
        const ty = Math.random() * 20 + 10;
        const rotation = Math.random() * 180 - 90;
        
        debris.style.setProperty('--debris-tx', `${tx}px`);
        debris.style.setProperty('--debris-ty', `${ty}px`);
        debris.style.setProperty('--debris-rotate', `${rotation}deg`);
        
        document.getElementById('world-container').appendChild(debris);
        setTimeout(() => debris.remove(), 1200);
    }
};