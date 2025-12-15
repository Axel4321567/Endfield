# Sidebar Component

## 📋 Descripción
Barra lateral de navegación con opciones de menú, expansión/colapso, y coordinación con VS Code embebido. Proporciona acceso a todas las secciones de la aplicación.

## 📁 Estructura de Archivos

```
Sidebar/
├── Sidebar.tsx  # Componente principal
└── Sidebar.css  # Estilos y animaciones
```

## 🔧 Funcionalidades Principales

### 1. Navegación Principal
Botones para acceder a:
- Dashboard
- Koko Web (navegador)
- Discord
- Password Manager
- Koko Code (VS Code)
- Extras (desplegable)
  - Database
  - HeidiSQL/phpMyAdmin
- Terminal (toggle bottom)

### 2. Collapse/Expand
- Botón toggle en header
- Animación CSS suave (300ms)
- Modo compacto: Solo iconos
- Modo expandido: Iconos + texto

### 3. Coordinación con VS Code
- Notifica cambios a Electron
- Redimensiona VS Code al colapsar/expandir
- Calcula desde `.content-area`
- Delay de 310ms para esperar animación

### 4. Submenu "Extras"
- Expansión/colapso con chevron animado
- Database y HeidiSQL como subopciones
- Indicador visual de submenu activo

## 📊 Flujo de Funcionamiento

```
┌─────────────────────┐
│ Sidebar             │
└──────────┬──────────┘
           │
           ├─► Usuario hace clic en toggle
           │   ├─► onToggle() → actualiza isCollapsed
           │   ├─► useEffect detecta cambio
           │   │   ├─► electronAPI.app.notifySidebarChange()
           │   │   └─► setTimeout 310ms
           │   │       ├─► Calcular .content-area bounds
           │   │       └─► electronAPI.kokoCode.resize()
           │   └─► CSS anima transición (300ms)
           │
           ├─► Usuario hace clic en opción
           │   └─► onSelectOption(option)
           │       └─► Actualiza selectedOption en App.tsx
           │
           ├─► Usuario hace clic en "Extras"
           │   └─► toggleExtras()
           │       └─> setExtrasExpanded(!extrasExpanded)
           │
           └─► Usuario hace clic en terminal icon
               └─► handleTerminalToggle()
                   └─► setTerminalOpen(!terminalOpen)
```

## 🎯 Props

```typescript
interface SidebarProps {
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}
```

### selectedOption
Opción actualmente seleccionada, define el estilo `active` de botones.

### onSelectOption
Callback para cambiar de vista, se ejecuta al hacer clic en cualquier botón.

### isCollapsed
Estado del sidebar (colapsado o expandido).

### onToggle
Callback para toggle collapse/expand.

## 🎨 Estados Locales

```typescript
const [extrasExpanded, setExtrasExpanded] = useState(false);
```

### extrasExpanded
Controla si el submenu "Extras" está abierto o cerrado.

## 🎨 Iconos SVG Personalizados

Todos los iconos son componentes SVG inline:

```typescript
const DashboardIcon = () => <svg>...</svg>;
const BrowserIcon = () => <svg>...</svg>;
const DiscordIcon = () => <svg>...</svg>;
const PasswordIcon = () => <svg>...</svg>;
const CodeIcon = () => <svg>...</svg>;
const ServicesIcon = () => <svg>...</svg>;
const TerminalIcon = () => <svg>...</svg>;
const MenuIcon = () => <svg>...</svg>;
const ChevronIcon = ({ isOpen }) => <svg style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>...</svg>;
```

### ChevronIcon Animado
```typescript
<ChevronIcon isOpen={extrasExpanded} />
```
Rota 90° cuando `extrasExpanded` es true.

## 🔄 Coordinación con VS Code

### useEffect Hook
```typescript
useEffect(() => {
  // Notificar a Electron inmediatamente
  window.electronAPI?.app?.notifySidebarChange();
  
  // Esperar animación CSS (300ms) + margen (10ms) = 310ms
  setTimeout(() => {
    const contentArea = document.querySelector('.content-area');
    const contentRect = contentArea.getBoundingClientRect();
    
    // Solo redimensionar si koko-code está activo
    const bounds = selectedOption === 'koko-code' ? {
      x: Math.round(contentRect.left),
      y: Math.round(contentRect.top),
      width: Math.round(contentRect.width),
      height: Math.round(contentRect.height)
    } : {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    
    window.electronAPI.kokoCode.resize(bounds);
  }, 310);
}, [isCollapsed]);
```

**Importante:**
- ✅ Calcula desde `.content-area` (no desde sidebar)
- ✅ Delay de 310ms para esperar animación
- ✅ Redimensiona solo si koko-code activo
- ✅ Oculta VS Code (0x0) si otra vista activa

