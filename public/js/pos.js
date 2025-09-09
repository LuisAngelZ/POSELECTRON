// ===== VARIABLES GLOBALES =====
let cart = [];
let products = [];
let categories = [];
let currentUser = null;
const API_BASE = '/api';
let authToken = localStorage.getItem('pos_token');

// ===== NUEVAS VARIABLES PARA SESIONES =====
let currentUserSession = null;
let nextTicketNumber = 1;
let lastUser = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initPOS, 100);
});

async function initPOS() {
  try {
    await checkPrinterStatus();
    await Promise.all([
        loadCategories(), 
        loadProducts(), 
        updateUserSession() // ⬅️ NUEVA LÍNEA
    ]);
    setupPOSEventListeners();
    
    // Actualizar sesión cada 30 segundos
    setInterval(updateUserSession, 30000);
    
  } catch (e) {
    console.error('Error inicializando POS:', e);
    alert('Error inicializando POS');
  }
}

// ===== NUEVAS FUNCIONES PARA MANEJO DE SESIONES =====

// Función para obtener información de sesión del usuario actual
async function updateUserSession() {
    try {
        const response = await fetch(`${API_BASE}/sales/ticket-session-info`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUserSession = data.session_info;
            nextTicketNumber = currentUserSession.next_ticket_number;
            
            // Verificar si cambió el usuario
            const currentUser = getCurrentUser();
            if (lastUser && lastUser.id !== currentUser.id) {
                console.log(`👤 Cambio de usuario detectado en frontend: ${lastUser.username} → ${currentUser.username}`);
                showUserChangeNotification(lastUser, currentUser);
            }
            lastUser = currentUser;
            
            // Actualizar display del ticket
            updateTicketNumberDisplay();
            
            console.log(`📋 Sesión actualizada - Usuario: ${currentUser.username}, Próximo ticket: #${nextTicketNumber}`);
            
        }
    } catch (error) {
        console.warn('No se pudo obtener información de sesión:', error);
    }
}

// Función para mostrar notificación de cambio de usuario
function showUserChangeNotification(previousUser, currentUser) {
    const notification = `🔄 CAMBIO DE USUARIO DETECTADO

Usuario anterior: ${previousUser.username}
Usuario actual: ${currentUser.username}

La numeración de tickets se ha reiniciado.
Próximo ticket: #${nextTicketNumber}`;

    alert(notification);
    
    // Efecto visual en la interfaz
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
        topBar.style.background = 'linear-gradient(135deg, #6f42c1, #6610f2)';
        topBar.style.color = 'white';
        topBar.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            topBar.style.background = 'white';
            topBar.style.color = '#1a1d29';
        }, 3000);
    }
}

// Función actualizada para mostrar número de ticket
function updateTicketNumberDisplay() {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        // Remover número anterior
        const existingNumber = breadcrumb.querySelector('.ticket-number');
        if (existingNumber) {
            existingNumber.remove();
        }
        
        // Agregar nuevo número con información de sesión
        const ticketSpan = document.createElement('span');
        ticketSpan.className = 'ticket-number';
        ticketSpan.style.cssText = `
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-left: 10px;
            font-weight: bold;
            cursor: pointer;
        `;
        
        const currentUser = getCurrentUser();
        ticketSpan.textContent = `${currentUser.username} - Ticket #${nextTicketNumber}`;
        ticketSpan.title = 'Click para ver detalles de sesión';
        
        // Agregar evento click para mostrar detalles
        ticketSpan.addEventListener('click', showSessionDetails);
        
        breadcrumb.appendChild(ticketSpan);
    }
}

// Función para mostrar detalles de la sesión
function showSessionDetails() {
    if (!currentUserSession) {
        alert('No hay información de sesión disponible');
        return;
    }
    
    const currentUser = getCurrentUser();
    const sessionInfo = currentUserSession.session || {};
    
    const details = `📊 DETALLES DE SESIÓN DE TICKETS

👤 Usuario: ${currentUser.full_name} (${currentUser.username})
📅 Fecha: ${new Date().toLocaleDateString('es-ES')}
🎫 Próximo ticket: #${nextTicketNumber}

📈 ESTADÍSTICAS DE LA SESIÓN:
• Tickets generados: ${sessionInfo.last_ticket_number || 0}
• Ventas realizadas: ${sessionInfo.total_sales_in_session || 0}
• Monto acumulado: Bs ${parseInt(sessionInfo.total_amount_in_session || 0)}

ℹ️ La numeración se resetea cada día o al cambiar de usuario.`;

    alert(details);
}

