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
        console.log("Sistema de sonido inicializado.");
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

    // Reproducir sonido: play(nombre, volumen=1, pitch=1, loop=false, forceStop=false)
    play(name, volume = 1, pitch = 1, loop = false, forceStop = false) {
        if (!this.buffers[name]) {
            console.warn(`Sonido no encontrado: ${name}`);
            return;
        }

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

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start();
        
        // Guardar referencia para poder detenerlo
        this.activeSounds[name] = { source, gainNode };
        source.onended = () => { 
            // Limpiar solo si es la instancia actual
            if (this.activeSounds[name] && this.activeSounds[name].source === source) {
                delete this.activeSounds[name]; 
            }
        };
        
        return this.activeSounds[name];
    },

    stop(name) {
        if (this.activeSounds[name]) {
            console.log("SOUND_SYSTEM.stop called for:", name);
            try {
                this.activeSounds[name].source.stop();
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
