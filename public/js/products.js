        // Variables globales
        let products = [];
        let categories = [];
        let filteredProducts = [];
        let filteredCategories = [];
        let currentEditingId = null;

        // BASE URL del API
        const API_BASE = '/api';

        // Token de autenticación (por ahora usamos uno básico)
        // Token de autenticación
        let authToken = localStorage.getItem('pos_token') || 'demo-token';

        // Inicializar aplicación
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });

        function initializeApp() {
            setupEventListeners();
            loadData();
            setupSearch();
        }

        function setupEventListeners() {
            document.getElementById('productForm').addEventListener('submit', handleCreateSubmit);
            document.getElementById('modalProductForm').addEventListener('submit', handleEditSubmit);
            document.getElementById('categoryForm').addEventListener('submit', handleCreateCategorySubmit);
            document.getElementById('modalCategoryForm').addEventListener('submit', handleEditCategorySubmit);
            
            // Cerrar modal al hacer clic fuera
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('modal')) {
                    closeModal(e.target.id);
                }
            });

            // Escape para cerrar modal
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal('productModal');
                    closeModal('categoryModal');
                }
            });

            // Vista previa de la imagen
document.addEventListener('change', function (e) {
  if (e.target && e.target.id === 'productImage') {
    const file = e.target.files && e.target.files[0];
    const preview = document.getElementById('productImagePreview');
    if (!preview) return;
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    } else {
      preview.removeAttribute('src');
      preview.style.display = 'none';
    }
  }
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
                // Si falla, usar datos de muestra como fallback
                loadSampleData();
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

        // Fallback con datos de muestra si falla la conexión
        function loadSampleData() {
            categories = [
                { id: 1, name: 'Bebidas', description: 'Bebidas frías y calientes' },
                { id: 2, name: 'Comidas', description: 'Platos principales y aperitivos' },
                { id: 3, name: 'Postres', description: 'Dulces y postres variados' },
                { id: 4, name: 'Snacks', description: 'Aperitivos y bocadillos' }
            ];

            products = [
                {
                    id: 1,
                    name: 'Pizza Margherita',
                    price: 85.50,
                    category_id: 2,
                    category_name: 'Comidas',
                    description: 'Pizza clásica con tomate, mozzarella y albahaca fresca',
                    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
                },
                {
                    id: 2,
                    name: 'Coca Cola 500ml',
                    price: 12.00,
                    category_id: 1,
                    category_name: 'Bebidas',
                    description: 'Bebida gaseosa clásica en botella de 500ml',
                    image_url: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&h=300&fit=crop'
                }
            ];
            
            filteredProducts = [...products];
            filteredCategories = [...categories];
            populateCategorySelects();
            renderProducts();
            renderCategories();
        }

        function populateCategorySelects() {
            const selects = [
                document.getElementById('productCategory'),
                document.getElementById('modalProductCategory'),
                document.getElementById('categoryFilter')
            ];
            
            selects.forEach((select, index) => {
                if (!select) return;
                
                if (index === 2) {
                    select.innerHTML = '<option value="">Todas las categorías</option>';
                } else {
                    select.innerHTML = '<option value="">Seleccionar categoría</option>';
                }
                
                categories.forEach(category => {
                    select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                });
            });
        }

        // Sistema de tabs
        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'Tab').classList.add('active');

            if (tabName === 'categories') {
                renderCategories();
            } else if (tabName === 'products') {
                renderProducts();
            }
        }

    // ===== FUNCIÓN MEJORADA PARA RENDERIZAR PRODUCTOS =====
// Reemplaza la función renderProducts() en tu products.html:

function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3 class="empty-title">No hay productos</h3>
                <p class="empty-description">
                    ${products.length === 0 ? 
                        'Comienza agregando tu primer producto al inventario' : 
                        'No se encontraron productos con los filtros aplicados'
                    }
                </p>
                <button class="btn btn-primary" onclick="switchTab('create-product'); document.querySelector('.tab-btn[onclick*=create-product]').click();">
                    ➕ ${products.length === 0 ? 'Crear Primer Producto' : 'Crear Producto'}
                </button>
            </div>
        `;
        return;
    }

    const productsHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="viewProduct(${product.id})">
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
                    <button class="btn-small btn-warning" onclick="event.stopPropagation(); editProduct(${product.id})" title="Editar producto">
                        ✏️ Editar
                    </button>
                    <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}');" title="Eliminar producto">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="products-grid">${productsHTML}</div>`;
}

