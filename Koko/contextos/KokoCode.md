# KokoCode Component

## 📋 Descripción
Componente que embebe Visual Studio Code como ventana hija de Electron, permitiendo editar código directamente dentro de la aplicación Koko Browser.

Actualiza este md cuando actualizes Koko Code

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

**Manipulación de ventana:**
- `SetParent`: Establecer ventana padre (WS_CHILD)
- `SetWindowPos`: Posicionar y redimensionar
- `GetWindowLong`/`SetWindowLong`: Manipular estilos
- `SetFocus`, `BringWindowToTop`: Restaurar foco
- `InvalidateRect`, `UpdateWindow`: Forzar redibujado

**Subclassing (bloqueo de resize):**
- `SetWindowSubclass`: Interceptar mensajes de ventana (WM_NCHITTEST)
- `DefSubclassProc`: Pasar mensajes no manejados
- `RemoveWindowSubclass`: Limpiar subclass al desmontar

**Debugging (coordenadas):**
- `GetWindowRect`: Obtener coordenadas de pantalla
- `GetClientRect`: Obtener área cliente
- `ScreenToClient`: Convertir coordenadas pantalla → cliente
- `GetParent`: Obtener HWND de ventana padre
- Estructuras: `RECT` (Left, Top, Right, Bottom), `POINT` (X, Y)

## 🔒 Bloqueo de Resize Manual

### ⚠️ Problema
VS Code (basado en Electron/Chromium) responde internamente a `WM_NCHITTEST` reportando zonas de resize (HTLEFT, HTRIGHT, HTTOP, HTBOTTOM, etc.) independientemente de los estilos de ventana. Esto permite que el usuario arrastre los bordes para redimensionar manualmente.

### ❌ Solución Ingenua (No Usar)
Remover WS_CAPTION, WS_BORDER, WS_DLGFRAME y retornar HTCLIENT para todos los mensajes WM_NCHITTEST **rompe el layout interno de Chromium**, causando:
- Espacio vacío cerca del sidebar de VS Code
- Paneles mal alineados
- Editor desplazado

**Razón:** Chromium depende de hit-testing correcto para calcular áreas internas.

### ✅ Solución Estable de Doble Capa

#### Capa 1: Remover SOLO Estilos de Resize
```powershell
# SOLO remover estilos relacionados con resize
$newStyle = $currentStyle
$newStyle = $newStyle -band (-bnot [Win32]::WS_THICKFRAME)   # Resize borders
$newStyle = $newStyle -band (-bnot [Win32]::WS_SIZEBOX)      # Same as THICKFRAME
$newStyle = $newStyle -band (-bnot [Win32]::WS_MAXIMIZEBOX)  # Maximize button
$newStyle = $newStyle -band (-bnot [Win32]::WS_MINIMIZEBOX)  # Minimize button

# PRESERVAR estilos críticos para Chromium layout
# NO remover: WS_CAPTION, WS_BORDER, WS_DLGFRAME, WS_SYSMENU

# Añadir WS_CHILD y WS_VISIBLE
$newStyle = $newStyle -bor [Win32]::WS_CHILD -bor [Win32]::WS_VISIBLE

# Aplicar estilos
[Win32]::SetWindowLong($hwnd, $GWL_STYLE, $newStyle)

# Forzar actualización del frame no-cliente
[Win32]::SetWindowPos($hwnd, 0, 0, 0, 0, 0, 0x0063) # SWP_FRAMECHANGED
```

#### Capa 2: Interceptar SOLO Hit-Tests de Resize
```powershell
# Definir callback que intercepta WM_NCHITTEST selectivamente
$callbackCode = @'
using namespace System.Runtime.InteropServices
[DllImport("comctl32.dll", SetLastError = $true)]
public static extern IntPtr DefSubclassProc(
    IntPtr hWnd, uint uMsg, IntPtr wParam, IntPtr lParam
);

public static IntPtr SubclassProc(
    IntPtr hWnd, uint uMsg, IntPtr wParam, IntPtr lParam,
    IntPtr uIdSubclass, IntPtr dwRefData
) {
    const uint WM_NCHITTEST = 0x0084;
    const int HTCLIENT = 1;
    
    // Hit-test codes para resize
    const int HTLEFT = 10;
    const int HTRIGHT = 11;
    const int HTTOP = 12;
    const int HTBOTTOM = 15;
    const int HTTOPLEFT = 13;
    const int HTTOPRIGHT = 14;
    const int HTBOTTOMLEFT = 16;
    const int HTBOTTOMRIGHT = 17;
    
    if (uMsg == WM_NCHITTEST) {
        // Llamar al handler por defecto PRIMERO
        IntPtr result = DefSubclassProc(hWnd, uMsg, wParam, lParam);
        int hitTest = result.ToInt32();
        
        // SOLO convertir hit-tests de resize a HTCLIENT
        if (hitTest == HTLEFT || hitTest == HTRIGHT ||
            hitTest == HTTOP || hitTest == HTBOTTOM ||
            hitTest == HTTOPLEFT || hitTest == HTTOPRIGHT ||
            hitTest == HTBOTTOMLEFT || hitTest == HTBOTTOMRIGHT) {
            return new IntPtr(HTCLIENT);
        }
        
        // Pasar TODO lo demás sin modificar
        // (caption, close button, menu, etc.)
        return result;
    }
    
    return DefSubclassProc(hWnd, uMsg, wParam, lParam);
}
'@

# Instalar subclass con ID único
[Win32]::SetWindowSubclass($hwnd, $callback, 1000, [IntPtr]::Zero)
```

