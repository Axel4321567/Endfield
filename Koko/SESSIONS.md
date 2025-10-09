# Sistema de Sesiones - Koko Browser

## 📋 Descripción General

El sistema de sesiones de Koko Browser implementa un mecanismo de persistencia similar al navegador Opera, donde las pestañas abiertas se guardan automáticamente y se restauran al reiniciar la aplicación.

## 🏗️ Arquitectura

### Componentes Principales

1. **useSessionManager** - Hook para gestión de sesiones
2. **useTabs** - Hook para gestión de pestañas con integración de sesiones
3. **LocalStorage** - Sistema de persistencia

### Flujo de Datos

```
App.tsx
  └── useTabs (con useSessionManager integrado)
      ├── Carga sesión al inicializar
      ├── Guarda sesión automáticamente en cambios
      └── Crea pestaña por defecto si no hay sesión
```

## 🔧 Implementación Técnica

### useSessionManager Hook

```typescript
// Funcionalidades principales:
- loadSession(): BrowserSession | null
- saveSession(sessionData: BrowserSession): void
- restoreSession(): BrowserSession
- updateSession(tabs: Tab[], activeTabId: string | null): void
- clearSession(): void
- hasChanges(currentTabs: Tab[], currentActiveTabId: string | null): boolean
```

### useTabs Hook Mejorado

```typescript
// Integración con sesiones:
- Inicialización automática desde sesión guardada
- Guardado automático en cada cambio de pestañas
- Creación de pestaña por defecto (Google) si no hay sesión
- Detección de cambios para optimizar escrituras
```

### Estructura de Datos

```typescript
interface BrowserSession {
  id: string;
  timestamp: number;
  tabs: SessionTab[];
  activeTabId: string | null;
  version: string;
}

interface SessionTab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  createdAt: number;
  lastAccessed: number;
}
```

## 🚀 Comportamientos del Sistema

### Inicialización
1. Al cargar la app, `useTabs` usa `useSessionManager` para cargar la sesión guardada
2. Si hay sesión guardada, restaura todas las pestañas
3. Si no hay sesión, crea una pestaña por defecto apuntando a Google

### Guardado Automático
- Se guarda la sesión automáticamente cada vez que:
  - Se crea una nueva pestaña
  - Se cierra una pestaña
  - Se cambia de pestaña activa
  - Se navega a una nueva URL en una pestaña

### Optimizaciones
- **Detección de cambios**: Solo guarda si hay cambios reales
- **Timestamps**: Rastrea última modificación para evitar escrituras innecesarias
- **Validación**: Verifica que los datos sean válidos antes de guardar

## 🧪 Testing

### Componente de Test
El archivo `TestSessionManagement.tsx` proporciona:
- Visualización del estado de sesiones
- Botones para probar funcionalidades
- Información de debugging
- Instrucciones de uso

### Casos de Prueba
1. **Crear múltiples pestañas** → Cerrar app → Reabrir → Verificar restauración
2. **Limpiar sesión** → Recargar → Verificar pestaña por defecto (Google)
3. **Cambiar pestaña activa** → Verificar persistencia del estado activo
4. **Navegar en pestaña** → Verificar guardado de URL actualizada

## 🔄 Manejo de Errores

### Casos Edge
- **Sesión corrupta**: Se ignora y se crea sesión por defecto
- **LocalStorage no disponible**: Sistema funciona sin persistencia
- **Datos inválidos**: Se validan y filtran automáticamente
- **Pestaña sin URL válida**: Se asigna about:blank como fallback

### Recovery
- El sistema es resiliente y siempre puede crear una sesión funcional
- En caso de error, se crea una pestaña por defecto con Google
- Los errores se logean para debugging

## 📊 Métricas y Logging

### Console Logs
- `📋 Sistema de sesiones` - Información de inicialización
- `💾 Sesión guardada` - Confirmación de guardado
- `🔄 Sesión restaurada` - Confirmación de restauración
- `🌐 Sesión por defecto` - Creación de sesión nueva

### Estado Observable
- Número de pestañas activas
- ID de pestaña activa
- Timestamp de última modificación
- Estado de sincronización con localStorage

## 🛠️ Configuración

### LocalStorage Key
```typescript
const STORAGE_KEY = 'koko-browser-session';
```

### Versioning
```typescript
const SESSION_VERSION = '1.0.0';
```

## 🔮 Futuras Mejoras

1. **Múltiples Sesiones**: Permitir guardar/cargar múltiples sesiones con nombres
2. **Sincronización Cloud**: Sincronizar sesiones entre dispositivos
3. **Historial de Sesiones**: Mantener historial de sesiones anteriores
4. **Configuración**: Permitir desactivar/configurar el sistema de sesiones
5. **Importar/Exportar**: Funcionalidad para backup de sesiones

---

*Documentación técnica del sistema de sesiones - Koko Browser v1.0.0*