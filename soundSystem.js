// ========== SISTEMA DE SONIDO (Web Audio API) ==========
const SOUND_SYSTEM = {
    context: null,
    buffers: {},
    masterGain: null,

    init() {
        // Inicializar el contexto cuando el usuario interactúe (click)
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.masterGain.gain.value = 0.5; // Volumen master
        
        // Pre-poblar el pool con algunos nodos iniciales
        for (let i = 0; i < 15; i++) {
            this.gainNodePool.push(this.context.createGain());
        }
        console.log("Sistema de sonido inicializado con Pool de Nodos.");
    },

    getGainNode() {
        if (this.gainNodePool.length > 0) {
            return this.gainNodePool.pop();
        }
        return this.context.createGain();
    },

    releaseGainNode(gainNode) {
        try {
            gainNode.disconnect();
            this.gainNodePool.push(gainNode);
        } catch (e) {
            console.error("Error liberando GainNode al pool:", e);
        }
    },

    async load(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
        } catch (e) {
            console.error(`Error cargando sonido ${name} (${url}):`, e);
        }
    },

    activeSounds: {},
    lastPlayedTimes: {},
    voiceCounts: {},
    gainNodePool: [],
    
    // Prioridad: 2=High, 1=Medium, 0=Low
    priorities: {
        'shot_rifle': 2, 'shot_shotgun': 2, 'shot_machinegun': 2, 'shot_minigun': 2,
        'shot_sniper': 2, 'shot_bazooka': 2, 'player_damage': 2, 'spawn_start': 2,
        'game_over': 2, 'low_health_warn': 1, 'organic_explosion': 1,
        'beast_pain': 1, 'tentacle_hit': 1, 'brick_hit': 1,
        'debris_step': 0, 'click_menu': 0
    },
    
    maxGlobalVoices: 12,
    
    // Configuración de cooldowns (ms) para evitar saturación
    cooldowns: {
        'player_damage': 100,
        'debris_step': 250,
        'beast_pain': 150,
        'organic_explosion': 80,
        'empty_click': 200,
        'tentacle_hit': 50,
        'brick_hit': 40
    },

    // Límite de instancias simultáneas por sonido
    maxVoices: {
        'player_damage': 2,
        'organic_explosion': 3,
        'beast_pain': 2,
        'debris_step': 1,
        'tentacle_hit': 2,
        'brick_hit': 2,
        'shot_rifle': 5,
        'shot_shotgun': 2,
        'shot_sniper': 2,
        'shot_bazooka': 2,
        'low_health_warn': 1,
        'spawn_start': 1,
        'game_over': 1
    },
    defaultMaxVoices: 5,

    // Reproducir sonido: play(nombre, volumen=1, pitch=1, loop=false, forceStop=false)
    play(name, volume = 1, pitch = 1, loop = false, forceStop = false) {
        if (!this.buffers[name]) {
            console.warn(`Sonido no encontrado: ${name}`);
            return;
        }

        const now = Date.now();
        
        // 1. Aplicar Throttling (Cooldown)
        if (!forceStop && !loop && this.cooldowns[name]) {
            const lastPlayed = this.lastPlayedTimes[name] || 0;
            if (now - lastPlayed < this.cooldowns[name]) {
                return null;
            }
        }

        // 2. Aplicar Voice Limiting (Límite de voces)
        const currentVoices = this.voiceCounts[name] || 0;
        const maxAllowed = this.maxVoices[name] || this.defaultMaxVoices;
        if (!forceStop && currentVoices >= maxAllowed) {
            return null; // Demasiadas instancias sonando
        }

        // 3. Aplicar Priorización
        const totalActive = Object.values(this.voiceCounts).reduce((a, b) => a + b, 0);
        const incomingPriority = this.priorities[name] || 0;
        
        if (!forceStop && totalActive >= this.maxGlobalVoices) {
            // Si estamos al límite, solo dejamos pasar sonidos de alta prioridad (2)
            if (incomingPriority < 2) return null;
        }

        this.lastPlayedTimes[name] = now;
        this.voiceCounts[name] = currentVoices + 1;

        // Solo detener si se solicita explícitamente (ej: turbo)
        if (forceStop) {
            this.stop(name);
        }

        // Necesario para reanudar el contexto si fue suspendido por el navegador
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const source = this.context.createBufferSource();
        source.buffer = this.buffers[name];
        source.playbackRate.value = pitch;
        source.loop = loop;

        const gainNode = this.getGainNode();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start();
        
        // Guardar referencia (para sonidos únicos o controlados)
        this.activeSounds[name] = { source, gainNode };
        
        source.onended = () => { 
            // Decrementar contador de voces
            this.voiceCounts[name] = Math.max(0, (this.voiceCounts[name] || 1) - 1);

            // Limpiar referencia única si es esta la instancia
            if (this.activeSounds[name] && this.activeSounds[name].source === source) {
                this.releaseGainNode(gainNode);
                delete this.activeSounds[name]; 
            } else {
                // Si ya no es la referencia activa, liberamos el nodo de igual forma
                this.releaseGainNode(gainNode);
            }
        };
        
        return { source, gainNode };
    },

    stop(name) {
        if (this.activeSounds[name]) {
            console.log("SOUND_SYSTEM.stop called for:", name);
            try {
                this.activeSounds[name].source.stop();
                this.releaseGainNode(this.activeSounds[name].gainNode);
            } catch (e) {
                console.log("Error stopping sound:", name, e);
            }
            // Importante: eliminar la referencia para permitir que se vuelva a reproducir
            this.activeSounds[name].source.disconnect();
            delete this.activeSounds[name];
        } else {
            console.log("SOUND_SYSTEM.stop called, but no active sound for:", name);
        }
    },

    stopSource(source) {
        if (!source) return;
        console.log("SOUND_SYSTEM.stopSource called");
        try {
            source.stop();
        } catch (e) {
            console.log("Error stopping source directly:", e);
        }
    }
};

// Exponer globalmente
window.SOUND_SYSTEM = SOUND_SYSTEM;
