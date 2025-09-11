   // ===== CONFIGURACIÓN Y VARIABLES GLOBALES =====
        const API_BASE = '/api';
        let isLoading = false;

        // ===== INICIALIZACIÓN =====
        document.addEventListener('DOMContentLoaded', function() {
    console.log('🌊 Inicializando POS Login - Geometric Wave Pattern');
    
    // Limpiar tokens corruptos
    cleanupCorruptedTokens();
    
    // Configurar formulario
    setupForm();
    
    // Configurar efectos visuales
    setupVisualEffects();
    
    // MEJORAR AUTO-FOCUS - FORZAR LIMPIEZA Y FOCO
    setTimeout(() => {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput && passwordInput) {
            // Limpiar completamente los campos
            usernameInput.value = '';
            passwordInput.value = '';
            
            // Quitar cualquier atributo problemático
            usernameInput.removeAttribute('readonly');
            usernameInput.removeAttribute('disabled');
            passwordInput.removeAttribute('readonly');
            passwordInput.removeAttribute('disabled');
            
            // Forzar que sean editables
            usernameInput.readOnly = false;
            passwordInput.readOnly = false;
            
            // Foco múltiple para asegurar que funcione
            usernameInput.focus();
            usernameInput.click();
            usernameInput.select();
            
            console.log('✅ Campos de login preparados y enfocados');
        }
    }, 1000); // Aumentar tiempo de espera
});

        // ===== LIMPIEZA DE TOKENS CORRUPTOS =====
        function cleanupCorruptedTokens() {
    try {
        // Limpiar tokens
        const token = localStorage.getItem('pos_token');
        
        if (token && (token.length < 10 || !token.includes('.'))) {
            console.log('🧹 Limpiando token malformado');
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
        }
        
        // AGREGAR: Limpiar localStorage problemático
        localStorage.removeItem('pos_session');
        localStorage.removeItem('lastUser');
        sessionStorage.clear();
        
        // AGREGAR: Forzar limpieza de formulario
        setTimeout(() => {
            forceCleanInputs();
        }, 500);
        
    } catch (error) {
        console.warn('Error en cleanup:', error);
        // Si hay error, limpiar todo localStorage
        localStorage.clear();
        sessionStorage.clear();
    }
}

        // ===== CONFIGURACIÓN DEL FORMULARIO =====
        function setupForm() {
            const form = document.getElementById('loginForm');
            const inputs = document.querySelectorAll('.form-input');

            // Efectos visuales en inputs
            inputs.forEach((input, index) => {
                // Efecto focus mejorado
                input.addEventListener('focus', function() {
                    this.parentElement.style.transform = 'translateY(-2px)';
                    this.parentElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                });
                
                input.addEventListener('blur', function() {
                    this.parentElement.style.transform = 'translateY(0)';
                });

                // Navegación con Enter
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextInput = inputs[index + 1];
                        if (nextInput) {
                            nextInput.focus();
                        } else {
                            form.dispatchEvent(new Event('submit'));
                        }
                    }
                });

                // Validación en tiempo real
                input.addEventListener('input', function() {
                    validateInput(this);
                });
            });

            // Submit del formulario
            form.addEventListener('submit', handleLogin);
        }

        // ===== VALIDACIÓN DE INPUTS =====
        function validateInput(input) {
            const value = input.value.trim();
            
            if (value.length > 0) {
                input.style.borderColor = '#10b981';
                input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            } else {
                input.style.borderColor = 'rgba(255, 140, 66, 0.2)';
                input.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
            }
        }

        // ===== MANEJO DEL LOGIN =====
        async function handleLogin(e) {
            e.preventDefault();
            
            if (isLoading) return;

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            // Validaciones
            if (!username || !password) {
                showNotification('⚠️ Complete todos los campos', 'error');
                shakeForm();
                return;
            }

            if (username.length < 2) {
                showNotification('⚠️ El usuario debe tener al menos 2 caracteres', 'error');
                document.getElementById('username').focus();
                return;
            }

            setLoading(true);

            try {
                console.log('🔐 Iniciando proceso de autenticación...');
                
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Guardar datos de autenticación
                    localStorage.setItem('pos_token', data.token);
localStorage.setItem('pos_user', JSON.stringify(data.user));

const role = String(data.user.role || '').toLowerCase().trim();

// (Opcional) mapa bonito para el texto del rol
const roleLabels = { admin: '👑 Administrador', venta: '👨‍💼 Cajero' };
const roleText = roleLabels[role] || '👤 Usuario';
showNotification(`🎉 ¡Bienvenido, ${data.user.full_name}! (${roleText})`, 'success');

successEffect();

// Decide destino por rol
const target = role === 'admin' ? '/dashboard' : '/pos';

// (Opcional) limpia “última sección” para no forzar POS/Dashboard de sesiones anteriores
localStorage.removeItem('lastSection');

// Redirigir después de la animación
setTimeout(() => {
  console.log('🚀 Redirigiendo a:', target);
  // Usa replace para evitar volver al login con “atrás”
  window.location.replace(target); // o window.location.href = target;
}, 2000);
                    
                } else {
                    throw new Error(data.message || 'Credenciales incorrectas');
                }
                
            } catch (error) {
                console.error('❌ Error en login:', error);
                
                let errorMessage = 'Error de conexión';
                
                if (error.message.includes('Credenciales')) {
                    errorMessage = '🔐 Usuario o contraseña incorrectos';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = '🌐 Error de conexión con el servidor';
                } else if (error.message) {
                    errorMessage = `⚠️ ${error.message}`;
                }
                
                showNotification(errorMessage, 'error');
                shakeForm();
                
            } finally {
                setLoading(false);
            }
        }

        // ===== ESTADOS DE LOADING =====
        function setLoading(loading) {
            isLoading = loading;
            const btn = document.getElementById('loginBtn');
            const spinner = document.getElementById('spinner');
            const btnText = document.getElementById('btnText');
            
            if (loading) {
                btn.disabled = true;
                spinner.style.display = 'inline-block';
                btnText.textContent = '🔄 Iniciando...';
                btn.style.background = 'linear-gradient(135deg, #9ca3af, #6b7280)';
            } else {
                btn.disabled = false;
                spinner.style.display = 'none';
                btnText.textContent = '🚀 Iniciar Sesión';
                btn.style.background = 'linear-gradient(135deg, #ff9f66, #ffb380)';
            }
        }

        // ===== EFECTOS VISUALES =====
        function setupVisualEffects() {
            // Efecto de parallax en el mouse
            document.addEventListener('mousemove', function(e) {
                const decorations = document.querySelectorAll('.bg-decoration');
                const mouseX = e.clientX / window.innerWidth;
                const mouseY = e.clientY / window.innerHeight;
                
                decorations.forEach((decoration, index) => {
                    const speed = (index + 1) * 0.5;
                    const x = (mouseX - 0.5) * speed * 20;
                    const y = (mouseY - 0.5) * speed * 20;
                    
                    decoration.style.transform += ` translate(${x}px, ${y}px)`;
                });
            });

            // Efecto de typing en el subtítulo
            const subtitle = document.querySelector('.brand-subtitle');
            const originalText = subtitle.textContent;
            subtitle.textContent = '';
            
            let i = 0;
            const typeEffect = setInterval(() => {
                subtitle.textContent += originalText.charAt(i);
                i++;
                if (i > originalText.length) {
                    clearInterval(typeEffect);
                }
            }, 100);
        }

        function shakeForm() {
            const container = document.querySelector('.login-container');
            container.style.animation = 'shake 0.5s ease-in-out';
            
            setTimeout(() => {
                container.style.animation = 'slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 500);
        }

        function successEffect() {
            const container = document.querySelector('.login-container');
            container.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))';
            container.style.transform = 'scale(1.02)';
            container.style.transition = 'all 0.5s ease';
            
            // Crear efecto de partículas de éxito
            createSuccessParticles();
        }

        function createSuccessParticles() {
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: fixed;
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1000;
                    left: 50%;
                    top: 50%;
                    animation: explode 1s ease-out forwards;
                `;
                
                const angle = (i / 20) * 2 * Math.PI;
                const velocity = 100 + Math.random() * 50;
                
                particle.style.setProperty('--x', `${Math.cos(angle) * velocity}px`);
                particle.style.setProperty('--y', `${Math.sin(angle) * velocity}px`);
                
                document.body.appendChild(particle);
                
                setTimeout(() => particle.remove(), 1000);
            }
        }

        // ===== SISTEMA DE NOTIFICACIONES =====
        function showNotification(message, type = 'success', duration = 4000) {
            // Remover notificación anterior
            const existing = document.querySelector('.notification');
            if (existing) {
                existing.remove();
            }
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">${type === 'success' ? '✅' : '❌'}</span>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Mostrar con animación
            setTimeout(() => notification.classList.add('show'), 100);
            
            // Auto-ocultar
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            notification.remove();
                        }
                    }, 400);
                }
            }, duration);
        }

        // ===== ANIMACIONES ADICIONALES CSS =====
        const additionalStyles = document.createElement('style');
        additionalStyles.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }

            @keyframes explode {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1);
                    opacity: 0;
                }
            }

            @keyframes ripple {
                0% {
                    box-shadow: 0 0 0 0 rgba(255, 159, 102, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 20px rgba(255, 159, 102, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(255, 159, 102, 0);
                }
            }

            .login-btn:focus {
                animation: ripple 0.6s ease-out;
            }

            /* Mejoras adicionales para el patrón geométrico */
            body::before {
                will-change: background-position;
            }

            body::after {
                will-change: transform, opacity;
            }

            /* Estados adicionales para inputs */
            .form-input:invalid:not(:placeholder-shown) {
                border-color: #ef4444;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }

            .form-input:valid:not(:placeholder-shown) {
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }

            /* Animación mejorada para el logo */
            .logo:active {
                transform: scale(0.95);
                transition: transform 0.1s ease;
            }

            /* Efecto glassmorphism mejorado en hover */
            .login-container:hover {
                backdrop-filter: blur(25px);
            }

            /* Animación de escritura para el subtítulo */
            .brand-subtitle {
                overflow: hidden;
                border-right: 2px solid #9a3412;
                white-space: nowrap;
                animation: typing 2s steps(20, end) 1s both, blink-caret 0.75s step-end infinite 1s;
            }

            @keyframes typing {
                from { width: 0; }
                to { width: 100%; }
            }

            @keyframes blink-caret {
                from, to { border-color: transparent; }
                50% { border-color: #9a3412; }
            }

            /* Efectos de hover mejorados */
            @media (hover: hover) {
                .form-input:hover {
                    border-color: rgba(255, 179, 128, 0.4);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
                }

                .logo:hover {
                    transform: scale(1.1) rotate(5deg);
                    box-shadow: 0 15px 40px rgba(255, 159, 102, 0.4);
                }
            }

            /* Optimizaciones de rendimiento */
            .login-container,
            .logo,
            .form-input,
            .login-btn {
                will-change: transform;
                backface-visibility: hidden;
                perspective: 1000px;
            }

            /* Soporte para dispositivos con notch */
            @supports (padding-top: env(safe-area-inset-top)) {
                body {
                    padding-top: env(safe-area-inset-top);
                    padding-bottom: env(safe-area-inset-bottom);
                }
            }
        `;
        document.head.appendChild(additionalStyles);

        // ===== UTILIDADES ADICIONALES =====
        
        // Detección de tipo de dispositivo
        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        // Optimización para dispositivos móviles
        if (isTouchDevice()) {
            document.body.style.WebkitTapHighlightColor = 'transparent';
            
            // Evitar zoom en iOS en inputs
            const inputs = document.querySelectorAll('.form-input');
            inputs.forEach(input => {
                if (input.style.fontSize < '16px') {
                    input.style.fontSize = '16px';
                }
            });
        }

        // Prevenir zoom accidental en inputs (iOS)
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });

        // Mejorar rendimiento de animaciones
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // Precargar animaciones críticas
                document.body.style.setProperty('--gpu-acceleration', 'translateZ(0)');
            });
        }

        // Detección de preferencias del usuario
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Reducir animaciones para usuarios que lo prefieren
            document.documentElement.style.setProperty('--animation-duration', '0.1s');
        }

        // ===== MANEJO DE ERRORES GLOBAL =====
        window.addEventListener('error', function(e) {
            console.error('🚨 Error global capturado:', e.error);
            
            if (e.error && e.error.message && e.error.message.includes('fetch')) {
                showNotification('🌐 Problema de conexión. Verifique su internet.', 'error');
            }
        });

        // ===== INFORMACIÓN DE DEBUGGING =====
        console.log('🌊 POS Login System - Geometric Wave Pattern');
        console.log('📱 Dispositivo táctil:', isTouchDevice());
        console.log('🎨 Animaciones reducidas:', window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        console.log('🔧 API Base:', API_BASE);
        console.log('');
        console.log('👥 Usuarios de prueba:');
        console.log('   📋 Admin: admin / 123456');
        console.log('   💼 Cajero: cajero / 123456');
        console.log('');
        console.log('✨ Características activas:');
        console.log('   🌊 Patrón geométrico animado');
        console.log('   💎 Efectos glassmorphism');
        console.log('   🎯 Validación en tiempo real');
        console.log('   📱 Diseño responsive');
        console.log('   ♿ Accesibilidad mejorada');
        console.log('   ⚡ Optimizado para rendimiento');

        // ===== ATAJOS DE TECLADO PARA DESARROLLO =====
        document.addEventListener('keydown', function(e) {
            // Admin rápido: Ctrl + Shift + A
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = '123456';
                showNotification('🔧 Credenciales admin cargadas', 'success', 2000);
            }
            
            // Cajero rápido: Ctrl + Shift + C
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                document.getElementById('username').value = 'cajero1';
                document.getElementById('password').value = 'cajero1';
                showNotification('🔧 Credenciales cajero cargadas', 'success', 2000);
            }
        });

        // ===== ANALYTICS Y MÉTRICAS (OPCIONAL) =====
        let loginAttempts = 0;
        let startTime = Date.now();

        function trackLoginAttempt(success) {
            loginAttempts++;
            const timeSpent = Date.now() - startTime;
            
            console.log(`📊 Intento #${loginAttempts} - ${success ? 'Éxito' : 'Fallo'} - Tiempo: ${timeSpent}ms`);
            
            // Aquí podrías enviar métricas a tu sistema de analytics
            // sendAnalytics('login_attempt', { success, attempts: loginAttempts, timeSpent });
        }

        // Modificar handleLogin para incluir tracking
        const originalHandleLogin = handleLogin;
        handleLogin = function(e) {
            return originalHandleLogin(e).then(result => {
                trackLoginAttempt(true);
                return result;
            }).catch(error => {
                trackLoginAttempt(false);
                throw error;
            });
        };

        console.log('🚀 Sistema de login completamente inicializado');