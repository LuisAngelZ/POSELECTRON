# 📊 GUÍA RÁPIDA - CARGAR DATOS EN EL DASHBOARD

## Paso 1: Ejecutar la aplicación
```bash
npm start
```

## Paso 2: Crear datos iniciales (si no existen)

### A. Crear usuarios
```bash
npm run create-users
```

Usuarios creados:
- **Usuario:** admin | **Contraseña:** 123456 | **Rol:** admin
- **Usuario:** cajero1 | **Contraseña:** cajero1 | **Rol:** cajero
- **Usuario:** cajero2 | **Contraseña:** cajero2 | **Rol:** cajero
- **Usuario:** cajero3 | **Contraseña:** cajero3 | **Rol:** cajero

### B. Crear productos y categorías
```bash
npm run create-products
```

Se crean:
- 4 categorías (Platos, Bebidas, Refrescos, Extras)
- 30+ productos con precios

### C. Crear ventas de prueba (⭐ IMPORTANTE para ver datos en dashboard)
```bash
npm run create-sales
```

Se crean:
- 20-40 ventas simuladas para las últimas 8 horas
- Mixtura de pagos en efectivo y QR
- Diferentes productos en cada venta
- Datos realistas de cantidad y precios

## Paso 3: Login en la aplicación

1. Abre la aplicación Electron (ya está ejecutándose con `npm start`)
2. Ingresa credenciales:
   - **Usuario:** cajero1
   - **Contraseña:** cajero1
3. Presiona "Entrar"

## Paso 4: Ver Dashboard

Una vez logueado, irás automáticamente al **Dashboard** donde verás:

✅ **Ventas de Hoy**
- Total de órdenes
- Monto total en Bs
- Promedio por venta
- Desglose por tipo de pago (Efectivo/QR)

✅ **Ventas del Mes**
- Número de órdenes del mes
- Total acumulado
- Promedio diario

✅ **Productos Top**
- Productos más vendidos hoy
- Cantidad de unidades vendidas
- Ingresos por producto

✅ **Ventas Recientes**
- Listado de últimas ventas
- Cliente, vendedor, total y método de pago

## Troubleshooting

### ❌ No veo datos en el Dashboard
**Solución 1:** Ejecuta el script de ventas
```bash
npm run create-sales
```

**Solución 2:** Verifica que estés logueado como cajero1

**Solución 3:** Recarga la página (F5) en la aplicación

### ❌ "Error al cargar datos"
- Asegúrate de que el servidor Node.js esté corriendo (debería iniciarse automáticamente)
- Revisa la consola de Electron (Ctrl+Shift+I)
- Verifica que los archivos estén en `database/pos.db`

### ❌ Los datos no son recientes
Los datos pueden retrasarse hasta 1 minuto. Haz clic en el botón "🔄 Refrescar" para actualizar inmediatamente.

## Estructura de Base de Datos

Los datos se almacenan en: `database/pos.db`

Tablas principales:
- `users` - Usuarios del sistema
- `products` - Productos disponibles
- `categories` - Categorías de productos
- `sales` - Encabezado de ventas
- `sale_details` - Detalles de cada venta

## Notas Importantes

⚠️ **Los datos de prueba son FICTICIOS**
- Se generan al azar cada vez que ejecutas `npm run create-sales`
- Puedes ejecutar múltiples veces para acumular más ventas

💡 **Para agregar más datos:**
- Edita `create-sales.js` para cambiar cantidad de ventas
- O simplemente ejecuta `npm run create-sales` varias veces

🔐 **Seguridad:**
- En producción, nunca incluyas estos scripts
- Cambia el JWT_SECRET en `.env`
- Configura contraseñas seguras

## Acceso al Dashboard en Diferentes Roles

- **Admin:** Acceso completo a reportes y configuración
- **Cajero:** Acceso a ventas del día y productos top

---

¡Listo! Ahora deberías ver datos reales en tu Dashboard. 🎉
