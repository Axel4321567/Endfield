# SessionRenderer Component

## 📋 Descripción
Componente utilitario que renderiza el contenido de las sesiones guardadas, usado principalmente para debugging y visualización de estado de tabs/sesiones.

## 📁 Ubicación
```
components/SessionRenderer/
└── SessionRenderer.tsx (si existe, o integrado en otros componentes)
```

## 🔧 Funcionalidades

### 1. Renderizado de Sesiones
- Muestra información de sesión actual
- Visualiza tabs guardadas
- Debugging de estado

### 2. Información Mostrada
- Lista de tabs (título, URL, favicon)
- Tab activa
- Metadata de sesión
- Timestamp de última modificación

## 🎯 Uso

```typescript
<SessionRenderer session={sessionData} />
```

## 📊 Datos de Sesión

```typescript
interface Session {
  tabs: Tab[];
  activeTabId: string;
  createdAt: string;
  updatedAt: string;
}
```

## 💡 Notas
- Usado principalmente en Dashboard
- Herramienta de debugging
- Visualización de estado interno
- No es componente crítico de UI
