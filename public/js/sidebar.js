// public/js/sidebar.js - Componente de menú lateral unificado
class UniversalSidebar {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('pos_token');
        this.currentPage = this.getCurrentPageFromURL();
        this.sidebarVisible = true;
        
        this.init();
    }

    getCurrentPageFromURL() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('pos')) return 'pos';
        if (path.includes('products')) return 'products';
        if (path.includes('categories')) return 'categories';
        if (path.includes('reports')) return 'reports';
        return 'dashboard';
    }

    async init() {
        if (!this.authToken) {
            this.redirectToLogin();
            return;
        }

        try {
            await this.verifyToken();
            this.injectSidebarHTML();
            this.setupEventListeners();
            this.updateActiveMenuItem();
        } catch (error) {
            console.error('Error inicializando sidebar:', error);
            this.redirectToLogin();
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify-token', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Token inválido');

            const data = await response.json();
            this.currentUser = data.user;
        } catch (error) {
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            throw error;
        }
    }

    injectSidebarHTML() {
        // Crear el contenedor del sidebar si no existe
        let sidebarContainer = document.getElementById('universal-sidebar');
        
        if (!sidebarContainer) {
            sidebarContainer = document.createElement('div');
            sidebarContainer.id = 'universal-sidebar';
            document.body.appendChild(sidebarContainer);
        }

        sidebarContainer.innerHTML = this.getSidebarHTML();
        
        // Agregar estilos
        this.injectStyles();
        
        // Ajustar el contenido principal
        this.adjustMainContent();
    }

    getSidebarHTML() {
        const menuItems = this.getMenuItems();
        
        return `
            <nav class="universal-sidebar ${this.sidebarVisible ? '' : 'collapsed'}">
                <!-- Header del Sidebar -->
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <div class="logo-icon">🏪</div>
                        <div class="brand-text">
                            <h2>Sistema POS</h2>
                            <p>Punto de Venta</p>
                        </div>
                    </div>
                    
                    <button class="sidebar-toggle-btn" onclick="universalSidebar.toggleSidebar()">
                        <span class="toggle-icon">←</span>
                    </button>
                </div>

                <!-- Información del Usuario -->
                <div class="user-info">
                    <div class="user-avatar">
                        ${this.currentUser?.role === 'admin' ? '👑' : '👨‍💼'}
                    </div>
                    <div class="user-details">
                        <h4>${this.currentUser?.full_name || 'Usuario'}</h4>
                        <span class="user-role">${this.currentUser?.role?.toUpperCase() || 'USER'}</span>
                    </div>
                </div>

                <!-- Navegación -->
                <div class="sidebar-nav">
                    ${menuItems.map(section => `
                        <div class="nav-section">
                            <div class="nav-section-title">${section.title}</div>
                            ${section.items.map(item => `
                                <a href="${item.href}" class="nav-item ${item.id === this.currentPage ? 'active' : ''}" data-page="${item.id}">
                                    <span class="nav-item-icon">${item.icon}</span>
                                    <span class="nav-item-text">${item.text}</span>
                                    ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                                </a>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>

                <!-- Footer del Sidebar -->
                <div class="sidebar-footer">
                    <button class="logout-btn" onclick="universalSidebar.logout()">
                        <span class="logout-icon">🚪</span>
                        <span class="logout-text">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            <!-- Overlay para móvil -->
            <div class="sidebar-overlay" onclick="universalSidebar.closeSidebar()"></div>
        `;
    }

    getMenuItems() {
        const isAdmin = this.currentUser?.role === 'admin';
        
        const sections = [
            {
                title: 'PRINCIPAL',
                items: [
                    {
                        id: 'dashboard',
                        icon: '📊',
                        text: 'Dashboard',
                        href: '/dashboard'
                    },
                    {
                        id: 'pos',
                        icon: '🛒',
                        text: 'Punto de Venta',
                        href: '/pos'
                    }
                ]
            }
        ];

        if (isAdmin) {
            sections.push({
                title: 'INVENTARIO',
                items: [
                    {
                        id: 'products',
                        icon: '📦',
                        text: 'Productos',
                        href: '/products'
                    },
                    {
                        id: 'categories',
                        icon: '🏷️',
                        text: 'Categorías',
                        href: '/categories'
                    }
                ]
            });

            sections.push({
                title: 'REPORTES',
                items: [
                    {
                        id: 'reports',
                        icon: '📈',
                        text: 'Reportes',
                        href: '/reports'
                    }
                ]
            });
        } else {
            // Menú para cajeros
            sections.push({
                title: 'MIS VENTAS',
                items: [
                    {
                        id: 'reports',
                        icon: '📋',
                        text: 'Mis Ventas',
                        href: '/reports'
                    }
                ]
            });
        }

        return sections;
    }

    injectStyles() {
        if (document.getElementById('universal-sidebar-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'universal-sidebar-styles';
        styles.textContent = `
            .universal-sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 280px;
                height: 100vh;
                background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                border-right: 1px solid #e2e8f0;
                box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(20px);
            }

            .universal-sidebar.collapsed {
                transform: translateX(-280px);
            }

            .sidebar-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .sidebar-logo {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .logo-icon {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
            }

            .brand-text h2 {
                font-size: 1.1rem;
                font-weight: 700;
                margin-bottom: 0.25rem;
            }

            .brand-text p {
                font-size: 0.75rem;
                opacity: 0.8;
            }

            .sidebar-toggle-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .sidebar-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }

            .user-info {
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
            }

            .user-avatar {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                color: white;
            }

            .user-details h4 {
                font-size: 0.9rem;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 0.25rem;
            }

            .user-role {
                font-size: 0.7rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 0.2rem 0.6rem;
                border-radius: 12px;
                font-weight: 500;
            }

            .sidebar-nav {
                flex: 1;
                overflow-y: auto;
                padding: 1rem 0;
            }

            .nav-section {
                margin-bottom: 1.5rem;
            }

            .nav-section-title {
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #64748b;
                margin-bottom: 0.75rem;
                padding: 0 1.5rem;
            }

            .nav-item {
                display: flex;
                align-items: center;
                padding: 0.75rem 1.5rem;
                color: #475569;
                text-decoration: none;
                transition: all 0.2s ease;
                position: relative;
            }

            .nav-item:hover {
                background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1));
                color: #667eea;
                transform: translateX(4px);
            }

            .nav-item.active {
                background: linear-gradient(90deg, #667eea, rgba(102, 126, 234, 0.1));
                color: white;
                font-weight: 600;
            }

            .nav-item.active::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #667eea;
            }

            .nav-item-icon {
                font-size: 1.2rem;
                width: 24px;
                text-align: center;
                margin-right: 0.75rem;
            }

            .nav-item-text {
                flex: 1;
                font-size: 0.9rem;
            }

            .nav-badge {
                background: #ef4444;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 0.15rem 0.4rem;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }

            .sidebar-footer {
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
            }

            .logout-btn {
                width: 100%;
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #e2e8f0;
                padding: 0.75rem;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                font-weight: 500;
            }

            .logout-btn:hover {
                background: #fef2f2;
                color: #dc2626;
                border-color: #fecaca;
            }

            .sidebar-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            }

            /* Ajustar contenido principal */
            body:not(.sidebar-collapsed) {
                margin-left: 280px;
            }

            body.sidebar-collapsed {
                margin-left: 0;
            }

            /* Responsive */
            @media (max-width: 768px) {
                body {
                    margin-left: 0 !important;
                }

                .universal-sidebar {
                    transform: translateX(-280px);
                }

                .universal-sidebar.mobile-open {
                    transform: translateX(0);
                }

                .sidebar-overlay.show {
                    display: block;
                }

                .sidebar-toggle-btn {
                    display: none;
                }
            }

            /* Scrollbar personalizado */
            .sidebar-nav::-webkit-scrollbar {
                width: 6px;
            }

            .sidebar-nav::-webkit-scrollbar-track {
                background: #f1f5f9;
            }

            .sidebar-nav::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }

            .sidebar-nav::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;

        document.head.appendChild(styles);
    }

    adjustMainContent() {
        document.body.classList.toggle('sidebar-collapsed', !this.sidebarVisible);
        
        // Ajustar márgenes del contenido existente
        const mainContent = document.querySelector('main, .main-content, .container, .main-container');
        if (mainContent && !mainContent.style.marginLeft) {
            mainContent.style.transition = 'margin-left 0.3s ease';
        }
    }

    setupEventListeners() {
        // Manejar clicks en elementos de navegación
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && !navItem.classList.contains('active')) {
                // La navegación se maneja por href, no necesitamos preventDefault
                this.updateActiveMenuItem(navItem.dataset.page);
            }
        });

        // Manejar resize para responsive
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M para toggle sidebar
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.toggleSidebar();
            }

            // Esc para cerrar en móvil
            if (e.key === 'Escape' && window.innerWidth <= 768) {
                this.closeSidebar();
            }
        });
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.querySelector('.universal-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (isMobile) {
            sidebar?.classList.remove('collapsed');
            sidebar?.classList.remove('mobile-open');
            overlay?.classList.remove('show');
        }
    }

    toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.sidebarVisible = !this.sidebarVisible;
            const sidebar = document.querySelector('.universal-sidebar');
            const toggleIcon = document.querySelector('.toggle-icon');
            
            sidebar?.classList.toggle('collapsed', !this.sidebarVisible);
            document.body.classList.toggle('sidebar-collapsed', !this.sidebarVisible);
            
            if (toggleIcon) {
                toggleIcon.textContent = this.sidebarVisible ? '←' : '→';
            }
        }
    }

    toggleMobileSidebar() {
        const sidebar = document.querySelector('.universal-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        const isOpen = sidebar?.classList.contains('mobile-open');
        
        sidebar?.classList.toggle('mobile-open', !isOpen);
        overlay?.classList.toggle('show', !isOpen);
    }

    closeSidebar() {
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.universal-sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            
            sidebar?.classList.remove('mobile-open');
            overlay?.classList.remove('show');
        }
    }

    updateActiveMenuItem(pageId = null) {
        const currentPageId = pageId || this.currentPage;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${currentPageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    logout() {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = '/login';
    }

    // Método público para agregar botón móvil en páginas existentes
    addMobileMenuButton() {
        if (window.innerWidth > 768) return;

        const existingBtn = document.querySelector('.mobile-sidebar-btn');
        if (existingBtn) return;

        const mobileBtn = document.createElement('button');
        mobileBtn.className = 'mobile-sidebar-btn';
        mobileBtn.innerHTML = '☰';
        mobileBtn.style.cssText = `
            position: fixed;
            top: 1rem;
            left: 1rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            font-size: 1.2rem;
            cursor: pointer;
            z-index: 1001;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.2s ease;
        `;

        mobileBtn.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        document.body.appendChild(mobileBtn);
    }
}

// Inicializar sidebar universal
let universalSidebar;

document.addEventListener('DOMContentLoaded', () => {
    universalSidebar = new UniversalSidebar();
    
    // Agregar botón móvil si es necesario
    setTimeout(() => {
        universalSidebar.addMobileMenuButton();
    }, 100);
});

// Hacer disponible globalmente
window.universalSidebar = universalSidebar;