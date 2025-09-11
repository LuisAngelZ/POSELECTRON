// Variables globales
let products = [];
let categories = [];
let filteredProducts = [];
let filteredCategories = [];
let currentEditingId = null;
let isEditMode = false;

// BASE URL del API
const API_BASE = '/api';

// Token de autenticación
let authToken = localStorage.getItem('pos_token') || 'demo-token';

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupFloatingButtons();
    setupModernAnimations();
    loadData();
    setupSearch();
}

function setupEventListeners() {
    // Formularios de modales
    document.getElementById('modalProductForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('modalCategoryForm').addEventListener('submit', handleCategorySubmit);
    
    // Cerrar modal al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id;
            closeModal(modalId);
        }
    });

    // Escape para cerrar modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal('productModal');
            closeModal('categoryModal');
        }
    });

    // Vista previa de imágenes mejorada
    setupImagePreviews();
}

function setupImagePreviews() {
    // Preview para modal de producto
    const modalImageInput = document.getElementById('modalProductImage');
    if (modalImageInput) {
        modalImageInput.addEventListener('change', function(e) {
            handleImagePreview(e, 'modalPreviewImg');
        });
    }
}

function handleImagePreview(event, previewId) {
    const file = event.target.files[0];
    const preview = document.getElementById(previewId);
    
    if (!preview) return;
    
    if (file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            showNotification('Solo se permiten archivos de imagen', 'error');
            event.target.value = '';
            return;
        }
        
        // Validar tamaño (2MB máximo)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('La imagen debe ser menor a 2MB', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            // Animación suave
            preview.style.opacity = '0';
            preview.style.transform = 'scale(0.8)';
            setTimeout(() => {
                preview.style.transition = 'all 0.3s ease';
                preview.style.opacity = '1';
                preview.style.transform = 'scale(1)';
            }, 100);
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

function setupFloatingButtons() {
    // Crear contenedor de botones flotantes si no existe
    let floatingContainer = document.getElementById('floatingButtons');
    if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.id = 'floatingButtons';
        floatingContainer.className = 'floating-buttons';
        
        // Botón para nuevo producto
        const newProductBtn = document.createElement('button');
        newProductBtn.className = 'floating-btn';
        newProductBtn.innerHTML = '➕ Nuevo Producto';
        newProductBtn.onclick = openCreateProductModal;
        
        // Botón para nueva categoría
        const newCategoryBtn = document.createElement('button');
        newCategoryBtn.className = 'floating-btn category-btn';
        newCategoryBtn.innerHTML = '🏷️ Nueva Categoría';
        newCategoryBtn.onclick = openCreateCategoryModal;
        
        floatingContainer.appendChild(newProductBtn);
        floatingContainer.appendChild(newCategoryBtn);
        document.body.appendChild(floatingContainer);
    }
}

function setupModernAnimations() {
    // Observer para animaciones de entrada
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0.1s';
                entry.target.classList.add('animate-in');
            }
        });
    });
    
    // Observar elementos que necesitan animación
    document.querySelectorAll('.product-card, .category-card').forEach(el => {
        observer.observe(el);
    });
}