// Función para cerrar sesión de tickets manualmente
async function closeTicketSession() {
    try {
        const response = await fetch(`${API_BASE}/sales/close-ticket-session`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            console.log('✅ Sesión de tickets cerrada manualmente');
            await updateUserSession(); // Actualizar estado
            return true;
        }
    } catch (error) {
        console.error('Error cerrando sesión de tickets:', error);
        return false;
    }
}

// ===== CATEGORÍAS =====
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    categories = data.categories || [];
    renderCategories();
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

// ===== ORDEN DE PRIORIDAD DE CATEGORÍAS =====
const categoryOrder = {
  'PLATOS Y PORCIONES': 1,
  'GASEOSAS': 2,
  'REFRESCOS NATURALES': 3,
  'EXTRAS': 4,
};

function renderCategories() {
  const nav = document.getElementById('categoriesNav');
  nav.innerHTML = '<button class="tab-btn active" data-category="all">Todos</button>';
  
  // Ordenar categorías por prioridad antes de renderizar
  const sortedCategories = categories.sort((a, b) => {
    const orderA = categoryOrder[a.name.toUpperCase()] || 999;
    const orderB = categoryOrder[b.name.toUpperCase()] || 999;
    return orderA - orderB;
  });
  
  sortedCategories.forEach((category) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.category = category.id;
    btn.textContent = category.name;
    nav.appendChild(btn);
  });
}

// ===== PRODUCTOS =====
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div style="text-align:center;color:#666;padding:1.6rem">Cargando productos...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    products = data.products || [];
    renderProducts();
  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.innerHTML = `
      <div style="text-align:center;color:red;padding:1.6rem">
        <div>Error cargando productos</div>
        <div style="font-size:0.8rem;margin-top:0.5rem">${error.message}</div>
        <button onclick="loadProducts()" style="margin-top:0.5rem;padding:0.5rem 1rem;border:1px solid #ccc;border-radius:4px;background:white;cursor:pointer;">Reintentar</button>
      </div>
    `;
  }
}

