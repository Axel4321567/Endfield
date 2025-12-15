# KokoCode Component

## 📋 Descripción
Componente que embebe Visual Studio Code como ventana hija de Electron, permitiendo editar código directamente dentro de la aplicación Koko Browser.

## 📁 Estructura de Archivos

```
KokoCode/
├── KokoCode.tsx  # Componente principal
└── KokoCode.css  # Estilos del contenedor
```

## 🔧 Funcionalidades Principales

### 1. Embedding de VS Code
- Embebe VS Code como ventana WS_CHILD de Electron
- Detección automática de instancia existente
- Reutilización de instancia si ya existe
- Posicionamiento en `.content-area`

### 2. Gestión de Posición
- Cálculo desde `.content-area` (no desde sidebar)
- Actualización automática al redimensionar
- ResizeObserver para detectar cambios en sidebar
- Debouncing para evitar updates excesivos

### 3. Persistencia de Ventana
- No cierra VS Code al desmontar componente
- Solo oculta la ventana (resize 0x0)
- Reutiliza instancia al volver a montar
- Mantiene HWND en ref

### 4. Control de Visibilidad
- Muestra VS Code al montar si ya existe
- Oculta al desmontar
- Gestión coordinada con App.tsx

## 📊 Flujo de Funcionamiento

```
┌─────────────────────┐
│ KokoCode Mount      │
└──────────┬──────────┘
           │
           ├─► getInfo() - ¿VS Code existe?
           │   ├─► SÍ → Reutilizar
           │   │   ├─► Guardar HWND en ref
           │   │   ├─► setVisibility(true)
           │   │   ├─► Calcular bounds desde .content-area
           │   │   └─► updatePosition(bounds)
           │   │
           │   └─► NO → Crear nuevo
           │       ├─► Esperar frame (requestAnimationFrame)
           │       ├─► Calcular bounds desde .content-area
           │       ├─► Validar dimensiones > 0
           │       ├─► embedVSCode(bounds)
           │       ├─► Guardar HWND
           │       └─► setIsVSCodeEmbedded(true)
           │
           ├─► useEffect 2: Observadores
           │   ├─► window.addEventListener('resize')
           │   │   └─► Debounce 100ms → updatePosition()
           │   │
           │   └─► ResizeObserver en containerRef
           │       └─► Debounce 150ms → updatePosition()
           │
           └─► Cleanup
               ├─► removeEventListener('resize')
               ├─► resizeObserver.disconnect()
               └─► setVisibility(false)
```

## 🎯 Estados del Componente

```typescript
const [isVSCodeEmbedded, setIsVSCodeEmbedded] = useState(false);
const [error, setError] = useState<string | null>(null);
const hwndRef = useRef<number | null>(null);
const containerRef = useRef<HTMLDivElement>(null);
```

### hwndRef
- Almacena el HWND (handle de ventana nativa)
- Persiste entre renders
- Usado para todas las operaciones de posición

### isVSCodeEmbedded
- Indica si VS Code está embebido correctamente
- No se usa actualmente para renderizado condicional

### error
- Mensajes de error durante embed o actualización
- Se muestra en UI si existe

## 🔌 APIs de Electron

### kokoCode.getInfo()
```typescript
const info = await window.electronAPI.kokoCode.getInfo();
// Returns: { hwnd: number, visible: boolean }
```
Obtiene información de VS Code si ya está corriendo.

### kokoCode.embedVSCode(bounds)
```typescript
const result = await window.electronAPI.kokoCode.embedVSCode({
  x: 288,
  y: 0,
  width: 1632,
  height: 1080
});
// Returns: { success: boolean, hwnd?: number, error?: string }
```
Inicia y embebe VS Code por primera vez.

### kokoCode.updatePosition(bounds)
```typescript
await window.electronAPI.kokoCode.updatePosition({
  hwnd: 123456,
  x: 288,
  y: 0,
  width: 1632,
  height: 1080
});
```
Actualiza posición y tamaño de ventana existente.

### kokoCode.setVisibility(visible)
```typescript
await window.electronAPI.kokoCode.setVisibility(true);  // Mostrar
await window.electronAPI.kokoCode.setVisibility(false); // Ocultar (0x0)
```
Muestra u oculta la ventana.

### kokoCode.resize(bounds)
```typescript
await window.electronAPI.kokoCode.resize({
  x: 288,
  y: 0,
  width: 1632,
  height: 1080
});
```
Alternativa a updatePosition (sin HWND).

## 📐 Cálculo de Posición

### Desde .content-area
```typescript
const contentArea = document.querySelector('.content-area');
const contentRect = contentArea.getBoundingClientRect();

const bounds = {
  x: Math.round(contentRect.left),
  y: Math.round(contentRect.top),
  width: Math.round(contentRect.width),
  height: Math.round(contentRect.height)
};
```

**Ventajas:**
- ✅ Usa coordenadas reales del contenedor
- ✅ No necesita calcular desde sidebar
- ✅ No necesita sumar bordes manualmente
- ✅ Ocupa exactamente el espacio disponible

## ⏱️ Debouncing y Timers