async function loadData() {
    try {
        showNotification('Cargando datos...', 'success');
        await Promise.all([loadCategories(), loadProducts()]);
        populateCategorySelects();
        renderProducts();
        renderCategories();
        showNotification('Datos cargados correctamente', 'success');
    } catch (error) {
        console.error('Error cargando datos:', error);
        showNotification('Error cargando datos del servidor', 'error');
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error cargando categorías');
        
        const data = await response.json();
        categories = data.categories || [];
        filteredCategories = [...categories];
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error cargando productos');
        
        const data = await response.json();
        products = data.products || [];
        filteredProducts = [...products];
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function populateCategorySelects() {
    const selects = [
        document.getElementById('modalProductCategory')
    ];
    
    selects.forEach((select) => {
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        categories.forEach(category => {
            select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    });
    
    // Actualizar filtro de categorías
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(category => {
            filterSelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }
}

// Sistema de tabs simplificado (solo productos y categorías)
function switchTab(tabName) {
    // Actualizar botones activos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Encontrar y activar el botón correcto
    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Mostrar contenido correcto
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Renderizar datos si es necesario
    if (tabName === 'categories') {
        renderCategories();
    } else if (tabName === 'products') {
        renderProducts();
    }
}

function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3 class="empty-title">No hay productos</h3>
                <p class="empty-description">
                    ${products.length === 0 ? 
                        'Comienza agregando tu primer producto al inventario usando el botón flotante' : 
                        'No se encontraron productos con los filtros aplicados'
                    }
                </p>
                <button class="btn btn-primary" onclick="openCreateProductModal()">
                    ➕ ${products.length === 0 ? 'Crear Primer Producto' : 'Crear Producto'}
                </button>
            </div>
        `;
        return;
    }

    const productsHTML = filteredProducts.map((product, index) => `
        <div class="product-card" onclick="viewProduct(${product.id})" style="animation-delay: ${index * 0.1}s">
            <div class="product-image">
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="product-image-placeholder" style="display: none;">📦</div>` :
                    `<div class="product-image-placeholder">📦</div>`
                }
            </div>
            
            <div class="product-info">
                <div class="product-header">
                    <div style="flex: 1; min-width: 0;">
                        <h3 class="product-name" title="${product.name}">${product.name}</h3>
                        <span class="product-category">${product.category_name || 'Sin categoría'}</span>
                    </div>
                </div>
                
                <div class="product-price">${parseFloat(product.price).toFixed(2)}</div>
                
                ${product.description ? 
                    `<p class="product-description" title="${product.description}">${product.description}</p>` : 
                    ''
                }
                
                <div class="product-actions">
                    <button class="btn-small btn-warning" onclick="event.stopPropagation(); openEditProductModal(${product.id})" title="Editar producto">
                        ✏️ Editar
                    </button>
                    <button class="btn-small btn-danger" onclick="event.stopPropagation(); confirmDeleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}');" title="Eliminar producto">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="products-grid">${productsHTML}</div>`;
    
    // Aplicar animaciones
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 50);
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    
    if (filteredCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏷️</div>
                <h3 class="empty-title">No hay categorías</h3>
                <p class="empty-description">
                    ${categories.length === 0 ? 
                        'Comienza creando tu primera categoría usando el botón flotante' : 
                        'No se encontraron categorías con los filtros aplicados'
                    }
                </p>
                <button class="btn btn-primary" onclick="openCreateCategoryModal()">
                    ➕ ${categories.length === 0 ? 'Crear Primera Categoría' : 'Crear Categoría'}
                </button>
            </div>
        `;
        return;
    }

    const categoriesHTML = filteredCategories.map((category, index) => {
        const productCount = products.filter(p => p.category_id === category.id).length;
        return `
            <div class="category-card" onclick="viewCategory(${category.id})" style="animation-delay: ${index * 0.1}s">
                <div class="category-header">
                    <div class="category-icon">🏷️</div>
                </div>
                
                <div class="category-info">
                    <h3 class="category-name" title="${category.name}">${category.name}</h3>
                    
                    ${category.description ? 
                        `<p class="category-description" title="${category.description}">${category.description}</p>` : 
                        '<p class="category-description">Sin descripción</p>'
                    }
                    
                    <div class="category-stats">
                        <span><strong>${productCount}</strong> producto${productCount !== 1 ? 's' : ''}</span>
                        <span>ID: ${category.id}</span>
                    </div>
                    
                    <div class="category-actions">
                        <button class="btn-small btn-warning" onclick="event.stopPropagation(); openEditCategoryModal(${category.id})" title="Editar categoría">
                            ✏️ Editar
                        </button>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); confirmDeleteCategory(${category.id}, '${category.name.replace(/'/g, "\\'")}', ${productCount})" title="Eliminar categoría">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="categories-grid">${categoriesHTML}</div>`;
    
    // Aplicar animaciones
    setTimeout(() => {
        document.querySelectorAll('.category-card').forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 50);
}

// Funciones de modal para CREAR
function openCreateProductModal() {
    isEditMode = false;
    currentEditingId = null;
    
    // Limpiar formulario
    document.getElementById('modalProductForm').reset();
    document.getElementById('modalProductId').value = '';
    
    // Actualizar título
    document.getElementById('modalProductTitle').textContent = '✨ Nuevo Producto';
    document.getElementById('modalProductSubmitBtn').innerHTML = '💾 Crear Producto';
    
    // Limpiar preview de imagen
    const preview = document.getElementById('modalPreviewImg');
    if (preview) {
        preview.style.display = 'none';
        preview.src = '';
    }
    
    showModal('productModal');
}

function openCreateCategoryModal() {
    isEditMode = false;
    currentEditingId = null;
    
    // Limpiar formulario
    document.getElementById('modalCategoryForm').reset();
    document.getElementById('modalCategoryId').value = '';
    
    // Actualizar título
    document.getElementById('modalCategoryTitle').textContent = '✨ Nueva Categoría';
    document.getElementById('modalCategorySubmitBtn').innerHTML = '💾 Crear Categoría';
    
    showModal('categoryModal');
}

// Funciones de modal para EDITAR
function openEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    isEditMode = true;
    currentEditingId = productId;
    
    // Llenar formulario del modal
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').value = product.name || '';
    document.getElementById('modalProductPrice').value = product.price || '';
    document.getElementById('modalProductCategory').value = product.category_id || '';
    document.getElementById('modalProductDescription').value = product.description || '';
    
    // Actualizar título
    document.getElementById('modalProductTitle').textContent = '✏️ Editar Producto';
    document.getElementById('modalProductSubmitBtn').innerHTML = '💾 Actualizar Producto';
    
    // Mostrar imagen actual si existe
    const modalPreviewImg = document.getElementById('modalPreviewImg');
    if (product.image_url && modalPreviewImg) {
        modalPreviewImg.src = product.image_url;
        modalPreviewImg.style.display = 'block';
    } else if (modalPreviewImg) {
        modalPreviewImg.style.display = 'none';
    }
    
    showModal('productModal');
}

function openEditCategoryModal(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        showNotification('Categoría no encontrada', 'error');
        return;
    }
    
    isEditMode = true;
    currentEditingId = categoryId;
    
    // Llenar formulario del modal
    document.getElementById('modalCategoryId').value = category.id;
    document.getElementById('modalCategoryName').value = category.name;
    document.getElementById('modalCategoryDescription').value = category.description || '';
    
    // Actualizar título
    document.getElementById('modalCategoryTitle').textContent = '✏️ Editar Categoría';
    document.getElementById('modalCategorySubmitBtn').innerHTML = '💾 Actualizar Categoría';
    
    showModal('categoryModal');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus en el primer input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) firstInput.focus();
        }, 300);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        currentEditingId = null;
        isEditMode = false;
        
        // Limpiar formularios del modal
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Limpiar preview de imagen
        const previewImg = modal.querySelector('img[id*="preview"]');
        if (previewImg) {
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
    }
}

