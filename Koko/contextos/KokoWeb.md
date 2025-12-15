# KokoWeb Component

## 📋 Descripción
Navegador web completo integrado en Koko Browser con soporte para pestañas, marcadores, búsqueda integrada, y navegación usando Electron WebView o iframe según el entorno.

## 📁 Estructura de Archivos

```
KokoWeb/
├── SimpleKokoWeb.tsx        # Componente principal
├── SimpleKokoWeb.css        # Estilos del navegador
└── components/
    ├── BrowserTopBar.tsx    # Barra superior con URL y controles
    ├── TabBar.tsx           # Barra de pestañas
    ├── ElectronWebView.tsx  # WebView de Electron
    ├── SpeedDial.tsx        # Acceso rápido a sitios
    └── BookmarkManager.tsx  # Gestor de marcadores
```

## 🔧 Funcionalidades Principales

### 1. Gestión de Pestañas
- Crear nuevas pestañas
- Cerrar pestañas
- Cambiar entre pestañas
- Tab activa destacada visualmente
- Persistencia de sesión

### 2. Navegación Web
- **Electron**: WebView nativo con aislamiento
- **Web**: iframe con sandbox
- Barra de URL con detección automática
- Botones adelante/atrás
- Recarga de página

### 3. Búsqueda Integrada
- Detección automática de búsquedas vs URLs
- Búsqueda directa en Google/DuckDuckGo/Bing
- Extracción de queries de URLs de búsqueda
- Modo búsqueda con resultados integrados

### 4. Marcadores
- Agregar/eliminar marcadores
- Gestor visual de marcadores
- Acceso rápido desde topbar
- Persistencia local

### 5. SpeedDial
- Accesos rápidos a sitios frecuentes
- Grid de favoritos con iconos
- Personalizable

## 🎣 Props

```typescript
interface SimpleKokoWebProps {
  tabsManager: TabsManager;
}
```

### TabsManager
Gestiona el estado de las pestañas:
```typescript
interface TabsManager {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: (url?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabUrl: (id: string, url: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabFavicon: (id: string, favicon: string) => void;
}
```

## 📊 Estados del Componente

```typescript
// Entorno
const [isElectron, setIsElectron] = useState(false);

// UI
const [showBookmarkManager, setShowBookmarkManager] = useState(false);

// Puppeteer (deprecado)
const [puppeteerUrl, setPuppeteerUrl] = useState('https://www.google.com');
const [isPuppeteerOpen, setIsPuppeteerOpen] = useState(false);
const [isPuppeteerLoading, setIsPuppeteerLoading] = useState(false);

// Búsqueda
const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
const [isSearchMode, setIsSearchMode] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [isProxyAvailable, setIsProxyAvailable] = useState<boolean | null>(null);

// Control de carga
const [loadingTimeouts, setLoadingTimeouts] = useState<Map<string, number>>(new Map());

// Refs
const webviewRef = useRef<any>(null);
const iframeRef = useRef<HTMLIFrameElement>(null);
const sessionLoadedRef = useRef(false);
const isLoadingSessionRef = useRef(false);
```

## 🔍 Detección de Búsquedas vs URLs

### isSearchQuery(input)
```typescript
const isSearchQuery = (input: string): boolean => {
  // Tiene protocolo → URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return false;
  }
  
  // Parece dominio (punto sin espacios) → URL
  if (input.includes('.') && !input.includes(' ')) {
    return false;
  }
  
  // Contiene espacios → Búsqueda
  if (input.includes(' ')) {
    return true;
  }
  
  // No tiene puntos → Búsqueda
  if (!input.includes('.')) {
    return true;
  }
  
  // Por defecto → URL
  return false;
};
```

**Ejemplos:**
- `https://google.com` → URL ✅
- `google.com` → URL ✅
- `cómo hacer pizza` → Búsqueda 🔍
- `pizza` → Búsqueda 🔍
- `localhost:3000` → URL ✅

## 🌐 Navegación

### handleNavigate(url)
Función principal de navegación que:
1. Detecta si es búsqueda o URL
2. Formatea URL si es necesario
3. Actualiza tab activa
4. Navega a la URL

```typescript
const handleNavigate = (url: string) => {
  if (isSearchQuery(url)) {
    // Es búsqueda → redirigir a Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    navigateToUrl(searchUrl);
  } else {
    // Es URL → asegurar protocolo
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    navigateToUrl(finalUrl);
  }
};
```

## 📑 Gestión de Pestañas

### Crear Tab
```typescript
tabsManager.createTab('https://google.com');
```

### Cerrar Tab
```typescript
tabsManager.closeTab(tabId);
```

### Cambiar Tab Activa
```typescript
tabsManager.setActiveTab(tabId);
```