### 🔧 Función: fixEmbeddedVSCodeWindow(hwnd)

Implementada en `koko-code-handlers.js`, esta función aplica ambas capas:

**Paso 1: Remover SOLO estilos de resize**
- ✅ Elimina: WS_THICKFRAME, WS_SIZEBOX, WS_MAXIMIZEBOX, WS_MINIMIZEBOX
- ❌ PRESERVA: WS_CAPTION, WS_BORDER, WS_DLGFRAME, WS_SYSMENU
- Añade: WS_CHILD y WS_VISIBLE
- Aplica: SWP_FRAMECHANGED para forzar actualización del frame

**Paso 2: Instalar subclass WM_NCHITTEST selectivo**
- Intercepta WM_NCHITTEST ANTES de VS Code
- Llama a DefSubclassProc primero (obtener hit-test real)
- SOLO convierte hit-tests de resize a HTCLIENT:
  * HTLEFT, HTRIGHT, HTTOP, HTBOTTOM
  * HTTOPLEFT, HTTOPRIGHT, HTBOTTOMLEFT, HTBOTTOMRIGHT
- Pasa TODO lo demás sin modificar
- Usa `SetWindowSubclass` (no hooks globales)
- ID de subclass: 1000

**Resultado:**
- ❌ **Cursor de resize bloqueado** - bordes no muestran flechas de resize
- ❌ **Dragging de bordes bloqueado** - no responde a arrastre
- ✅ **SetWindowPos programático funciona** - resize automático intacto
- ✅ **Layout interno preservado** - sidebar, editor, paneles correctos
- ✅ **Hit-testing selectivo** - solo resize bloqueado, resto intacto
- ✅ **Sin hooks globales** - solo subclass local y segura
- ✅ **Idempotente** - seguro llamar múltiples veces

**Llamada en ciclo de vida:**
```javascript
// En embedVSCode() después de setWindowParent
await setWindowParent(vscodeHwnd, mainWindowHandle);
await fixEmbeddedVSCodeWindow(vscodeHwnd); // ← Aquí
```

### 📊 Flujo de Hit-Testing Selectivo

```
Usuario mueve cursor sobre ventana VS Code
    ↓
Windows envía WM_NCHITTEST a HWND de VS Code
    ↓
SetWindowSubclass intercepta mensaje
    ↓
Llama DefSubclassProc → obtiene hit-test real
    ↓
¿Es hit-test de resize (HTLEFT, HTRIGHT, etc.)?
    ├─► SÍ → Retorna HTCLIENT (bloquear resize)
    │        ↓
    │        Cursor: flecha normal (no resize)
    │        Dragging: no cambia tamaño
    │
    └─► NO → Retorna hit-test original
             ↓
             Cursor: normal según área (caption, botones, etc.)
             Click: funciona correctamente
             Layout: preservado
```

### 🔄 Re-aplicación de Estilos

Windows y VS Code pueden intentar restaurar estilos. Para prevenir esto:

**1. En setWindowParent (embed inicial)**
```javascript
await setWindowParent(childHwnd, parentHwnd);
await fixEmbeddedVSCodeWindow(childHwnd);
```

**2. En updateWindowBounds (cada resize programático)**
```powershell
# Después de SetWindowPos, re-aplicar SOLO estilos de resize
$currentStyle = [Win32]::GetWindowLong($hwnd, $GWL_STYLE)
$newStyle = $currentStyle
$newStyle = $newStyle -band (-bnot $WS_THICKFRAME)
$newStyle = $newStyle -band (-bnot $WS_SIZEBOX)
$newStyle = $newStyle -band (-bnot $WS_MAXIMIZEBOX)
$newStyle = $newStyle -band (-bnot $WS_MINIMIZEBOX)
# NO remover: WS_CAPTION, WS_BORDER, WS_DLGFRAME

if ($currentStyle -ne $newStyle) {
    [Win32]::SetWindowLong($hwnd, $GWL_STYLE, $newStyle)
    [Win32]::SetWindowPos($hwnd, 0, 0, 0, 0, 0, 0x0063)
}
```