// Funciones de confirmación
function confirmDeleteProduct(productId, productName) {
    if (confirm(`¿Estás seguro de eliminar el producto "${productName}"?\n\nEsta acción no se puede deshacer.`)) {
        deleteProduct(productId, productName);
    }
}

function confirmDeleteCategory(categoryId, categoryName, productCount) {
    if (productCount > 0) {
        showNotification(`No se puede eliminar la categoría "${categoryName}" porque tiene ${productCount} producto(s) asociado(s).`, 'error');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?\n\nEsta acción no se puede deshacer.`)) {
        deleteCategory(categoryId, categoryName);
    }
}

// Funciones CRUD
async function handleProductSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('modalProductSubmitBtn');
    const originalText = submitBtn.innerHTML;

    const name = document.getElementById('modalProductName').value.trim();
    const price = document.getElementById('modalProductPrice').value;
    const categoryId = document.getElementById('modalProductCategory').value;
    const description = document.getElementById('modalProductDescription').value.trim();
    const imageFile = document.getElementById('modalProductImage').files[0];

    // Validaciones
    if (!name) return showNotification('El nombre del producto es requerido', 'error');
    if (!price || parseFloat(price) <= 0) return showNotification('El precio debe ser mayor a 0', 'error');
    if (!categoryId) return showNotification('Debe seleccionar una categoría', 'error');

    const fd = new FormData();
    fd.append('name', name);
    fd.append('price', price);
    fd.append('category_id', categoryId);
    fd.append('description', description);
    
    if (imageFile) {
        fd.append('image', imageFile);
    } else if (isEditMode) {
        const currentProduct = products.find(p => p.id == currentEditingId);
        if (currentProduct && currentProduct.image_url) {
            fd.append('image_url', currentProduct.image_url);
        }
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> ' + (isEditMode ? 'Actualizando...' : 'Creando...');

        const url = isEditMode ? `${API_BASE}/products/${currentEditingId}` : `${API_BASE}/products`;
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: fd
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || `Error HTTP: ${response.status}`);
        }

        await loadProducts();
        renderProducts();
        closeModal('productModal');
        showNotification(`Producto ${isEditMode ? 'actualizado' : 'creado'} exitosamente`, 'success');

    } catch (err) {
        console.error(err);
        showNotification(err.message || `Error ${isEditMode ? 'actualizando' : 'creando'} producto`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('modalCategorySubmitBtn');
    const originalText = submitBtn.innerHTML;
    
    const name = document.getElementById('modalCategoryName').value.trim();
    const description = document.getElementById('modalCategoryDescription').value.trim();

    if (!name) {
        showNotification('El nombre de la categoría es requerido', 'error');
        return;
    }

    const categoryData = {
        name: name,
        description: description || null
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> ' + (isEditMode ? 'Actualizando...' : 'Creando...');

        const url = isEditMode ? `${API_BASE}/categories/${currentEditingId}` : `${API_BASE}/categories`;
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Error ${isEditMode ? 'actualizando' : 'creando'} categoría`);
        }

        await Promise.all([loadCategories(), loadProducts()]);
        populateCategorySelects();
        renderCategories();
        renderProducts();
        closeModal('categoryModal');
        showNotification(`Categoría ${isEditMode ? 'actualizada' : 'creada'} exitosamente`, 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || `Error ${isEditMode ? 'actualizando' : 'creando'} categoría`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function deleteProduct(productId, productName) {
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error eliminando producto');
        }

        await loadProducts();
        renderProducts();
        populateCategorySelects();
        showNotification('Producto eliminado exitosamente', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error eliminando producto', 'error');
    }
}

