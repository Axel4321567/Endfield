# GoogleSearchProxy Component

## 📋 Descripción
Componente de búsqueda en Google que utiliza un proxy backend para evitar la detección de bots y realizar búsquedas programáticas.

## 📁 Estructura de Archivos

```
GoogleSearchProxy/
└── GoogleSearchProxy.tsx  # Componente único
```

## 🔧 Funcionalidades Principales

### 1. Búsqueda con Proxy
- Búsqueda en Google a través de proxy backend
- Evita detección de bots
- Renderiza HTML de resultados
- Manejo de errores robusto

### 2. Verificación de Salud
- Chequeo automático del proxy al montar
- Indicador visual de disponibilidad
- Mensaje de error si proxy no está disponible

### 3. Estados Visuales
- ⏳ Verificando proxy
- ✅ Proxy disponible (puerto 8001)
- ❌ Proxy no disponible
- 🔄 Buscando...

## 📊 Flujo de Funcionamiento

```
┌──────────────────────┐
│ GoogleSearchProxy    │
│ Component Mount      │
└─────────┬────────────┘
          │
          ├─► useEffect: Verificar proxy
          │   └─► checkProxyHealth()
          │       ├─► true → setProxyAvailable(true)
          │       └─► false → mostrar error
          │
          ├─► Usuario ingresa query
          │
          └─► handleSearch()
              ├─► Validar query no vacío
              ├─► Verificar proxy disponible
              ├─► setIsLoading(true)
              ├─► searchGoogle(query)
              │   ├─► Llamada al backend proxy
              │   └─► Retorna HTML de resultados
              ├─► setSearchHtml(html)
              └─► setIsLoading(false)
```

## 🎯 Estados del Componente

### Estados Principales
```typescript
const [query, setQuery] = useState('');           // Término de búsqueda
const [searchHtml, setSearchHtml] = useState<string | null>(null);  // HTML resultados
const [isLoading, setIsLoading] = useState(false); // Cargando
const [error, setError] = useState<string | null>(null);  // Errores
const [proxyAvailable, setProxyAvailable] = useState<boolean | null>(null); // Estado proxy
```

### Ciclo de Estados del Proxy
```
null → Verificando
  ├─► true → Disponible ✅
  └─► false → No disponible ❌
```

## 🔌 Servicios Backend

### GoogleSearchService

#### checkProxyHealth()
```typescript
const available = await checkProxyHealth();
```
- Verifica que el proxy esté corriendo
- Puerto: 8001
- Retorna: `boolean`

#### searchGoogle(query)
```typescript
const response = await searchGoogle(query);
```
- Envía búsqueda al proxy
- Parámetros: `query: string`
- Retorna: 
  ```typescript
  {
    html?: string;    // HTML de resultados
    error?: string;   // Mensaje de error
  }
  ```

## 🎨 UI Components

### Formulario de Búsqueda
```tsx
<form onSubmit={handleSearch}>
  <input 
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Buscar en Google..."
    disabled={!proxyAvailable || isLoading}
  />
  <button type="submit" disabled={!proxyAvailable || isLoading}>
    {isLoading ? '🔄 Buscando...' : '🔍 Buscar'}
  </button>
</form>
```

### Indicador de Estado del Proxy
```tsx
{proxyAvailable === null && <span>⏳ Verificando...</span>}
{proxyAvailable === true && <span>✅ Proxy disponible</span>}
{proxyAvailable === false && <span>❌ Proxy no disponible</span>}
```

### Visualización de Resultados
```tsx
{searchHtml && (
  <iframe 
    srcDoc={searchHtml}
    className="search-results-iframe"
    sandbox="allow-same-origin"
  />
)}
```

## ⚙️ Configuración del Proxy

### Ubicación
```
src/Apis/SearchProxy/
```

### Inicio Manual
```bash
cd src/Apis/SearchProxy
python main.py
```

### Puerto
```
http://localhost:8001
```

### Endpoints
- `GET /health` - Verificar disponibilidad
- `GET /search?q=<query>` - Realizar búsqueda

## 🚨 Manejo de Errores

### Errores Comunes

1. **Proxy no disponible**
```
"Servicio de proxy no disponible. Ejecuta: cd src/Apis/SearchProxy && python main.py"
```

2. **Query vacío**
```
"Por favor ingresa un término de búsqueda"
```

3. **Error de búsqueda**
```
"Error desconocido" | <mensaje específico>
```

### Visualización de Errores
```tsx
{error && (
  <div className="error-message text-red-600">
    ❌ {error}
  </div>
)}
```

## 🎯 Props

```typescript
interface GoogleSearchProxyProps {
  className?: string;
}
```

## 💡 Características Especiales

### 1. Verificación Automática
Al montar, verifica automáticamente si el proxy está disponible.

### 2. Deshabilitación Inteligente
Deshabilita input y botón si:
- Proxy no disponible
- Búsqueda en progreso

### 3. Sanitización
Usa `iframe` con `sandbox="allow-same-origin"` para renderizar HTML de forma segura.

### 4. Feedback Visual
Estados visuales claros para cada fase de la búsqueda.

## 🔧 Validaciones

### Pre-búsqueda
```typescript
if (!query.trim()) {
  setError('Por favor ingresa un término de búsqueda');
  return;
}

if (!proxyAvailable) {
  setError('Servicio de proxy no disponible');
  return;
}
```

## 📝 Logs

Este componente no usa el sistema de logging centralizado, pero podría integrarse:

```typescript
// Posible mejora
const { addLog } = useLogger();

useEffect(() => {
  addLog('🔍 Google Search Proxy iniciado', 'info', 'extras');
  checkProxy();
}, []);
```

## 🛠️ Troubleshooting

### Proxy no responde
1. Verificar que Python está instalado
2. Navegar a `src/Apis/SearchProxy`
3. Ejecutar `python main.py`
4. Verificar puerto 8001 disponible

### Resultados no se muestran
1. Verificar que `searchHtml` contiene HTML válido
2. Comprobar sandbox del iframe
3. Revisar consola de errores

### Error CORS
- El proxy backend debe manejar CORS
- Headers necesarios en Python backend

## 🔐 Seguridad

### Sandbox del iframe
```tsx
sandbox="allow-same-origin"
```
Restringe capacidades del HTML renderizado.

### Validación de Input
Sanitiza query antes de enviar al backend.

## 🚀 Mejoras Futuras

1. **Cache de resultados**: Guardar búsquedas recientes
2. **Historial**: Lista de búsquedas anteriores
3. **Paginación**: Navegar entre páginas de resultados
4. **Filtros**: Filtrar por fecha, tipo, etc.
5. **Auto-complete**: Sugerencias mientras escribe
6. **Logging**: Integrar con LogsContext
