// ========== TOUCH CONTROLS - 2 Fixed Joysticks (Multitouch) ==========
// Based on joystickIzquierdoOK backup for left joystick
class TouchControls {
    constructor() {
        this.enabled = false;
        // Left joystick (movement) - anchored bottom-left
        this.joyZone = null;
        this.base = null;
        this.knob = null;
        this.activeTouchId = null;
        this.startX = 0;
        this.startY = 0;

        // Right joystick (aim) - anchored bottom-right
        this.lookZone = null;
        this.lookBase = null;
        this.lookKnob = null;
        this.lookTouchId = null;
        this.lookStartX = 0;
        this.lookStartY = 0;

        // Fire button
        this.fireZone = null;
        this.fireBase = null;
        this.fireLabel = null;
        this.fireTouchId = null;

        // Weapon selector (cycle button)
        this.weaponZone = null;
        this.weaponButton = null;

        // Turbo button
        this.turboZone = null;
        this.turboBase = null;
        this.turboLabel = null;
        this.turboTouchId = null;

        // Minimap toggle
        this.minimapZone = null;
        this.minimapBtn = null;
        this._minimapLastTouch = 0;
        this._weaponLastTouch = 0;

        // Testing methodology: track touch state
        this.testResults = {
            joyTouchReceived: false,
            lookTouchReceived: false,
            simultaneousTouches: 0,
            maxSimultaneous: 0,
            movementKeysSet: false,
            aimPositionUpdated: false,
            errors: []
        };
    }