function renderProducts(list = products) {
  const grid = document.getElementById('productsGrid');
  
  if (!list.length) {
    grid.innerHTML = '<div style="text-align:center;color:#666;padding:1.6rem">No se encontraron productos</div>';
    return;
  }

  // Si la lista es todos los productos (pestaña "Todos"), ordenar por prioridad de categoría
  let sortedList = list;
  if (list === products) { // Detectar si es la pestaña "Todos"
    sortedList = [...products].sort((a, b) => {
      // Encontrar las categorías de cada producto
      const categoryA = categories.find(c => c.id === a.category_id);
      const categoryB = categories.find(c => c.id === b.category_id);
      
      // Obtener el orden de prioridad
      const orderA = categoryOrder[categoryA?.name.toUpperCase()] || 999;
      const orderB = categoryOrder[categoryB?.name.toUpperCase()] || 999;
      
      // Ordenar primero por categoría, luego por nombre de producto
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
  }

  grid.innerHTML = sortedList.map(product => `
    <div class="product-card" onclick="addToCart(${product.id})" data-category="${product.category_id}">
      <div class="product-image">
        ${product.image_url ? 
          `<img src="${product.image_url}" alt="${product.name}" 
               style="width:100%;height:100%;object-fit:cover;border-radius:12px;" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:2rem;color:#ff7043;">🍽️</div>` :
          `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#ff7043;">🍽️</div>`
        }
      </div>
      <div class="product-name">${product.name}</div>
      <div class="product-price">Bs ${parseInt(product.price)}</div>
    </div>
  `).join('');
}

// ===== CARRITO =====
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.product_id === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      product_id: productId,
      product_name: product.name,
      unit_price: product.price,
      quantity: 1
    });
  }

  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('salesTableBody');
  
  if (!cart.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.2rem;color:#666">No hay productos en el carrito</td></tr>';
    updateTotals();
    return;
  }

  tbody.innerHTML = cart.map((item, index) => `
    <tr>
      <td>
        <button class="btn btn-secondary" onclick="removeFromCart(${index})" 
                style="padding:.3rem .5rem">✕</button>
      </td>
      <td style="text-align:left">${item.product_name}</td>
      <td>Bs ${parseInt(item.unit_price)}</td>
      <td>
        <input type="number" min="1" value="${item.quantity}" 
               class="payment-input" style="max-width:70px" 
               onchange="updateQuantity(${index}, this.value)">
      </td>
      <td><strong>Bs ${parseInt(item.unit_price * item.quantity)}</strong></td>
    </tr>
  `).join('');

  updateTotals();
}

function updateQuantity(index, value) {
  const quantity = Math.max(1, parseInt(value));
  cart[index].quantity = quantity;
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
  clearSale();
}

// ===== TOTALES Y PAGO - MEJORADO =====
function updateTotals() {
  const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  
  // Actualizar el total en la columna correspondiente
  const totalDisplay = document.getElementById('totalDisplay');
  if (totalDisplay) {
    totalDisplay.textContent = `Bs ${parseInt(total)}`;
  }
  
  updatePaymentDisplay();
}

function updatePaymentDisplay() {
  const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
  const change = paid - total;
  
  // Actualizar cobrado
  const chargedAmount = document.getElementById('chargedAmount');
  if (chargedAmount) {
    chargedAmount.textContent = parseInt(paid);
  }
  
  // Actualizar cambio
  const changeAmount = document.getElementById('changeAmount');
  if (changeAmount) {
    if (paid > 0 && paid >= total) {
      changeAmount.textContent = parseInt(change);
      changeAmount.style.color = '#28a745';
    } else if (paid > 0 && paid < total) {
      changeAmount.textContent = `-${parseInt(Math.abs(change))}`;
      changeAmount.style.color = '#dc3545';
    } else {
      changeAmount.textContent = '0';
      changeAmount.style.color = '#1a1d29';
    }
  }
  
  // Habilitar/deshabilitar botón
  const processBtn = document.getElementById('processBtn');
  if (processBtn) {
    processBtn.disabled = !(paid >= total && cart.length > 0 && total > 0);
  }
}

function autoCompletePay() {
  const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  if (total > 0) {
    document.getElementById('paidAmount').value = Math.ceil(total);
    updatePaymentDisplay();
  }
}

// ===== FUNCIÓN ACTUALIZADA PARA CIERRE DE CAJA (F3) =====
async function printDailyCashClose() {
    try {
        // Mostrar indicador visual
        const topBar = document.querySelector('.top-bar');
        if (topBar) {
            topBar.style.background = 'linear-gradient(135deg, #17a2b8, #138496)';
            topBar.style.color = 'white';
            topBar.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                topBar.style.background = 'white';
                topBar.style.color = '#1a1d29';
            }, 2500);
        }

        // Obtener resumen de tickets del día
        const today = new Date().toISOString().split('T')[0];
        
        console.log('📊 Generando reporte de cierre con información de tickets...');
        
        showLoadingIndicator('Generando reporte de cierre...');
        
        // Obtener tanto el reporte diario como el resumen de tickets
        const [reportResponse, ticketResponse] = await Promise.all([
            fetch(`${API_BASE}/reports/daily?date=${today}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE}/sales/daily-ticket-summary?date=${today}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        hideLoadingIndicator();

        if (!reportResponse.ok || !ticketResponse.ok) {
            throw new Error('Error obteniendo datos del reporte');
        }

        const reportData = await reportResponse.json();
        const ticketData = await ticketResponse.json();
        
        if (!reportData.success || !ticketData.success) {
            throw new Error('Error en los datos del reporte');
        }

        // Mostrar resumen de consistencia
        const ticketSummary = ticketData.summary;
        const consistency = ticketSummary.consistency_check;
        
        let consistencyMessage = '';
        if (consistency.tickets_vs_sales && consistency.amounts_match) {
            consistencyMessage = '✅ Los datos están CONSISTENTES';
        } else {
            consistencyMessage = '⚠️ Se detectaron inconsistencias en los datos';
        }

        const shouldPrint = confirm(`${consistencyMessage}

📊 RESUMEN DEL DÍA:
• Ventas totales: ${reportData.report.summary.total_sales}
• Monto total: Bs ${parseInt(reportData.report.summary.total_amount)}
• Último ticket: #${ticketSummary.session_totals.max_ticket_number}

¿Desea imprimir el reporte de cierre?`);
        
        if (!shouldPrint) {
            console.log('❌ Usuario canceló la impresión del cierre de caja');
            return;
        }

        // Combinar datos para impresión
        const printData = {
            type: 'daily_close',
            date: today,
            user: getCurrentUser(),
            user_name: getCurrentUser()?.full_name || 'Sistema',
            summary: reportData.report.summary,
            ticket_summary: ticketSummary,
            sales_by_user: reportData.report.sales_by_user || [],
            top_products: reportData.report.top_products || [],
            consistency_check: consistency
        };

        // Enviar a imprimir
        showLoadingIndicator('Enviando a impresora...');
        await printDailyReport(printData);
        hideLoadingIndicator();

    } catch (error) {
        hideLoadingIndicator();
        console.error('❌ Error en cierre de caja:', error);
        
        alert(`❌ Error generando reporte de cierre:

${error.message}

Verifica:
• Conexión de la impresora
• Estado del servidor
• Permisos de usuario`);
    }
}