// ===== FUNCIÓN MEJORADA PARA RENDERIZAR CATEGORÍAS =====
// Reemplaza la función renderCategories() en tu products.html:

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    
    if (filteredCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏷️</div>
                <h3 class="empty-title">No hay categorías</h3>
                <p class="empty-description">
                    ${categories.length === 0 ? 
                        'Comienza creando tu primera categoría' : 
                        'No se encontraron categorías con los filtros aplicados'
                    }
                </p>
                <button class="btn btn-primary" onclick="switchTab('create-category'); document.querySelector('.tab-btn[onclick*=create-category]').click();">
                    ➕ ${categories.length === 0 ? 'Crear Primera Categoría' : 'Crear Categoría'}
                </button>
            </div>
        `;
        return;
    }

    const categoriesHTML = filteredCategories.map(category => {
        const productCount = products.filter(p => p.category_id === category.id).length;
        return `
            <div class="category-card" onclick="viewCategory(${category.id})">
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
                        <button class="btn-small btn-warning" onclick="event.stopPropagation(); editCategory(${category.id})" title="Editar categoría">
                            ✏️ Editar
                        </button>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteCategory(${category.id}, '${category.name.replace(/'/g, "\\'")}', ${productCount})" title="Eliminar categoría">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="categories-grid">${categoriesHTML}</div>`;
}

        // SEARCH FUNCTIONS
        function setupSearch() {
            let searchTimeout;
            
            document.getElementById('searchInput').addEventListener('input', function(e) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    handleSearch(e);
                }, 300);
            });

            document.getElementById('searchCategoriesInput').addEventListener('input', function(e) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    handleCategorySearch(e);
                }, 300);
            });
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
                showNotification(`Viendo: ${product.name}`, 'success');
            }
        }

        function viewCategory(categoryId) {
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                showNotification(`Viendo categoría: ${category.name}`, 'success');
            }
        }

        // EDIT FUNCTIONS
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    currentEditingId = productId;
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').value = product.name || '';
    document.getElementById('modalProductPrice').value = product.price || '';
    document.getElementById('modalProductCategory').value = product.category_id || '';
    document.getElementById('modalProductDescription').value = product.description || '';
    
    // Mostrar imagen actual si existe
    const modalPreviewImg = document.getElementById('modalPreviewImg');
    if (product.image_url) {
        modalPreviewImg.src = product.image_url;
        modalPreviewImg.style.display = 'block';
    } else {
        modalPreviewImg.style.display = 'none';
    }
    
    showModal('productModal');
}

        function editCategory(categoryId) {
            const category = categories.find(c => c.id === categoryId);
            if (!category) {
                showNotification('Categoría no encontrada', 'error');
                return;
            }
            
            currentEditingId = categoryId;
            document.getElementById('modalCategoryId').value = category.id;
            document.getElementById('modalCategoryName').value = category.name;
            document.getElementById('modalCategoryDescription').value = category.description || '';
            
            showModal('categoryModal');
        }

        // CRUD PRODUCTOS - Métodos reales
// === CREAR PRODUCTO con archivo ===
async function handleCreateSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');

  const name = document.getElementById('productName').value.trim();
  const price = document.getElementById('productPrice').value;
  const categoryId = document.getElementById('productCategory').value;
  const description = (document.getElementById('productDescription').value || '').trim();
  const imageFile = document.getElementById('productImage').files[0];

  // Validaciones mínimas
  if (!name) return showNotification('El nombre del producto es requerido', 'error');
  if (!price || parseFloat(price) <= 0) return showNotification('El precio debe ser mayor a 0', 'error');
  if (!categoryId) return showNotification('Debe seleccionar una categoría', 'error');

  // Construir FormData (multipart/form-data)
  const fd = new FormData();
  fd.append('name', name);
  fd.append('price', price);
  fd.append('category_id', categoryId);
  fd.append('description', description);
  if (imageFile) fd.append('image', imageFile); // <-- AQUÍ VA EL ARCHIVO

  try {
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Creando...';

    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}` // ¡NO pongas Content-Type aquí!
      },
      body: fd
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Error HTTP: ${response.status}`);
    }

    await loadProducts();
    renderProducts();
    resetForm();
    showNotification('Producto creado exitosamente', 'success');

    setTimeout(() => {
      switchTab('products');
      document.querySelector('.tab-btn[onclick*="products"]').click();
    }, 1000);

  } catch (err) {
    console.error(err);
    showNotification(err.message || 'Error creando producto', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = 'Crear Producto';
  }
}

