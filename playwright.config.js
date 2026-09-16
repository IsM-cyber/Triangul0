// playwright.config.js — configuración de los tests e2e de Triangul0
// El juego corre en el servidor local (python3 -m http.server 8000)
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 120000,             // 120s por test: el wait de desenlace usa el mismo margen
  use: {
    baseURL: 'http://localhost:8000',
    viewport: { width: 1920, height: 1080 },
    headless: true,            // corre sin abrir ventana (robot invisible)
    // Swiftshader: render por software. Esta VM no tiene GPU y sin esto
    // el navegador headless no produce frames (rAF congelado).
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--enable-unsafe-swiftshader'],
    },
  },
  outputDir: 'test-results',   // capturas y evidencia
});