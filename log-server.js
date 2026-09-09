// log-server.js
// Simple HTTP server to receive console.log from browser
// Run: node log-server.js

const http = require('http');
const url = require('url');

const PORT = 3456;
const logs = [];

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    if (req.method === 'POST' && parsedUrl.pathname === '/api/logs') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const entry = {
                    time: data.time || Date.now(),
                    args: data.args || [],
                    url: data.url || 'unknown'
                };
                logs.push(entry);
                
                // Print to server console
                const timeStr = new Date(entry.time).toISOString().substr(11, 12);
                const argsStr = entry.args.map(a => 
                    typeof a === 'object' ? JSON.stringify(a) : String(a)
                ).join(' ');
                console.log(`[${timeStr}] ${argsStr}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, count: logs.length }));
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
        return;
    }
    
    if (req.method === 'GET' && parsedUrl.pathname === '/api/logs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));
        return;
    }
    
    if (req.method === 'GET' && parsedUrl.pathname === '/api/logs/clear') {
        logs.length = 0;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    
    // Simple status page
    if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/status')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head><title>Touch Controls Log Server</title>
<style>
body { font-family: monospace; background: #1a1a2e; color: #0f0; padding: 20px; }
h1 { color: #0cc0df; }
.log { margin: 2px 0; padding: 4px 8px; background: #0a0a1a; border-left: 3px solid #0cc0df; }
.time { color: #888; }
.btn { background: #0cc0df; color: #000; border: none; padding: 8px 16px; cursor: pointer; margin: 5px; }
.btn:hover { background: #0099cc; }
</style></head>
<body>
<h1>🎮 Touch Controls Log Server</h1>
<p>Logs received: <span id="count">${logs.length}</span></p>
<button class="btn" onclick="location.reload()">Refresh</button>
<button class="btn" onclick="fetch('/api/logs/clear',{method:'POST'}).then(()=>location.reload())">Clear</button>
<div id="logs">${logs.slice().reverse().map(l => 
    `<div class="log"><span class="time">[${new Date(l.time).toISOString().substr(11,12)}]</span> ${l.args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')}</div>`
).join('')}</div>
<script>setTimeout(()=>location.reload(), 3000)</script>
</body>
</html>
        `);
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`🎮 Log server running at http://localhost:${PORT}`);
    console.log(`   POST /api/logs  - Receive logs from browser`);
    console.log(`   GET  /api/logs  - Get all logs (JSON)`);
    console.log(`   GET  /status    - Web UI (auto-refresh 3s)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
});