## 🎨 CSS y Animaciones

### Clases
```css
.sidebar-container { /* Estado expandido */ }
.sidebar-container.collapsed { /* Estado colapsado */ }
.sidebar-button { /* Botones de navegación */ }
.sidebar-button.active { /* Botón activo */ }
```

### Animación de Collapse
```css
.sidebar-container {
  width: 280px;
  transition: width 300ms ease;
}

.sidebar-container.collapsed {
  width: 60px;
}
```

### Borde Derecho
```css
.sidebar-container {
  border-right: 1px solid #404040;
}
```
**Importante:** Este 1px es incluido en `.content-area.left`.

## 🎯 Opciones de Navegación

### Principales
- `dashboard` - Dashboard
- `koko-web` - Navegador
- `discord` - Cliente Discord
- `password-manager` - Gestor de contraseñas
- `koko-code` - VS Code embebido

### Extras (Submenu)
- `extras-database` - Database Manager
- `extras-heidisql` - phpMyAdmin

### Especiales
- Terminal toggle (bottom panel)

## 🔗 Integración con LogsContext

```typescript
const { terminalOpen, setTerminalOpen } = useLogger();
```

### terminalOpen
Estado global del panel de terminal (bottom).

### setTerminalOpen
Toggle para mostrar/ocultar terminal.

## 📊 Render Structure

```tsx
<div className="sidebar-container">
  <div className="sidebar-header">
    {!isCollapsed && <h1>Koko</h1>}
    <button onClick={onToggle}>
      <MenuIcon />
    </button>
  </div>
  
  <nav className="sidebar-nav">
    <button onClick={() => handleOptionClick('dashboard')}>
      <DashboardIcon />
      {!isCollapsed && <span>Dashboard</span>}
    </button>
    
    {/* ... más botones ... */}
    
    <button onClick={toggleExtras}>
      <ServicesIcon />
      {!isCollapsed && <span>Extras</span>}
      <ChevronIcon isOpen={extrasExpanded} />
    </button>
    
    {extrasExpanded && (
      <>
        <button onClick={() => handleOptionClick('extras-database')}>
          {/* Database */}
        </button>
        <button onClick={() => handleOptionClick('extras-heidisql')}>
          {/* HeidiSQL */}
        </button>
      </>
    )}
    
    <button onClick={handleTerminalToggle}>
      <TerminalIcon />
      {!isCollapsed && <span>Terminal</span>}
    </button>
  </nav>
</div>
```

## 💡 Características Especiales

### 1. Título Condicional
```tsx
{!isCollapsed && <h1 className="sidebar-title">Koko</h1>}
```
Solo muestra título cuando está expandido.

### 2. Tooltip en Modo Colapsado
```tsx
<button title={isCollapsed ? 'Dashboard' : ''}>
```
Muestra nombre al hacer hover si está colapsado.

### 3. Submenu Animado
```tsx
{extrasExpanded && (
  <>
    <button>Database</button>
    <button>HeidiSQL</button>
  </>
)}
```
Monta/desmonta subopciones con transición CSS.

### 4. Botón Activo
```tsx
className={`sidebar-button ${selectedOption === 'dashboard' ? 'active' : ''}`}
```
Resalta opción seleccionada.

## 🔧 APIs de Electron

### app.notifySidebarChange()
```typescript
window.electronAPI.app.notifySidebarChange();
```
Notifica a Electron que el sidebar cambió (para coordinación general).

### kokoCode.resize(bounds)
```typescript
window.electronAPI.kokoCode.resize({
  x: 288,
  y: 0,
  width: 1632,
  height: 1080
});
```
Redimensiona VS Code al cambiar sidebar.

## 🎨 Estados Visuales

### Expandido
- Ancho: 280px
- Muestra texto + iconos
- Animación suave

### Colapsado
- Ancho: 60px
- Solo iconos
- Tooltips activados

### Botón Activo
- Color de fondo resaltado
- Borde izquierdo de acento
- Efecto visual diferenciado

## 🚀 Mejoras Futuras

1. **Scroll en sidebar largo**
```css
.sidebar-nav {
  overflow-y: auto;
  max-height: calc(100vh - 60px);
}
```

2. **Badges de notificación**
```tsx
<button>
  <DiscordIcon />
  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</button>
```

3. **Arrastrar para reordenar**
Drag & drop para personalizar orden de opciones.

4. **Temas personalizados**
Iconos y colores configurables.

5. **Shortcuts de teclado**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === '1') onSelectOption('dashboard');
    // ...
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```
