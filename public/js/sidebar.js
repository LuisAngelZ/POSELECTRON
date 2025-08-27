/* ===========================
   SIDEBAR UNIVERSAL V2.0 
   Compatible con todos los HTMLs
   =========================== */

class UniversalSidebar {
  constructor() {
    this.API_BASE = '/api';
    this.tokenKeys = ['pos_token', 'token'];
    this.authToken = this.getToken();
    
    // Usuario desde localStorage para rendering inmediato
    this.currentUser = this.getUserFromStorage();
    
    // Elementos DOM
    this.sidebar = null;
    this.sidebarNav = null;
    this.mainContent = null;
    this.toggleBtn = null;
    this.toggleIcon = null;
    
    // Estado
    this.isInitialized = false;
    this.authVerified = false;
    
    // Rutas del sistema
    this.routes = {
      dashboard: '/dashboard',
      pos: '/pos',
      products: '/products',
      categories: '/categories', 
      reports: '/reports',
      'create-user': '/create-user',
      'my-sales': '/dashboard'
    };

    this.bootstrap();
  }

  /* ============ UTILIDADES ============ */
  getToken() {
    for (const key of this.tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token.length > 10) return token;
    }
    return null;
  }

  setToken(token) {
    if (!token) return;
    localStorage.setItem('pos_token', token);
    localStorage.setItem('token', token);
    this.authToken = token;
  }

  getUserFromStorage() {
    try {
      const userData = localStorage.getItem('pos_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Error parsing user data:', error);
      return null;
    }
  }

  saveUserToStorage(user) {
    try {
      localStorage.setItem('pos_user', JSON.stringify(user));
    } catch (error) {
      console.warn('Error saving user data:', error);
    }
  }

  clearAuth() {
    try {
      this.tokenKeys.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('pos_user');
    } catch (error) {
      console.warn('Error clearing auth:', error);
    }
    this.authToken = null;
    this.currentUser = null;
    this.authVerified = false;
  }

  /* ============ INICIALIZACIÓN ============ */
  async bootstrap() {
    try {
      console.log('🚀 Inicializando Sidebar Universal...');

      // 1. Inicializar elementos DOM
      await this.initializeDOM();

      // 2. Si hay usuario en storage, renderizar inmediatamente
      if (this.currentUser) {
        this.renderUserInfo();
        this.buildNavigationMenu();
        this.setActivePageFromURL();
      }

      // 3. Verificar autenticación en paralelo
      this.verifyAuthAsync();

      // 4. Configurar event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Sidebar inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando sidebar:', error);
      this.handleInitError(error);
    }
  }

  async initializeDOM() {
    // Buscar sidebar existente
    this.sidebar = document.getElementById('sidebar');
    
    // Si no existe, crearlo
    if (!this.sidebar) {
      this.createSidebarHTML();
    }

    // Obtener referencias a elementos
    this.sidebarNav = document.getElementById('sidebarNav');
    this.mainContent = document.querySelector('.main-content') || document.querySelector('main');
    this.toggleBtn = document.querySelector('.sidebar-toggle');
    this.toggleIcon = document.getElementById('toggleIcon');

    // Crear botón móvil si no existe
    this.ensureMobileButton();
  }

  createSidebarHTML() {
    const sidebarHTML = `
      <nav class="sidebar-modern" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="logo-icon">🪟</div>
            <div class="brand-text">
              <h2>Sistema POS</h2>
              <p>Punto de Venta</p>
            </div>
          </div>
          <div class="user-info">
            <div class="user-avatar" id="userAvatar">👤</div>
            <div class="user-details">
              <h4 id="userName">Cargando...</h4>
              <span class="user-role" id="userRole">USUARIO</span>
            </div>
          </div>
        </div>
        <div class="sidebar-nav" id="sidebarNav">
          <div style="text-align: center; padding: 2rem; color: #6b7280;">
            Cargando menú...
          </div>
        </div>
        <div class="sidebar-footer">
          <button type="button" class="logout-btn" id="sidebarLogoutBtn">
            <span>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>
    `;

    // Insertar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    this.sidebar = document.getElementById('sidebar');

    // Ajustar margin del contenido principal si existe
    if (this.mainContent) {
      this.mainContent.style.marginLeft = '280px';
      this.mainContent.style.transition = 'margin-left 0.3s ease';
    }
  }

  /* ============ AUTENTICACIÓN ============ */
  async verifyAuthAsync() {
    try {
      if (!this.authToken) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.API_BASE}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error('Token inválido o usuario no encontrado');
      }

      // Actualizar usuario si cambió
      const userChanged = !this.currentUser || 
        this.currentUser.id !== data.user.id ||
        this.currentUser.role !== data.user.role;

      this.currentUser = data.user;
      this.authVerified = true;
      this.saveUserToStorage(this.currentUser);

      // Re-renderizar si el usuario cambió
      if (userChanged) {
        this.renderUserInfo();
        this.buildNavigationMenu();
        this.setActivePageFromURL();
      }

      console.log('✅ Autenticación verificada:', this.currentUser.full_name);

    } catch (error) {
      console.warn('⚠️ Error verificando autenticación:', error.message);
      
      // Solo redirigir si estamos en una página que requiere auth y no hay usuario previo
      if (!this.currentUser && this.requiresAuth()) {
        this.handleAuthError();
      }
    }
  }

  requiresAuth() {
    const publicPages = ['/login', '/'];
    return !publicPages.includes(window.location.pathname);
  }

  handleAuthError() {
    console.log('🔄 Redirigiendo a login...');
    this.clearAuth();
    window.location.href = '/login';
  }

  handleInitError(error) {
    console.error('Error crítico en sidebar:', error);
    
    // Mostrar mensaje de error si es necesario
    if (this.requiresAuth() && !this.currentUser) {
      this.handleAuthError();
    }
  }

  /* ============ RENDERIZADO ============ */
  renderUserInfo() {
    if (!this.currentUser) return;

    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) {
      userNameEl.textContent = this.currentUser.full_name || 'Usuario';
    }

    if (userRoleEl) {
      userRoleEl.textContent = (this.currentUser.role || 'user').toUpperCase();
    }

    if (userAvatarEl) {
      const isAdmin = (this.currentUser.role || '').toLowerCase() === 'admin';
      userAvatarEl.textContent = isAdmin ? '👨‍💼' : '👨‍💻';
    }
  }

  buildNavigationMenu() {
    if (!this.sidebarNav || !this.currentUser) return;

    const isAdmin = (this.currentUser.role || '').toLowerCase() === 'admin';

    // Definir elementos del menú por rol
    const menuSections = this.getMenuSections(isAdmin);

    // Generar HTML del menú
    const menuHTML = menuSections.map(section => `
      <div class="nav-section">
        <div class="nav-section-title">${section.title}</div>
        ${section.items.map(item => this.createNavItemHTML(item)).join('')}
      </div>
    `).join('');

    this.sidebarNav.innerHTML = menuHTML;
    this.setActivePageFromURL();
  }

  getMenuSections(isAdmin) {
    const baseSections = [
      {
        title: 'Principal',
        items: [
          { key: 'dashboard', icon: '📊', text: 'Dashboard', href: this.routes.dashboard },
          { key: 'pos', icon: '🛒', text: 'Punto de Venta', href: this.routes.pos, badge: '3' }
        ]
      }
    ];

    if (isAdmin) {
      baseSections.push(
        {
          title: 'Inventario',
          items: [
            { key: 'products', icon: '📦', text: 'Productos', href: this.routes.products },
            { key: 'categories', icon: '🏷️', text: 'Categorías', href: this.routes.categories }
          ]
        },
        {
          title: 'Reportes',
          items: [
            { key: 'reports', icon: '📈', text: 'Reportes', href: this.routes.reports }
          ]
        },
        {
          title: 'Administración',
          items: [
            { key: 'create-user', icon: '➕', text: 'Crear Usuario', href: this.routes['create-user'] }
          ]
        }
      );
    } else {
      baseSections.push({
        title: 'Mis Ventas',
        items: [
          { key: 'my-sales', icon: '📋', text: 'Mis Ventas', href: this.routes['my-sales'] }
        ]
      });
    }

    return baseSections;
  }

  createNavItemHTML(item) {
    const badgeHTML = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    
    return `
      <a href="${item.href}" class="nav-item" data-page="${item.key}">
        <span class="nav-item-icon">${item.icon}</span>
        <span class="nav-item-text">${item.text}</span>
        ${badgeHTML}
      </a>
    `;
  }

  /* ============ NAVEGACIÓN ============ */
  setActivePageFromURL() {
    if (!this.sidebar) return;

    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const navItems = this.sidebar.querySelectorAll('.nav-item');
    
    // Remover active de todos
    navItems.forEach(item => item.classList.remove('active'));

    // Encontrar y activar el item actual
    const activeItem = Array.from(navItems).find(item => {
      try {
        const itemPath = new URL(item.href, window.location.origin).pathname.replace(/\/+$/, '');
        return itemPath === currentPath;
      } catch (error) {
        return false;
      }
    });

    if (activeItem) {
      activeItem.classList.add('active');
    }

    // Actualizar breadcrumb si existe
    this.updateBreadcrumb(activeItem);
  }

  updateBreadcrumb(activeItem) {
    const breadcrumbCurrent = document.querySelector('.breadcrumb span:last-child');
    if (breadcrumbCurrent && activeItem) {
      const itemText = activeItem.querySelector('.nav-item-text');
      if (itemText) {
        breadcrumbCurrent.textContent = itemText.textContent;
      }
    }
  }

  /* ============ TOGGLE SIDEBAR ============ */
  toggleSidebar() {
    if (!this.sidebar) return;

    if (window.innerWidth <= 768) {
      // Móvil: toggle class mobile-open
      this.sidebar.classList.toggle('mobile-open');
    } else {
      // Desktop: toggle collapsed
      this.sidebar.classList.toggle('collapsed');
      
      if (this.mainContent) {
        this.mainContent.classList.toggle('expanded');
      }

      // Actualizar icono
      if (this.toggleIcon) {
        this.toggleIcon.textContent = this.sidebar.classList.contains('collapsed') ? '→' : '☰';
      }
    }
  }

  closeSidebar() {
    if (!this.sidebar) return;

    if (window.innerWidth <= 768) {
      this.sidebar.classList.remove('mobile-open');
    } else {
      this.sidebar.classList.add('collapsed');
      if (this.mainContent) this.mainContent.classList.add('expanded');
      if (this.toggleIcon) this.toggleIcon.textContent = '→';
    }
  }

  openSidebar() {
    if (!this.sidebar) return;

    if (window.innerWidth <= 768) {
      this.sidebar.classList.add('mobile-open');
    } else {
      this.sidebar.classList.remove('collapsed');
      if (this.mainContent) this.mainContent.classList.remove('expanded');
      if (this.toggleIcon) this.toggleIcon.textContent = '☰';
    }
  }

  /* ============ EVENT LISTENERS ============ */
  setupEventListeners() {
    // Toggle button
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // Navegación en sidebar
    if (this.sidebar) {
      this.sidebar.addEventListener('click', (e) => {
        const navItem = e.target.closest('a.nav-item');
        if (!navItem) return;

        // Cerrar sidebar en móvil después de click
        if (window.innerWidth <= 768) {
          setTimeout(() => this.closeSidebar(), 100);
        }

        // Marcar como activo temporalmente
        this.sidebar.querySelectorAll('.nav-item').forEach(item => 
          item.classList.remove('active')
        );
        navItem.classList.add('active');
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Click fuera del sidebar (móvil)
    document.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;

      const mobileBtn = document.querySelector('.mobile-menu-btn');
      const isClickInSidebar = this.sidebar && this.sidebar.contains(e.target);
      const isClickToggleBtn = (this.toggleBtn && this.toggleBtn.contains(e.target)) ||
                               (mobileBtn && mobileBtn.contains(e.target));

      if (!isClickInSidebar && !isClickToggleBtn) {
        this.closeSidebar();
      }
    });

    // Resize window
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Page navigation (para SPAs)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.setActivePageFromURL(), 100);
    });
  }

  handleResize() {
    if (!this.sidebar) return;

    if (window.innerWidth <= 768) {
      // Móvil: remover clases de desktop
      this.sidebar.classList.remove('collapsed');
      if (this.mainContent) this.mainContent.classList.remove('expanded');
      if (this.toggleIcon) this.toggleIcon.textContent = '☰';
    } else {
      // Desktop: remover clases móviles
      this.sidebar.classList.remove('mobile-open');
    }
  }

  /* ============ BOTÓN MÓVIL ============ */
  ensureMobileButton() {
    // Solo crear si no existe el toggle principal
    if (this.toggleBtn || document.querySelector('.mobile-menu-btn')) return;

    const topBarLeft = document.querySelector('.top-bar-left') || 
                       document.querySelector('.top-bar');
    
    if (!topBarLeft) return;

    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'mobile-menu-btn';
    mobileBtn.innerHTML = '☰';
    mobileBtn.style.cssText = `
      background: linear-gradient(135deg, #ff8a65, #ff7043);
      border: none;
      color: white;
      border-radius: 8px;
      padding: 0.6rem;
      cursor: pointer;
      margin-right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      transition: all 0.2s ease;
    `;

    mobileBtn.addEventListener('click', () => this.toggleSidebar());
    topBarLeft.insertBefore(mobileBtn, topBarLeft.firstChild);
  }

  /* ============ LOGOUT ============ */
  logout() {
    if (!confirm('¿Está seguro que desea cerrar sesión?')) {
      return;
    }

    console.log('👋 Cerrando sesión...');
    this.clearAuth();
    window.location.href = '/login';
  }

  /* ============ API PÚBLICA ============ */
  refresh() {
    console.log('🔄 Actualizando sidebar...');
    this.verifyAuthAsync();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.authVerified && this.currentUser;
  }

  setActivePage(pageKey) {
    const navItem = this.sidebar?.querySelector(`[data-page="${pageKey}"]`);
    if (navItem) {
      this.sidebar.querySelectorAll('.nav-item').forEach(item => 
        item.classList.remove('active')
      );
      navItem.classList.add('active');
    }
  }
}

/* ============ INICIALIZACIÓN GLOBAL ============ */
let universalSidebar = null;

// Inicializar cuando el DOM esté listo
function initializeSidebar() {
  if (universalSidebar) {
    console.log('⚠️ Sidebar ya inicializado');
    return;
  }

  universalSidebar = new UniversalSidebar();
  
  // Exponer globalmente para compatibilidad
  window.universalSidebar = universalSidebar;
  window.appLogout = () => universalSidebar.logout();
}

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}

// Manejar navegación sin recarga (SPA)
window.addEventListener('pageshow', () => {
  if (universalSidebar) {
    setTimeout(() => universalSidebar.setActivePageFromURL(), 100);
  }
});

// Exponer funciones globales para compatibilidad con HTML existente
window.toggleSidebar = () => universalSidebar?.toggleSidebar();
window.logout = () => universalSidebar?.logout();

console.log('📱 Sidebar Universal v2.0 cargado correctamente');