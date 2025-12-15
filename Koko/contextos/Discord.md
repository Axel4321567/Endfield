# Discord Component

## 📋 Descripción
Componente que embebe Discord Web usando Electron WebView con sesión persistente, captura automática de credenciales y limpieza de interfaz.

## 📁 Estructura de Archivos

```
Discord/
├── DiscordPanelSimple.tsx  # Componente principal
└── DiscordPanelSimple.css  # Estilos del panel
```

## 🔧 Funcionalidades Principales

### 1. WebView Embebido
- Discord Web completamente funcional
- Sesión persistente con `partition:persist:discord`
- User agent personalizado (Chrome 120)
- Context isolation activado

### 2. Gestión de Sesión
- **Auto-login**: Restaura token guardado automáticamente
- **Persistencia**: Usa localStorage para mantener sesión
- **Captura de credenciales**: Inyecta script para capturar tokens
- **Remember me**: Activa opción de recordar sesión

### 3. Limpieza de UI
- **Modales bloqueados**: Remueve modales molestos cada 500ms
- **Líneas azules eliminadas**: Quita decoraciones de borde azules
- **CSS personalizado**: Interfaz más compacta estilo Opera
- **Sidebar reducida**: 50px de ancho
- **Avatares optimizados**: 40x40px
- **Miembros compactos**: Padding reducido

### 4. Seguridad
- Bloqueo de popups
- `disablewebsecurity` para evitar CORS
- Context isolation activado
- Preload script para seguridad

## 🎣 Hooks Utilizados

### useLogger
```typescript
const { addLog } = useLogger();
```
Sistema de logging categorizado para eventos de Discord.

### useRef
```typescript
const webviewRef = useRef<any>(null);
```
Referencia al elemento webview para control directo.

## 📊 Flujo de Funcionamiento

```
┌─────────────────────┐
│ DiscordPanel        │
│ Component Mount     │
└──────────┬──────────┘
           │
           ├─► Crear webview con partition persist
           │
           ├─► Evento: dom-ready
           │   ├─► Ejecutar cleanUIScript
           │   │   ├─► hideModals() cada 500ms
           │   │   └─► removeBlueLines() cada 500ms
           │   └─► Inyectar cleanCSS (5 intentos)
           │
           ├─► Evento: did-finish-load
           │   ├─► Inyectar script de captura (una vez)
           │   │   └─► window.electronAPI.credentialCapture.inject()
           │   │
           │   └─► Restaurar sesión
           │       ├─► Obtener token guardado
           │       │   └─► window.electronAPI.discord.getToken()
           │       ├─► Inyectar token en localStorage
           │       │   ├─► localStorage.setItem("token", ...)
           │       │   ├─► localStorage.setItem('discord_persistent_session', 'true')
           │       │   └─► localStorage.setItem('discord_remember_me', 'true')
           │       └─► Redirigir a /app si no está
           │
           └─► Evento: new-window
               └─► Bloquear popups (e.preventDefault())
```

## 🎨 CSS Personalizado

### Limpieza General
```css
* { 
  border: none !important; 
  outline: none !important; 
}
```

### Optimizaciones de Espacio
- **Sidebar**: 50px → Avatar lista compacta
- **Avatares**: 40x40px → Más pequeños
- **Container**: Margen ajustado para sidebar
- **Toolbar**: 40px altura
- **Miembros**: 36px altura, padding reducido

### Modales
```css
[class*="modal"], [class*="backdrop"] { 
  display: none !important; 
}
```

## 🔐 Sistema de Tokens

### Captura
Script inyectado captura token automáticamente cuando el usuario inicia sesión.

### Almacenamiento
```typescript
await window.electronAPI.discord.getToken();
```
Token almacenado de forma segura en el sistema.

### Restauración
```javascript
localStorage.setItem("token", '"${savedToken}"');
```
Token restaurado automáticamente al cargar.

### Persistencia
```javascript
localStorage.setItem('discord_persistent_session', 'true');
localStorage.setItem('discord_remember_me', 'true');
```

## 🧹 Scripts de Limpieza

### hideModals()
```javascript
document.querySelectorAll('[class*="modal"], [class*="backdrop"]')
  .forEach(el => {
    el.style.display = 'none';
    el.remove();
  });
```
Ejecutado cada 500ms para remover modales.

### removeBlueLines()
```javascript
document.querySelectorAll('*').forEach(el => {
  const style = window.getComputedStyle(el);
  if (style.borderColor.includes('blue') || 
      style.borderColor.includes('#5865f2')) {
    el.style.border = 'none';
  }
});
```
Elimina decoraciones azules de Discord.

## ⚙️ Configuración de WebView

```tsx
<webview
  src="https://discord.com/app"
  partition="persist:discord"           // Sesión persistente
  preload="file://electron/preload-webview.js"
  allowpopups={false}                   // Bloquear popups
  disablewebsecurity={true}             // Evitar CORS
  nodeintegration={false}               // Sin Node en webview
  webpreferences="contextIsolation=true"
  useragent="Mozilla/5.0 (...) Chrome/120.0.0.0"
/>
```

## 📝 Eventos del WebView

### dom-ready
- Página cargada, DOM disponible
- Inyectar scripts de limpieza UI
- Aplicar CSS personalizado

### did-finish-load
- Carga completada
- Inyectar script de captura de credenciales (una vez)
- Restaurar token guardado
- Activar persistencia

### new-window
- Intento de abrir popup
- Bloqueado con `e.preventDefault()`

## 🎯 Props

```typescript
interface DiscordPanelProps {
  className?: string;
}
```

## 💡 Características Especiales

### 1. Inyección Única
Script de captura inyectado solo una vez usando flag `scriptsInjected`.

### 2. Reintento de CSS
CSS aplicado 5 veces con intervalo de 1s para garantizar aplicación.

### 3. Auto-redirect
Si no está en `/app` o `/channels`, redirige automáticamente.

### 4. Limpieza Continua
Scripts de limpieza ejecutados cada 500ms indefinidamente.

## 🔗 Dependencias de Electron

### electronAPI.credentialCapture
```typescript
await window.electronAPI.credentialCapture.inject(
  webContentsId, 
  'discord-full'
);
```
Inyecta script centralizado de captura y sesión.

### electronAPI.discord
```typescript
await window.electronAPI.discord.getToken();
```
Recupera token guardado del almacenamiento seguro.

## 📊 Logs Generados

- 🚀 **success**: Panel iniciado
- 🎯 **info**: WebView cargado
- ✅ **success**: Discord cargado
- 🔑 **info**: Token encontrado
- ✅ **success**: Script inyectado
- 🚫 **warn**: Popup bloqueado

## 🛠️ Troubleshooting

### Sesión no persiste
- Verificar que `partition="persist:discord"` está activo
- Comprobar que token se guarda correctamente
- Revisar localStorage en DevTools

### Modales aparecen
- Script de limpieza ejecutándose cada 500ms
- Verificar que no hay errores en consola

### No carga Discord
- Verificar conexión a internet
- Comprobar user agent
- Revisar configuración de webview
