# 🧪 PRUEBAS DEL SISTEMA DE FECHAS Y REPORTES

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Sistema de Fechas Centralizado**
- ✅ Creado `DateUtils` centralizado en `backend/utils/dateUtils.js`
- ✅ Todas las funciones usan **hora local de la PC**
- ✅ Eliminada dependencia de zona horaria de Bolivia manual
- ✅ Formato consistente: `YYYY-MM-DD HH:MM:SS`

### 2. **Modelos Actualizados**
- ✅ `Sale.js` usa `DateUtils.getLocalDateTime()`
- ✅ `TicketSession.js` usa `DateUtils.getLocalDate()`
- ✅ `userSessionManager.js` usa `DateUtils.getLocalDate()`

### 3. **Reportes de Ventas por Producto**
Se agregaron 6 nuevos endpoints en `backend/routes/reports.js`:

#### 📊 Nuevos Endpoints Disponibles:

1. **Ventas por Producto del Día**
   ```
   GET /api/reports/products/day?date=2024-01-15
   ```
   - Parámetros: `date` (opcional, default: hoy)
   - Retorna: Lista de productos vendidos en el día con cantidad y revenue

2. **Ventas por Producto del Mes**
   ```
   GET /api/reports/products/month?yearMonth=2024-01
   ```
   - Parámetros: `yearMonth` (opcional, formato YYYY-MM, default: mes actual)
   - Retorna: Lista de productos vendidos en el mes con días vendidos

3. **Ventas por Producto del Año**
   ```
   GET /api/reports/products/year?year=2024
   ```
   - Parámetros: `year` (opcional, default: año actual)
   - Retorna: Lista de productos vendidos en el año

4. **Ventas de Producto Específico por Día**
   ```
   GET /api/reports/products/:productId/day?date=2024-01-15
   ```
   - Parámetros: `productId` (requerido), `date` (opcional)
   - Retorna: Ventas de un producto específico en un día

5. **Reporte Personalizado de Productos**
   ```
   GET /api/reports/products/custom?startDate=2024-01-01&endDate=2024-01-31
   ```
   - Parámetros: `startDate` y `endDate` (requeridos)
   - Retorna: Análisis detallado de productos en rango de fechas

### 4. **Nuevos Métodos en SaleDetail.js**
- ✅ `getProductSalesByDay(date)` - Ventas por producto del día
- ✅ `getProductSalesByMonth(yearMonth)` - Ventas por producto del mes
- ✅ `getProductSalesByYear(year)` - Ventas por producto del año
- ✅ `getSpecificProductSalesByDay(productId, date)` - Producto específico por día
- ✅ `getProductSalesReport(startDate, endDate)` - Reporte personalizado

---

## 🧪 CÓMO PROBAR

### Paso 1: Verificar que el servidor esté corriendo
```bash
# En la terminal, verificar que no haya errores
# Debe mostrar: ✅ Servidor escuchando en puerto 3000
```

### Paso 2: Probar endpoints de reportes

#### A. Ver ayuda de reportes
```bash
GET http://localhost:3000/api/reports/help
```

#### B. Ventas por producto HOY
```bash
GET http://localhost:3000/api/reports/products/day
```

**Respuesta esperada:**
```json
{
  "success": true,
  "date": "2026-01-19",
  "total_products": 5,
  "products": [
    {
      "product_id": 1,
      "product_name": "PIZZA MARGHERITA",
      "total_quantity": 8,
      "total_revenue": 200.00,
      "times_sold": 3,
      "avg_price": 25.00
    }
  ],
  "summary": {
    "total_quantity": 25,
    "total_revenue": 650.00
  }
}
```

#### C. Ventas por producto del MES ACTUAL
```bash
GET http://localhost:3000/api/reports/products/month
```

#### D. Ventas por producto del AÑO ACTUAL
```bash
GET http://localhost:3000/api/reports/products/year
```

#### E. Ventas de un producto específico hoy
```bash
GET http://localhost:3000/api/reports/products/1/day
# Reemplaza "1" con el ID del producto que quieras consultar
```

#### F. Reporte personalizado
```bash
GET http://localhost:3000/api/reports/products/custom?startDate=2026-01-01&endDate=2026-01-19
```

