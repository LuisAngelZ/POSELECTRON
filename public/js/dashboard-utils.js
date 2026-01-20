// ===== FUNCIONES DE UTILIDAD PARA EL DASHBOARD =====
import { CONFIG, AppState } from './dashboard-config.js';

// Event Listeners y actualizaciones periódicas
function setupEventListeners() {
    // Listener para cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearSession('Sesión cerrada correctamente');
        });
    }

    // Listener para actualizaciones manuales
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadDashboardData();
            showNotification('Datos actualizados', 'success');
        });
    }
}

// Función para iniciar chequeos periódicos
function startPeriodicChecks() {
    // Actualizar datos cada minuto
    setInterval(async () => {
        if (!AppState.auth.offlineMode) {
            await loadDashboardData();
        }
    }, CONFIG.UPDATE_INTERVAL);

    // Verificar autenticación cada 10 minutos
    setInterval(async () => {
        if (!AppState.auth.offlineMode) {
            try {
                const isValid = await verifyToken();
                if (!isValid) {
                    handleAuthError(new Error('Token inválido'));
                }
            } catch (error) {
                handleAuthError(error);
            }
        }
    }, CONFIG.AUTH_CHECK);

    // Verificar estado offline cada 30 segundos
    setInterval(async () => {
        if (AppState.auth.offlineMode) {
            try {
                const isValid = await verifyToken();
                if (isValid) {
                    AppState.auth.offlineMode = false;
                    AppState.auth.lastOnlineTime = Date.now();
                    showNotification('Conexión restaurada', 'success');
                    await loadDashboardData();
                }
            } catch (error) {
                console.log('Aún sin conexión:', error);
            }
        }
    }, CONFIG.OFFLINE_CHECK);
}