async function deleteCategory(categoryId, categoryName) {
    try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error eliminando categoría');
        }

        await Promise.all([loadCategories(), loadProducts()]);
        renderCategories();
        renderProducts();
        populateCategorySelects();
        showNotification('Categoría eliminada exitosamente', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error eliminando categoría', 'error');
    }
}

// SEARCH FUNCTIONS
function setupSearch() {
    let searchTimeout;
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e);
            }, 300);
        });
    }

    const searchCategoriesInput = document.getElementById('searchCategoriesInput');
    if (searchCategoriesInput) {
        searchCategoriesInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleCategorySearch(e);
            }, 300);
        });
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            (product.description && product.description.toLowerCase().includes(query)) ||
            (product.category_name && product.category_name.toLowerCase().includes(query))
        );
    }
    
    renderProducts();
}

function handleCategorySearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredCategories = [...categories];
    } else {
        filteredCategories = categories.filter(category => 
            category.name.toLowerCase().includes(query) ||
            (category.description && category.description.toLowerCase().includes(query))
        );
    }
    
    renderCategories();
}

function filterByCategory() {
    const categoryId = document.getElementById('categoryFilter').value;
    
    if (categoryId === '') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => 
            product.category_id == categoryId
        );
    }
    
    renderProducts();
}

function sortProducts() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'price':
                return parseFloat(a.price) - parseFloat(b.price);
            case 'category':
                return (a.category_name || '').localeCompare(b.category_name || '');
            default:
                return 0;
        }
    });
    
    renderProducts();
}