### Actualizar Tab
```typescript
tabsManager.updateTabUrl(tabId, newUrl);
tabsManager.updateTabTitle(tabId, title);
tabsManager.updateTabFavicon(tabId, faviconUrl);
```

## 🎨 Componentes Hijos

### BrowserTopBar
Barra superior con:
- Input de URL
- Botones adelante/atrás
- Botón de recarga
- Botón de marcadores
- Título de la página

**Props:**
```typescript
interface BrowserTopBarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleBookmarks: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}
```

### TabBar
Barra de pestañas con:
- Lista de tabs
- Tab activa destacada
- Botón cerrar por tab
- Botón nueva tab
- Scroll horizontal

**Props:**
```typescript
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}
```

### ElectronWebView
WebView nativo de Electron:
```typescript
<webview
  src={url}
  partition="persist:kokoweb"
  allowpopups="false"
  webpreferences="contextIsolation=true"
/>
```

### SpeedDial
Grid de accesos rápidos con íconos y nombres.

### BookmarkManager
Modal con lista de marcadores:
- Agregar nuevo
- Eliminar existente
- Navegar a marcador

## 🔄 Flujo de Navegación

```
Usuario ingresa URL/búsqueda
         ↓
    isSearchQuery()
         ↓
   ┌─────┴─────┐
   ↓           ↓
Búsqueda      URL
   ↓           ↓
Google     Formatear
Search       URL
   ↓           ↓
   └─────┬─────┘
         ↓
  handleNavigate()
         ↓
  updateTabUrl()
         ↓
   WebView/iframe
   actualiza src
```

## 📝 Persistencia de Sesión

### Carga de Sesión
```typescript
useEffect(() => {
  if (!sessionLoadedRef.current && !isLoadingSessionRef.current) {
    isLoadingSessionRef.current = true;
    tabsManager.loadSession();
    sessionLoadedRef.current = true;
  }
}, []);
```

### Guardado Automático
El TabsManager guarda automáticamente cambios en tabs.

## 🔖 Marcadores

### Estructura
```typescript
interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
}
```

### Almacenamiento
LocalStorage: `koko-browser-bookmarks`

### Operaciones
- **Agregar**: Desde topbar o bookmark manager
- **Eliminar**: Desde bookmark manager
- **Navegar**: Click en marcador

## 🎯 Detección de Entorno

```typescript
useEffect(() => {
  setIsElectron(!!window.electronAPI);
}, []);
```

Si `window.electronAPI` existe → Electron
Sino → Web (usa iframe)

## ⚙️ Configuración de WebView

```tsx
<webview
  src={activeTab?.url}
  partition="persist:kokoweb"      // Sesión persistente
  allowpopups={false}               // Bloquear popups
  disablewebsecurity={true}         // Evitar CORS
  nodeintegration={false}           // Sin Node.js
  webpreferences="contextIsolation=true"
  useragent="Mozilla/5.0 (...) Chrome/120.0.0.0"
/>
```

## 🚨 Manejo de Errores

### URL Inválida
```typescript
try {
  new URL(url);
} catch {
  // No es URL válida, buscar en Google
  handleSearch(url);
}
```

### Tab No Existe
```typescript
if (!activeTab) {
  return <div>No hay tabs abiertas</div>;
}
```

## 💡 Características Especiales

### 1. Detección Inteligente
Distingue automáticamente entre búsquedas y URLs.

### 2. Partición Persistente
Sesión separada para navegación (`persist:kokoweb`).

### 3. Context Isolation
Aislamiento de contexto para seguridad.

### 4. User Agent Personalizado
Simula Chrome 120 para compatibilidad.

### 5. Lazy Loading
Tabs inactivas no cargan contenido hasta activarse.

## 🔗 Integración con TabsManager

KokoWeb es solo la UI, toda la lógica de tabs está en `useTabs`:
- Estado centralizado
- Persistencia automática
- Sincronización entre componentes

## 📊 Logs

Logs de detección de búsquedas:
```
🔍 [DETECCIÓN] Analizando entrada: pizza
🔍 [DETECCIÓN] Una palabra sin dominio - Es búsqueda - Interceptar
```

## 🎨 Estilos

### Layout
```css
.simple-koko-web {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

### TabBar
Scroll horizontal para muchas tabs.

### WebView
Ocupa todo el espacio disponible debajo de topbar y tabbar.

## 🛠️ Troubleshooting

### WebView no carga
- Verificar que `isElectron === true`
- Comprobar URL válida
- Revisar partition

### Tabs no persisten
- Verificar TabsManager.saveSession()
- Comprobar localStorage

### Búsquedas no detectadas
- Revisar logs de `isSearchQuery()`
- Verificar lógica de detección
