// test-touch-controls.js
// Unit tests for touch-controls.js logic (no DOM required)

const assert = require('assert');

// Mock gameState
let gameState = {
    keys: { w: false, a: false, s: false, d: false }
};

// Simulated touch-controls logic (extracted for testing)
class TouchControlsTest {
    constructor() {
        this.joyTouchId = null;
        this.joyCX = 100;
        this.joyCY = 100;
    }

    joyStart(clientX, clientY, id = 'mouse') {
        this.joyTouchId = id;
        this.joyCX = clientX;
        this.joyCY = clientY;
    }

    joyMove(clientX, clientY, id = 'mouse') {
        if (this.joyTouchId === null) return false;
        if (id !== this.joyTouchId) return false;
        
        let dx = clientX - this.joyCX;
        let dy = clientY - this.joyCY;
        const len = Math.sqrt(dx*dx + dy*dy);
        const max = 48;
        if (len > max) { dx = dx/len*max; dy = dy/len*max; }
        
        const kx = dx/max;
        const ky = dy/max;
        const th = 0.22;
        
        gameState.keys.w = ky < -th;
        gameState.keys.s = ky > th;
        gameState.keys.a = kx < -th;
        gameState.keys.d = kx > th;
        
        return true;
    }

    joyEnd(id = 'mouse') {
        if (id === this.joyTouchId) {
            this.joyTouchId = null;
            gameState.keys.w = gameState.keys.s = gameState.keys.a = gameState.keys.d = false;
            return true;
        }
        return false;
    }
}

// Helper to reset gameState
function resetKeys() {
    gameState.keys.w = gameState.keys.a = gameState.keys.s = gameState.keys.d = false;
}

// ========== TESTS ==========
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        resetKeys();
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ FAIL: ${name} - ${e.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}

function assertDeepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg}: expected ${e}, got ${a}`);
}

// ---- Test Suite ----

const tc = new TouchControlsTest();

test('joyStart sets touchId and center', () => {
    tc.joyStart(100, 100, 'touch1');
    assertEqual(tc.joyTouchId, 'touch1');
    assertEqual(tc.joyCX, 100);
    assertEqual(tc.joyCY, 100);
});

test('joyMove up sets w=true', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(100, 50, 'touch1'); // dy = -50, ky = -50/48 = -1.04 < -0.22
    assertEqual(gameState.keys.w, true);
    assertEqual(gameState.keys.s, false);
    assertEqual(gameState.keys.a, false);
    assertEqual(gameState.keys.d, false);
});

test('joyMove down sets s=true', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(100, 150, 'touch1'); // dy = 50, ky = 1.04 > 0.22
    assertEqual(gameState.keys.s, true);
    assertEqual(gameState.keys.w, false);
});

test('joyMove left sets a=true', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(50, 100, 'touch1'); // dx = -50, kx = -1.04 < -0.22
    assertEqual(gameState.keys.a, true);
    assertEqual(gameState.keys.d, false);
});

test('joyMove right sets d=true', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(150, 100, 'touch1'); // dx = 50, kx = 1.04 > 0.22
    assertEqual(gameState.keys.d, true);
    assertEqual(gameState.keys.a, false);
});

test('joyMove diagonal up-right sets w+d', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(140, 60, 'touch1'); // dx=40, dy=-40
    assertEqual(gameState.keys.w, true);
    assertEqual(gameState.keys.d, true);
    assertEqual(gameState.keys.a, false);
    assertEqual(gameState.keys.s, false);
});

test('joyMove small distance (below threshold) sets nothing', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(105, 102, 'touch1'); // dx=5, dy=2, len~5.4, kx=0.1, ky=0.04 < 0.22
    assertEqual(gameState.keys.w, false);
    assertEqual(gameState.keys.a, false);
    assertEqual(gameState.keys.s, false);
    assertEqual(gameState.keys.d, false);
});

test('joyMove clamps to max radius', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(200, 100, 'touch1'); // dx=100, should clamp to 48
    // kx = 48/48 = 1.0 > 0.22
    assertEqual(gameState.keys.d, true);
    // Verify clamping happened (knob position would be at max)
    // In real code: dx = dx/len*max = 100/100*48 = 48
});

test('joyEnd resets all keys', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(100, 50, 'touch1'); // w=true
    assertEqual(gameState.keys.w, true);
    tc.joyEnd('touch1');
    assertEqual(gameState.keys.w, false);
    assertEqual(gameState.keys.a, false);
    assertEqual(gameState.keys.s, false);
    assertEqual(gameState.keys.d, false);
});

test('joyEnd with wrong id does nothing', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(100, 50, 'touch1');
    assertEqual(gameState.keys.w, true);
    tc.joyEnd('touch2'); // wrong id
    assertEqual(gameState.keys.w, true); // still true
    tc.joyEnd('touch1');
    assertEqual(gameState.keys.w, false);
});

test('joyMove without joyStart does nothing', () => {
    resetKeys();
    tc.joyTouchId = null;
    tc.joyMove(100, 50, 'touch1');
    assertEqual(gameState.keys.w, false);
});

test('Multiple touches: only tracked id affects keys', () => {
    tc.joyStart(100, 100, 'touch1');
    tc.joyMove(100, 50, 'touch1'); // w=true
    tc.joyMove(200, 100, 'touch2'); // different id, ignored
    assertEqual(gameState.keys.w, true);
    assertEqual(gameState.keys.d, false);
});

// Summary
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);