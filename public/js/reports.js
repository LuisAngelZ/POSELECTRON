
    // ===== PARTE 4: ACTUALIZAR JAVASCRIPT EN reports.html =====
// Reemplaza todo el JavaScript dentro de las etiquetas <script> en tu reports.html:

// Variables globales
let currentPeriod = 'today';
let refreshInterval;
let dashboardData = null;

// BASE URL del API
const API_BASE = '/api';
let authToken = localStorage.getItem('pos_token') || 'demo-token';

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INICIALIZANDO REPORTES ===');
    setTimeout(initializeReports, 100);
});

async function initializeReports() {
    try {
        await loadDashboard();
        
        // Auto-refresh cada 60 segundos para datos reales
        refreshInterval = setInterval(refreshData, 60000);
        
    } catch (error) {
        console.error('Error inicializando reportes:', error);
        showError('Error inicializando el sistema de reportes');
    }
}

async function loadDashboard() {
    try {
        console.log('Cargando dashboard desde API...');
        
        await Promise.all([
            loadStats(),
            loadRecentSales(),
            loadTopProducts()
        ]);
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showError('Error cargando los datos del dashboard');
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/reports/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos del dashboard recibidos:', data);
        
        if (data.success) {
            dashboardData = data.dashboard;
            renderStats(data.dashboard);
        } else {
            throw new Error(data.message || 'Error en la respuesta del servidor');
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showError('Error cargando estadísticas del servidor');
        
        // Fallback: mostrar estado sin datos
        renderEmptyStats();
    }
}

async function loadRecentSales() {
    try {
        if (!dashboardData || !dashboardData.recent_sales) {
            console.log('Usando datos de dashboard para ventas recientes');
            return;
        }
        
        renderRecentSales(dashboardData.recent_sales);
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        showError('Error cargando ventas recientes');
    }
}

async function loadTopProducts() {
    try {
        if (!dashboardData || !dashboardData.top_products_today) {
            console.log('Usando datos de dashboard para productos populares');
            return;
        }
        
        renderTopProducts(dashboardData.top_products_today);
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        showError('Error cargando productos populares');
    }
}

function renderStats(dashboard) {
    const statsGrid = document.getElementById('statsGrid');
    
    const stats = [
        {
            icon: '💰',
            value: `Bs. ${parseInt(dashboard.today.amount || 0)}`,
            label: 'Ventas de Hoy'
        },
        {
            icon: '🧾',
            value: dashboard.today.sales || 0,
            label: 'Órdenes de Hoy'
        },
        {
            icon: '📊',
            value: `Bs. ${parseInt(dashboard.today.average || 0)}`,
            label: 'Promedio por Venta'
        },
        {
            icon: '📅',
            value: `Bs. ${parseInt(dashboard.this_month.amount || 0)}`,
            label: 'Ventas del Mes'
        }
    ];

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
}

function renderEmptyStats() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">Sin datos</div>
            <div class="stat-label">Conectando al servidor...</div>
        </div>
    `;
}

function renderRecentSales(sales) {
    const salesList = document.getElementById('recentSalesList');
    
    if (!sales || sales.length === 0) {
        salesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: #ff8a65;">📋</div>
                <div>No hay ventas registradas hoy</div>
            </div>
        `;
        return;
    }

    salesList.innerHTML = sales.slice(0, 10).map(sale => {
        const date = new Date(sale.created_at);
        const timeStr = date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="sale-item">
                <div class="sale-info">
                    <h4>Venta #${sale.id}</h4>
                    <p>👤 ${sale.customer_name || 'Cliente'} - ${timeStr}</p>
                    <p>👨‍💼 ${sale.user_name || 'Usuario'}</p>
                    ${sale.table_number ? `<p>🪑 Mesa ${sale.table_number}</p>` : ''}
                </div>
                <div class="sale-amount">Bs. ${parseInt(sale.total)}</div>
            </div>
        `;
    }).join('');
}

function renderTopProducts(products) {
    const productsList = document.getElementById('topProductsList');
    
    if (!products || products.length === 0) {
        productsList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: #ff8a65;">🏆</div>
                <div>No hay productos vendidos hoy</div>
            </div>
        `;
        return;
    }

    productsList.innerHTML = products.map((product, index) => `
        <div class="product-item">
            <div class="product-rank">${index + 1}</div>
            <div class="product-name" title="${product.product_name}">
                ${product.product_name}
            </div>
            <div class="product-sales">
                ${product.total_quantity} vendidos
                ${product.total_revenue ? 
                    `<br><small style="color: #6b7280;">Bs. ${parseInt(product.total_revenue)}</small>` : 
                    ''
                }
            </div>
        </div>
    `).join('');
}