    detectTouchDevice() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.location.search.includes('touch=1');
    }

    init() {
        if (!this.detectTouchDevice()) {
            console.log('[TouchControls] No touch device, skipping');
            return;
        }
        this.enabled = true;
        console.log('[TouchControls] Enabled:', { hasTouch: 'ontouchstart' in window, maxTouchPoints: navigator.maxTouchPoints });
        this.createElements();
        this.bindEvents();
        // Start disabled so start button works
        this.setEnabled(false);
        console.log('[TouchControls] Ready - 2 fixed joysticks (multitouch)');
        this.runSelfTest();
    }

    // Enable/disable touch zones
    setEnabled(state) {
        this.enabled = state;
        if (this.joyZone) {
            this.joyZone.style.pointerEvents = state ? 'auto' : 'none';
            this.joyZone.style.display = state ? 'block' : 'none';
        }
        if (this.lookZone) {
            this.lookZone.style.pointerEvents = state ? 'auto' : 'none';
            this.lookZone.style.display = state ? 'block' : 'none';
        }
        // Also handle extra controls (fire, turbo, weapon, minimap buttons)
        const fireZone = document.getElementById('tc-fire');
        const turboZone = document.getElementById('tc-turbo');
        const weaponZone = document.getElementById('tc-weapon');
        const minimapZone = document.getElementById('tc-minimap');
        const minimapBtn = document.getElementById('tc-minimap-btn');
        if (fireZone) fireZone.style.setProperty('display', state ? 'block' : 'none', 'important');
        if (turboZone) turboZone.style.setProperty('display', state ? 'block' : 'none', 'important');
        if (weaponZone) weaponZone.style.setProperty('display', state ? 'block' : 'none', 'important');
        if (minimapZone) minimapZone.style.setProperty('display', state ? 'flex' : 'none', 'important');
        if (minimapBtn) minimapBtn.style.setProperty('display', state ? 'block' : 'none', 'important');
        console.log('[TouchControls] setEnabled:', state ? 'ON' : 'OFF');
    }

    runSelfTest() {
        console.log('[TouchControls] === SELF-TEST START ===');
        
        // Test 1: Elements exist
        const joyZone = document.getElementById('tc-joy');
        const base = document.getElementById('tc-base');
        const knob = document.getElementById('tc-knob');
        const lookZone = document.getElementById('tc-look');
        const lookBase = document.getElementById('tc-look-base');
        const lookKnob = document.getElementById('tc-look-knob');
        
        console.log('[TouchControls] Test 1 - Elements:', {
            joyZone: !!joyZone,
            base: !!base,
            knob: !!knob,
            lookZone: !!lookZone,
            lookBase: !!lookBase,
            lookKnob: !!lookKnob
        });
        
        // Test 2: Base positions (anchored to corners)
        if (base && lookBase) {
            const baseRect = base.getBoundingClientRect();
            const lookBaseRect = lookBase.getBoundingClientRect();
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            
            console.log('[TouchControls] Test 2 - Base positions:', {
                leftBase: { left: baseRect.left, bottom: vh - baseRect.bottom, expected: '~20px from edges' },
                rightBase: { right: vw - lookBaseRect.right, bottom: vh - lookBaseRect.bottom, expected: '~20px from edges' },
                correctlyAnchored: baseRect.left < 100 && (vh - baseRect.bottom) < 100 && (vw - lookBaseRect.right) < 100 && (vh - lookBaseRect.bottom) < 100
            });
        }
        
        // Test 3: Zones cover full screen
        if (joyZone && lookZone) {
            const joyRect = joyZone.getBoundingClientRect();
            const lookRect = lookZone.getBoundingClientRect();
            console.log('[TouchControls] Test 3 - Zones cover screen:', {
                joyZone: { fullScreen: joyRect.width === window.innerWidth && joyRect.height === window.innerHeight },
                lookZone: { fullScreen: lookRect.width === window.innerWidth && lookRect.height === window.innerHeight }
            });
        }
        
        // Test 4: Event listeners
        const hasListeners = joyZone && 
            joyZone._events?.touchstart && 
            joyZone._events?.touchmove && 
            joyZone._events?.touchend;
        console.log('[TouchControls] Test 4 - Event listeners:', { hasListeners: !!hasListeners });
        
        // Test 5: gameState accessible
        const state = gameState || window.gameState;
        console.log('[TouchControls] Test 5 - gameState accessible:', { accessible: !!state });
        
        console.log('[TouchControls] === SELF-TEST COMPLETE ===');
        console.log('[TouchControls] Touch test: Use two fingers simultaneously on both corners');
        console.log('[TouchControls] Expected: joyTouchReceived=true, lookTouchReceived=true, multitouchWorking=true');
        
        // Run automated simulation test
        setTimeout(() => this.runAutomatedTest(), 1000);
    }

    logTestResult(name, passed, details = {}) {
        if (!passed) {
            this.testResults.errors.push({ test: name, details });
            console.log(`[TouchControls] TEST FAIL: ${name}`, details);
        } else {
            console.log(`[TouchControls] TEST PASS: ${name}`);
        }
    }

    createElements() {
        // LEFT JOYSTICK ZONE - 120px circle at bottom-left (touch area)
        this.joyZone = document.createElement('div');
        this.joyZone.id = 'tc-joy';
        
        // INLINE STYLES - bypass CSS file issues
        this.joyZone.style.cssText = `
            position: fixed !important;
            left: 20px !important;
            bottom: 20px !important;
            width: 120px !important;
            height: 120px !important;
            z-index: 2000 !important;
            background: transparent !important;
            touch-action: none !important;
            border-radius: 50% !important;
        `;

        this.base = document.createElement('div');
        this.base.id = 'tc-base';
        this.base.style.cssText = `
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 120px !important;
            height: 120px !important;
            background: rgba(0, 200, 255, 0.3) !important;
            border: 2px solid #00c8ff !important;
            border-radius: 50% !important;
            pointer-events: none !important;
        `;

        this.knob = document.createElement('div');
        this.knob.id = 'tc-knob';
        this.knob.style.cssText = `
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            width: 40px !important;
            height: 40px !important;
            background: rgba(0, 200, 255, 0.8) !important;
            border: 2px solid #00ffff !important;
            border-radius: 50% !important;
            transform: translate(-50%, -50%) !important;
            pointer-events: none !important;
            transition: transform 0.05s linear !important;
            z-index: 10 !important;
        `;

        this.base.appendChild(this.knob); // Knob INSIDE base (relative to base)
        this.joyZone.appendChild(this.base);
        document.body.appendChild(this.joyZone);

        // RIGHT JOYSTICK ZONE - 120px circle at bottom-right (touch area)
        this.lookZone = document.createElement('div');
        this.lookZone.id = 'tc-look';
        
        this.lookZone.style.cssText = `
            position: fixed !important;
            right: 20px !important;
            bottom: 20px !important;
            width: 120px !important;
            height: 120px !important;
            z-index: 2000 !important;
            background: transparent !important;
            touch-action: none !important;
            border-radius: 50% !important;
        `;

        this.lookBase = document.createElement('div');
        this.lookBase.id = 'tc-look-base';
        this.lookBase.style.cssText = `
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 120px !important;
            height: 120px !important;
            background: rgba(255, 0, 255, 0.3) !important;
            border: 2px solid #ff00ff !important;
            border-radius: 50% !important;
            pointer-events: none !important;
        `;

        this.lookKnob = document.createElement('div');
        this.lookKnob.id = 'tc-look-knob';
        this.lookKnob.style.cssText = `
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            width: 40px !important;
            height: 40px !important;
            background: rgba(255, 0, 255, 0.8) !important;
            border: 2px solid #ff00ff !important;
            border-radius: 50% !important;
            transform: translate(-50%, -50%) !important;
            pointer-events: none !important;
            transition: transform 0.05s linear !important;
            z-index: 10 !important;
        `;

        this.lookBase.appendChild(this.lookKnob);
        this.lookZone.appendChild(this.lookBase);
        document.body.appendChild(this.lookZone);

        // ========== FIRE BUTTON - LEFT of right joystick ==========
        this.fireZone = document.createElement('div');
        this.fireZone.id = 'tc-fire';
        this.fireZone.style.cssText = `
            position: fixed !important;
            right: 145px !important;
            bottom: 20px !important;
            width: 60px !important;
            height: 60px !important;
            z-index: 3000 !important;
            touch-action: none !important;
            border-radius: 50% !important;
            background: rgba(255, 100, 0, 0.3) !important;
            border: 2px solid #ff6400 !important;
            pointer-events: auto !important;
        `;

        this.fireBase = document.createElement('div');
        this.fireBase.id = 'tc-fire-base';
        this.fireBase.style.cssText = `
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 60px !important;
            height: 60px !important;
            background: rgba(255, 100, 0, 0.4) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
        `;

        this.fireLabel = document.createElement('span');
        this.fireLabel.style.cssText = `
            color: #ffaa00 !important;
            font-size: 14px !important;
            font-weight: bold !important;
            text-shadow: 0 0 4px #ff6400 !important;
            pointer-events: none !important;
        `;
        this.fireLabel.textContent = 'F';

        this.fireBase.appendChild(this.fireLabel);
        this.fireZone.appendChild(this.fireBase);
        document.body.appendChild(this.fireZone);

        // ========== WEAPON SELECTOR (cycle button) - above right joystick ==========
        this.weaponZone = document.createElement('div');
        this.weaponZone.id = 'tc-weapon';
        this.weaponZone.style.cssText = `
            position: fixed !important;
            right: 20px !important;
            bottom: 160px !important;
            width: 40px !important;
            height: 40px !important;
            z-index: 3000 !important;
            touch-action: none !important;
            border-radius: 50% !important;
            background: #999 !important;
            border: 2px solid #fff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: auto !important;
        `;

        this.weaponButton = document.createElement('div');
        this.weaponButton.id = 'tc-weapon-btn';
        this.weaponButton.dataset.weaponId = 1;
        this.weaponButton.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            border-radius: 50% !important;
            background: transparent !important;
            border: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            touch-action: none !important;
            pointer-events: auto !important;
        `;
        // Sin capa visible: el toggle de arma queda transparente (un solo circulo) -

        this.weaponZone.appendChild(this.weaponButton);
        document.body.appendChild(this.weaponZone);

        // ========== TURBO BUTTON - right of left joystick ==========
        this.turboZone = document.createElement('div');
        this.turboZone.id = 'tc-turbo';
        this.turboZone.style.cssText = `
            position: fixed !important;
            left: 160px !important;
            bottom: 100px !important;
            width: 30px !important;
            height: 30px !important;
            z-index: 3000 !important;
            touch-action: none !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 0, 0.3) !important;
            border: 2px solid #ffff00 !important;
            pointer-events: auto !important;
        `;

        this.turboBase = document.createElement('div');
        this.turboBase.id = 'tc-turbo-base';
        this.turboBase.style.cssText = `
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 30px !important;
            height: 30px !important;
            background: rgba(255, 255, 0, 0.4) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
        `;

        this.turboLabel = document.createElement('span');
        this.turboLabel.style.cssText = `
            color: #ffff00 !important;
            font-size: 7px !important;
            font-weight: bold !important;
            text-shadow: 0 0 4px #ffff00 !important;
            pointer-events: none !important;
        `;
        this.turboLabel.textContent = 'T';

        this.turboBase.appendChild(this.turboLabel);
        this.turboZone.appendChild(this.turboBase);
        document.body.appendChild(this.turboZone);

        // ========== MINIMAP TOGGLE - above left joystick ==========
        this.minimapZone = document.createElement('div');
        this.minimapZone.id = 'tc-minimap';
        this.minimapZone.style.cssText = `
            position: fixed !important;
            left: 20px !important;
            bottom: 160px !important;
            width: 30px !important;
            height: 30px !important;
            z-index: 3000 !important;
            touch-action: none !important;
            border-radius: 50% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            border: 2px solid #00ff00 !important;
            display: none !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: auto !important;
        `;

        this.minimapBtn = document.createElement('div');
        this.minimapBtn.id = 'tc-minimap-btn';
        this.minimapBtn.style.cssText = `
            width: 20px !important;
            height: 20px !important;
            border-radius: 4px !important;
            background: #003300 !important;
            border: 1px solid #00ff00 !important;
            pointer-events: none !important;
        `;

        this.minimapZone.appendChild(this.minimapBtn);
        document.body.appendChild(this.minimapZone);

        console.log('[TouchControls] createElements DONE - bases anchored to corners + 4 extra controls');
    }

    bindEvents() {
        // LEFT zone events (movement) - passive:false for preventDefault
        this.joyZone.addEventListener('touchstart', this.onJoyStart.bind(this), { passive: false });
        this.joyZone.addEventListener('touchmove', this.onJoyMove.bind(this), { passive: false });
        this.joyZone.addEventListener('touchend', this.onJoyEnd.bind(this), { passive: false });
        this.joyZone.addEventListener('touchcancel', this.onJoyEnd.bind(this), { passive: false });

        // Pointer events (work with Playwright touchscreen and real touch)
        this.joyZone.addEventListener('pointerdown', this.onJoyStart.bind(this), { passive: false });
        this.joyZone.addEventListener('pointermove', this.onJoyMove.bind(this), { passive: false });
        this.joyZone.addEventListener('pointerup', this.onJoyEnd.bind(this), { passive: false });
        this.joyZone.addEventListener('pointercancel', this.onJoyEnd.bind(this), { passive: false });
        this.joyZone.addEventListener('pointerleave', this.onJoyEnd.bind(this), { passive: false });

        // Mouse fallback for desktop testing
        this.joyZone.addEventListener('mousedown', this.onJoyStart.bind(this));
        this.joyZone.addEventListener('mousemove', this.onJoyMove.bind(this));
        this.joyZone.addEventListener('mouseup', this.onJoyEnd.bind(this));
        this.joyZone.addEventListener('mouseleave', this.onJoyEnd.bind(this));

        // RIGHT zone events (aim) - passive:false for preventDefault
        this.lookZone.addEventListener('touchstart', this.onLookStart.bind(this), { passive: false });
        this.lookZone.addEventListener('touchmove', this.onLookMove.bind(this), { passive: false });
        this.lookZone.addEventListener('touchend', this.onLookEnd.bind(this), { passive: false });
        this.lookZone.addEventListener('touchcancel', this.onLookEnd.bind(this), { passive: false });

        // Pointer events
        this.lookZone.addEventListener('pointerdown', this.onLookStart.bind(this), { passive: false });
        this.lookZone.addEventListener('pointermove', this.onLookMove.bind(this), { passive: false });
        this.lookZone.addEventListener('pointerup', this.onLookEnd.bind(this), { passive: false });
        this.lookZone.addEventListener('pointercancel', this.onLookEnd.bind(this), { passive: false });
        this.lookZone.addEventListener('pointerleave', this.onLookEnd.bind(this), { passive: false });

        // Mouse fallback
        this.lookZone.addEventListener('mousedown', this.onLookStart.bind(this));
        this.lookZone.addEventListener('mousemove', this.onLookMove.bind(this));
        this.lookZone.addEventListener('mouseup', this.onLookEnd.bind(this));
        this.lookZone.addEventListener('mouseleave', this.onLookEnd.bind(this));

        // FIRE BUTTON events
        this.fireZone.addEventListener('touchstart', this.onFireStart.bind(this), { passive: false });
        this.fireZone.addEventListener('touchend', this.onFireEnd.bind(this), { passive: false });
        this.fireZone.addEventListener('touchcancel', this.onFireEnd.bind(this), { passive: false });
        this.fireZone.addEventListener('pointerdown', this.onFireStart.bind(this), { passive: false });
        this.fireZone.addEventListener('pointerup', this.onFireEnd.bind(this), { passive: false });
        this.fireZone.addEventListener('pointercancel', this.onFireEnd.bind(this), { passive: false });
        this.fireZone.addEventListener('mousedown', this.onFireStart.bind(this));
        this.fireZone.addEventListener('mouseup', this.onFireEnd.bind(this));

        // WEAPON SELECTOR (cycle button) events
        this.weaponZone.addEventListener('touchstart', this.onWeaponSelect.bind(this), { passive: false });
        this.weaponZone.addEventListener('mousedown', this.onWeaponSelect.bind(this));

        // TURBO BUTTON events
        this.turboZone.addEventListener('touchstart', this.onTurboStart.bind(this), { passive: false });
        this.turboZone.addEventListener('touchend', this.onTurboEnd.bind(this), { passive: false });
        this.turboZone.addEventListener('touchcancel', this.onTurboEnd.bind(this), { passive: false });
        this.turboZone.addEventListener('mousedown', this.onTurboStart.bind(this));
        this.turboZone.addEventListener('mouseup', this.onTurboEnd.bind(this));

        // MINIMAP TOGGLE - tap to toggle visibility
        this.minimapZone.addEventListener('touchstart', this.onMinimapToggle.bind(this), { passive: false });
        this.minimapZone.addEventListener('mousedown', this.onMinimapToggle.bind(this));
    }

    // ========== LEFT JOYSTICK (Movement) - zone: left half of screen ==========
    // EXACT COPY FROM joystickIzquierdoOK BACKUP
    onJoyStart(e) {
        // Don't block UI elements
        if (e.target.closest('#start-button, #instructions-toggle, #restart-button')) return;
        if (e.target.id === 'start-screen' || e.target.closest('#start-screen')) return;
        
        e.preventDefault();
        
        // Handle touch, pointer, and mouse events
        let touch = null;
        let pointerId = null;
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent
            touch = e.changedTouches[0];
            pointerId = touch.identifier;
        } else if (e.touches && e.touches.length > 0) {
            // TouchEvent (touchmove)
            touch = e.touches[0];
            pointerId = touch.identifier;
        } else if (e.pointerId !== undefined) {
            // PointerEvent
            touch = e;
            pointerId = e.pointerId;
        } else if (e.clientX !== undefined) {
            // MouseEvent
            touch = e;
            pointerId = 'mouse';
        }
        if (!touch) return;

        // SIMPLE ZONE: Left half of screen
        if (touch.clientX >= window.innerWidth / 2) return;

        if (this.activeTouchId !== null) return;

        this.activeTouchId = pointerId;
        
        // Base center as origin (fixed position)
        const centerX = 80;
        const centerY = window.innerHeight - 80;
        this.startX = centerX;
        this.startY = centerY;

        // Base is FIXED at bottom-left (CSS handles position)
        this.knob.style.transform = 'translate(-50%, -50%)';
        
        // TEST: Track
        this.testResults.joyTouchReceived = true;
        this.logTestResult('JoyStart - touch in left zone', true, { touchId: this.activeTouchId, clientX: touch.clientX, clientY: touch.clientY });
    }

    onJoyMove(e) {
        e.preventDefault();
        if (this.activeTouchId === null) return;

        // Find the touch/pointer with our identifier
        let touch = null;
        
        if (e.touches && e.touches.length > 0) {
            // TouchEvent
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.activeTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent (touchend)
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.activeTouchId) {
            // PointerEvent
            touch = e;
        } else if (e.clientX !== undefined && (this.activeTouchId === 'mouse' || e.pointerId === this.activeTouchId)) {
            // MouseEvent
            touch = e;
        }
        if (!touch) return;

        // Use base center as origin
        const centerX = 80;
        const centerY = window.innerHeight - 80;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxRadius = 30;

        // Clamp knob position
        if (distance > maxRadius) {
            const angle = Math.atan2(deltaY, deltaX);
            this.knob.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * maxRadius}px, ${Math.sin(angle) * maxRadius}px)`;
        } else {
            this.knob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${-deltaY}px)`;
        }

        // Calculate movement from joystick angle/distance (ANALOG STICK LOGIC)
        const state = gameState || window.gameState;
        if (!state) return;
        if (!state.keys) state.keys = { w: false, a: false, s: false, d: false };

        const deadzone = 8;
        if (distance > deadzone) {
            const angle = Math.atan2(deltaY, deltaX);
            const distanceRatio = Math.min(distance / maxRadius, 1);
            const threshold = 0.3;
            
            state.keys.d = Math.cos(angle) > threshold;
            state.keys.a = Math.cos(angle) < -threshold;
            state.keys.s = Math.sin(angle) > threshold;
            state.keys.w = Math.sin(angle) < -threshold;
            
            state.joyIntensity = distanceRatio;
            state.joyAngle = angle;
        } else {
            state.keys.w = state.keys.a = state.keys.s = state.keys.d = false;
            state.joyIntensity = 0;
            state.joyAngle = 0;
        }
        
        if (state.keys && (state.keys.w || state.keys.a || state.keys.s || state.keys.d)) {
            this.testResults.movementKeysSet = true;
        }
    }

    onJoyEnd(e) {
        let touch = null;
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.activeTouchId) {
            // PointerEvent
            touch = e;
        } else if (e.clientX !== undefined && (this.activeTouchId === 'mouse' || e.pointerId === this.activeTouchId)) {
            // MouseEvent
            touch = e;
        }
        if (this.activeTouchId === null || !touch) return;

        this.activeTouchId = null;
        this.knob.style.transform = 'translate(-50%, -50%)';
        this.resetMovement();
    }

    // ========== RIGHT JOYSTICK (Aim) - zone: right half of screen ==========
    onLookStart(e) {
        // Don't block UI elements
        if (e.target.closest('#start-button, #instructions-toggle, #restart-button')) return;
        if (e.target.id === 'start-screen' || e.target.closest('#start-screen')) return;
        
        e.preventDefault();
        
        // Handle touch, pointer, and mouse events
        let touch = null;
        let pointerId = null;
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent
            touch = e.changedTouches[0];
            pointerId = touch.identifier;
        } else if (e.touches && e.touches.length > 0) {
            // TouchEvent (touchmove)
            touch = e.touches[0];
            pointerId = touch.identifier;
        } else if (e.pointerId !== undefined) {
            // PointerEvent
            touch = e;
            pointerId = e.pointerId;
        } else if (e.clientX !== undefined) {
            // MouseEvent
            touch = e;
            pointerId = 'mouse';
        }
        if (!touch) return;

        // Zone check: only on the right joystick element (tc-look)
        const joyEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!joyEl || !joyEl.closest('#tc-look')) return;

        if (this.lookTouchId !== null) return;

        this.lookTouchId = pointerId;

        // Base center as origin (fixed position)
        const centerX = window.innerWidth - 80;
        const centerY = window.innerHeight - 80;
        this.lookStartX = centerX;
        this.lookStartY = centerY;

        // Initialize aim position to joystick base center ONLY if not already set
        const state = gameState || window.gameState;
        if (state) {
            // Keep existing aim position, only initialize if at default (300,300) or undefined
            if (state.mouseX === undefined || state.mouseY === undefined || 
                (state.mouseX === 300 && state.mouseY === 300)) {
                // Convert viewport to gameContainer LOGICAL coordinates (dividido por scale)
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    const rect = gameContainer.getBoundingClientRect();
                    const scaleFactor = rect.width / 600;
                    state.mouseX = (centerX - rect.left) / scaleFactor;
                    state.mouseY = (centerY - rect.top) / scaleFactor;
                } else {
                    state.mouseX = centerX;
                    state.mouseY = centerY;
                }
            }
            // La mira nunca sale de la pantalla
            this.clampAimToVisibleScreen(state);
        }

        // Base is FIXED at bottom-right
        this.lookKnob.style.transform = 'translate(-50%, -50%)';
        
        // Update visual cursor immediately
        const cursor = document.getElementById('cursor');
        const gameContainer = document.getElementById('game-container');
        if (cursor && gameContainer) {
            // state.mouseX/Y are already in gameContainer coordinates
            cursor.style.left = state.mouseX + 'px';
            cursor.style.top = state.mouseY + 'px';
            cursor.style.display = 'block';
        }

        // TEST: Track
        this.testResults.lookTouchReceived = true;
        this.logTestResult('LookStart - touch in right zone', true, { touchId: this.lookTouchId, clientX: touch.clientX, clientY: touch.clientY });
    }

    onLookMove(e) {
        e.preventDefault();
        if (this.lookTouchId === null) return;

        // Find the touch/pointer with our identifier
        let touch = null;

        if (e.touches && e.touches.length > 0) {
            // TouchEvent
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.lookTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent (touchend)
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.lookTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.lookTouchId) {
            // PointerEvent
            touch = e;
        } else if (e.clientX !== undefined && (this.lookTouchId === 'mouse' || e.pointerId === this.lookTouchId)) {
            // MouseEvent
            touch = e;
        }
        if (!touch) return;

        // Use base center as origin
        const centerX = window.innerWidth - 80;
        const centerY = window.innerHeight - 80;

        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxRadius = 30;

        // Clamp knob position
        if (distance > maxRadius) {
            const angle = Math.atan2(deltaY, deltaX);
            this.lookKnob.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * maxRadius}px, ${Math.sin(angle) * maxRadius}px)`;
        } else {
            this.lookKnob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${-deltaY}px)`;
        }

        // Calculate aim from joystick angle/distance (RELATIVE MOVEMENT - analog stick style)
        const state = gameState || window.gameState;
        if (!state) return;

        const deadzone = 8;
        if (distance > deadzone) {
            const angle = Math.atan2(deltaY, deltaX);
            const distanceRatio = Math.min(distance / maxRadius, 1);
            const aimSpeed = 15 * distanceRatio; // pixels per frame, scaled by distance from center

            // Initialize aim position to joystick base center if at default (300,300)
            if (state.mouseX === 300 && state.mouseY === 300) {
                // Convert viewport to gameContainer LOGICAL coordinates (dividido por scale)
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    const rect = gameContainer.getBoundingClientRect();
                    const scaleFactor = rect.width / 600;
                    state.mouseX = (centerX - rect.left) / scaleFactor;
                    state.mouseY = (centerY - rect.top) / scaleFactor;
                } else {
                    state.mouseX = centerX;
                    state.mouseY = centerY;
                }
            }

            // Relative movement: joystick direction moves aim from CURRENT position
            state.mouseX += Math.cos(angle) * aimSpeed;
            state.mouseY += Math.sin(angle) * aimSpeed;

            // Clamp a la zona VISIBLE: la mira nunca sale de la pantalla
            // (el helper también posiciona el cursor visual)
            this.clampAimToVisibleScreen(state);

            state.lookIntensity = distanceRatio;
            state.lookAngle = angle;
        } else {
            // In deadzone - no movement
            state.lookIntensity = 0;
            state.lookAngle = 0;
        }

        if (state.mouseX !== centerX || state.mouseY !== centerY) {
            this.testResults.aimPositionUpdated = true;
        }

        this.logTestResult('LookMove - aim updated', true, {
            touchClient: { x: touch.clientX, y: touch.clientY },
            delta: { x: deltaX, y: deltaY },
            aim: { x: state.mouseX, y: state.mouseY }
        });
    }

    onLookEnd(e) {
        let touch = null;
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            // TouchEvent
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.lookTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.lookTouchId) {
            // PointerEvent
            touch = e;
        } else if (e.clientX !== undefined && (this.lookTouchId === 'mouse' || e.pointerId === this.lookTouchId)) {
            // MouseEvent
            touch = e;
        }
        if (this.lookTouchId === null || !touch) return;

        this.lookTouchId = null;
        this.lookKnob.style.transform = 'translate(-50%, -50%)';
        
        // Keep cursor at last position (don't hide, don't reset)
        // Cursor stays where the joystick left it
        
        const state = gameState || window.gameState;
        if (state) {
            state.lookIntensity = 0;
            state.lookAngle = 0;
        }
    }

    // ========== FIRE BUTTON ==========
    onFireStart(e) {
        e.preventDefault();
        if (this.fireTouchId !== null) return;

        let touch = null;
        let pointerId = null;

        if (e.changedTouches && e.changedTouches.length > 0) {
            touch = e.changedTouches[0];
            pointerId = touch.identifier;
        } else if (e.pointerId !== undefined) {
            touch = e;
            pointerId = e.pointerId;
        } else if (e.clientX !== undefined) {
            touch = e;
            pointerId = 'mouse';
        }
        if (!touch) return;

        // Verify touch is on fire button
        const fireEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!fireEl || !fireEl.closest('#tc-fire')) return;

        this.fireTouchId = pointerId;

        // Set isMouseDown for weapon system
        if (window.WEAPON_SYSTEM) {
            window.WEAPON_SYSTEM.isMouseDown = true;
        }
        const state = window.gameState;
        if (state) {
            state.isMouseDown = true;
        }

        // Fire immediately for single-shot weapons
        if (state && window.WEAPON_SYSTEM && state.gameActive && !state.mergingEnemies && state.canShoot) {
            const weapon = window.WEAPON_SYSTEM.currentWeapon;
            if (weapon && weapon.fireRate === 0) {
                const mouseWorldX = state.mouseX + state.cameraX;
                const mouseWorldY = state.mouseY + state.cameraY;
                const projectiles = window.WEAPON_SYSTEM.shoot(
                    state.playerX, state.playerY,
                    mouseWorldX, mouseWorldY
                );
                state.projectiles.push(...projectiles);

                // Trigger cooldown system (GitHub behavior)
                if (window.COOLDOWN_SYSTEM) {
                    window.COOLDOWN_SYSTEM.incrementShots(weapon.type);
                }
            } else if (weapon && (weapon.type === 'machinegun' || weapon.type === 'minigun')) {
                if (weapon.type === 'machinegun') {
                    window.WEAPON_SYSTEM.startMachinegun();
                } else if (weapon.type === 'minigun') {
                    window.WEAPON_SYSTEM.startMinigun();
                }
            }
        }

        // Visual feedback
        this.fireBase.style.background = 'rgba(255, 100, 0, 0.8)';
        this.fireBase.style.transform = 'scale(0.95)';
    }

    onFireEnd(e) {
        let touch = null;

        if (e.changedTouches && e.changedTouches.length > 0) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.fireTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.fireTouchId) {
            touch = e;
        } else if (e.clientX !== undefined && (this.fireTouchId === 'mouse' || e.pointerId === this.fireTouchId)) {
            touch = e;
        }
        if (this.fireTouchId === null || !touch) return;

        this.fireTouchId = null;

        // Clear isMouseDown
        if (window.WEAPON_SYSTEM) {
            window.WEAPON_SYSTEM.isMouseDown = false;
        }
        const state = window.gameState;
        if (state) {
            state.isMouseDown = false;
        }

        // Visual feedback reset
        this.fireBase.style.background = 'rgba(255, 100, 0, 0.4)';
        this.fireBase.style.transform = 'scale(1)';
    }

    // ========== WEAPON SELECTOR (cycle button) ==========
    onWeaponSelect(e) {
        e.preventDefault();

        // Weapon IDs: 1=RIFLE, 2=SHOTGUN, 3=MACHINEGUN, 4=SNIPER, 5=BAZOOKA, 6=MINIGUN
        const weaponNames = ['R', 'S', 'M', 'SN', 'BZ', 'MG'];
        const weaponColors = ['#222', '#ffaa00', '#ff4444', '#00ffff', '#ff00ff', '#ff8800'];

        if (window.WEAPON_SYSTEM) {
            const currentId = window.WEAPON_SYSTEM.currentWeapon?.id || 1;
            const nextId = currentId >= 6 ? 1 : currentId + 1;
            window.WEAPON_SYSTEM.switchWeapon(nextId);

            // Update button state: sin letras ni colores por arma (un solo estilo fijo)
            if (this.weaponButton) {
                this.weaponButton.dataset.weaponId = nextId;

                this.weaponButton.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.weaponButton.style.transform = 'scale(1)';
                }, 100);
            }
        }
    }

    // ========== TURBO BUTTON ==========
    onTurboStart(e) {
        console.log('[TouchControls] onTurboStart:', e.type);
        e.preventDefault();
        if (this.turboTouchId !== null) return;

        let touch = null;
        let pointerId = null;

        if (e.changedTouches && e.changedTouches.length > 0) {
            touch = e.changedTouches[0];
            pointerId = touch.identifier;
        } else if (e.pointerId !== undefined) {
            touch = e;
            pointerId = e.pointerId;
        } else if (e.touches && e.touches.length > 0) {
            touch = e.touches[0];
            pointerId = touch.identifier;
        } else if (e.clientX !== undefined) {
            touch = e;
            pointerId = 'mouse';
        }
        if (!touch) return;

        const turboEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!turboEl || !turboEl.closest('#tc-turbo')) return;

        this.turboTouchId = pointerId;

        const state = window.gameState;
        if (state && !state.turboRunning && state.turboCurrent > 0) {
            state.turboRequested = true;
            state.turboRunning = true;
            state.turboActive = true;
            state.turboMode = true;

            const mouseWorldX = state.mouseX + state.cameraX;
            const mouseWorldY = state.mouseY + state.cameraY;
            const dx = mouseWorldX - state.playerX;
            const dy = mouseWorldY - state.playerY;
            state.turboAngle = Math.atan2(dy, dx);
        }

        this.turboBase.style.background = 'rgba(255, 255, 0, 0.8)';
        this.turboBase.style.transform = 'scale(0.95)';
    }

    onTurboEnd(e) {
        console.log('[TouchControls] onTurboEnd:', e.type, 'turboTouchId:', this.turboTouchId);
        let touch = null;

        if (e.changedTouches && e.changedTouches.length > 0) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.turboTouchId) {
                    touch = e.changedTouches[i];
                    break;
                }
            }
        } else if (e.pointerId !== undefined && e.pointerId === this.turboTouchId) {
            touch = e;
        } else if (e.clientX !== undefined && (this.turboTouchId === 'mouse' || e.pointerId === this.turboTouchId)) {
            touch = e;
        }
        if (this.turboTouchId === null || !touch) {
            console.log('[TouchControls] onTurboEnd: RETURN EARLY - no touch found');
            return;
        }

        this.turboTouchId = null;

        this.turboBase.style.background = 'rgba(255, 255, 0, 0.4)';
        this.turboBase.style.transform = 'scale(1)';
    }

    // ========== MINIMAP TOGGLE ==========
    onMinimapToggle(e) {
        e.preventDefault();

        const minimap = document.getElementById('minimap');
        const state = window.gameState;

        if (minimap && state) {
            state.minimapVisible = !state.minimapVisible;
            minimap.style.display = state.minimapVisible ? 'block' : 'none';

            this.minimapZone.style.borderColor = state.minimapVisible ? '#ffff00' : '#00ff00';
        }
    }

    // ========== AIM CLAMP: la mira nunca sale de la pantalla ==========
    // El game-container está escalado con overflow, así que sus bordes lógicos
    // (0..600) quedan FUERA del viewport. La lógica de límites vive en aimClamp.js
    // (cargado como global) y está testeada por node --test.
    clampAimToVisibleScreen(state) {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        const rect = gameContainer.getBoundingClientRect();
        const r = window.clampAim(state.mouseX, state.mouseY, rect, window.innerWidth, window.innerHeight);
        if (!r) return;
        state.mouseX = r.x;
        state.mouseY = r.y;
        
        // Update visual cursor (coords lógicas dentro del container escalado)
        const cursor = document.getElementById('cursor');
        if (cursor) {
            cursor.style.left = state.mouseX + 'px';
            cursor.style.top = state.mouseY + 'px';
            cursor.style.display = 'block';
        }
    }

    resetMovement() {
        const state = gameState || window.gameState;
        if (!state) return;
        if (!state.keys) state.keys = { w: false, a: false, s: false, d: false };
        state.keys.w = state.keys.a = state.keys.s = state.keys.d = false;
        state.joyIntensity = 0;
        state.joyAngle = 0;
    }

    updateSimultaneousCount() {
        let count = 0;
        if (this.activeTouchId !== null) count++;
        if (this.lookTouchId !== null) count++;
        this.testResults.simultaneousTouches = count;
        if (count > this.testResults.maxSimultaneous) {
            this.testResults.maxSimultaneous = count;
        }
    }
    
    // ========== AUTOMATED TEST ==========
    runAutomatedTest() {
        console.log('[TouchControls] === AUTOMATED TEST START ===');
        
        const state = gameState || window.gameState;
        if (!state) {
            console.log('[TouchControls] AUTOMATED TEST FAIL: No gameState');
            return;
        }
        
        // Test 1: Left joystick simulation
        console.log('[TouchControls] Test 1: Simulating LEFT joystick touch...');
        const leftStartEvent = this.createMockTouchEvent('touchstart', 50, window.innerHeight - 50, 1);
        this.onJoyStart(leftStartEvent);
        
        const leftMoveEvent = this.createMockTouchEvent('touchmove', 20, window.innerHeight - 80, 1);
        this.onJoyMove(leftMoveEvent);
        
        // Check if keys were set
        const keysSet = state.keys && (state.keys.w || state.keys.a || state.keys.s || state.keys.d);
        console.log('[TouchControls] Test 1 result:', { 
            keys: state.keys, 
            keysSet,
            expected: 'keys.w/a/s/d should be true based on movement'
        });
        this.logTestResult('Automated: Left joystick sets movement keys', keysSet, { keys: state.keys });
        
        const leftEndEvent = this.createMockTouchEvent('touchend', 20, window.innerHeight - 80, 1);
        this.onJoyEnd(leftEndEvent);
        
        // Test 2: Right joystick simulation
        console.log('[TouchControls] Test 2: Simulating RIGHT joystick touch...');
        const rightStartEvent = this.createMockTouchEvent('touchstart', window.innerWidth - 50, window.innerHeight - 50, 2);
        this.onLookStart(rightStartEvent);
        
        const rightMoveEvent = this.createMockTouchEvent('touchmove', window.innerWidth - 20, window.innerHeight - 80, 2);
        this.onLookMove(rightMoveEvent);
        
        // Check if aim was updated
        const centerX = window.innerWidth - 80;
        const centerY = window.innerHeight - 80;
        const aimUpdated = state.mouseX !== centerX || state.mouseY !== centerY;
        console.log('[TouchControls] Test 2 result:', { 
            mouseX: state.mouseX, 
            mouseY: state.mouseY,
            centerX,
            centerY,
            aimUpdated,
            expected: 'mouseX/mouseY should differ from center'
        });
        this.logTestResult('Automated: Right joystick updates aim position', aimUpdated, { 
            mouseX: state.mouseX, 
            mouseY: state.mouseY 
        });
        
        const rightEndEvent = this.createMockTouchEvent('touchend', window.innerWidth - 20, window.innerHeight - 80, 2);
        this.onLookEnd(rightEndEvent);
        
        // Test 3: Multitouch - both simultaneously
        console.log('[TouchControls] Test 3: Simulating MULTITOUCH (both joysticks)...');
        this.testResults.simultaneousTouches = 0;
        
        const leftStart2 = this.createMockTouchEvent('touchstart', 50, window.innerHeight - 50, 3);
        this.onJoyStart(leftStart2);
        
        const rightStart2 = this.createMockTouchEvent('touchstart', window.innerWidth - 50, window.innerHeight - 50, 4);
        this.onLookStart(rightStart2);
        
        this.updateSimultaneousCount();
        const bothActive = this.activeTouchId !== null && this.lookTouchId !== null;
        
        const leftMove2 = this.createMockTouchEvent('touchmove', 20, window.innerHeight - 80, 3);
        this.onJoyMove(leftMove2);
        
        const rightMove2 = this.createMockTouchEvent('touchmove', window.innerWidth - 20, window.innerHeight - 80, 4);
        this.onLookMove(rightMove2);
        
        const multiKeysSet = state.keys && (state.keys.w || state.keys.a || state.keys.s || state.keys.d);
        const multiAimUpdated = state.mouseX !== centerX || state.mouseY !== centerY;
        
        console.log('[TouchControls] Test 3 result:', { 
            bothActive,
            multiKeysSet,
            multiAimUpdated,
            simultaneous: this.testResults.simultaneousTouches,
            expected: 'Both joysticks active, keys set, aim updated'
        });
        this.logTestResult('Automated: Multitouch both joysticks active', bothActive && multiKeysSet && multiAimUpdated, { 
            keys: state.keys,
            mouseX: state.mouseX,
            mouseY: state.mouseY,
            simultaneous: this.testResults.simultaneousTouches
        });
        
        const leftEnd2 = this.createMockTouchEvent('touchend', 20, window.innerHeight - 80, 3);
        this.onJoyEnd(leftEnd2);
        const rightEnd2 = this.createMockTouchEvent('touchend', window.innerWidth - 20, window.innerHeight - 80, 4);
        this.onLookEnd(rightEnd2);
        
        // Final results
        const results = this.getTestResults();
        console.log('[TouchControls] === AUTOMATED TEST COMPLETE ===', results);
        console.log('[TouchControls] OVERALL:', results.allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        console.log('[TouchControls] Errors:', results.errors);
    }
    
    // Mock event with proper target for automated testing
    createMockTouchEvent(type, clientX, clientY, identifier) {
        const mockTarget = {
            id: 'tc-joy',
            closest: (selector) => null  // No UI elements in mock
        };
        return {
            type,
            preventDefault: () => {},
            changedTouches: [{ clientX, clientY, identifier }],
            touches: [{ clientX, clientY, identifier }],
            target: mockTarget,
            currentTarget: mockTarget
        };
    }

    // Public method to get test results
    getTestResults() {
        return {
            ...this.testResults,
            allTestsPassed: this.testResults.joyTouchReceived && 
                           this.testResults.lookTouchReceived && 
                           this.testResults.movementKeysSet && 
                           this.testResults.aimPositionUpdated &&
                           this.testResults.maxSimultaneous >= 2 &&
                           this.testResults.errors.length === 0
        };
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.TouchControls = new TouchControls();
        window.TouchControls.init();
    });
} else {
    window.TouchControls = new TouchControls();
    window.TouchControls.init();
}