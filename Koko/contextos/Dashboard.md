# Dashboard Component

## 📋 Descripción
Componente principal del Dashboard que muestra la vista de gestión de sesiones, estadísticas y control del sistema.

## 📁 Estructura de Archivos

```
Dashboard/
├── Dashboard.tsx          # Componente principal
├── Dashboard.css          # Estilos del dashboard
├── ActionButton.tsx       # Botón de acción reutilizable
├── DashboardCard.tsx      # Tarjeta informativa
├── DiscordPanel.tsx       # Panel de información de Discord
├── SessionInstructions.tsx # Instrucciones de uso
└── SessionStatus.tsx      # Estado de la sesión
```

## 🔧 Funcionalidades

### 1. Gestión de Sesiones
- **Ver Sesión**: Muestra información detallada de la sesión actual (pestañas, tab activa)
- **Limpiar Sesión**: Elimina la sesión guardada y recarga la aplicación
- **Recargar App**: Fuerza una recarga completa de la aplicación

### 2. Visualización de Estado
- Muestra número de pestañas activas
- Indica cuál es la pestaña activa actualmente
- Badge visual indicando si hay sesión guardada

### 3. Tarjetas Informativas
- Estadísticas del sistema
- Actividad reciente
- Configuración

## 🎣 Hooks Utilizados

### useSessionManager
```typescript
const sessionManager = useSessionManager();
```
- Gestiona el almacenamiento y recuperación de sesiones
- Métodos: `loadSession()`, `clearSession()`

### useTabs
```typescript
const { tabs, activeTabId } = useTabs();
```
- Gestiona el estado de las pestañas
- `tabs`: Array de pestañas abiertas
- `activeTabId`: ID de la pestaña activa

### useLogger
```typescript
const { addLog } = useLogger();
```
- Sistema de logging centralizado
- Registra acciones en la terminal con categorías y niveles

## 📊 Flujo de Funcionamiento

```
┌─────────────────┐
│  Dashboard      │
│  Mounted        │
└────────┬────────┘
         │
         ├─► Log inicial (una vez)
         │
         ├─► Renderiza SessionStatus
         │   └─► Muestra badges de estado
         │
         ├─► Renderiza ActionButtons
         │   ├─► Ver Sesión → loadSession() → alert()
         │   ├─► Limpiar Sesión → clearSession() → reload()
         │   └─► Recargar → window.location.reload()
         │
         └─► Renderiza DashboardCards
             └─► Información estática
```

## 🎨 Componentes Hijos

### SessionStatus
Muestra el estado actual de la sesión con badges visuales.

### ActionButton
Botón reutilizable con variantes:
- `primary`: Azul (Ver Sesión)
- `danger`: Rojo (Limpiar Sesión)
- `success`: Verde (Recargar)

### SessionInstructions
Instrucciones de uso con badge informativo.

### DashboardCard
Tarjeta de información genérica con título y contenido.

## 🔔 Sistema de Logs

Todas las acciones generan logs en la terminal:
- ✅ **success**: Acciones completadas exitosamente
- ℹ️ **info**: Información general
- ⚠️ **warn**: Advertencias

## 🎯 Props
Ninguna - componente autónomo que consume contextos globales.

## 💡 Notas de Implementación

1. **Logging único**: Usa `useRef` para evitar logs duplicados en mount
2. **useCallback**: Todas las funciones están memoizadas para evitar re-renders
3. **Feedback visual**: Alert boxes para confirmación de usuario
4. **Recarga automática**: Después de limpiar sesión se recarga la app

## 🔗 Dependencias

- `useSessionManager`: Hook personalizado de gestión de sesiones
- `useTabs`: Hook de estado de pestañas
- `LogsContext`: Contexto de logging global
