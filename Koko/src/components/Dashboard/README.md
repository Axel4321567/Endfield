# Dashboard Component Architecture

## 📁 Estructura de Archivos

```
src/components/Dashboard/
├── Dashboard.tsx          # Componente principal (contenedor)
├── Dashboard.css          # Estilos globales del dashboard
├── SessionStatus.tsx      # Muestra el estado actual de la sesión
├── ActionButton.tsx       # Botón de acción reutilizable
├── SessionInstructions.tsx# Instrucciones de uso
└── DashboardCard.tsx      # Tarjeta de información genérica
```

## 🎯 Principios de Diseño

### 1. **Separación de Responsabilidades**
- **Dashboard.tsx**: Maneja la lógica y orquesta los subcomponentes
- **Componentes específicos**: Cada uno tiene una responsabilidad única
- **CSS externo**: Sin estilos inline, todo en archivos `.css`

### 2. **Componentización**
Cada pieza visual es un componente independiente:
- `SessionStatus`: Estado de pestañas y sesión
- `ActionButton`: Botones con variantes (primary, danger, success)
- `SessionInstructions`: Lista de instrucciones
- `DashboardCard`: Tarjetas de información

### 3. **Reutilización**
```tsx
// Ejemplo: ActionButton se puede usar con diferentes variantes
<ActionButton variant="primary" icon="📋" onClick={handler}>
  Ver Sesión
</ActionButton>

<ActionButton variant="danger" icon="🗑️" onClick={handler}>
  Limpiar Sesión
</ActionButton>
```

### 4. **Tipado Fuerte**
Todos los componentes usan TypeScript con interfaces:
```tsx
interface SessionStatusProps {
  tabsCount: number;
  activeTabId: string | null;
  hasSession: boolean;
}
```

### 5. **Performance**
- `useCallback` para memoizar funciones
- `useRef` para evitar re-renders innecesarios
- Componentes pequeños y focalizados

## 📊 Flujo de Datos

```
Dashboard (contenedor)
  ├─> useSessionManager() → session data
  ├─> useTabs() → tabs, activeTabId
  ├─> useLogger() → addLog
  │
  ├─> SessionStatus (presentacional)
  │     └─> Recibe: tabsCount, activeTabId, hasSession
  │
  ├─> ActionButton (presentacional) × 3
  │     └─> Recibe: onClick, variant, icon, children
  │
  ├─> SessionInstructions (presentacional)
  │     └─> Sin props (estático)
  │
  └─> DashboardCard (presentacional) × 3
        └─> Recibe: title, content
```

## 🎨 Sistema de Estilos

### BEM Methodology
Usamos BEM (Block Element Modifier) para nomenclatura:

```css
/* Block */
.session-status {}

/* Element */
.session-status__title {}
.session-status__items {}
.session-status__item {}

/* Modifier */
.session-status__value--count {}
.session-status__value--success {}
.session-status__value--error {}
```

### Variantes de ActionButton
```css
.action-button--primary   /* Azul - Acción principal */
.action-button--danger    /* Rojo - Acción destructiva */
.action-button--success   /* Verde - Acción positiva */
```

## 🔧 Mantenibilidad

### Ventajas de esta arquitectura:

1. **Fácil de testear**: Cada componente es independiente
2. **Fácil de modificar**: Cambios localizados sin efectos secundarios
3. **Fácil de entender**: Estructura clara y predecible
4. **Reutilizable**: Componentes se pueden usar en otras partes
5. **Escalable**: Fácil agregar nuevos componentes

### Ejemplo de extensión:

```tsx
// Agregar un nuevo botón es trivial:
<ActionButton 
  variant="primary" 
  icon="📊" 
  onClick={handleExport}
>
  Exportar Datos
</ActionButton>

// Crear nueva variante en CSS:
.action-button--info {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
```

## 🎯 Mejores Prácticas Aplicadas

✅ **Sin estilos inline**: Todo en archivos CSS  
✅ **Componentización**: Divide y vencerás  
✅ **Tipado fuerte**: TypeScript en todos los componentes  
✅ **Hooks optimizados**: useCallback para funciones  
✅ **Accesibilidad**: Focus states y aria attributes  
✅ **Responsive**: Media queries para mobile  
✅ **Dark mode**: Soporte para prefers-color-scheme  
✅ **Animaciones**: Transiciones suaves con CSS  
✅ **Performance**: Componentes memoizados y optimizados  

## 📝 Convenciones de Código

### Imports
```tsx
// 1. React imports
import { useEffect, useCallback } from 'react';

// 2. Custom hooks
import { useSessionManager } from '../../hooks/useSessionManager';

// 3. Components
import { SessionStatus } from './SessionStatus';

// 4. Styles
import './Dashboard.css';
```

### Naming
- **Componentes**: PascalCase (Dashboard, ActionButton)
- **Funciones**: camelCase (handleClearSession)
- **CSS classes**: kebab-case con BEM (.session-status__title)
- **Archivos**: PascalCase para componentes (Dashboard.tsx)

## 🚀 Próximos Pasos

Posibles mejoras futuras:
- [ ] Agregar tests unitarios con Vitest
- [ ] Implementar Storybook para documentación visual
- [ ] Agregar más variantes de ActionButton
- [ ] Crear más DashboardCards con datos reales
- [ ] Implementar lazy loading de componentes
- [ ] Agregar animaciones con Framer Motion