// === ACTUALIZAR PRODUCTO (usa FormData; conserva imagen si no eliges una nueva) ===
async function handleEditSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('modalSubmitBtn');
  const productId = parseInt(document.getElementById('modalProductId').value);

  // Obtener el producto actual para preservar la imagen existente
  const currentProduct = products.find(p => p.id === productId);
  
  // Arma el FormData
  const fd = new FormData();
  fd.append('name', document.getElementById('modalProductName').value.trim());
  fd.append('price', document.getElementById('modalProductPrice').value);
  fd.append('category_id', document.getElementById('modalProductCategory').value);
  fd.append('description', (document.getElementById('modalProductDescription').value || '').trim());

  // CLAVE: Solo enviar imagen si el usuario seleccionó una nueva
  const newFile = document.getElementById('modalProductImage').files[0];
  if (newFile) {
    // Si hay nueva imagen, enviarla
    fd.append('image', newFile);
  } else {
    // Si NO hay nueva imagen, preservar la imagen actual
    if (currentProduct && currentProduct.image_url) {
      fd.append('image_url', currentProduct.image_url);
    }
  }

  // Validaciones rápidas
  if (!fd.get('name')) return showNotification('El nombre del producto es requerido', 'error');
  if (!fd.get('price') || isNaN(parseFloat(fd.get('price'))) || parseFloat(fd.get('price')) <= 0) {
    return showNotification('El precio debe ser un número mayor a 0', 'error');
  }
  if (!fd.get('category_id')) return showNotification('La categoría es requerida', 'error');

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Actualizando...';

    const resp = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` }, // ¡NO pongas Content-Type!
      body: fd
    });

    const result = await resp.json();
    if (!resp.ok || !result.success) throw new Error(result.message || `Error HTTP: ${resp.status}`);

    await loadProducts();
    renderProducts();
    closeModal('productModal');
    showNotification('Producto actualizado exitosamente', 'success');

  } catch (error) {
    console.error('ERROR AL ACTUALIZAR:', error);
    showNotification(error.message || 'Error actualizando producto', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '💾 Actualizar Producto';
  }
}
function previewModalImage(input) {
  const file = input.files && input.files[0];
  const img = document.getElementById('modalPreviewImg');
  if (!img) return;
  if (file) {
    img.src = URL.createObjectURL(file);
    img.style.display = 'block';
  }
}

        async function deleteProduct(productId, productName) {
            if (!confirm(`¿Estás seguro de eliminar el producto "${productName}"?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }

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

        // CRUD CATEGORÍAS - Métodos reales
        async function handleCreateCategorySubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const submitBtn = document.getElementById('categorySubmitBtn');
            const submitBtnText = document.getElementById('categorySubmitBtnText');
            
            const categoryData = {
                name: formData.get('name').trim(),
                description: formData.get('description')?.trim() || null
            };

            if (!categoryData.name) {
                showNotification('El nombre de la categoría es requerido', 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtnText.textContent = 'Creando...';

                const response = await fetch(`${API_BASE}/categories`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoryData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Error creando categoría');
                }

                await loadCategories();
                renderCategories();
                populateCategorySelects();
                resetCategoryForm();
                showNotification('Categoría creada exitosamente', 'success');
                
                setTimeout(() => {
                    switchTab('categories');
                    document.querySelector('.tab-btn[onclick*="categories"]').click();
                }, 1500);

            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message || 'Error creando categoría', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtnText.textContent = 'Crear Categoría';
            }
        }

        async function handleEditCategorySubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const submitBtn = document.getElementById('modalCategorySubmitBtn');
            const categoryId = parseInt(document.getElementById('modalCategoryId').value);
            
            const updatedData = {
                name: formData.get('name').trim(),
                description: formData.get('description')?.trim() || null
            };

            if (!updatedData.name) {
                showNotification('El nombre de la categoría es requerido', 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading-spinner"></span> Actualizando...';

                const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Error actualizando categoría');
                }

                await Promise.all([loadCategories(), loadProducts()]);
                renderCategories();
                renderProducts();
                populateCategorySelects();
                closeModal('categoryModal');
                showNotification('Categoría actualizada exitosamente', 'success');

            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message || 'Error actualizando categoría', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Actualizar Categoría';
            }
        }

        async function deleteCategory(categoryId, categoryName, productCount) {
            if (productCount > 0) {
                showNotification(`No se puede eliminar la categoría "${categoryName}" porque tiene ${productCount} producto(s) asociado(s).`, 'error');
                return;
            }

            if (!confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }

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

        // MODAL FUNCTIONS
        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
            currentEditingId = null;
        }

        // FORM FUNCTIONS
       function resetForm() {
  document.getElementById('productForm').reset();
  const preview = document.getElementById('productImagePreview');
  if (preview) {
    preview.removeAttribute('src');
    preview.style.display = 'none';
  }
}

        function resetCategoryForm() {
            document.getElementById('categoryForm').reset();
        }

        function cancelForm() {
            if (confirm('¿Estás seguro? Se perderán todos los datos ingresados.')) {
                resetForm();
                switchTab('products');
                document.querySelector('.tab-btn[onclick*="products"]').click();
            }
        }

        function cancelCategoryForm() {
            if (confirm('¿Estás seguro? Se perderán todos los datos ingresados.')) {
                resetCategoryForm();
                switchTab('categories');
                document.querySelector('.tab-btn[onclick*="categories"]').click();
            }
        }

        // NOTIFICATION FUNCTIONS
        function showNotification(message, type = 'success') {
            const existing = document.querySelector('.notification');
            if (existing) existing.remove();
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 4000);
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


        // Funciones para vista previa de imágenes
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        }
        
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
    }
}

function previewModalImage(input) {
    const previewImg = document.getElementById('modalPreviewImg');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}