**3. En enforceWindowStyles (monitor continuo, cada 500ms)**
```javascript
// Solo fuerza estilos de resize, NO caption/border
setInterval(() => enforceWindowStyles(hwnd), 500);
```

### 🎯 Comparación de Enfoques

| Aspecto | ❌ Ingenuo | ✅ Selectivo |
|---------|-----------|-------------|
| **Estilos removidos** | Todos (caption, border, etc.) | Solo resize (thickframe, sizebox) |
| **WM_NCHITTEST** | HTCLIENT siempre | HTCLIENT solo para resize |
| **Layout Chromium** | ❌ Roto | ✅ Preservado |
| **Sidebar VS Code** | ❌ Espacio vacío | ✅ Correcto |
| **Resize manual** | ✅ Bloqueado | ✅ Bloqueado |
| **Resize programático** | ✅ Funciona | ✅ Funciona |
| **Estabilidad** | ⚠️ Baja | ✅ Alta |

### ⚠️ Limitaciones y Consideraciones

**✅ Lo que funciona:**
- Bloqueo completo de resize manual por dragging
- Resize programático vía SetWindowPos
- Layout interno de VS Code preservado
- Focus y eventos de teclado/mouse
- Actualización automática desde React
- Hit-testing correcto para áreas no-resize

**❌ Lo que NO funciona (por diseño):**
- Usuario NO puede redimensionar arrastrando bordes
- Usuario NO puede usar botones maximize/minimize (removidos)
- Bordes NO responden a dragging

**🔐 Seguridad y Estabilidad:**
- Sin hooks globales (solo subclass local)
- Sin modificación del ejecutable de VS Code
- Solo afecta la instancia embebida
- Preserva layout interno de Chromium
- Cleanup automático al cerrar aplicación
- Idempotente (seguro re-aplicar)

## 🎨 Estilos NO Aplicados

VS Code es una ventana nativa, por lo que `.koko-code-container` solo sirve como:
- Ref para ResizeObserver
- Placeholder visual (aunque no se ve)

El CSS no afecta a VS Code directamente.

## 📊 Logs de Consola

### Logs Standard
```
🔄 [KokoCode] VS Code ya existe, mostrando y actualizando...
📐 [KokoCode Mount] Actualizando posición: { x, y, width, height }
📐 [KokoCode] Dimensiones calculadas desde .content-area: { ... }
⚠️ [KokoCode] Dimensiones inválidas, esperando...
📊 [Window Resize] Dimensiones: { ... }
📏 [Container Resize] Bounds calculados desde .content-area: { ... }
🔓 [KokoCode Cleanup] Desmontando componente...
```

### 🐛 Logs de Debugging (Layout)

#### Frontend (HTML/React)
Función helper `logLayoutDebug()` imprime coordenadas HTML en formato de caja:

```
==================================================
[LAYOUT DEBUG - Window Resize]
==================================================
Sidebar (HTML):
  left:   0
  top:    0
  width:  280
  height: 761

Content Area (HTML):
  left:   280
  top:    0
  width:  845
  height: 761
==================================================
```

**Se ejecuta en:**
- Mount (cuando VS Code ya existe)
- Initial Embed (primer embed)
- Window Resize
- ResizeObserver (sidebar collapse/expand)

#### Backend (Win32/PowerShell)
`updateWindowBounds()` imprime coordenadas Win32 antes y después de SetWindowPos:

```
==================================================
[WIN32 LAYOUT DEBUG - BEFORE SetWindowPos]
==================================================
VS Code HWND (Screen coordinates):
  x:      280
  y:      31
  width:  845
  height: 730

Parent Window (Screen coordinates):
  x:      100
  y:      100
  width:  1125
  height: 761

Parent Window (Client area):
  width:  1125
  height: 761

VS Code relative to Parent (Client coords):
  x: 180
  y: -69
==================================================

==================================================
[WIN32 LAYOUT DEBUG - AFTER SetWindowPos]
==================================================
VS Code HWND (Screen coordinates):
  x:      380
  y:      100
  width:  845
  height: 761

VS Code relative to Parent (Client coords):
  x: 280
  y: 0
==================================================
```

**Utilidad:**
- Diagnosticar offsets visuales
- Comparar coordenadas HTML vs Win32
- Detectar problemas de screen-to-client conversion
- Verificar posicionamiento correcto de ventana embebida

**Win32 APIs usadas para debugging:**
- `GetWindowRect` - coordenadas de pantalla
- `GetClientRect` - área cliente de ventana
- `ScreenToClient` - conversión de coordenadas
- Estructuras: `RECT`, `POINT`

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
