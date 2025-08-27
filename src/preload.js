const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Información de la aplicación
    getAppVersion: () => require('../package.json').version,
    
    // Funciones de ventana
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    
    // Funciones del sistema
    platform: () => process.platform,
    
    // Notificaciones
    showNotification: (title, body) => {
        new Notification(title, { body });
    }
});

// Prevenir navegación externa
window.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Los links externos se manejan en main.js
        });
    });
});