### Window Resize: 100ms
```typescript
resizeTimeout = setTimeout(() => {
  updatePosition(bounds);
}, 100);
```
Espera a que termine el resize antes de actualizar.

### ResizeObserver: 150ms
```typescript
observerTimeout = setTimeout(() => {
  updatePosition(bounds);
}, 150);
```
Espera más tiempo para animaciones CSS (sidebar: 300ms).

### Initial Position: 100ms
```typescript
setTimeout(() => {
  updatePosition(bounds);
}, 100);
```
Da tiempo al DOM para estabilizarse.

## 🔄 ResizeObserver

Observa cambios en `containerRef` para detectar:
- Collapse/expand del sidebar
- Cambios en layout general
- Redimensionamiento del contenedor padre

```typescript
resizeObserver = new ResizeObserver((entries) => {
  // Debounce 150ms
  setTimeout(() => {
    for (const entry of entries) {
      if (hwndRef.current) {
        // Calcular y actualizar posición
      }
    }
  }, 150);
});
resizeObserver.observe(containerRef.current);
```

## 🧹 Cleanup

```typescript
return () => {
  console.log('🔓 [KokoCode Cleanup] Desmontando componente...');
  
  window.removeEventListener('resize', handleResize);
  
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  // Solo ocultar, NO cerrar
  if (window.electronAPI?.kokoCode?.setVisibility) {
    window.electronAPI.kokoCode.setVisibility(false);
  }
  
  clearTimeout(resizeTimeout);
  clearTimeout(observerTimeout);
  clearTimeout(initialResizeTimer);
};
```

**Importante:**
- ✅ Solo oculta VS Code (no cierra)
- ✅ Limpia event listeners
- ✅ Desconecta observers
- ✅ Limpia timers

## 🚨 Manejo de Errores

### Errores Comunes

1. **No se encuentra .content-area**
```
"No se encontró el contenedor .content-area"
```

2. **Dimensiones inválidas**
```
"Esperando dimensiones válidas..."
```

3. **API no disponible**
```
"API de Koko-Code no disponible"
```

4. **Error en embed**
```
"No se pudo embeber VS Code"
```

### Validaciones

```typescript
// Verificar dimensiones
if (bounds.width === 0 || bounds.height === 0) {
  setError('Esperando dimensiones válidas...');
  return;
}

// Verificar API
if (!window.electronAPI?.kokoCode?.embedVSCode) {
  setError('API de Koko-Code no disponible');
}
```

## 💡 Características Especiales

### 1. Detección de Instancia Existente
Verifica si VS Code ya está corriendo antes de crear nueva instancia.

### 2. Reutilización Inteligente
Si detecta instancia existente, solo actualiza posición en lugar de crear nueva.

### 3. Persistencia Global
VS Code persiste incluso al cambiar de vista o desmontar componente.

### 4. Sincronización con Sidebar
ResizeObserver detecta cambios en sidebar (collapse/expand).

### 5. requestAnimationFrame
Espera un frame antes de calcular dimensiones para asegurar layout estable.

## 🔧 Backend (Electron)

### koko-code-handlers.js
Handlers en Electron para:
- `koko-code-embed`: Iniciar y embeber VS Code
- `koko-code-update-position`: Actualizar posición
- `koko-code-resize`: Redimensionar
- `koko-code-set-visibility`: Mostrar/ocultar
- `koko-code-get-info`: Obtener información
- `koko-code-get-hwnd`: Obtener HWND

### Win32 APIs Usadas
- `SetParent`: Establecer ventana padre (WS_CHILD)
- `SetWindowPos`: Posicionar y redimensionar
- `GetWindowLong`/`SetWindowLong`: Manipular estilos
- `SetFocus`, `BringWindowToTop`: Restaurar foco
- `InvalidateRect`, `UpdateWindow`: Forzar redibujado

## 🎨 Estilos NO Aplicados

VS Code es una ventana nativa, por lo que `.koko-code-container` solo sirve como:
- Ref para ResizeObserver
- Placeholder visual (aunque no se ve)

El CSS no afecta a VS Code directamente.

## 📊 Logs de Consola

```
🔄 [KokoCode] VS Code ya existe, mostrando y actualizando...
📐 [KokoCode Mount] Actualizando posición: { x, y, width, height }
📐 [KokoCode] Dimensiones calculadas desde .content-area: { ... }
⚠️ [KokoCode] Dimensiones inválidas, esperando...
📊 [Window Resize] Dimensiones: { ... }
📏 [Container Resize] Bounds calculados desde .content-area: { ... }
🔓 [KokoCode Cleanup] Desmontando componente...
```

## 🎯 Props
Ninguna - componente autónomo.

## 🔗 Coordinación con App.tsx

App.tsx controla visibilidad global:
```typescript
useEffect(() => {
  if (selectedOption === 'koko-code') {
    window.electronAPI?.kokoCode?.setVisibility(true);
    // Actualizar tamaño...
  } else {
    window.electronAPI?.kokoCode?.setVisibility(false);
  }
}, [selectedOption]);
```

KokoCode.tsx solo gestiona:
- Embed inicial
- Actualización de posición
- Observadores de resize
