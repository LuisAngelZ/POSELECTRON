// Configuración global del dashboard
export const CONFIG = {
    API_BASE: "/api",
    UPDATE_INTERVAL: 60000,  // 1 minuto
    AUTO_REFRESH: 120000,    // 2 minutos
    AUTH_CHECK: 600000,      // 10 minutos
    OFFLINE_CHECK: 30000,    // 30 segundos
    MAX_OFFLINE_TIME: 3600000, // 1 hora
    CHART_COLORS: {
        primary: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        info: "#6366f1"
    }
};

// Estado global de la aplicación
export const AppState = {
    charts: {
        sales: null,
        paymentMethods: null,
        topProducts: null
    },
    auth: {
        token: null,
        user: null,
        isAuthenticated: false,
        checkInProgress: false,
        retryCount: 0,
        maxRetries: 3,
        offlineMode: false,
        lastOnlineTime: Date.now()
    },
    data: {
        lastUpdate: null,
        updateInterval: null,
        offlineData: {
            sales: [],
            payments: [],
            products: []
        }
    }
};