// ===== FUNCIÓN PARA IMPRIMIR REPORTE DIARIO =====
async function printDailyReport(reportData) {
    try {
        console.log('🖨️ Enviando reporte diario a impresora...', reportData.date);

        const response = await fetch(`${API_BASE}/printer/daily-report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ report_data: reportData })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error enviando a impresora');
        }

        console.log('✅ Reporte enviado a impresora correctamente');
        
        return {
            success: true,
            message: 'Reporte de cierre impreso correctamente'
        };

    } catch (error) {
        console.error('❌ Error imprimiendo reporte:', error);
        
        // Si falla la impresión, mostrar el reporte en pantalla
        showReportPreview(reportData);
        
        throw new Error(`Error de impresión: ${error.message}`);
    }
}

// ===== FUNCIÓN PARA MOSTRAR VISTA PREVIA DEL REPORTE =====
function showReportPreview(reportData) {
    const summary = reportData.summary || {};
    const topProducts = reportData.top_products || [];
    const salesByUser = reportData.sales_by_user || [];
    
    let productsList = '';
    if (topProducts.length > 0) {
        productsList = topProducts.slice(0, 5).map((product, index) => 
            `${index + 1}. ${product.product_name || product.name} - ${product.total_quantity || product.quantity} vendidos`
        ).join('\n');
    } else {
        productsList = 'No hay productos vendidos';
    }

    let usersList = '';
    if (salesByUser.length > 0) {
        usersList = salesByUser.map((user, index) => 
            `${index + 1}. ${user.user_name || user.full_name} - ${user.total_sales || user.count} ventas`
        ).join('\n');
    } else {
        usersList = 'Un solo usuario';
    }
    
    const previewContent = `╔═══ VISTA PREVIA DEL REPORTE ═══

📅 FECHA: ${reportData.date}
👤 USUARIO: ${reportData.user?.full_name || reportData.user_name || 'Sistema'}

📊 RESUMEN DEL DÍA:
• Total de ventas: ${reportData.total_sales || summary.total_sales || 0}
• Monto total: Bs ${parseInt(reportData.total_amount || summary.total_amount || 0)}
• Venta promedio: Bs ${parseInt(reportData.average_sale || summary.average_sale || 0)}

🏆 TOP PRODUCTOS:
${productsList}

👥 VENTAS POR USUARIO:
${usersList}

╚════════════════════════════════════════════════════════════`;
    
    alert(previewContent);
}

// ===== FUNCIÓN PARA OBTENER USUARIO ACTUAL =====
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('pos_user');
        if (userData) {
            return JSON.parse(userData);
        }
        
        // Si no hay usuario en localStorage, intentar extraer del token
        const token = localStorage.getItem('pos_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    id: payload.id,
                    username: payload.username,
                    full_name: payload.full_name || payload.username,
                    role: payload.role
                };
            } catch (e) {
                console.warn('Error extrayendo usuario del token');
            }
        }
        
        return {
            id: 1,
            username: 'sistema',
            full_name: 'Sistema POS',
            role: 'admin'
        };
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return {
            id: 1,
            username: 'sistema',
            full_name: 'Sistema POS',
            role: 'admin'
        };
    }
}

// ===== FUNCIONES DE UI AUXILIARES =====
function showLoadingIndicator(message = 'Procesando...') {
    // Eliminar indicador existente si existe
    hideLoadingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 1.2rem;
        font-weight: bold;
    `;
    
    indicator.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="margin-bottom: 1rem;">⏳</div>
            <div>${message}</div>
            <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                Presiona ESC para cancelar
            </div>
        </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Permitir cancelar con ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            hideLoadingIndicator();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showErrorMessage(message) {
    alert(`❌ ${message}`);
}

// ===== EVENT LISTENERS ACTUALIZADOS =====
function setupPOSEventListeners() {
    const paidInput = document.getElementById('paidAmount');
    if (paidInput) {
        paidInput.addEventListener('input', updatePaymentDisplay);
    }

    // Evento click para tabs de categorías
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const category = e.target.dataset.category;
            if (category === 'all') {
                renderProducts(products); // Esto activará el ordenamiento automático
            } else {
                // Filtrar productos por categoría específica
                const filteredProducts = products.filter(p => p.category_id == category);
                renderProducts(filteredProducts);
            }
        }
    });

    // ===== EVENTOS DE TECLADO ACTUALIZADOS =====
    document.addEventListener('keydown', (e) => {
        // F3 - CIERRE DE CAJA
        if (e.key === 'F3') {
            e.preventDefault();
            console.log('🔒 F3 presionado - Iniciando cierre de caja');
            
            // Efecto visual inmediato
            const topBar = document.querySelector('.top-bar');
            if (topBar) {
                topBar.style.background = 'linear-gradient(135deg, #17a2b8, #138496)';
                topBar.style.color = 'white';
            }
            
            printDailyCashClose();
        }
        
        // F8 - VENTA RÁPIDA
        if (e.key === 'F8') {
            e.preventDefault();
            
            const topBar = document.querySelector('.top-bar');
            if (topBar) {
                topBar.style.background = 'linear-gradient(135deg,#28a745,#20c997)';
                topBar.style.color = 'white';
                setTimeout(() => {
                    topBar.style.background = 'white';
                    topBar.style.color = '#1a1d29';
                }, 1500);
            }
            
            ventaRapidaF8();
        }

        // ESC - LIMPIAR CARRITO
        if (e.key === 'Escape') {
            e.preventDefault();
            if (confirm('¿Limpiar carrito actual?')) {
                clearCart();
            }
        }

        // CTRL+L - LIMPIAR CARRITO
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            clearCart();
        }

        // CTRL+P - AUTO COMPLETAR PAGO
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            autoCompletePay();
        }
    });
}

