# Terminal Component

## 📋 Descripción
Terminal global embebido en la parte inferior que muestra logs categorizados de todas las secciones de la aplicación. Proviene del contexto `LogsContext`.

## 📁 Ubicación
```
components/Terminal/
├── Terminal.tsx
└── Terminal.css
```

## 🔧 Funcionalidades

### 1. Visualización de Logs
- Logs categorizados por sección (dashboard, koko-web, discord, database, extras, system)
- Niveles: info, success, warn, error
- Timestamps automáticos
- Auto-scroll al final

### 2. Filtrado por Sección
- Mostrar solo logs de la sección actual
- Vista "Todos" para ver todos los logs
- Contador por categoría

### 3. Controles
- Limpiar logs
- Toggle show/hide
- Auto-scroll on/off
- Exportar logs

## 🎨 Uso

### En LogsContext
```typescript
const { addLog } = useLogger();
addLog('Mensaje', 'info', 'dashboard');
```

### Props
```typescript
interface TerminalProps {
  currentSection: 'dashboard' | 'koko-web' | 'discord' | 'database' | 'extras' | 'system';
}
```

## 📊 Estructura de Log

```typescript
interface Log {
  id: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
  section: string;
  timestamp: Date;
}
```

## 🎨 Colores por Nivel
- info: Azul
- success: Verde
- warn: Amarillo
- error: Rojo

## 💡 Características
- Panel colapsable (bottom)
- Altura configurable
- Auto-scroll inteligente
- Logs persisten entre vistas
- Búsqueda en logs (futuro)