// VIEW FUNCTIONS
function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        showProductDetails(product);
    }
}

function viewCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
        showCategoryDetails(category);
    }
}

function showProductDetails(product) {
    const detailsHTML = `
        <div style="text-align: center; padding: 2rem;">
            ${product.image_url ? 
                `<img src="${product.image_url}" alt="${product.name}" style="max-width: 200px; max-height: 150px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">` :
                `<div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>`
            }
            <h3 style="color: #1a1d29; margin-bottom: 0.5rem;">${product.name}</h3>
            <p style="color: #ff7043; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Bs. ${parseFloat(product.price).toFixed(2)}</p>
            <span style="background: #f1f5f9; color: #475569; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">${product.category_name || 'Sin categoría'}</span>
            ${product.description ? `<p style="color: #6b7280; margin-top: 1rem;">${product.description}</p>` : ''}
            <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                <button onclick="openEditProductModal(${product.id}); closeModal('quickViewModal');" class="btn btn-primary">Editar</button>
                <button onclick="closeModal('quickViewModal');" class="btn btn-secondary">Cerrar</button>
            </div>
        </div>
    `;
    
    showQuickModal('Detalles del Producto', detailsHTML);
}

function showCategoryDetails(category) {
    const productCount = products.filter(p => p.category_id === category.id).length;
    const detailsHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏷️</div>
            <h3 style="color: #1a1d29; margin-bottom: 0.5rem;">${category.name}</h3>
            <p style="color: #6b7280; margin-bottom: 1rem;">${category.description || 'Sin descripción'}</p>
            <p style="color: #ff7043; font-weight: bold; margin-bottom: 2rem;">${productCount} producto${productCount !== 1 ? 's' : ''}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="openEditCategoryModal(${category.id}); closeModal('quickViewModal');" class="btn btn-primary">Editar</button>
                <button onclick="closeModal('quickViewModal');" class="btn btn-secondary">Cerrar</button>
            </div>
        </div>
    `;
    
    showQuickModal('Detalles de la Categoría', detailsHTML);
}

function showQuickModal(title, content) {
    // Crear modal temporal
    const modalHTML = `
        <div id="quickViewModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="closeModal('quickViewModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('quickViewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

// NOTIFICATION FUNCTIONS mejoradas
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.2rem;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-hide después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 400);
    }, 4000);
    
    // Click para cerrar manualmente
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 400);
    });
}

// Preview de imagen para modal
function previewModalImage(input) {
    handleImagePreview({ target: input }, 'modalPreviewImg');
}

// COMPATIBILITY FUNCTIONS
function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        showNotification('Cerrando sesión...', 'success');
        // localStorage.removeItem('pos_token');
        // window.location.href = '/login';
    }
}

// Global functions for compatibility
window.appLogout = logout;

// Funciones auxiliares para mejorar UX
function initializeTooltips() {
    // Agregar tooltips a elementos importantes
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.target;
    const title = element.getAttribute('title');
    
    if (!title) return;
    
    // Crear tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = title;
    tooltip.style.cssText = `
        position: absolute;
        background: #1a1d29;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.8rem;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    // Posicionar tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    
    // Mostrar tooltip
    setTimeout(() => tooltip.style.opacity = '1', 100);
    
    // Guardar referencia para limpieza
    element._tooltip = tooltip;
}

function hideTooltip(event) {
    const element = event.target;
    if (element._tooltip) {
        element._tooltip.remove();
        delete element._tooltip;
    }
}

// Inicializar tooltips cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeTooltips, 1000);
});

// Funciones de utilidad adicionales
function formatPrice(price) {
    return `Bs. ${parseFloat(price).toFixed(2)}`;
}

function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!validTypes.includes(file.type)) {
        throw new Error('Solo se permiten archivos JPG, PNG o WebP');
    }
    
    if (file.size > maxSize) {
        throw new Error('El archivo debe ser menor a 2MB');
    }
    
    return true;
}