async function loadDashboardData() {
    try {
        console.log('📊 Cargando datos del dashboard...');
        
        // Obtener datos del endpoint principal de reportes
        const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
            headers: {
                'Authorization': `Bearer ${AppState.auth.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error en la respuesta del servidor');
        }

        console.log('✅ Datos del dashboard recibidos:', data.dashboard);

        // Actualizar datos en el estado
        AppState.data = {
            ...AppState.data,
            dashboard: data.dashboard,
            lastUpdate: new Date()
        };

        // Actualizar UI
        updateDashboardUI(data.dashboard);
        
    } catch (error) {
        console.error('⚠️ Error cargando datos:', error);
        if (!AppState.auth.offlineMode) {
            showNotification('Error al cargar datos. Usando datos locales.', 'warning');
            AppState.auth.offlineMode = true;
        }
    }
}

// Funciones para obtener datos específicos (DEPRECATED - usar endpoint /reports/dashboard)
async function fetchTodaySales() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.today || {};
}

async function fetchMonthlySales() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.this_month || {};
}

async function fetchTopProducts() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.top_products_today || [];
}

async function fetchCategoryDistribution() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.category_distribution || {};
}

async function fetchTopSellers() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.top_sellers || [];
}

async function fetchRecentTransactions() {
    const response = await fetch(`${CONFIG.API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${AppState.auth.token}` }
    });
    const data = await response.json();
    return data.dashboard?.recent_sales || [];
}

function updateDashboardUI(dashboardData) {
    if (!dashboardData) {
        console.warn('⚠️ No hay datos del dashboard para mostrar');
        return;
    }

    // Actualizar datos de hoy
    if (dashboardData.today) {
        document.getElementById('totalSales').textContent = dashboardData.today.sales || '0';
        document.getElementById('totalAmount').textContent = 
            `Bs ${(dashboardData.today.amount || 0).toFixed(2)}`;
        document.getElementById('averageSale').textContent = 
            `Bs ${(dashboardData.today.average || 0).toFixed(2)}`;
        
        // Mostrar métodos de pago
        document.getElementById('effectivoAmount').textContent = 
            `Bs ${(dashboardData.today.efectivo || 0).toFixed(2)}`;
        document.getElementById('qrAmount').textContent = 
            `Bs ${(dashboardData.today.qr || 0).toFixed(2)}`;
    }

    // Actualizar datos del mes
    if (dashboardData.this_month) {
        document.getElementById('monthlySales').textContent = dashboardData.this_month.sales || '0';
        document.getElementById('monthlyAmount').textContent = 
            `Bs ${(dashboardData.this_month.amount || 0).toFixed(2)}`;
        document.getElementById('dailyAverage').textContent = 
            `Bs ${(dashboardData.this_month.daily_average || 0).toFixed(2)}`;
    }

    // Actualizar productos top
    if (dashboardData.top_products_today) {
        const productsList = document.getElementById('topProducts');
        if (productsList) {
            productsList.innerHTML = dashboardData.top_products_today
                .map((p, idx) => `
                    <li style="padding: 0.75rem; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${idx + 1}. ${p.name}</strong><br><small style="color: #6b7280;">${p.quantity} unidades</small></span>
                        <span style="color: #10b981; font-weight: bold;">Bs ${(p.revenue || 0).toFixed(2)}</span>
                    </li>
                `)
                .join('');
        }
    }

    // Actualizar ventas recientes
    if (dashboardData.recent_sales) {
        const transactionsList = document.getElementById('recentTransactions');
        if (transactionsList) {
            transactionsList.innerHTML = dashboardData.recent_sales
                .map(sale => {
                    const date = new Date(sale.created_at);
                    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const paymentIcon = sale.payment_type === 'efectivo' ? '💵' : '📱';
                    
                    return `
                    <div class="transaction-item" style="padding: 1rem; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-weight: bold;">${sale.customer_name}</span><br>
                            <small style="color: #6b7280;">${sale.user_name} - ${timeStr}</small><br>
                            <small style="color: #6b7280;">${paymentIcon} ${sale.payment_type === 'efectivo' ? 'Efectivo' : 'QR/Digital'}</small>
                        </div>
                        <span style="color: #10b981; font-weight: bold; font-size: 1.1rem;">Bs ${(sale.total || 0).toFixed(2)}</span>
                    </div>
                `;
                })
                .join('');
        }
    }

    // Renderizar gráficos si están disponibles
    renderDashboardCharts(dashboardData);

    // Actualizar fecha y hora
    updateDate();
}

// Función para renderizar gráficos del dashboard
function renderDashboardCharts(dashboardData) {
    // Gráfico de ventas por hora
    if (dashboardData.hourly_sales) {
        renderHourlyChart(dashboardData.hourly_sales);
    }
    
    // Gráfico de método de pago
    if (dashboardData.today) {
        renderPaymentChart(dashboardData.today.efectivo || 0, dashboardData.today.qr || 0);
    }
    
    // Gráfico de productos top
    if (dashboardData.top_products_today) {
        renderProductChart(dashboardData.top_products_today);
    }
}

// Función para renderizar gráfico de ventas por hora
function renderHourlyChart(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return;
    
    // Crear tabla de horas
    const tableHtml = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; text-align: left; font-size: 0.9rem;">
                <thead style="border-bottom: 2px solid #e5e7eb; background-color: #f9fafb;">
                    <tr>
                        <th style="padding: 0.75rem; font-weight: 600;">Hora</th>
                        <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Ventas</th>
                        <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Monto (Bs.)</th>
                    </tr>
                </thead>
                <tbody>
                    ${hourlyData.map(h => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 0.75rem;">${String(h.hour || 0).padStart(2, '0')}:00</td>
                            <td style="padding: 0.75rem; text-align: right;">${h.count || 0}</td>
                            <td style="padding: 0.75rem; text-align: right; color: #10b981; font-weight: bold;">Bs. ${(h.total || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    const placeholder = document.querySelector('.chart-placeholder') || document.getElementById('supplyDemandChart')?.parentElement;
    if (placeholder) {
        placeholder.innerHTML = tableHtml;
    }
}

// Función para renderizar gráfico de productos
function renderProductChart(products) {
    if (typeof Chart === 'undefined' || !products || products.length < 2) return;
    
    const ctx = document.getElementById('distributionChart') || document.getElementById('topProductsChart');
    if (!ctx) return;
    
    if (window.productChart) {
        window.productChart.destroy();
    }
    
    try {
        window.productChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: products.slice(0, 8).map(p => (p.name || 'Producto').substring(0, 15)),
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: products.slice(0, 8).map(p => p.quantity || 0),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e40af',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.log('Chart.js no disponible:', error);
    }
}

// Función para renderizar gráfico de método de pago
function renderPaymentChart(cashAmount, qrAmount) {
    const ctx = document.getElementById('paymentChart') || document.getElementById('paymentMethodChart');
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
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        });
    } catch (error) {
        console.log('Chart.js no disponible:', error);
    }
}

// Función para actualizar la fecha y hora
function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    const dateStr = now.toLocaleDateString('es-BO', options);
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = dateStr;
    }

    // Actualizar última actualización
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = `Última actualización: ${now.toLocaleTimeString('es-BO')}`;
    }
}

export { setupEventListeners, startPeriodicChecks, loadDashboardData };