// ===== PROCESAMIENTO DE VENTAS ACTUALIZADO =====
async function processSale() {
    if (!cart.length) {
        alert('El carrito está vacío');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const paid = parseFloat(document.getElementById('paidAmount').value) || 0;

    // Validación mejorada
    if (paid === 0) {
        const confirm = window.confirm('No ingresó monto. ¿Venta sin pago registrado?');
        if (!confirm) return;
    } else if (paid < total) {
        alert(`Falta: Bs ${Math.round(total - paid)}`);
        return;
    }

    const saleData = {
        customer_nit: document.getElementById('customerNit').value || '1234',
        customer_name: document.getElementById('customerName').value || 'SIN NOMBRE',
        order_type: document.getElementById('orderType').value,
        payment_type: document.getElementById('paymentType').value,
        observations: document.getElementById('observations').value || '',
        total: total,
        paid_amount: paid,
        change_amount: paid - total,
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity
        }))
    };

    try {
        const response = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            clearCart();
            await printSaleTicketAuto(result.sale);
            
            // Actualizar sesión para la próxima venta
            await updateUserSession();
            
        } else {
            throw new Error(result.message || 'Error procesando venta');
        }

    } catch (error) {
        console.error('Error procesando venta:', error);
        alert(`Error procesando venta: ${error.message}`);
    }
}

async function ventaRapidaF8() {
    if (!cart.length) {
        alert('Carrito vacío');
        return;
    }

    const paidInput = document.getElementById('paidAmount');
    if (!paidInput.value) {
        const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        paidInput.value = Math.ceil(total);
        updatePaymentDisplay();
    }

    await processSale();
}

// ===== UTILIDADES =====
function clearSale() {
    const customerNit = document.getElementById('customerNit');
    const customerName = document.getElementById('customerName');
    const orderType = document.getElementById('orderType');
    const paymentType = document.getElementById('paymentType');
    const observations = document.getElementById('observations');
    const paidAmount = document.getElementById('paidAmount');
    
    if (customerNit) customerNit.value = '1234';
    if (customerName) customerName.value = 'SIN NOMBRE';
    if (orderType) orderType.value = 'dine_in';
    if (paymentType) paymentType.value = 'efectivo';
    if (observations) observations.value = '';
    if (paidAmount) paidAmount.value = '';
    
    // Limpiar también los valores de cobrado y cambio
    const chargedAmount = document.getElementById('chargedAmount');
    const changeAmount = document.getElementById('changeAmount');
    
    if (chargedAmount) chargedAmount.textContent = '0';
    if (changeAmount) changeAmount.textContent = '0';
}

async function checkPrinterStatus() {
    try {
        const response = await fetch(`${API_BASE}/printer/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        await response.json();
    } catch (error) {
        // Ignorar errores de impresora
    }
}

async function printSaleTicketAuto(sale) {
    try {
        const response = await fetch(`${API_BASE}/printer/print-sale`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sale_data: sale })
        });

        const result = await response.json();
        // No mostrar errores de impresión para no interrumpir flujo
    } catch (error) {
        // Ignorar errores de impresión
    }
}

// ===== FUNCIÓN ACTUALIZADA DE LOGOUT =====
function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        // Cerrar sesión de tickets antes del logout
        closeTicketSession().finally(() => {
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            location.href = '/login';
        });
    }
}

window.appLogout = logout;