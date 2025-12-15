# MainContent Component

## 📋 Descripción
Componente router principal que renderiza el contenido de acuerdo a la opción seleccionada en el sidebar. Gestiona la visualización condicional de todos los componentes principales de la aplicación.

## 📁 Estructura de Archivos

```
MainContent/
├── MainContent.tsx  # Componente router principal
└── MainContent.css  # Estilos del contenedor
```

## 🔧 Funcionalidades Principales

### 1. Router de Componentes
Renderiza condicionalmente componentes según `selectedOption`:
- `dashboard` → Dashboard
- `koko-web` → SimpleKokoWeb
- `discord` → DiscordPanelSimple
- `password-manager` → PasswordManager
- `koko-code` → KokoCode
- `database` / `extras-database` → DatabaseManager
- `extras-heidisql` → PhpMyAdmin
- `null` → Mensaje de bienvenida

### 2. Optimización de Renderizado
- Renderizado condicional (no usa `display: none`)
- Solo monta componentes cuando están seleccionados
- Desmonta componentes al cambiar de vista
- Reduce consumo de memoria

### 3. Layouts Específicos
Cada componente tiene su propio contenedor con estilos específicos:
- `flex` layouts para componentes que ocupan todo el espacio
- `overflow` controlado según necesidades
- `padding` solo donde es necesario

## 📊 Flujo de Funcionamiento

```
┌─────────────────────┐
│ MainContent         │
│ Props: selectedOption│
└──────────┬──────────┘
           │
           ├─► selectedOption === 'dashboard'
           │   └─► Renderizar <Dashboard />
           │
           ├─► selectedOption === 'koko-web'
           │   └─► Renderizar <SimpleKokoWeb />
           │
           ├─► selectedOption === 'discord'
           │   └─► Renderizar <DiscordPanelSimple />
           │
           ├─► selectedOption === 'password-manager'
           │   └─► Renderizar <PasswordManager />
           │
           ├─► selectedOption === 'koko-code'
           │   └─► Renderizar <KokoCode />
           │
           ├─► selectedOption === 'database' || 'extras-database'
           │   └─► Renderizar <DatabaseManager />
           │
           ├─► selectedOption === 'extras-heidisql'
           │   └─► Renderizar <PhpMyAdmin />
           │
           └─► selectedOption === null
               └─► Renderizar mensaje de bienvenida
```

## 🎯 Props

```typescript
interface MainContentProps {
  selectedOption: string | null;
  tabsManager: TabsManager;
  onSelectOption: (option: string) => void;
}
```

### selectedOption
- Opción actualmente seleccionada en el sidebar
- `null` cuando no hay selección
- Define qué componente renderizar

### tabsManager
- Gestor de pestañas para KokoWeb
- Pasado directamente a `<SimpleKokoWeb />`
- Controla tabs del navegador

### onSelectOption
- Callback para cambiar de vista
- Pasado a `<DatabaseManager />` para navegación interna
- Permite navegación desde componentes hijos

## 🎨 Layouts por Componente

### Dashboard
```tsx
<div style={{ display: 'block' }}>
  <Dashboard />
</div>
```
Layout simple de bloque.

### KokoWeb
```tsx
<div style={{ 
  display: 'flex',
  flex: 1,
  height: '100%',
  width: '100%'
}}>
  <SimpleKokoWeb tabsManager={tabsManager} />
</div>
```
Flex container que ocupa todo el espacio.

### Discord
```tsx
<div style={{ display: 'flex' }}>
  <DiscordPanelSimple />
</div>
```
Flex container simple.

### PasswordManager
```tsx
<div style={{ 
  display: 'flex',
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'hidden'
}}>
  <PasswordManager />
</div>
```
Flex fullscreen con overflow hidden.

### KokoCode
```tsx
<div style={{ 
  display: 'flex',
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'hidden'
}}>
  <KokoCode />
</div>
```
Flex fullscreen con overflow hidden (VS Code embebido).

### Database
```tsx
<div style={{ 
  display: 'flex',
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'auto',
  padding: '1rem'
}}>
  <DatabaseManager onNavigate={onSelectOption} />
</div>
```
Flex fullscreen con scroll y padding.

### PhpMyAdmin
```tsx
<div style={{ 
  display: 'flex',
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'hidden'
}}>
  <PhpMyAdmin />
</div>
```
Flex fullscreen con overflow hidden.

## 🔄 Renderizado Condicional

