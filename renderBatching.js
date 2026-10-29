// ========== RENDER BATCHING SYSTEM ==========
// Agrupa escrituras DOM en un solo batch por frame para evitar forced reflows
// Se activa con gameState.useRenderBatching = true

const RENDER_BATCH = {
    queue: [],
    scheduled: false,
    
    // Añade una escritura DOM a la cola
    // fn: función que hace la escritura (ej: () => el.style.left = '100px')
    add(fn) {
        this.queue.push(fn);
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    },
    
    // Ejecuta todas las escrituras encoladas de una vez
    flush() {
        const q = this.queue;
        this.queue = [];
        this.scheduled = false;
        
        // Ejecutar todas las escrituras juntas
        for (let i = 0; i < q.length; i++) {
            q[i]();
        }
    },
    
    // Helper para escribir estilo de un elemento
    setStyle(element, styles) {
        if (!element) return;
        this.add(() => {
            Object.assign(element.style, styles);
        });
    },
    
    // Helper para cssText (más rápido para múltiples propiedades)
    setCssText(element, cssText) {
        if (!element) return;
        this.add(() => {
            element.style.cssText = cssText;
        });
    },
    
    // Helper para transform (GPU accelerated)
    setTransform(element, transform) {
        if (!element) return;
        this.add(() => {
            element.style.transform = transform;
        });
    },
    
    // Helper para left/top
    setPosition(element, x, y) {
        if (!element) return;
        this.add(() => {
            element.style.left = x + 'px';
            element.style.top = y + 'px';
        });
    },
    
    // Helper para display
    setDisplay(element, display) {
        if (!element) return;
        this.add(() => {
            element.style.display = display;
        });
    },
    
    // Helper para opacity
    setOpacity(element, opacity) {
        if (!element) return;
        this.add(() => {
            element.style.opacity = opacity;
        });
    },
    
    // Helper para classList
    addClass(element, className) {
        if (!element) return;
        this.add(() => {
            element.classList.add(className);
        });
    },
    
    removeClass(element, className) {
        if (!element) return;
        this.add(() => {
            element.classList.remove(className);
        });
    },
    
    // Flush inmediato (para cambios críticos que no pueden esperar)
    flushSync() {
        this.flush();
    },
    
    // Stats para debug
    getStats() {
        return {
            queueLength: this.queue.length,
            scheduled: this.scheduled
        };
    }
};

// Exponer globalmente
window.RENDER_BATCH = RENDER_BATCH;