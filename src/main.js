const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');
const { fork } = require('child_process');
const fs = require('fs');

class POSApp {
    constructor() {
        this.mainWindow = null;
        this.serverProcess = null;
        this.serverReady = false;
        // Puerto del servidor - debe coincidir con .env
        this.serverPort = parseInt(process.env.PORT, 10) || 3333;
    }

    async createWindow() {
        let mainWindowState = windowStateKeeper({
            defaultWidth: 1400,
            defaultHeight: 900
        });

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

        mainWindowState.manage(this.mainWindow);
        this.createMenu();

        // Configurar listeners ANTES de mostrar
        this.mainWindow.once('ready-to-show', () => {
            if (isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Mostrar pantalla de carga primero
        this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getLoadingHTML())}`);
        this.mainWindow.show();

        // Iniciar servidor y luego cargar la app
        await this.startServer();
        await this.loadApp();
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

    async startServer() {
        return new Promise((resolve, reject) => {
            // Determinar rutas correctas según el entorno
            let serverPath, serverDir, dbPath, logDir;
            
            if (isDev) {
                // Desarrollo
                serverPath = path.join(__dirname, '../backend/server.js');
                serverDir = path.join(__dirname, '../backend');
                dbPath = path.join(__dirname, '../database/pos.db');
                logDir = path.join(__dirname, '../logs');
            } else {
                // Producción - CORREGIDO
                if (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'app.asar.unpacked'))) {
                    // Usando app.asar.unpacked
                    serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js');
                    serverDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
                    dbPath = path.join(process.resourcesPath, 'database', 'pos.db');
                } else {
                    // Fallback - archivos en directorio de instalación
                    const appDir = path.dirname(process.execPath);
                    serverPath = path.join(appDir, 'resources', 'backend', 'server.js');
                    serverDir = path.join(appDir, 'resources', 'backend');
                    dbPath = path.join(appDir, 'resources', 'database', 'pos.db');
                }
                logDir = path.join(app.getPath('userData'), 'logs');
            }

            // Crear directorios necesarios
            try {
                fs.mkdirSync(logDir, { recursive: true });
                fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            } catch (error) {
                console.log('Error creando directorios:', error.message);
            }

            // Verificar que el servidor existe
            if (!fs.existsSync(serverPath)) {
                console.error('❌ Archivo server.js no encontrado en:', serverPath);
                reject(new Error(`Server no encontrado: ${serverPath}`));
                return;
            }

            console.log('🚀 Iniciando servidor desde:', serverPath);
            console.log('📁 Directorio de trabajo:', serverDir);
            console.log('🗄️ Base de datos:', dbPath);

            const logFile = path.join(logDir, 'backend.log');

            // Variables de entorno para el servidor
            const env = {
                ...process.env,
                NODE_ENV: isDev ? 'development' : 'production',
                PORT: this.serverPort.toString(),
                DB_PATH: dbPath
            };

            let ready = false;
            let retries = 0;
            const maxRetries = 3;

            const startServerProcess = () => {
                this.serverProcess = fork(serverPath, [], {
                    cwd: serverDir,
                    env: env,
                    stdio: 'pipe',
                    silent: true
                });

                // Log de salida
                this.serverProcess.stdout?.on('data', (data) => {
                    const msg = String(data);
                    fs.appendFileSync(logFile, `[OUT] ${msg}`);
                    console.log('Server OUT:', msg.trim());
                    
                    if (msg.includes('Servidor POS LOCAL') || 
                        msg.includes(`http://127.0.0.1:${this.serverPort}`) ||
                        msg.includes(`http://localhost:${this.serverPort}`)) {
                        ready = true;
                        this.serverReady = true;
                        resolve();
                    }
                });

                // Log de errores
                this.serverProcess.stderr?.on('data', (data) => {
                    const msg = String(data);
                    fs.appendFileSync(logFile, `[ERR] ${msg}`);
                    console.error('Server ERR:', msg.trim());
                });

                // Manejar errores del proceso
                this.serverProcess.on('error', (error) => {
                    console.error('❌ Error del servidor:', error);
                    fs.appendFileSync(logFile, `[PROCESS_ERR] ${error.message}\n`);
                    
                    if (!ready && retries < maxRetries) {
                        retries++;
                        console.log(`🔄 Reintentando iniciar servidor (${retries}/${maxRetries})...`);
                        setTimeout(startServerProcess, 2000);
                    } else if (!ready) {
                        reject(error);
                    }
                });

                // Manejar salida del proceso
                this.serverProcess.on('exit', (code, signal) => {
                    console.log(`Server terminado con código: ${code}, señal: ${signal}`);
                    if (!ready && retries < maxRetries) {
                        retries++;
                        console.log(`🔄 Servidor terminó, reintentando (${retries}/${maxRetries})...`);
                        setTimeout(startServerProcess, 2000);
                    }
                });
            };

            // Iniciar proceso del servidor
            startServerProcess();

            // Timeout de seguridad
            setTimeout(() => {
                if (!ready) {
                    console.warn('⚠️ Timeout esperando servidor, continuando...');
                    resolve();
                }
            }, 15000);
        });
    }

    async loadApp() {
        const url = `http://127.0.0.1:${this.serverPort}`;
        const maxRetries = 30;
        let tries = 0;

        console.log(`🌐 Intentando conectar a: ${url}`);

        while (tries < maxRetries) {
            try {
                await this.mainWindow.loadURL(url);
                console.log('✅ Aplicación cargada correctamente');
                return;
            } catch (error) {
                tries++;
                console.log(`⏳ Intento ${tries}/${maxRetries} falló:`, error.message);
                
                if (tries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // Si llegamos aquí, no se pudo conectar
        console.error('❌ No se pudo conectar al servidor después de', maxRetries, 'intentos');
        this.showErrorDialog(`No se pudo conectar al servidor local en ${url}\n\nVerificar logs en: ${app.getPath('userData')}/logs/backend.log`);
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
                .progress {
                    width: 300px;
                    height: 4px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    margin-top: 1rem;
                    overflow: hidden;
                }
                .progress-bar {
                    height: 100%;
                    background: white;
                    width: 0%;
                    animation: progress 15s ease-in-out;
                }
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <h1>🏪 Sistema POS</h1>
            <p>Iniciando servidor local...</p>
            <p>Por favor espere...</p>
            <div class="progress">
                <div class="progress-bar"></div>
            </div>
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
                        label: 'Ver Logs',
                        click: () => {
                            shell.openPath(path.join(app.getPath('userData'), 'logs'));
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
                    },
                    {
                        label: 'Ver Logs de Error',
                        click: () => {
                            const logPath = path.join(app.getPath('userData'), 'logs', 'backend.log');
                            shell.openPath(logPath);
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
            detail: 'Aplicación de Punto de Venta\nDesarrollada con Electron + Node.js + SQLite\n\nLogs: ' + path.join(app.getPath('userData'), 'logs'),
            buttons: ['OK']
        });
    }

    showErrorDialog(message) {
        dialog.showErrorBox('Error del Sistema POS', message);
    }

    cleanup() {
        if (this.serverProcess) {
            console.log('🛑 Cerrando servidor...');
            this.serverProcess.kill('SIGTERM');
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    }
}

// Inicializar aplicación
const posApp = new POSApp();

// Manejar eventos de la aplicación - usar whenReady en lugar de ready
app.whenReady().then(async () => {
    await posApp.createWindow();
}).catch(err => {
    console.error('Error iniciando aplicación:', err);
    app.quit();
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await posApp.createWindow();
    }
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