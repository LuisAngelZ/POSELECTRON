// dashboard.js - Sistema POS Moderno
import { setupEventListeners, startPeriodicChecks, loadDashboardData } from './dashboard-utils.js';
import { CONFIG, AppState } from './dashboard-config.js';

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Iniciando Dashboard...");
    
    try {
        // Cargar token y usuario
        AppState.auth.token = localStorage.getItem("pos_token");
        const userStr = localStorage.getItem("pos_user");
        AppState.auth.user = userStr ? JSON.parse(userStr) : null;

        if (!AppState.auth.token || !AppState.auth.user) {
            console.log("No hay token o usuario, redirigiendo a login");
            redirectToLogin();
            return;
        }

        await initializeApp();
    } catch (error) {
        console.error("Error de inicialización:", error);
        handleAuthError(error);
    }
});

async function initializeApp() {
    if (AppState.auth.checkInProgress) return;

    try {
        AppState.auth.checkInProgress = true;
        console.log("🚀 Iniciando verificación de sesión...");
        
        // Verificar token local
        if (!AppState.auth.token || !AppState.auth.user) {
            console.log("No hay datos de sesión locales");
            throw new Error("Sin datos de sesión");
        }

        // Intentar verificar autenticación con reintentos
        let isValid = false;
        let retryCount = 0;
        const maxInitRetries = 3;

        while (!isValid && retryCount < maxInitRetries) {
            try {
                isValid = await verifyToken();
                if (isValid) break;
            } catch (e) {
                console.log(`Intento ${retryCount + 1} fallido:`, e);
            }
            retryCount++;
            if (retryCount < maxInitRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (!isValid) {
            throw new Error("No se pudo verificar el token después de varios intentos");
        }

        console.log("✅ Sesión verificada correctamente");
        AppState.auth.isAuthenticated = true;
        AppState.auth.retryCount = 0; // Resetear contador de intentos

        // Inicializar componentes
        console.log("🔄 Inicializando componentes...");
        setupEventListeners();
        await loadDashboardData();
        initializeCharts();
        startPeriodicChecks();
        
        console.log("✅ Dashboard inicializado correctamente");
    } catch (error) {
        console.error("⚠ Error en inicialización:", error);
        handleAuthError(error);
    } finally {
        AppState.auth.checkInProgress = false;
    }
}

async function verifyToken() {
    try {
        // Intentar ambas rutas de verificación
        const endpoints = [
            `${CONFIG.API_BASE}/auth/verify-token`,
            `${CONFIG.API_BASE}/auth/verify`
        ];

        let response = null;
        let success = false;

        for (const endpoint of endpoints) {
            try {
                response = await fetch(endpoint, {
                    method: 'POST', // Cambiar a POST ya que enviamos datos
                    headers: { 
                        "Authorization": `Bearer ${AppState.auth.token}`,
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ token: AppState.auth.token })
                });

                if (response.ok) {
                    success = true;
                    break;
                }
            } catch (e) {
                console.log(`Intento fallido con ${endpoint}:`, e);
                continue;
            }
        }

        if (!success) {
            if (response && response.status === 401) {
                return false;
            }
            throw new Error("Error verificando token en todos los endpoints");
        }

        // Verificar si hay un nuevo token en los headers
        const newToken = response.headers.get('X-New-Token');
        if (newToken) {
            console.log("🔄 Renovando token...");
            AppState.auth.token = newToken;
            localStorage.setItem("pos_token", newToken);
        }

        const data = await response.json();

        // Actualizar información del usuario si está disponible
        if (data.user) {
            AppState.auth.user = data.user;
            localStorage.setItem("pos_user", JSON.stringify(data.user));
        }

        return data.success;
    } catch (error) {
        console.error("Error en verificación de token:", error);
        
        // Si es error de red, implementar backoff exponencial
        if (error.name === "TypeError" && AppState.auth.retryCount < AppState.auth.maxRetries) {
            AppState.auth.retryCount++;
            const backoffTime = Math.min(1000 * Math.pow(2, AppState.auth.retryCount), 30000);
            console.log(`⏳ Reintentando en ${backoffTime/1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return verifyToken(); // Reintentar recursivamente
        }
        
        // Si excedimos los reintentos, verificar si aún tenemos datos locales válidos
        if (AppState.auth.token && AppState.auth.user) {
            console.log("🔄 Usando datos locales mientras se restaura la conexión...");
            return true;
        }
        
        return false;
    }
}

function handleAuthError(error) {
    console.error("Error de autenticación:", error);

    // Verificar si tenemos datos locales válidos
    const hasLocalData = AppState.auth.token && AppState.auth.user;

    // Si es error de red y no hemos excedido los reintentos, implementar backoff exponencial
    if ((error.name === "TypeError" || error.message.includes("conexión")) && AppState.auth.retryCount < AppState.auth.maxRetries) {
        AppState.auth.retryCount++;
        const backoffTime = Math.min(1000 * Math.pow(2, AppState.auth.retryCount), 30000);
        
        if (hasLocalData) {
            showNotification(`Error de conexión. Operando en modo offline. Reintentando en ${backoffTime/1000} segundos...`, "warning");
            
            // Mantener la sesión activa en modo offline
            setTimeout(() => {
                if (AppState.auth.token && AppState.auth.user) {
                    initializeApp();
                }
            }, backoffTime);
        } else {
            showNotification(`Error de conexión. Reintentando en ${backoffTime/1000} segundos...`, "warning");
            setTimeout(() => initializeApp(), backoffTime);
        }
        return;
    }

    // Manejar diferentes tipos de errores
    if (error.status === 401 || error.message.includes("Token inválido")) {
        // Error de autenticación explícito
        clearSession("Sesión expirada. Por favor, vuelva a iniciar sesión.");
    } else if (AppState.auth.retryCount >= AppState.auth.maxRetries) {
        // Se agotaron los reintentos
        if (hasLocalData) {
            showNotification("Problemas de conexión persistentes. Operando en modo offline.", "warning");
            AppState.auth.retryCount = 0; // Resetear para futuros intentos
            startPeriodicChecks(); // Mantener los chequeos periódicos
        } else {
            clearSession("Error de conexión persistente. Por favor, inicie sesión nuevamente.");
        }
    } else {
        // Otros errores, mantener la sesión si hay datos locales
        if (hasLocalData) {
            showNotification("Error de conexión. Operando con datos locales.", "warning");
            startPeriodicChecks();
        } else {
            clearSession("Error del sistema. Por favor, inicie sesión nuevamente.");
        }
    }
}

function clearSession(message) {
    AppState.auth.isAuthenticated = false;
    AppState.auth.token = null;
    AppState.auth.user = null;
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    
    showNotification(message, "error");
    setTimeout(() => {
        window.location.href = "/login";
    }, 2000);
}

function showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = "block";
        setTimeout(() => {
            notification.style.display = "none";
        }, 3000);
    }
}

// Función para inicializar gráficos
function initializeCharts() {
    // Gráfico de ventas mensuales
    const chartCanvas = document.getElementById('supplyDemandChart');
    if (chartCanvas && !AppState.charts.sales) {
        AppState.charts.sales = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Ventas (Bs)',
                    data: [100, 150, 120, 200, 180, 220, 210, 240, 200, 180, 160, 200],
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e40af',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Gráfico de distribución de categorías
    const pieCanvas = document.getElementById('distributionChart');
    if (pieCanvas && !AppState.charts.paymentMethods) {
        AppState.charts.paymentMethods = new Chart(pieCanvas, {
            type: 'pie',
            data: {
                labels: ['Platos', 'Bebidas', 'Refrescos', 'Extras'],
                datasets: [{
                    data: [30, 25, 20, 25],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }
}

// ... [resto del código del dashboard permanece igual]
