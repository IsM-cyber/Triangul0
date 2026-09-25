// ========== SISTEMA DE CADÁVERES CON SALPICADURA DIRECCIONAL ==========
const DIRECTED_CORPSE_SYSTEM = {
    CORPSE_RADIUS: 20,
    GREEN_CORPSE_RADIUS: 80,
    CORPSE_DURATION: 20000,
    DAMAGE_PER_SECOND: 2,
    DAMAGE_INTERVAL: 500,
    
    PARTICLE_COUNT: 80,
    GREEN_PARTICLE_COUNT: 200,
    PARTICLE_SIZE: 2,
    GRAVITY: 0.15,
    ALPHA_DECAY: 0.03,
    MAX_SPEED: 2.8,
    MIN_SPEED: 0.7,
    
    STAIN_COUNT: 25,
    GREEN_STAIN_COUNT: 60,
    
    ORGANIC_COLORS: [
        '#ff6600', '#ff3300', '#cc5500', '#ff5500', '#dd4400',
        '#ff0066', '#cc0055', '#990044', '#ff3388', '#ff6b9d'
    ],
    
    GREEN_ORGANIC_COLORS: [
        '#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc',
        '#00cc00', '#33cc33', '#66cc66', '#99cc99', '#00aa00',
        '#33aa33', '#66aa66', '#009900', '#339933', '#669966'
    ],
    
    activeCorpses: [],
    lastDamageTime: 0,
    splashDamageTotal: 0,
    
    transformEnemyToCorpse(enemy, impactAngle) {
        const isGreen = enemy.radius > 30;
        
        const x = enemy.x;
        const y = enemy.y;
        
        const corpseRadius = isGreen ? this.GREEN_CORPSE_RADIUS : this.CORPSE_RADIUS;
        
        const corpse = {
            id: `corpse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x: x,
            y: y,
            radius: corpseRadius,
            impactAngle: impactAngle,
            createdAt: Date.now(),
            particles: [],
            stains: [],
            isActive: true,
            enemyElement: enemy.element,
            splashInterval: null,
            particleInterval: null,
            isGreen: isGreen
        };
        
        this.transformEnemyVisual(enemy, corpse, isGreen);
        this.createStaticStains(corpse, isGreen);
        this.startDirectedParticleSystem(corpse, isGreen);
        this.startContactDamageSystem(corpse);
        
        this.activeCorpses.push(corpse);
        
        const duration = isGreen ? this.CORPSE_DURATION * 1.5 : this.CORPSE_DURATION;
        setTimeout(() => {
            this.removeOrganicCorpse(corpse);
        }, duration);
        
        return corpse;
    },
    
    transformEnemyVisual(enemy, corpse, isGreen) {
        // Con canvas render el enemigo vivo no tiene div (element null):
        // el cadaver crea su propio div aca, solo en el momento de morir.
        let el = enemy.element;
        if (!el) {
            el = document.createElement('div');
            el.className = 'enemy';
            el.style.position = 'absolute';
            document.getElementById('world-container').appendChild(el);
            enemy.element = el;
        }
        
        // Marca de estado: gameFunctions la usa para los chequeos de vivo/muerto.
        enemy.deadClass = isGreen ? 'green' : 'fuxia';
        
        if (isGreen) {
            el.className = 'enemy dead-green';
        } else {
            el.className = 'enemy dead-fuxia';
        }
        
        el.style.width = `${corpse.radius * 2}px`;
        el.style.height = `${corpse.radius * 2}px`;
        el.style.left = `${enemy.x - corpse.radius}px`;
        el.style.top = `${enemy.y - corpse.radius}px`;
        el.style.zIndex = '4';
        el.style.opacity = '0.85';
        el.style.pointerEvents = 'none';
        el.style.transform = 'translate(0, 0)';
        
        corpse.transformedEnemy = el;
    },

    
    createStaticStains(corpse, isGreen) {
        const stainCount = isGreen ? this.GREEN_STAIN_COUNT : this.STAIN_COUNT;
        const colors = isGreen ? this.GREEN_ORGANIC_COLORS : this.ORGANIC_COLORS;
        
        for (let i = 0; i < stainCount; i++) {
            const stain = document.createElement('div');
            stain.className = 'static-organic-stain';
            
            const sizeMultiplier = isGreen ? 1.5 : 1;
            const size = (Math.random() * 3 + 1) * sizeMultiplier;
            stain.style.width = `${size}px`;
            stain.style.height = `${size}px`;
            
            const colorIndex = Math.floor(Math.random() * colors.length);
            stain.style.backgroundColor = colors[colorIndex];
            stain.style.opacity = (Math.random() * 0.3 + 0.1).toString();
            
            const distributionRadius = corpse.radius * (isGreen ? 2.0 : 1.5);
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * distributionRadius;
            
            const stainX = corpse.x + Math.cos(angle) * distance;
            const stainY = corpse.y + Math.sin(angle) * distance;
            
            stain.style.left = `${stainX}px`;
            stain.style.top = `${stainY}px`;
            stain.style.borderRadius = '50%';
            stain.style.position = 'absolute';
            stain.style.pointerEvents = 'none';
            stain.style.zIndex = '3';
            stain.style.filter = 'blur(0.5px)';
            stain.style.animation = `staticStainPulse ${Math.random() * 5 + 5}s infinite alternate`;
            
            document.getElementById('world-container').appendChild(stain);
            
            corpse.stains.push({
                element: stain,
                x: stainX,
                y: stainY,
                size: size
            });
        }
    },
    
    startDirectedParticleSystem(corpse, isGreen) {
        const particleCount = isGreen ? this.GREEN_PARTICLE_COUNT : this.PARTICLE_COUNT;
        this.createInitialParticles(corpse, isGreen, particleCount);
        
        corpse.particleInterval = setInterval(() => {
            if (corpse.isActive) {
                this.emitDirectedParticleWave(corpse, isGreen);
            }
        }, isGreen ? 300 : 400);
    },
    
    createInitialParticles(corpse, isGreen, particleCount) {
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createDirectedParticle(corpse, i, isGreen);
            }, i * 10);
        }
    },
    
    createDirectedParticle(corpse, index, isGreen) {
        const particle = document.createElement('div');
        particle.className = 'directed-splash-particle';
        
        const sizeMultiplier = isGreen ? 1.5 : 1;
        const size = (Math.random() * 2 + 1) * sizeMultiplier;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const colors = isGreen ? this.GREEN_ORGANIC_COLORS : this.ORGANIC_COLORS;
        const colorIndex = Math.floor(Math.random() * colors.length);
        particle.style.backgroundColor = colors[colorIndex];
        
        particle.style.left = `${corpse.x}px`;
        particle.style.top = `${corpse.y}px`;
        
        particle.style.cssText += `
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
            opacity: 1;
            transform: translate(-50%, -50%);
            will-change: transform, opacity;
        `;
        
        document.getElementById('world-container').appendChild(particle);
        
        const baseAngle = corpse.impactAngle + Math.PI;
        const angleVariation = (Math.random() - 0.5) * (isGreen ? 1.5 : 1.0);
        const particleAngle = baseAngle + angleVariation;
        
        const speedMultiplier = isGreen ? 1.3 : 1;
        const speed = (Math.random() * (this.MAX_SPEED - this.MIN_SPEED) + this.MIN_SPEED) * speedMultiplier;
        
        const particleObj = {
            id: `particle_${corpse.id}_${index}`,
            element: particle,
            x: corpse.x,
            y: corpse.y,
            vx: Math.cos(particleAngle) * speed,
            vy: Math.sin(particleAngle) * speed,
            gravity: this.GRAVITY * (isGreen ? 1.2 : 1),
            alpha: 0.8 + Math.random() * 0.2,
            alphaDecay: this.ALPHA_DECAY * (0.5 + Math.random() * 0.5),
            color: colors[colorIndex],
            size: size,
            corpseId: corpse.id,
            isActive: true,
            order: index,
            createdAt: Date.now(),
            lifeTime: 0,
            maxLifeTime: 1000 + Math.random() * 500
        };
        
        corpse.particles.push(particleObj);
        this.animateParticle(particleObj);
        
        return particleObj;
    },
    
    animateParticle(particle) {
        if (!particle.isActive) return;
        
        const update = () => {
            if (!particle.isActive || !particle.element.parentNode) return;
            
            particle.lifeTime += 16;
            
            particle.vy += particle.gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= particle.alphaDecay;
            
            particle.element.style.left = `${particle.x}px`;
            particle.element.style.top = `${particle.y}px`;
            particle.element.style.opacity = particle.alpha.toString();
            
            if (particle.alpha <= 0 || particle.lifeTime >= particle.maxLifeTime) {
                this.resetParticle(particle);
            } else {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    },
    
    resetParticle(particle) {
        const corpse = this.activeCorpses.find(c => c.id === particle.corpseId);
        if (!corpse || !corpse.isActive) {
            this.removeParticle(particle);
            return;
        }
        
        particle.x = corpse.x;
        particle.y = corpse.y;
        
        const baseAngle = corpse.impactAngle + Math.PI;
        const angleVariation = (Math.random() - 0.5) * (corpse.isGreen ? 1.2 : 1.0);
        const particleAngle = baseAngle + angleVariation;
        
        const speedMultiplier = corpse.isGreen ? 1.3 : 1;
        const speed = (Math.random() * (this.MAX_SPEED - this.MIN_SPEED) + this.MIN_SPEED) * speedMultiplier;
        
        particle.vx = Math.cos(particleAngle) * speed;
        particle.vy = Math.sin(particleAngle) * speed;
        particle.alpha = 0.8 + Math.random() * 0.2;
        particle.lifeTime = 0;
        
        particle.element.style.left = `${particle.x}px`;
        particle.element.style.top = `${particle.y}px`;
        particle.element.style.opacity = particle.alpha.toString();
        
        this.animateParticle(particle);
    },
    
    removeParticle(particle) {
        particle.isActive = false;
        if (particle.element && particle.element.parentNode) {
            particle.element.remove();
        }
    },
    
    emitDirectedParticleWave(corpse, isGreen) {
        const waveParticleCount = isGreen ? 
            Math.floor(Math.random() * 20) + 15 : 
            Math.floor(Math.random() * 12) + 8;
        
        for (let i = 0; i < waveParticleCount; i++) {
            setTimeout(() => {
                if (!corpse.isActive) return;
                this.createWaveParticle(corpse, isGreen);
            }, i * 30);
        }
        
        this.checkDirectedSplashDamage(corpse, isGreen);
    },
    
    createWaveParticle(corpse, isGreen) {
        const particle = document.createElement('div');
        particle.className = 'directed-wave-particle';
        
        const sizeMultiplier = isGreen ? 1.5 : 1;
        const size = (Math.random() * 2 + 1) * sizeMultiplier;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const colors = isGreen ? this.GREEN_ORGANIC_COLORS : this.ORGANIC_COLORS;
        const colorIndex = Math.floor(Math.random() * colors.length);
        particle.style.backgroundColor = colors[colorIndex];
        particle.style.opacity = '0.9';
        
        particle.style.cssText += `
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: 6;
            transform: translate(-50%, -50%);
        `;
        
        particle.style.left = `${corpse.x}px`;
        particle.style.top = `${corpse.y}px`;
        
        document.getElementById('world-container').appendChild(particle);
        
        const baseAngle = corpse.impactAngle + Math.PI;
        const angleVariation = (Math.random() - 0.5) * (isGreen ? 1.0 : 0.8);
        const particleAngle = baseAngle + angleVariation;
        
        const speedMultiplier = isGreen ? 1.5 : 1;
        const speed = (Math.random() * (this.MAX_SPEED * 1.2 - this.MIN_SPEED) + this.MIN_SPEED) * speedMultiplier;
        
        const particleObj = {
            id: `wave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            element: particle,
            x: corpse.x,
            y: corpse.y,
            vx: Math.cos(particleAngle) * speed,
            vy: Math.sin(particleAngle) * speed,
            gravity: this.GRAVITY * 0.7 * (isGreen ? 1.2 : 1),
            alpha: 0.9,
            alphaDecay: this.ALPHA_DECAY * 0.8,
            color: colors[colorIndex],
            size: size,
            isActive: true,
            createdAt: Date.now()
        };
        
        this.animateWaveParticle(particleObj);
    },
    
    animateWaveParticle(particle) {
        if (!particle.isActive) return;
        
        const update = () => {
            if (!particle.isActive || !particle.element.parentNode) return;
            
            particle.vy += particle.gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= particle.alphaDecay;
            
            particle.element.style.left = `${particle.x}px`;
            particle.element.style.top = `${particle.y}px`;
            particle.element.style.opacity = particle.alpha.toString();
            
            if (particle.alpha <= 0) {
                particle.isActive = false;
                if (particle.element.parentNode) {
                    particle.element.remove();
                }
            } else {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    },
    
    checkDirectedSplashDamage(corpse, isGreen) {
        if (!gameState.gameActive || gameState.playerLives <= 0) return;
        
        const dx = gameState.playerX - corpse.x;
        const dy = gameState.playerY - corpse.y;
        const splashRadius = corpse.radius * (isGreen ? 4 : 3);
        
        if (dx * dx + dy * dy < splashRadius * splashRadius) {
            const playerAngle = Math.atan2(dy, dx);
            const splashDirection = corpse.impactAngle + Math.PI;
            
            let angleDiff = Math.abs(playerAngle - splashDirection);
            if (angleDiff > Math.PI) angleDiff = (2 * Math.PI) - angleDiff;
            
            const directionFactor = 1.0 - (angleDiff / Math.PI) * 0.5;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const proximityFactor = 1 - (distance / splashRadius);
            
            const baseDamage = isGreen ? 3 : 2;
            const damage = Math.ceil(baseDamage * directionFactor * (0.3 + proximityFactor * 0.7));
            
            this.applyDirectedSplashDamage(corpse, gameState.playerX, gameState.playerY, damage, isGreen);
            this.createDirectedSplashEffect(gameState.playerX, gameState.playerY, damage, isGreen);
        }
    },
    
    applyDirectedSplashDamage(corpse, playerX, playerY, damage, isGreen) {
        gameState.playerLives -= damage;
        gameState.pestilenceDamageReceived = (gameState.pestilenceDamageReceived || 0) + damage;
        this.splashDamageTotal += damage;
        
        updateHealthBar();
        this.createDirectedKnockback(playerX, playerY, corpse, isGreen);
        
        document.getElementById('player').classList.add('pestilent');
        document.getElementById('player').classList.add('splash-hit');
        
        setTimeout(() => {
            document.getElementById('player').classList.remove('pestilent');
            document.getElementById('player').classList.remove('splash-hit');
        }, 400);
        
        if (gameState.playerLives <= 0) {
            endGame();
        }
    },
    
    createDirectedSplashEffect(x, y, damage, isGreen) {
        const indicator = document.createElement('div');
        indicator.className = 'directed-damage-indicator';
        indicator.textContent = `-${damage}`;
        const color = isGreen ? '#00ff00' : '#ff3300';
        indicator.style.cssText = `
            left:${x}px;
            top:${y - 15}px;
            color: ${color};
            font-size: 11px;
            font-weight: bold;
            text-shadow: 0 0 3px #000;
            position: absolute;
            pointer-events: none;
            z-index: 20;
            animation: damageFloat 1.2s forwards;
        `;
        
        document.getElementById('world-container').appendChild(indicator);
        
        const particleCount = isGreen ? 12 : 8;
        const particleColor = isGreen ? '#00ff00' : '#ff3300';
        
        for (let i = 0; i < particleCount; i++) {
            const impactParticle = document.createElement('div');
            impactParticle.className = 'impact-particle';
            const spread = isGreen ? 20 : 15;
            impactParticle.style.cssText = `
                left:${x + (Math.random() - 0.5) * spread}px;
                top:${y + (Math.random() - 0.5) * spread}px;
                width:${Math.random() * 2 + 1}px;
                height:${Math.random() * 2 + 1}px;
                background-color: ${particleColor};
                border-radius: 50%;
                position: absolute;
                pointer-events: none;
                z-index: 5;
                opacity: 0.8;
            `;
            
            document.getElementById('world-container').appendChild(impactParticle);
            
            setTimeout(() => {
                if (impactParticle.parentNode) {
                    impactParticle.style.opacity = '0';
                    impactParticle.style.transform = `translate(${(Math.random() - 0.5) * 25}px, ${(Math.random() - 0.5) * 25}px)`;
                    setTimeout(() => {
                        if (impactParticle.parentNode) {
                            impactParticle.remove();
                        }
                    }, 300);
                }
            }, 50);
        }
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 1200);
    },
    
    createDirectedKnockback(playerX, playerY, corpse, isGreen) {
        const dx = playerX - corpse.x;
        const dy = playerY - corpse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const knockbackForce = isGreen ? 12 : 8;
            const knockbackX = (dx / distance) * knockbackForce;
            const knockbackY = (dy / distance) * knockbackForce;
            
            let remainingForce = knockbackForce;
                        const applyKnockback = () => {
                            if (remainingForce > 0.5 && gameState.gameActive) {
                                const nextX = gameState.playerX + knockbackX * (remainingForce / knockbackForce);
                                const nextY = gameState.playerY + knockbackY * (remainingForce / knockbackForce);
                    
                                // No empujar al jugador dentro de un obstáculo (muro de ladrillos):
                                // si el destino choca, cortar el empuje y quedarse pegado al borde.
                                const collisionCheck = checkPlayerCollisionAtPosition(
                                    nextX,
                                    nextY,
                                    gameState.playerX,
                                    gameState.playerY
                                );
                                if (collisionCheck.collided) {
                                    gameState.playerX = collisionCheck.safeX;
                                    gameState.playerY = collisionCheck.safeY;
                                    return;
                                }
                    
                                gameState.playerX = nextX;
                                gameState.playerY = nextY;
                                remainingForce *= 0.8;
                    
                                requestAnimationFrame(applyKnockback);
                            }
                        };
            
            applyKnockback();
        }
    },
    
    startContactDamageSystem(corpse) {
        corpse.damageInterval = setInterval(() => {
            if (corpse.isActive) {
                this.checkContactDamage(corpse);
            }
        }, this.DAMAGE_INTERVAL);
    },
    
    checkContactDamage(corpse) {
        if (!gameState.gameActive || gameState.playerLives <= 0) return;
        
        const dx = gameState.playerX - corpse.x;
        const dy = gameState.playerY - corpse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const contactRadius = corpse.radius * (corpse.isGreen ? 1.5 : 1);
        
        if (distance < contactRadius) {
            this.applyContactDamage(corpse, gameState.playerX, gameState.playerY);
        }
    },
    
    applyContactDamage(corpse, playerX, playerY) {
        const now = Date.now();
        if (now - this.lastDamageTime >= this.DAMAGE_INTERVAL) {
            const damage = corpse.isGreen ? 3 : 2;
            gameState.playerLives -= damage;
            gameState.pestilenceDamageReceived = (gameState.pestilenceDamageReceived || 0) + damage;
            
            updateHealthBar();
            this.createContactDamageEffect(playerX, playerY, corpse.isGreen);
            
            this.lastDamageTime = now;
            
            if (gameState.playerLives <= 0) {
                endGame();
            }
        }
    },
    
    createContactDamageEffect(x, y, isGreen) {
        const indicator = document.createElement('div');
        indicator.className = 'directed-damage-indicator';
        const damage = isGreen ? 3 : 2;
        indicator.textContent = `-${damage}`;
        const color = isGreen ? '#00ff00' : '#ff0066';
        indicator.style.cssText = `left:${x}px;top:${y - 20}px;color:${color};`;
        document.getElementById('world-container').appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 1500);
    },
    
    checkPlayerInCorpse(playerX, playerY) {
        let playerInCorpse = false;
        
        for (let corpse of this.activeCorpses) {
            if (!corpse.isActive) continue;
            
            const dx = playerX - corpse.x;
            const dy = playerY - corpse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < corpse.radius) {
                playerInCorpse = true;
                break;
            }
        }
        
        return playerInCorpse;
    },
    
    removeOrganicCorpse(corpse) {
        corpse.isActive = false;
        
        if (corpse.particleInterval) {
            clearInterval(corpse.particleInterval);
        }
        
        if (corpse.damageInterval) {
            clearInterval(corpse.damageInterval);
        }
        
        corpse.particles.forEach(particle => {
            this.removeParticle(particle);
        });
        
        corpse.stains.forEach(stain => {
            if (stain.element && stain.element.parentNode) {
                stain.element.remove();
            }
        });
        
        if (corpse.transformedEnemy && corpse.transformedEnemy.parentNode) {
            corpse.transformedEnemy.style.opacity = '0.5';
            corpse.transformedEnemy.style.transition = 'opacity 1.5s ease';
            
            setTimeout(() => {
                if (corpse.transformedEnemy.parentNode) {
                    corpse.transformedEnemy.remove();
                }
            }, 1500);
        }
        
        const index = this.activeCorpses.indexOf(corpse);
        if (index !== -1) {
            this.activeCorpses.splice(index, 1);
        }
    },
    
    update() {
        // Las partículas se actualizan con requestAnimationFrame
    },
    
    clearAllCorpses() {
        while (this.activeCorpses.length > 0) {
            const corpse = this.activeCorpses[0];
            this.removeOrganicCorpse(corpse);
        }
        this.activeCorpses = [];
        this.splashDamageTotal = 0;
    }
};