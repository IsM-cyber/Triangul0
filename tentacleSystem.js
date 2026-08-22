// ========== SISTEMA DE TENTÁCULOS PARA BESTIA VERDE ==========
const TENTACLE_SYSTEM = {
    TENTACLE_COUNT: 5,
    SEGMENTS_PER_TENTACLE: 6,
    BASE_SEGMENT_SIZE: 10,
    TIP_SEGMENT_SIZE: 4,
    TENTACLE_LENGTH: 60,
    WAVE_SPEED: 2.0,
    WAVE_AMPLITUDE: 10,
    SEGMENT_FOLLOW_SPEED: 0.25,
    
    GRAB_DAMAGE: 2,
    GRAB_DAMAGE_INTERVAL: 1000,
    GRAB_SLOW_FACTOR: 0.5,
    SEGMENT_HEALTH: 10,
    SEGMENT_DESTROY_SCORE: 150,
    
    activeTentacles: new Map(),
    tentacleDamageTotal: 0,
    tentaclesDestroyed: 0,
    
    createTentaclesForGreenEnemy(enemy) {
        const tentacles = [];
        const baseRadius = enemy.radius * 0.7;
        
        for (let i = 0; i < this.TENTACLE_COUNT; i++) {
            const angle = (i / this.TENTACLE_COUNT) * Math.PI * 2;
            const tentacle = {
                enemyId: enemy.id,
                index: i,
                angle: angle,
                baseAngle: angle,
                targetAngle: angle,
                segments: [],
                wavePhase: Math.random() * Math.PI * 2,
                isGrabbing: false,
                grabTarget: null,
                lastGrabDamage: 0,
                segmentHealths: []
            };
            
            for (let j = 0; j < this.SEGMENTS_PER_TENTACLE; j++) {
                const segment = document.createElement('div');
                const segmentSize = this.BASE_SEGMENT_SIZE - 
                    (this.BASE_SEGMENT_SIZE - this.TIP_SEGMENT_SIZE) * 
                    (j / (this.SEGMENTS_PER_TENTACLE - 1));
                
                segment.className = 'tentacle-segment';
                if (j === 0) segment.classList.add('base');
                else if (j < this.SEGMENTS_PER_TENTACLE - 1) segment.classList.add('middle');
                else segment.classList.add('tip');
                
                segment.style.width = `${segmentSize}px`;
                segment.style.height = `${segmentSize}px`;
                segment.style.position = 'absolute';
                segment.style.zIndex = '29';
                
                document.getElementById('world-container').appendChild(segment);
                
                const segmentData = {
                    element: segment,
                    size: segmentSize,
                    x: enemy.x,
                    y: enemy.y,
                    targetX: enemy.x,
                    targetY: enemy.y,
                    index: j,
                    health: this.SEGMENT_HEALTH
                };
                
                tentacle.segments.push(segmentData);
                tentacle.segmentHealths.push(this.SEGMENT_HEALTH);
            }
            
            tentacles.push(tentacle);
        }
        
        this.activeTentacles.set(enemy.id, tentacles);
        return tentacles;
    },
    
    updateTentacles(enemy, deltaTime) {
        const tentacles = this.activeTentacles.get(enemy.id);
        if (!tentacles || !enemy.active) return;
        
        const playerDx = gameState.playerX - enemy.x;
        const playerDy = gameState.playerY - enemy.y;
        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
        const playerAngle = Math.atan2(playerDy, playerDx);
        
        const reactionDistance = 300;
        
        tentacles.forEach((tentacle, tentacleIndex) => {
            if (playerDistance < reactionDistance) {
                const optimalAngle = playerAngle + 
                    (tentacleIndex / tentacles.length - 0.5) * Math.PI * 0.7;
                
                let angleDiff = optimalAngle - tentacle.targetAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                tentacle.targetAngle += angleDiff * 0.05;
            } else {
                const baseAngle = tentacle.baseAngle + enemy.tentacleWavePhase;
                let angleDiff = baseAngle - tentacle.targetAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                tentacle.targetAngle += angleDiff * 0.03;
            }
            
            let currentAngleDiff = tentacle.targetAngle - tentacle.angle;
            while (currentAngleDiff > Math.PI) currentAngleDiff -= Math.PI * 2;
            while (currentAngleDiff < -Math.PI) currentAngleDiff += Math.PI * 2;
            
            tentacle.angle += currentAngleDiff * 0.1;
            tentacle.wavePhase += this.WAVE_SPEED * deltaTime;
            
            const baseX = enemy.x;
            const baseY = enemy.y;
            const baseRadius = enemy.radius * 0.7;
            
            for (let i = 0; i < tentacle.segments.length; i++) {
                const segment = tentacle.segments[i];
                const t = i / (tentacle.segments.length - 1);
                
                const segmentDistance = baseRadius + this.TENTACLE_LENGTH * t;
                const waveOffset = Math.sin(tentacle.wavePhase + i * 1.5) * 
                    this.WAVE_AMPLITUDE * (1 - t * 0.7);
                
                const targetX = baseX + 
                    Math.cos(tentacle.angle) * segmentDistance +
                    Math.cos(tentacle.angle + Math.PI/2) * waveOffset;
                    
                const targetY = baseY + 
                    Math.sin(tentacle.angle) * segmentDistance +
                    Math.sin(tentacle.angle + Math.PI/2) * waveOffset;
                
                segment.targetX = targetX;
                segment.targetY = targetY;
                
                const dx = targetX - segment.x;
                const dy = targetY - segment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    segment.x += (dx / distance) * Math.min(distance, this.SEGMENT_FOLLOW_SPEED * 50 * deltaTime);
                    segment.y += (dy / distance) * Math.min(distance, this.SEGMENT_FOLLOW_SPEED * 50 * deltaTime);
                }
                
                segment.element.style.left = `${segment.x - segment.size/2}px`;
                segment.element.style.top = `${segment.y - segment.size/2}px`;
                
                if (!tentacle.isGrabbing) {
                    this.checkPlayerGrab(segment, enemy, tentacle);
                }
                
                if (tentacle.isGrabbing) {
                    this.updateGrabEffect(tentacle, segment, i, deltaTime);
                } else {
                    segment.element.classList.remove('grabbing');
                }
                
                this.checkProjectileCollision(segment, enemy, tentacle, i);
            }
            
            if (tentacle.isGrabbing && tentacle.grabTarget === 'player') {
                this.applyGrabDamage(enemy, tentacle);
            }
        });
        
        if (!enemy.tentacleWavePhase) enemy.tentacleWavePhase = 0;
        enemy.tentacleWavePhase += 0.5 * deltaTime;
    },
    
    checkPlayerGrab(segment, enemy, tentacle) {
        if (!gameState.gameActive || gameState.playerLives <= 0) return;
        
        const dx = gameState.playerX - segment.x;
        const dy = gameState.playerY - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const grabRadius = segment.size / 2 + 10;
        
        if (distance < grabRadius) {
            tentacle.isGrabbing = true;
            tentacle.grabTarget = 'player';
            tentacle.lastGrabDamage = Date.now();
            
            segment.element.classList.add('grabbing');
            
            if (!enemy.tentacleSlowApplied) {
                gameState.playerSpeed *= this.GRAB_SLOW_FACTOR;
                enemy.tentacleSlowApplied = true;
            }
        }
    },
    
    updateGrabEffect(tentacle, segment, segmentIndex, deltaTime) {
        if (tentacle.grabTarget === 'player') {
            const dx = gameState.playerX - segment.x;
            const dy = gameState.playerY - segment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > segment.size / 2) {
                segment.x += (dx / distance) * 2;
                segment.y += (dy / distance) * 2;
            }
            
            if (segmentIndex === tentacle.segments.length - 1) {
                const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1;
                segment.element.style.transform = `scale(${pulse})`;
            }
        }
    },
    
    applyGrabDamage(enemy, tentacle) {
        const now = Date.now();
        if (now - tentacle.lastGrabDamage >= this.GRAB_DAMAGE_INTERVAL) {
            gameState.playerLives -= this.GRAB_DAMAGE;
            this.tentacleDamageTotal += this.GRAB_DAMAGE;
            
            updateHealthBar();
            
            this.createGrabDamageEffect(gameState.playerX, gameState.playerY);
            
            tentacle.lastGrabDamage = now;
            
            if (gameState.playerLives <= 0) {
                endGame();
            }
        }
    },
    
    createGrabDamageEffect(x, y) {
        const indicator = document.createElement('div');
        indicator.className = 'tentacle-damage-indicator';
        indicator.textContent = `-${this.GRAB_DAMAGE}`;
        indicator.style.cssText = `
            left:${x}px;
            top:${y - 20}px;
            color:#ff3300;
            font-size:10px;
            font-weight:bold;
            text-shadow:0 0 3px #000;
            position:absolute;
            pointer-events:none;
            z-index:30;
        `;
        document.getElementById('world-container').appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 1000);
    },
    
    checkProjectileCollision(segment, enemy, tentacle, segmentIndex) {
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            const projectile = gameState.projectiles[i];
            const dx = projectile.x - segment.x;
            const dy = projectile.y - segment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionDistance = (projectile.weaponType === "shotgun" ? 1.5 : 0.5) + segment.size / 2;
            
            if (distance < collisionDistance) {
                tentacle.segmentHealths[segmentIndex] -= projectile.damage;
                
                this.createSegmentHitEffect(segment.x, segment.y, projectile.weaponType);
                
                projectile.element.remove();
                gameState.projectiles.splice(i, 1);
                
                if (tentacle.segmentHealths[segmentIndex] <= 0) {
                    this.destroyTentacleSegment(enemy, tentacle, segmentIndex);
                }
                
                break;
            }
        }
    },
    
    createSegmentHitEffect(x, y, weaponType) {
        const color = weaponType === "shotgun" ? "#ffcc00" : 
                     weaponType === "machinegun" ? "#ff3333" : 
                     weaponType === "minigun" ? "#ff00ff" : "#00ff00";
        const count = weaponType === "shotgun" ? 3 : 5;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'impact-particle';
            particle.style.cssText = `
                left:${x + (Math.random() - 0.5) * 10}px;
                top:${y + (Math.random() - 0.5) * 10}px;
                width:${Math.random() * 2 + 1}px;
                height:${Math.random() * 2 + 1}px;
                background-color: ${color};
                border-radius: 50%;
                position: absolute;
                pointer-events: none;
                z-index: 5;
                opacity: 0.8;
            `;
            
            document.getElementById('world-container').appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.style.opacity = '0';
                    particle.style.transform = `translate(${(Math.random() - 0.5) * 15}px, ${(Math.random() - 0.5) * 15}px)`;
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.remove();
                        }
                    }, 300);
                }
            }, 50);
        }
    },
    
    destroyTentacleSegment(enemy, tentacle, segmentIndex) {
        const segment = tentacle.segments[segmentIndex];
        
        if (!segment) return;
        
        this.createSegmentExplosion(segment.x, segment.y, segment.size);
        
        if (segment.element.parentNode) {
            segment.element.remove();
        }
        
        tentacle.segments.splice(segmentIndex, 1);
        tentacle.segmentHealths.splice(segmentIndex, 1);
        
        gameState.score += this.SEGMENT_DESTROY_SCORE;
        updateScoreDisplay();
        this.tentaclesDestroyed++;
        
        if (tentacle.segments.length === 0) {
            this.removeTentacle(enemy.id, tentacle.index);
        }
        
        const tentacles = this.activeTentacles.get(enemy.id);
        if (tentacles && tentacles.length === 0) {
            this.onAllTentaclesDestroyed(enemy);
        }
    },
    
    createSegmentExplosion(x, y, size) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion green-explosion';
        explosion.style.cssText = `left:${x}px;top:${y}px;width:${size * 3}px;height:${size * 3}px`;
        document.getElementById('world-container').appendChild(explosion);
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.style.cssText = `
                left:${x}px;
                top:${y}px;
                width:${Math.random() * 4 + 2}px;
                height:${Math.random() * 4 + 2}px;
                background-color: #00ff00;
                border-radius: 50%;
            `;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const tx = Math.cos(angle) * speed * 15;
            const ty = Math.sin(angle) * speed * 15;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            document.getElementById('world-container').appendChild(particle);
            setTimeout(() => particle.remove(), 1200);
        }
        
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
            }
        }, 800);
    },
    
    onAllTentaclesDestroyed(enemy) {
        enemy.speedX *= 0.7;
        enemy.speedY *= 0.7;
        
        gameState.score += 1000;
        updateScoreDisplay();
        
        const notification = document.createElement('div');
        notification.className = 'special-event-notification';
        notification.textContent = '¡BESTIA DEBILITADA!';
        notification.style.cssText = `
            left:${enemy.x}px;
            top:${enemy.y - 50}px;
            opacity:1;
            color:#00ff00;
            font-size:24px;
        `;
        document.getElementById('world-container').appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 1000);
        }, 2000);
    },
    
    removeTentacle(enemyId, tentacleIndex) {
        const tentacles = this.activeTentacles.get(enemyId);
        if (!tentacles) return;
        
        const tentacle = tentacles.find(t => t.index === tentacleIndex);
        if (!tentacle) return;
        
        tentacle.segments.forEach(segment => {
            if (segment.element.parentNode) {
                segment.element.remove();
            }
        });
        
        const index = tentacles.indexOf(tentacle);
        if (index !== -1) {
            tentacles.splice(index, 1);
        }
    },
    
    removeAllTentaclesForEnemy(enemyId) {
        const tentacles = this.activeTentacles.get(enemyId);
        if (!tentacles) return;
        
        tentacles.forEach(tentacle => {
            tentacle.segments.forEach(segment => {
                if (segment.element.parentNode) {
                    segment.element.remove();
                }
            });
        });
        
        this.activeTentacles.delete(enemyId);
        
        const enemy = gameState.enemies.find(e => e.id === enemyId);
        if (enemy && enemy.tentacleSlowApplied) {
            gameState.playerSpeed /= TENTACLE_SYSTEM.GRAB_SLOW_FACTOR;
        }
    },
    
    clearAllTentacles() {
        this.activeTentacles.forEach((tentacles, enemyId) => {
            this.removeAllTentaclesForEnemy(enemyId);
        });
        this.activeTentacles.clear();
        this.tentacleDamageTotal = 0;
        this.tentaclesDestroyed = 0;
    }
};