### Paso 3: Verificar fechas en la BD

Ejecutar desde la terminal del backend:
```javascript
// En Node.js o en el navegador (console de DevTools)
const DateUtils = require('./backend/utils/dateUtils');

console.log('Fecha/Hora actual:', DateUtils.getLocalDateTime());
console.log('Fecha actual:', DateUtils.getLocalDate());
console.log('Mes actual:', DateUtils.getCurrentMonth());
console.log('Año actual:', DateUtils.getCurrentYear());
```

---

## 📊 ESTRUCTURA DE RESPUESTAS

### Reporte por Día
```json
{
  "success": true,
  "date": "2026-01-19",
  "total_products": 12,
  "products": [
    {
      "product_id": 5,
      "product_name": "COCA COLA 350ML",
      "total_quantity": 15,
      "total_revenue": 120.00,
      "times_sold": 8,
      "avg_price": 8.00,
      "first_sale": "2026-01-19 08:30:15",
      "last_sale": "2026-01-19 20:15:45"
    }
  ],
  "summary": {
    "total_quantity": 45,
    "total_revenue": 1250.00
  }
}
```

### Reporte por Mes
```json
{
  "success": true,
  "month": "2026-01",
  "total_products": 25,
  "products": [
    {
      "product_id": 3,
      "product_name": "HAMBURGUESA DOBLE",
      "total_quantity": 120,
      "total_revenue": 3600.00,
      "times_sold": 45,
      "days_sold": 18,
      "avg_price": 30.00
    }
  ],
  "summary": {
    "total_quantity": 450,
    "total_revenue": 12500.00,
    "total_days_with_sales": 19
  }
}
```

### Reporte Personalizado
```json
{
  "success": true,
  "start_date": "2026-01-01",
  "end_date": "2026-01-19",
  "total_products": 30,
  "products": [
    {
      "product_id": 8,
      "product_name": "PIZZA HAWAIANA",
      "total_quantity": 95,
      "total_revenue": 2850.00,
      "times_sold": 38,
      "days_sold": 15,
      "avg_price": 30.00,
      "avg_daily_revenue": 190.00
    }
  ]
}
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: "No hay ventas en la fecha especificada"
**Solución:** 
1. Verificar que la PC tenga la fecha/hora correcta
2. Verificar que existan ventas en la base de datos
3. Probar con: `GET /api/sales/today` para ver ventas del día

### Problema: "Fechas incorrectas en reportes"
**Solución:**
1. Verificar hora del sistema: `new Date()` en consola del navegador
2. Asegurar que la PC esté en zona horaria correcta
3. Los reportes ahora usan la hora LOCAL de la PC

### Problema: "Error obteniendo reporte"
**Solución:**
1. Verificar logs del servidor en la terminal
2. Verificar que la base de datos tenga datos
3. Intentar con fechas diferentes

---

## 📝 NOTAS IMPORTANTES

1. **SIN CAMBIOS EN LA BD**: No se modificó la estructura de tablas
2. **HORA DE LA PC**: Todo usa la hora local del sistema operativo
3. **COMPATIBILIDAD**: Funciones antiguas siguen funcionando
4. **LOGS MEJORADOS**: Cada operación muestra fecha/hora en consola

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Servidor inicia sin errores
- [ ] `GET /api/reports/help` responde correctamente
- [ ] `GET /api/reports/products/day` retorna ventas de hoy
- [ ] `GET /api/reports/products/month` retorna ventas del mes
- [ ] `GET /api/reports/products/year` retorna ventas del año
- [ ] Las fechas mostradas coinciden con la fecha actual de la PC
- [ ] Los totales suman correctamente
- [ ] No hay errores en la consola del servidor

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. Probar los endpoints desde el frontend (dashboard o reportes)
2. Agregar gráficos para visualizar ventas por producto
3. Exportar reportes a PDF o Excel
4. Agregar filtros por categoría de producto
5. Implementar caché para reportes frecuentes

---

**Fecha de implementación:** 19 de enero de 2026
**Sistema:** POS Electron - Módulo de Ventas y Reportes