function changePeriod(period) {
    currentPeriod = period;
    
    // Actualizar botones activos
    document.querySelectorAll('.time-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    console.log('Cambiando período a:', period);
    
    // Recargar datos según el período seleccionado
    loadPeriodData(period);
}

async function loadPeriodData(period) {
    try {
        let endpoint = '/reports/dashboard';
        let params = '';
        
        switch (period) {
            case 'today':
                endpoint = '/reports/dashboard';
                break;
            case 'week':
                endpoint = '/reports/weekly';
                break;
            case 'month':
                endpoint = '/reports/monthly';
                break;
        }
        
        const response = await fetch(`${API_BASE}${endpoint}${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.dashboard) {
                dashboardData = data.dashboard;
                renderStats(data.dashboard);
                renderRecentSales(data.dashboard.recent_sales);
                renderTopProducts(data.dashboard.top_products_today);
            } else if (data.report) {
                // Adaptar datos de reporte para mostrar en dashboard
                adaptReportToStats(data.report, period);
            }
        }
        
    } catch (error) {
        console.error('Error cargando datos del período:', error);
        showError(`Error cargando datos del período: ${period}`);
    }
}

function adaptReportToStats(report, period) {
    // Adaptar datos de reportes semanales/mensuales para mostrar en el dashboard
    const statsGrid = document.getElementById('statsGrid');
    
    let stats = [];
    
    if (period === 'week') {
        stats = [
            {
                icon: '💰',
                value: `Bs. ${parseInt(report.summary.total_amount || 0)}`,
                label: 'Ventas de la Semana'
            },
            {
                icon: '🧾',
                value: report.summary.total_sales || 0,
                label: 'Órdenes de la Semana'
            },
            {
                icon: '📊',
                value: `Bs. ${parseInt(report.summary.average_sale || 0)}`,
                label: 'Promedio por Venta'
            },
            {
                icon: '📅',
                value: report.summary.days_with_sales || 0,
                label: 'Días con Ventas'
            }
        ];
    } else if (period === 'month') {
        stats = [
            {
                icon: '💰',
                value: `Bs. ${parseInt(report.summary.total_amount || 0)}`,
                label: 'Ventas del Mes'
            },
            {
                icon: '🧾',
                value: report.summary.total_sales || 0,
                label: 'Órdenes del Mes'
            },
            {
                icon: '📊',
                value: `Bs. ${parseInt(report.summary.average_sale || 0)}`,
                label: 'Promedio por Venta'
            },
            {
                icon: '📅',
                value: report.summary.days_with_sales || 0,
                label: 'Días con Ventas'
            }
        ];
    }

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
    
    // Actualizar productos si están disponibles
    if (report.top_products) {
        renderTopProducts(report.top_products);
    }
}

async function refreshData() {
    console.log('Refrescando datos...');
    const refreshBtn = document.querySelector('.refresh-btn');
    
    // Animación de refresh
    refreshBtn.style.transform = 'scale(0.9) rotate(180deg)';
    
    try {
        await loadDashboard();
        
        console.log('Datos actualizados correctamente');
        
    } catch (error) {
        console.error('Error actualizando datos:', error);
    } finally {
        setTimeout(() => {
            refreshBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 500);
    }
}

function showError(message) {
    console.error('ERROR:', message);
    
    const container = document.querySelector('.content-area');
    const existingError = container.querySelector('.error-message');
    
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        if (container.contains(errorDiv)) {
            container.removeChild(errorDiv);
        }
    }, 8000);
}

// Funciones de compatibilidad con sidebar
function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        clearInterval(refreshInterval);
        console.log('Cerrando sesión...');
        // localStorage.removeItem('pos_token');
        // window.location.href = '/login';
    }
}

// Función global para compatibilidad
window.appLogout = logout;

// Limpiar interval al salir
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Actualizar cuando la página vuelve a estar activa
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && dashboardData) {
        console.log('Página activa - refrescando datos');
        refreshData();
    }
});

// Manejar errores de conexión
window.addEventListener('online', function() {
    console.log('Conexión restaurada - refrescando datos');
    refreshData();
});

window.addEventListener('offline', function() {
    console.log('Sin conexión a internet');
    showError('Sin conexión a internet - datos pueden no estar actualizados');
});

// Debug: función para probar conexión
function testConnection() {
    console.log('Probando conexión con el servidor...');
    fetch(`${API_BASE}/reports/dashboard`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Estado de conexión:', response.status, response.statusText);
        return response.json();
    })
    .then(data => {
        console.log('Respuesta del servidor:', data);
    })
    .catch(error => {
        console.error('Error de conexión:', error);
    });
}

// Hacer disponible globalmente para debug
window.testConnection = testConnection;
