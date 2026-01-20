// Variables globales
let currentPeriod = 'today';
let refreshInterval;
let dashboardData = null;
let currentFilters = {
    startDate: null,
    endDate: null,
    product: '',
    paymentType: 'all'
};

// BASE URL del API
const API_BASE = '/api';
let authToken = localStorage.getItem('pos_token') || 'demo-token';

// Función para establecer rango de fechas rápido
function setDateRange(range) {
    const today = new Date();
    let startDate, endDate;
    
    endDate = today.toISOString().split('T')[0];
    
    switch(range) {
        case 'today':
            startDate = endDate;
            break;
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            startDate = weekAgo.toISOString().split('T')[0];
            break;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            startDate = monthAgo.toISOString().split('T')[0];
            break;
        case 'custom':
            return; // No hacer nada, dejar que el usuario seleccione
        default:
            startDate = endDate;
    }
    
    // Actualizar inputs
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
    
    // Actualizar botones activos
    document.querySelectorAll('.quick-dates .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (range !== 'custom') {
        document.querySelector(`[onclick="setDateRange('${range}')"]`).classList.add('active');
    }
    
    applyFilters();
}

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
            loadTopProducts(),
            loadChartsData()
        ]);
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showError('Error cargando los datos del dashboard');
    }
}

async function loadChartsData() {
    try {
        if (!dashboardData) return;
        
        // Renderizar gráfico de ventas por hora
        if (dashboardData.hourly_sales) {
            renderHourlyChart(dashboardData.hourly_sales);
        }
        
        // Renderizar gráfico de método de pago
        if (dashboardData.today) {
            renderPaymentChart(dashboardData.today.efectivo || 0, dashboardData.today.qr || 0);
        }
        
    } catch (error) {
        console.error('Error cargando gráficos:', error);
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

function renderStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    
    let stats;
    
    // Si los datos vienen del reporte filtrado
    if (data.summary && data.summary.total_amount !== undefined) {
        stats = [
            {
                icon: '💰',
                value: `Bs. ${parseInt(data.summary.total_amount || 0)}`,
                label: 'Total Ventas'
            },
            {
                icon: '🧾',
                value: data.summary.total_sales || 0,
                label: 'Total Órdenes'
            },
            {
                icon: '📊',
                value: `Bs. ${parseInt(data.summary.average_sale || 0)}`,
                label: 'Promedio por Venta'
            },
            {
                icon: '📅',
                value: `Bs. ${parseInt(data.summary.average_per_day || 0)}`,
                label: 'Promedio Diario'
            }
        ];
    } 
    // Si los datos vienen del dashboard
    else if (data.today) {
        stats = [
            {
                icon: '💰',
                value: `Bs. ${parseInt(data.today.amount || 0)}`,
                label: 'Ventas de Hoy'
            },
            {
                icon: '🧾',
                value: data.today.sales || 0,
                label: 'Órdenes de Hoy'
            },
            {
                icon: '📊',
                value: `Bs. ${parseInt(data.today.average || 0)}`,
                label: 'Promedio por Venta'
            },
            {
                icon: '📅',
                value: `Bs. ${parseInt(data.this_month?.amount || 0)}`,
                label: 'Ventas del Mes'
            }
        ];
    }
    // Si no hay datos válidos
    else {
        stats = [
            {
                icon: '💰',
                value: 'Bs. 0',
                label: 'Sin datos'
            },
            {
                icon: '🧾',
                value: '0',
                label: 'Sin órdenes'
            },
            {
                icon: '📊',
                value: 'Bs. 0',
                label: 'Promedio'
            },
            {
                icon: '📅',
                value: 'Bs. 0',
                label: 'Total'
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
        
        const paymentIcon = sale.payment_type === 'efectivo' ? '💵' : '📱';
        const paymentLabel = sale.payment_type === 'efectivo' ? 'Efectivo' : 'QR/Digital';
        
        return `
            <div class="sale-item">
                <div class="sale-info">
                    <h4>Venta #${sale.id}</h4>
                    <p>👤 ${sale.customer_name || 'Cliente'} - ${timeStr}</p>
                    <p>👨‍💼 ${sale.user_name || 'Usuario'}</p>
                    ${sale.table_number ? `<p>🪑 Mesa ${sale.table_number}</p>` : ''}
                    <p style="color: #6b7280; font-size: 0.9rem;">${paymentIcon} ${paymentLabel}</p>
                </div>
                <div class="sale-amount">Bs. ${(sale.total || 0).toFixed(2)}</div>
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
            <div class="product-name" title="${product.name || product.product_name}">
                ${product.name || product.product_name}
            </div>
            <div class="product-sales">
                ${product.quantity || product.total_quantity} vendidos
                ${(product.revenue || product.total_revenue) ? 
                    `<br><small style="color: #6b7280;">Bs. ${(product.revenue || product.total_revenue).toFixed(2)}</small>` : 
                    ''
                }
            </div>
        </div>
    `).join('');
    
    // Renderizar también gráfico de productos si hay Chart.js
    renderProductChart(products);
}

// Función para renderizar gráfico de ventas por hora
function renderHourlyChart(hourlyData) {
    const chartPlaceholder = document.querySelector('.chart-placeholder');
    if (!chartPlaceholder) return;
    
    // Si Chart.js no está disponible, mostrar tabla
    if (typeof Chart === 'undefined' || !hourlyData || hourlyData.length === 0) {
        chartPlaceholder.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: #6b7280;">
                <div>No hay datos de ventas por hora</div>
            </div>
        `;
        return;
    }
    
    // Crear tabla de horas
    const tableHtml = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; text-align: left; font-size: 0.9rem;">
                <thead style="border-bottom: 2px solid #e5e7eb;">
                    <tr>
                        <th style="padding: 0.5rem;">Hora</th>
                        <th style="padding: 0.5rem; text-align: right;">Ventas</th>
                        <th style="padding: 0.5rem; text-align: right;">Monto (Bs.)</th>
                    </tr>
                </thead>
                <tbody>
                    ${hourlyData.map(h => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 0.5rem;">${h.hour || '00'}:00</td>
                            <td style="padding: 0.5rem; text-align: right;">${h.count || 0}</td>
                            <td style="padding: 0.5rem; text-align: right; color: #10b981; font-weight: bold;">Bs. ${(h.total || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    chartPlaceholder.innerHTML = tableHtml;
}

// Función para renderizar gráfico de productos
function renderProductChart(products) {
    if (typeof Chart === 'undefined' || !products || products.length < 2) return;
    
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;
    
    if (window.productChart) {
        window.productChart.destroy();
    }
    
    try {
        window.productChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: products.slice(0, 8).map(p => (p.name || p.product_name || 'Producto').substring(0, 15)),
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: products.slice(0, 8).map(p => p.quantity || p.total_quantity || 0),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e40af',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.log('Chart.js no disponible, saltando gráfico:', error);
    }
}

// Función para renderizar gráfico de método de pago
function renderPaymentChart(cashAmount, qrAmount) {
    const ctx = document.getElementById('paymentMethodChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    if (window.paymentChart) {
        window.paymentChart.destroy();
    }
    
    const total = parseFloat(cashAmount) + parseFloat(qrAmount);
    if (total === 0) return;
    
    try {
        window.paymentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Efectivo', 'QR/Digital'],
                datasets: [{
                    data: [parseFloat(cashAmount), parseFloat(qrAmount)],
                    backgroundColor: ['#f59e0b', '#8b5cf6'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        });
    } catch (error) {
        console.log('Chart.js no disponible, saltando gráfico:', error);
    }
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

// Funciones de filtrado
function filterByPayment(type) {
    // Actualizar botones
    document.querySelectorAll('.payment-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="filterByPayment('${type}')"]`).classList.add('active');
    
    currentFilters.paymentType = type;
    applyFilters();
}

function filterByProduct(productId) {
    document.getElementById('productFilter').value = productId;
    applyFilters();
}

// Función principal para aplicar todos los filtros
async function applyFilters() {
    try {
        console.log('Aplicando filtros...');
        
        // Recoger valores actuales y asegurarse de que sean válidos
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const product = document.getElementById('productFilter').value;
        
        if (!startDate || !endDate) {
            showError('Por favor seleccione un rango de fechas válido');
            return;
        }

        // Convertir fechas a zona horaria Bolivia (UTC-4)
        const startDateObj = new Date(startDate + 'T00:00:00-04:00');
        const endDateObj = new Date(endDate + 'T23:59:59-04:00');
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            showError('Formato de fecha inválido');
            return;
        }

        // Validar que la fecha final no sea menor que la inicial
        if (endDateObj < startDateObj) {
            showError('La fecha final no puede ser menor que la fecha inicial');
            return;
        }

        // Convertir a formato ISO para el API
        const startDateISO = startDate;
        const endDateISO = endDate;

        console.log('Fechas a enviar:', {
            startDate,
            endDate,
            startDateObj,
            endDateObj
        });

        // Actualizar filtros actuales
        currentFilters = {
            startDate,
            endDate,
            product,
            paymentType: currentFilters.paymentType || 'all'
        };

        console.log('Filtros actuales:', currentFilters);
        
        // Construir URL con filtros
        const url = new URL(`${API_BASE}/reports/filtered`, window.location.origin);
        url.searchParams.append('start_date', currentFilters.startDate);
        url.searchParams.append('end_date', currentFilters.endDate);
        
        if (currentFilters.product) {
            url.searchParams.append('product_id', currentFilters.product);
        }
        
        if (currentFilters.paymentType && currentFilters.paymentType !== 'all') {
            url.searchParams.append('payment_type', currentFilters.paymentType);
        }
        
        console.log('URL de consulta:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error aplicando filtros');
        
        const data = await response.json();
        
        // Actualizar la interfaz con los datos filtrados
        renderFilteredData(data);
        
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        showError('Error al filtrar los datos');
    }
}

// Función para renderizar datos filtrados
function renderFilteredData(data) {
    try {
        console.log('Datos recibidos:', data);
        
        if (!data || !data.success || !data.report) {
            console.error('Formato de respuesta inválido:', data);
            showError('Error al cargar los datos del reporte');
            return;
        }

        const report = data.report;
        console.log('Procesando reporte:', report);
        
        // Actualizar resumen diario
        const dailySummary = document.getElementById('dailySummary');
        dailySummary.innerHTML = `
        <div class="summary-card">
            <h4>Total Ventas</h4>
            <div class="value">${report.summary.total_sales}</div>
        </div>
        <div class="summary-card">
            <h4>Monto Total</h4>
            <div class="value">Bs. ${parseInt(report.summary.total_amount)}</div>
        </div>
        <div class="summary-card">
            <h4>Promedio por Venta</h4>
            <div class="value">Bs. ${parseInt(report.summary.average_sale)}</div>
        </div>
        <div class="summary-card">
            <h4>Días con Ventas</h4>
            <div class="value">${report.summary.days_with_sales}</div>
        </div>
    `;
    
    // Actualizar tabla de ventas
    const salesTable = document.querySelector('#salesTable tbody');
    if (salesTable) {
        if (report.sales.length === 0) {
            salesTable.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <div class="no-data-message">
                            No se encontraron ventas en el período seleccionado
                        </div>
                    </td>
                </tr>
            `;
        } else {
            salesTable.innerHTML = report.sales.map(sale => `
                <tr>
                    <td>#${sale.id}</td>
                    <td>${formatDate(sale.created_at)}</td>
                    <td>${sale.user_name}</td>
                    <td>${sale.table_number || '-'}</td>
                    <td class="amount">Bs. ${parseInt(sale.total)}</td>
                    <td>${formatPaymentType(sale.payment_type)}</td>
                    <td>
                        <button onclick="showSaleDetails(${sale.id})" class="action-btn">
                            👁️ Ver
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    // Actualizar productos más vendidos
    const topProducts = document.getElementById('topProductsList');
    if (topProducts && report.top_products) {
        if (report.top_products.length === 0) {
            topProducts.innerHTML = `
                <div class="no-data-message">
                    No hay productos vendidos en este período
                </div>
            `;
        } else {
            topProducts.innerHTML = report.top_products.map((product, index) => `
                <div class="product-item">
                    <div class="product-rank">${index + 1}</div>
                    <div class="product-info">
                        <div class="product-name">${product.product_name}</div>
                        <div class="product-stats">
                            ${product.total_quantity} unidades • Bs. ${parseInt(product.total_revenue)}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Actualizar estadísticas principales
    const stats = {
        today: {
            amount: report.summary.total_amount,
            sales: report.summary.total_sales,
            average: report.summary.average_sale
        }
    };
    renderStats(stats);
    } catch (error) {
        console.error('Error renderizando datos:', error);
        showError('Error al mostrar los datos del reporte');
    }
}

// Funciones auxiliares de formato
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatPaymentType(type) {
    switch(type) {
        case 'cash':
            return '💵 Efectivo';
        case 'qr':
            return '🔲 QR';
        default:
            return '🔄 ' + type;
    }
}

function showSaleDetails(saleId) {
    // Implementar vista detallada de la venta
    alert('Detalles de la venta ' + saleId + ' próximamente');
}

// Función para exportar a Excel
async function exportToExcel() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const paymentType = document.querySelector('.payment-filters .filter-btn.active').getAttribute('onclick').includes('qr') ? 'qr' : 
                           document.querySelector('.payment-filters .filter-btn.active').getAttribute('onclick').includes('cash') ? 'cash' : 'all';

        let url = `${API_BASE}/reports/export?start_date=${startDate}&end_date=${endDate}`;
        if (paymentType !== 'all') {
            url += `&payment_type=${paymentType}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Error exportando reporte');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_ventas_${startDate}_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        console.error('Error exportando reporte:', error);
        showError('Error al exportar el reporte');
    }
}

// Exportar reporte
async function exportReport() {
    try {
        // Construir URL con filtros actuales
        let url = `${API_BASE}/reports/export?`;
        url += `start_date=${currentFilters.startDate}`;
        url += `&end_date=${currentFilters.endDate}`;
        if (currentFilters.product) url += `&product_id=${currentFilters.product}`;
        if (currentFilters.paymentType !== 'all') url += `&payment_type=${currentFilters.paymentType}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error exportando reporte');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_${currentFilters.startDate}_${currentFilters.endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
    } catch (error) {
        console.error('Error exportando reporte:', error);
        showError('Error al exportar el reporte');
    }
}

// Eventos para inputs de fecha
document.getElementById('startDate').addEventListener('change', () => {
    document.querySelector('[onclick="setDateRange(\'custom\')"]').click();
    applyFilters();
});

document.getElementById('endDate').addEventListener('change', () => {
    document.querySelector('[onclick="setDateRange(\'custom\')"]').click();
    applyFilters();
});

// Evento para filtro de productos
document.getElementById('productFilter').addEventListener('change', applyFilters);
