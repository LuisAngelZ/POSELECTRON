const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');

class POSApp {
    constructor() {
        this.mainWindow = null;
        this.serverProcess = null;
        this.serverReady = false;
    }

    async createWindow() {
        // Mantener estado de la ventana
        let mainWindowState = windowStateKeeper({
            defaultWidth: 1400,
            defaultHeight: 900
        });

        // Crear ventana principal
        this.mainWindow = new BrowserWindow({
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            minWidth: 1000,
            minHeight: 700,
            show: false,
            icon: this.getIconPath(),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                preload: path.join(__dirname, 'preload.js')
            },
            titleBarStyle: 'default',
            autoHideMenuBar: false
        });

        // Gestionar estado de ventana
        mainWindowState.manage(this.mainWindow);

        // Configurar menú
        this.createMenu();

        // Cargar aplicación
        await this.loadApp();

        // Mostrar cuando esté listo
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Manejar cierre
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Manejar links externos
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    getIconPath() {
        if (process.platform === 'win32') {
            return path.join(__dirname, '../assets/icon.ico');
        } else if (process.platform === 'darwin') {
            return path.join(__dirname, '../assets/icon.icns');
        } else {
            return path.join(__dirname, '../assets/icon.png');
        }
    }

     // En src/main.js, modificar la función startServer()
async startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Iniciando servidor local...');

        // Verificar que el archivo existe
        const serverPath = isDev 
            ? path.join(__dirname, '../backend/server.js')
            : path.join(process.resourcesPath, 'backend/server.js');
            
        console.log('📂 Ruta del servidor:', serverPath);

        // Verificar que Node.js puede acceder al archivo
        const fs = require('fs');
        if (!fs.existsSync(serverPath)) {
            console.error('❌ Archivo server.js no encontrado en:', serverPath);
            reject(new Error('server.js no encontrado'));
            return;
        }

        const env = {
            ...process.env,
            NODE_ENV: 'production',
            PORT: '3000'
        };

        const serverDir = path.dirname(serverPath);
        console.log('📁 Directorio de trabajo:', serverDir);

        this.serverProcess = spawn('node', [serverPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: env,
            cwd: serverDir
        });

        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[SERVER]: ${output}`);
            
            if (output.includes('Servidor POS LOCAL iniciado')) {
                this.serverReady = true;
                resolve();
            }
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error(`[SERVER ERROR]: ${data}`);
        });

        this.serverProcess.on('error', (error) => {
            console.error('❌ Error iniciando servidor:', error);
            reject(error);
        });

        // Timeout aumentado para debug
        setTimeout(() => {
            if (!this.serverReady) {
                console.log('⏰ Timeout - continuando sin confirmación del servidor');
                resolve();
            }
        }, 15000);
    });
}

    async loadApp() {
        const maxRetries = 10;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                if (this.serverReady || isDev) {
                    await this.mainWindow.loadURL('http://localhost:3000');
                    break;
                } else {
                    // Cargar página de carga mientras el servidor inicia
                    const loadingHTML = this.getLoadingHTML();
                    await this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retries++;
                }
            } catch (error) {
                console.error(`Error cargando app (intento ${retries + 1}):`, error);
                retries++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (retries >= maxRetries) {
            this.showErrorDialog('No se pudo conectar al servidor local');
        }
    }

    getLoadingHTML() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Iniciando Sistema POS...</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(255,255,255,0.3);
                    border-top: 5px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 2rem;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                h1 { font-size: 2rem; margin-bottom: 1rem; }
                p { font-size: 1.2rem; opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <h1>🏪 Sistema POS</h1>
            <p>Iniciando servidor local...</p>
            <p>Por favor espere...</p>
        </body>
        </html>
        `;
    }

    createMenu() {
        const template = [
            {
                label: 'Archivo',
                submenu: [
                    {
                        label: 'Recargar',
                        accelerator: 'F5',
                        click: () => {
                            this.mainWindow.reload();
                        }
                    },
                    {
                        label: 'Pantalla Completa',
                        accelerator: 'F11',
                        click: () => {
                            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Salir',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Ver',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Ayuda',
                submenu: [
                    {
                        label: 'Acerca de',
                        click: () => {
                            this.showAboutDialog();
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    showAboutDialog() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Acerca del Sistema POS',
            message: 'Sistema POS Desktop v1.0.0',
            detail: 'Aplicación de Punto de Venta\nDesarrollada con Electron + Node.js + SQLite',
            buttons: ['OK']
        });
    }

    showErrorDialog(message) {
        dialog.showErrorBox('Error', message);
    }

    async init() {
        // Esperar a que Electron esté listo
        await app.whenReady();

        // Iniciar servidor
        try {
            await this.startServer();
        } catch (error) {
            console.error('Error iniciando servidor:', error);
        }

        // Crear ventana
        await this.createWindow();

        // Manejar activación en macOS
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createWindow();
            }
        });
    }

    cleanup() {
        if (this.serverProcess) {
            console.log('🛑 Cerrando servidor...');
            this.serverProcess.kill();
        }
    }
}

// Inicializar aplicación
const posApp = new POSApp();

// Manejar eventos de la aplicación
app.on('ready', () => {
    posApp.init();
});

app.on('window-all-closed', () => {
    posApp.cleanup();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    posApp.cleanup();
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (posApp.mainWindow) {
            if (posApp.mainWindow.isMinimized()) posApp.mainWindow.restore();
            posApp.mainWindow.focus();
        }
    });
}