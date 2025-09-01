     // Variables globales
        let currentUser = null;
        let authToken = localStorage.getItem('pos_token');
        const API_BASE = '/api';
        let isAuthenticated = false;
        let authCheckInProgress = false;
        let supplyDemandChart = null;
        let distributionChart = null;

        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎨 Iniciando Dashboard Moderno...');
            
            // Esperar a que sidebar.js se inicialice
            setTimeout(initializeDashboard, 100);
        });

        async function initializeDashboard() {
            try {
                if (!authToken) {
                    redirectToLogin();
                    return;
                }

                if (authCheckInProgress) return;
                authCheckInProgress = true;

                await initializeDashboardContent();
             
                
            } catch (error) {
                console.error('⚠ Error en inicialización:', error);
                cleanupAndRedirect();
            } finally {
                authCheckInProgress = false;
            }
        }


        async function initializeDashboardContent() {

            await loadDashboardData();
            initializeCharts();
            startPeriodicCheck();
            startAutoRefresh();
        }

        async function loadDashboardData() {
            try {
                const [dashboardResponse, salesResponse] = await Promise.allSettled([
                    fetch(`${API_BASE}/reports/dashboard`, {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }),
                    fetch(`${API_BASE}/sales/today`, {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    })
                ]);

                let dashboardData = null;
                let salesData = null;

                if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.ok) {
                    const data = await dashboardResponse.value.json();
                    dashboardData = data.dashboard;
                }

                if (salesResponse.status === 'fulfilled' && salesResponse.value.ok) {
                    const data = await salesResponse.value.json();
                    salesData = data.today_sales || [];
                }

                updateDashboardStats(dashboardData);
                updateTransactionsTable(salesData);

            } catch (error) {
                console.error('Error cargando datos:', error);
                updateDashboardStats(null);
                updateTransactionsTable([]);
            }
        }

        function updateDashboardStats(dashboardData) {
            if (dashboardData) {
                const today = dashboardData.today || {};
                const thisMonth = dashboardData.this_month || {};

                // Actualizar ventas de hoy
                const todayAmountEl = document.getElementById('todayAmount');
                if (todayAmountEl && today.amount !== undefined) {
                    todayAmountEl.innerHTML = `$${today.amount.toFixed(2)} <span style="font-size: 1rem; color: #6b7280;">BOB</span>`;
                }

                // Actualizar ventas del mes
                const monthAmountEl = document.getElementById('monthAmount');
                if (monthAmountEl && thisMonth.amount !== undefined) {
                    monthAmountEl.textContent = `$${thisMonth.amount.toFixed(2)}`;
                }

                // Actualizar productos activos
                const productsCountEl = document.getElementById('productsCount');
                if (productsCountEl && dashboardData.total_products !== undefined) {
                    productsCountEl.textContent = dashboardData.total_products;
                }
            }
        }

        function updateTransactionsTable(salesData) {
            const tableBody = document.getElementById('transactionsTable');
            
            if (!salesData || salesData.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:2rem;color:#6b7280">
                            No hay ventas registradas hoy
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = salesData.slice(0, 10).map(sale => {
                const date = new Date(sale.created_at);
                const dateStr = date.toLocaleDateString('es-ES');
                
                return `
                    <tr>
                        <td>${sale.customer_name || 'SIN NOMBRE'}</td>
                        <td>${dateStr}</td>
                        <td class="transaction-amount">$${sale.total.toFixed(2)}</td>
                        <td>
                            <span class="transaction-status ${sale.order_type === 'takeaway' ? 'status-completed' : 'status-pending'}">
                                ${sale.order_type === 'takeaway' ? 'Para llevar' : 'Mesa'}
                            </span>
                        </td>
                        <td>${sale.table_number || '-'}</td>
                        <td>#${sale.id}</td>
                        <td>
                            <button style="background: none; border: none; color: #ff7043; cursor: pointer;" 
                                    onclick="viewSaleDetails(${sale.id})" title="Ver detalles">
                                👁️
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function viewSaleDetails(saleId) {
            alert(`Ver detalles de la venta #${saleId}\n(Función próximamente)`);
        }

        function initializeCharts() {
            // Chart 1: Ventas mensuales
            const ctx1 = document.getElementById('supplyDemandChart');
            if (ctx1) {
                supplyDemandChart = new Chart(ctx1.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                        datasets: [{
                            label: 'Ventas ($)',
                            data: [1250, 1890, 2340, 1980, 2100, 2450, 2180, 2890, 2340, 2100, 2650, 2890],
                            backgroundColor: '#ff8a65',
                            borderRadius: 8,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false } 
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { 
                                    color: '#f3f4f6', 
                                    borderDash: [2, 2] 
                                },
                                ticks: {
                                    color: '#6b7280',
                                    font: { size: 12 },
                                    callback: function(value) { 
                                        return '$' + value; 
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { 
                                    color: '#6b7280', 
                                    font: { size: 12 } 
                                }
                            }
                        },
                        elements: { 
                            bar: { borderWidth: 0 } 
                        }
                    }
                });
            }

            // Chart 2: Productos por categoría
            const ctx2 = document.getElementById('distributionChart');
            if (ctx2) {
                distributionChart = new Chart(ctx2.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Comidas', 'Bebidas', 'Postres'],
                        datasets: [{
                            data: [45, 35, 20],
                            backgroundColor: ['#ff8a65', '#64b5f6', '#81c784'],
                            borderWidth: 0,
                            cutout: '70%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    font: { size: 12 },
                                    color: '#6b7280'
                                }
                            }
                        }
                    }
                });
            }
        }

        function startPeriodicCheck() {
            setInterval(async () => {
                if (!isAuthenticated || authCheckInProgress) return;
                
                try {
                    const isValid = await verifyToken();
                    if (!isValid) {
                        cleanupAndRedirect();
                    }
                } catch (error) {
                    console.error('Error en verificación periódica:', error);
                }
            }, 10 * 60 * 1000); // Cada 10 minutos
        }

        function startAutoRefresh() {
            // Auto-refresh de datos cada 2 minutos
            setInterval(() => {
                if (isAuthenticated && !authCheckInProgress) {
                    const currentPage = document.getElementById('currentPage').textContent;
                    if (currentPage === 'Dashboard') {
                        loadDashboardData().catch(console.error);
                    }
                }
            }, 120000); // 2 minutos
        }

        function cleanupAndRedirect() {
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            currentUser = null;
            authToken = null;
            isAuthenticated = false;
            redirectToLogin();
        }

        function redirectToLogin() {
            window.location.href = '/login';
        }

        // Funciones de compatibilidad con sidebar.js
        function logout() {
            if (confirm('¿Está seguro que desea cerrar sesión?')) {
                cleanupAndRedirect();
            }
        }

        // Alias para compatibilidad
        window.appLogout = logout;

        // Navegación (para compatibilidad con el código original)
        function navigateTo(section, title, icon) {
            if (!isAuthenticated) {
                cleanupAndRedirect();
                return;
            }

            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const routes = {
                'dashboard': '/dashboard',
                'pos': '/pos',
                'products': '/products',
                'categories': '/categories',
                'reports': '/reports',
                'create-user': '/create-user',
                'my-sales': '/dashboard'
            };
            
            if (routes[section] && routes[section] !== '/dashboard') {
                window.location.href = routes[section];
            }
        }

        // Resize de charts cuando cambia el sidebar
      // Función mejorada para resize de charts
