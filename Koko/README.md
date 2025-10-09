# Koko - Navegador Web con React + Tauri

Aplicación de navegador web construida con React, TypeScript, TailwindCSS y Tauri.

## 📁 Estructura del Proyecto

```
Koko/
├── src/
│   ├── App.tsx                 # Componente principal
│   ├── App.css                 # Estilos del layout principal
│   ├── components/
│   │   ├── Sidebar/           # Barra lateral de navegación
│   │   │   ├── Sidebar.tsx
│   │   │   └── Sidebar.css
│   │   ├── MainContent/       # Área de contenido principal
│   │   │   ├── MainContent.tsx
│   │   │   └── MainContent.css
│   │   └── KokoWeb/          # Componente del navegador web
│   │       ├── KokoWeb.tsx
│   │       └── KokoWeb.css
│   ├── hooks/
│   │   └── useSidebar.ts     # Hook para gestión del sidebar
│   ├── types/
│   │   └── index.ts          # Definiciones de tipos TypeScript
│   ├── index.css             # Estilos globales + Tailwind
│   └── main.tsx              # Punto de entrada
├── tailwind.config.js        # Configuración de TailwindCSS
├── postcss.config.js         # Configuración de PostCSS
└── package.json
```

## 🚀 Comandos

### Desarrollo
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## 🎨 Características Actuales

- ✅ Layout tipo Dashboard con Sidebar y área principal
- ✅ Sidebar con opción "Koko-Web"
- ✅ Componentes modulares y reutilizables
- ✅ Sistema de tipos TypeScript
- ✅ Hook personalizado para gestión de estado
- ✅ Estilos con TailwindCSS
- ✅ **Navegador web funcional con sistema de pestañas**
- ✅ **Sistema de sesiones persistentes tipo Opera**
- ✅ **Manejo inteligente de errores ERR_ABORTED**
- ✅ **Soporte para múltiples pestañas**
- ✅ **Restauración automática de sesiones**

## � Sistema de Navegación

### Características del Navegador
- **Smart Navigation**: Detección automática de dominios problemáticos
- **Anti-Loop Protection**: Prevención de bucles infinitos con ERR_ABORTED
- **Error Recovery**: Manejo robusto de errores de carga de páginas
- **Embedded WebView**: Navegador embebido sin ventanas externas

### Sistema de Sesiones
- **Persistencia Automática**: Guarda las pestañas abiertas automáticamente
- **Restauración Completa**: Restaura todas las pestañas al reiniciar la app
- **Fallback Inteligente**: Crea pestaña por defecto (Google) si no hay sesión
- **Gestión de Estado**: Sistema robusto con localStorage

### Hooks Personalizados
- `useSessionManager`: Gestiona la persistencia de sesiones
- `useTabs`: Maneja el estado de pestañas con integración de sesiones
- `useSidebar`: Controla la barra lateral

## 🔜 Próximas Funcionalidades

- [ ] Historial de navegación
- [ ] Favoritos y marcadores
- [ ] Gestión de descargas
- [ ] Configuración de proxy/VPN
- [ ] Modo incógnito
- [ ] Integración con Tauri para distribución desktop

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **Tauri** (próximamente) - Framework desktop

## 📝 Notas

Este es el esqueleto inicial del proyecto. La funcionalidad del navegador web se implementará en fases posteriores.

---

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
