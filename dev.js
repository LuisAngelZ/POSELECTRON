// dev.js - Script para desarrollo
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando POS en modo desarrollo...');

// Iniciar servidor backend
const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

// Esperar un poco y luego iniciar Electron
setTimeout(() => {
    const electron = spawn('electron', ['.'], {
        stdio: 'inherit'
    });

    electron.on('close', () => {
        server.kill();
        process.exit();
    });
}, 3000);

server.on('close', () => {
    process.exit();
});