### Estrategia
Usa renderizado condicional real (`&&`) en lugar de `display: none`:

```tsx
{selectedOption === 'dashboard' && <Dashboard />}
```

**Ventajas:**
- ✅ Componentes no seleccionados NO están en el DOM
- ✅ No consumen recursos
- ✅ No ejecutan efectos
- ✅ Mejor rendimiento

**Desventajas:**
- ❌ Componentes se desmontan al cambiar vista
- ❌ Estado local se pierde (mitigado con contextos)
- ❌ Re-mount puede ser costoso

### Casos Especiales

#### Database
```tsx
{(selectedOption === 'database' || selectedOption === 'extras-database') && ...}
```
Renderiza el mismo componente para dos opciones diferentes.

## 💡 Características Especiales

### 1. Paso de Props Selectivo
Solo `SimpleKokoWeb` recibe `tabsManager`:
```tsx
<SimpleKokoWeb tabsManager={tabsManager} />
```

Solo `DatabaseManager` recibe `onNavigate`:
```tsx
<DatabaseManager onNavigate={onSelectOption} />
```

### 2. Estilos Inline
Todos los estilos son inline para:
- Mayor claridad
- Evitar conflictos de CSS
- Facilitar mantenimiento por componente

### 3. Mensaje de Bienvenida
```tsx
{!selectedOption && (
  <div className="welcome-message">
    <h1>Bienvenido a Koko Browser</h1>
    <p>Selecciona una opción del menú lateral</p>
  </div>
)}
```

## 🔗 Componentes Renderizados

1. **Dashboard** - Gestión de sesiones
2. **SimpleKokoWeb** - Navegador con tabs
3. **DiscordPanelSimple** - Cliente Discord
4. **PasswordManager** - Gestor de contraseñas
5. **KokoCode** - VS Code embebido
6. **DatabaseManager** - MariaDB, PHP, phpMyAdmin
7. **PhpMyAdmin** - phpMyAdmin embebido

## 📦 Imports

```typescript
import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import DiscordPanelSimple from '../Discord/DiscordPanelSimple';
import { DatabaseManager } from '../Database/DatabaseManager';
import { PhpMyAdmin } from '../Database/PhpMyAdmin';
import PasswordManager from '../PasswordManager';
import { KokoCode } from '../KokoCode/KokoCode';
import type { TabsManager } from '../../types';
```

## 🎯 Uso en App.tsx

```tsx
<MainContent 
  selectedOption={selectedOption}
  tabsManager={tabsManager}
  onSelectOption={handleSelectOption}
/>
```

## 🚀 Optimizaciones Futuras

1. **Lazy Loading**
```tsx
const Dashboard = lazy(() => import('../Dashboard/Dashboard'));
```

2. **Keep Alive**
Mantener componentes montados pero ocultos:
```tsx
<div style={{ display: selectedOption === 'dashboard' ? 'block' : 'none' }}>
  <Dashboard />
</div>
```

3. **Transiciones**
Animaciones al cambiar entre componentes.

4. **Error Boundaries**
Capturar errores de componentes hijos.

## 🔍 Debugging

### Ver qué componente está renderizado
```typescript
console.log('Selected option:', selectedOption);
console.log('Rendered component:', 
  selectedOption === 'dashboard' ? 'Dashboard' :
  selectedOption === 'koko-web' ? 'KokoWeb' :
  // ...
);
```

### Verificar props
```typescript
console.log('TabsManager:', tabsManager);
console.log('onSelectOption:', typeof onSelectOption);
```

## 💻 CSS

### .main-content-container
Contenedor principal que se ajusta al espacio disponible en `.content-area`.

```css
.main-content-container {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

## 🎭 Casos de Uso

### Navegación desde DatabaseManager
```tsx
// En DatabaseManager
<button onClick={() => onNavigate('extras-heidisql')}>
  Abrir phpMyAdmin
</button>

// En MainContent
<DatabaseManager onNavigate={onSelectOption} />
```

### Persistencia de Tabs en KokoWeb
```tsx
// tabsManager mantiene estado global
<SimpleKokoWeb tabsManager={tabsManager} />
```
Tabs persisten aunque el componente se desmonte.

## 🛡️ Validaciones

Actualmente no hay validaciones de props. Posibles mejoras:

```typescript
if (!selectedOption) {
  return <WelcomeScreen />;
}

if (!VALID_OPTIONS.includes(selectedOption)) {
  return <NotFound />;
}
```