function resizeChartsOnSidebarToggle() {
    // Esperar a que termine la animación del sidebar (300ms)
    setTimeout(() => {
        try {
            // Forzar recálculo del layout
            const chartsContainer = document.querySelector('.widgets-grid');
            if (chartsContainer) {
                chartsContainer.style.display = 'none';
                chartsContainer.offsetHeight; // Trigger reflow
                chartsContainer.style.display = 'grid';
            }
            
            // Resize de los charts con nuevas dimensiones
            if (supplyDemandChart) {
                supplyDemandChart.resize();
                supplyDemandChart.update('none'); // Update sin animación
            }
            
            if (distributionChart) {
                distributionChart.resize();
                distributionChart.update('none');
            }
            
            console.log('Charts redimensionados correctamente');
            
        } catch (error) {
            console.warn('Error redimensionando charts:', error);
        }
    }, 350); // 50ms extra después de la animación
}

        // Escuchar eventos de resize
        window.addEventListener('resize', function() {
            resizeChartsOnSidebarToggle();
        });

        // Escuchar clicks en el toggle del sidebar
        document.addEventListener('click', function(e) {
            if (e.target.closest('.sidebar-toggle') || e.target.closest('.mobile-menu-btn')) {
                resizeChartsOnSidebarToggle();
            }
        });

        console.log('✨ Dashboard Moderno inicializado correctamente');