# PasswordManager Component

## 📋 Descripción
Gestor de contraseñas y tokens que almacena de forma segura credenciales capturadas automáticamente durante la navegación web. Integrado con sistema de captura automática de formularios de login.

## 📁 Estructura de Archivos

```
PasswordManager/
├── PasswordManager.tsx  # Componente principal
└── index.ts            # Export del componente
```

## 🔧 Funcionalidades Principales

### 1. Gestión de Credenciales
- Listar todas las credenciales guardadas
- Buscar por dominio, username o URL
- Ver/ocultar contraseñas individualmente
- Copiar username/password al portapapeles
- Eliminar credenciales con confirmación
- Editar credenciales (funcionalidad expandible)

### 2. Gestión de Tokens
- Listar tokens guardados por servicio
- Visualizar tipo de token (Bearer, OAuth, etc.)
- Ver fecha de expiración
- Copiar tokens al portapapeles
- Filtrar por servicio

### 3. Captura Automática
- Intercepta formularios de login
- Guarda credenciales al iniciar sesión
- Captura tokens de APIs
- Asocia favicon del sitio
- Registra fecha de uso y frecuencia

### 4. Búsqueda y Filtrado
- Búsqueda en tiempo real
- Filtro por dominio, username, URL
- Resaltado de resultados
- Búsqueda case-insensitive

## 📊 Flujo de Funcionamiento

```
┌─────────────────────────┐
│ PasswordManager Mount   │
└──────────┬──────────────┘
           │
           ├─► useEffect: loadCredentials()
           │   └─► electronAPI.passwordManager.getAll()
           │       ├─► success → setCredentials()
           │       └─► error → console.error()
           │
           ├─► Usuario cambia searchQuery
           │   └─► filteredCredentials recalcula
           │
           ├─► Usuario hace clic en "Ver"
           │   └─► togglePasswordVisibility(id)
           │       └─► Actualiza showPasswords Set
           │
           ├─► Usuario hace clic en "Copiar"
           │   └─► copyToClipboard(text, id)
           │       ├─► navigator.clipboard.writeText()
           │       └─► setCopiedId() → reset después de 2s
           │
           ├─► Usuario hace clic en "Eliminar"
           │   └─► deleteCredential(id)
           │       ├─► confirm() → confirmación
           │       ├─► electronAPI.passwordManager.deleteCredential(id)
           │       └─► loadCredentials() → recargar lista
           │
           └─► Usuario cambia a vista "Tokens"
               └─► setView('tokens')
                   └─► Renderiza lista de tokens
```

## 🎯 Interfaces TypeScript

### Credential
```typescript
interface Credential {
  id: number;
  url: string;              // URL completa
  domain: string;           // Dominio extraído
  username: string;
  password: string;
  email?: string;           // Email opcional
  notes?: string;           // Notas del usuario
  favicon_url?: string;     // URL del favicon
  times_used: number;       // Contador de usos
  last_used?: string;       // Última vez usado
  created_at: string;       // Fecha de creación
  updated_at: string;       // Última actualización
}
```

### Token
```typescript
interface Token {
  id: number;
  service_name: string;     // Nombre del servicio (Discord, GitHub, etc.)
  domain: string;           // Dominio asociado
  token_type: string;       // Bearer, OAuth, API Key, etc.
  token_value: string;      // Valor del token
  expires_at?: string;      // Fecha de expiración
  created_at: string;       // Fecha de captura
}
```

## 🎨 Estados del Componente

```typescript
const [credentials, setCredentials] = useState<Credential[]>([]);
const [tokens, setTokens] = useState<Token[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());
const [copiedId, setCopiedId] = useState<number | null>(null);
const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
const [view, setView] = useState<'credentials' | 'tokens'>('credentials');
const [loading, setLoading] = useState(true);
```

### showPasswords (Set)
- Almacena IDs de credenciales con contraseñas visibles
- Usa `Set` para performance O(1) en búsqueda
- Toggle individual por credencial

### copiedId
- ID temporal de elemento copiado
- Se resetea después de 2 segundos
- Muestra feedback visual de copiado exitoso

## 🔌 APIs de Electron

### passwordManager.getAll()
```typescript
const result = await window.electronAPI.passwordManager.getAll();
// Returns: { success: boolean, credentials: Credential[] }
```
Obtiene todas las credenciales almacenadas.

### passwordManager.getTokens(serviceName)
```typescript
const result = await window.electronAPI.passwordManager.getTokens('discord');
// Returns: { success: boolean, tokens: Token[] }
```
Obtiene tokens de un servicio específico.

### passwordManager.deleteCredential(id)
```typescript
await window.electronAPI.passwordManager.deleteCredential(123);
```
Elimina una credencial por ID.

### passwordManager.updateCredential(id, data)
```typescript
await window.electronAPI.passwordManager.updateCredential(123, {
  username: 'nuevo@email.com',
  password: 'nuevaContraseña'
});
```
Actualiza una credencial existente.

### passwordManager.saveCredential(data)
```typescript
await window.electronAPI.passwordManager.saveCredential({
  url: 'https://example.com/login',
  domain: 'example.com',
  username: 'user@example.com',
  password: 'password123'
});
```
Guarda nueva credencial manualmente.

## 🔍 Búsqueda y Filtrado

### Algoritmo de Búsqueda
```typescript
const filteredCredentials = credentials.filter(cred => 
  cred.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
  cred.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
  cred.url.toLowerCase().includes(searchQuery.toLowerCase())
);
```

Busca en:
- ✅ Dominio
- ✅ Username
- ✅ URL completa

### Características
- Case-insensitive
- Búsqueda en tiempo real
- Sin debouncing (filtro local rápido)

## 🎨 UI Components

### Header
```tsx
<div className="bg-gray-800 border-b border-gray-700 p-4">
  <h1>🔑 Gestor de Contraseñas</h1>
  <button onClick={() => setView('credentials')}>Credenciales</button>
  <button onClick={() => setView('tokens')}>Tokens</button>
</div>
```

### Search Bar
```tsx
<div className="relative">
  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Buscar por dominio, usuario o URL..."
  />
</div>
```

### Credential Card
```tsx
<div className="bg-gray-800 rounded-lg p-4">
  <div className="flex items-center gap-3">
    {favicon_url && <img src={favicon_url} className="w-8 h-8" />}
    <div>
      <h3>{domain}</h3>
      <p>{username}</p>
    </div>
  </div>
  <div className="flex gap-2">
    <button onClick={() => togglePasswordVisibility(id)}>
      {showPasswords.has(id) ? <EyeOff /> : <Eye />}
    </button>
    <button onClick={() => copyToClipboard(password, id)}>
      <Copy />
    </button>
    <button onClick={() => deleteCredential(id)}>
      <Trash2 />
    </button>
  </div>
</div>
```

## 💡 Características Especiales

### 1. Toggle Individual de Contraseñas
Usa `Set` para gestionar visibilidad de cada credencial independientemente:
```typescript
togglePasswordVisibility(id) {
  const newSet = new Set(showPasswords);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  setShowPasswords(newSet);
}
```

### 2. Feedback Visual de Copiado
```typescript
copyToClipboard(text, id) {
  await navigator.clipboard.writeText(text);
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 2000);
}

// En render:
{copiedId === id ? <Check className="text-green-500" /> : <Copy />}
```

### 3. Confirmación de Eliminación
```typescript
if (confirm('¿Estás seguro de eliminar esta credencial?')) {
  await deleteCredential(id);
}
```

### 4. Loading State
```tsx
{loading && (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
    <p>Cargando credenciales...</p>
  </div>
)}
```

## 🔐 Seguridad

### Almacenamiento
- SQLite cifrado en backend
- Contraseñas no se muestran por defecto
- Tokens sensibles ocultos

### Clipboard
- Copia segura usando `navigator.clipboard`
- Feedback visual temporal
- No persiste en historial

### Validaciones
- Confirmación antes de eliminar
- Validación de datos en backend
- Sanitización de inputs

## 📊 Metadatos Almacenados

### times_used
Contador de cuántas veces se ha usado la credencial.

### last_used
Timestamp de último uso, actualizado al hacer login.

### favicon_url
Icono del sitio web para mejor identificación visual.

### created_at / updated_at
Auditoría de creación y modificación.

## 🎨 Iconos (Lucide React)

```typescript
import { 
  Search,      // Búsqueda
  Eye,         // Ver contraseña
  EyeOff,      // Ocultar contraseña
  Copy,        // Copiar
  Trash2,      // Eliminar
  Edit2,       // Editar
  Key,         // Password manager
  Globe,       // Dominio/URL
  Clock,       // Fecha/hora
  Check,       // Copiado exitoso
  X            // Cerrar/cancelar
} from 'lucide-react';
```

## 🔄 Integración con Captura Automática

### Flujo de Captura
```
Usuario inicia sesión
  └─► preload-webview.js detecta submit
      └─► Captura username + password
          └─► Envía a electron/handlers/credential-capture.js
              └─► Guarda en SQLite
                  └─► PasswordManager recarga datos
```

### Scripts de Captura
- `electron/preload-webview.js` - Inyecta listeners
- `electron/handlers/credential-capture.js` - Procesa y guarda
- `electron/services/password-manager.js` - Gestiona DB

## 🚀 Mejoras Futuras

1. **Edición In-line**
```tsx
{editing === id ? (
  <input value={newUsername} onChange={...} />
) : (
  <span>{username}</span>
)}
```

2. **Categorías/Tags**
```typescript
interface Credential {
  // ...
  tags: string[];
  category: 'personal' | 'work' | 'other';
}
```

3. **Exportar/Importar**
```tsx
<button onClick={exportToCSV}>Exportar CSV</button>
<button onClick={importFromCSV}>Importar CSV</button>
```

4. **Generador de Contraseñas**
```typescript
function generatePassword(length = 16) {
  // Genera contraseña segura
}
```

5. **2FA Support**
```typescript
interface Credential {
  // ...
  totp_secret?: string;
}
```

## 🎯 Props
Ninguna - componente autónomo que accede a datos globales.

## 📝 Logs

Actualmente usa `console.error`. Podría integrar con LogsContext:

```typescript
const { addLog } = useLogger();

addLog('✅ Credencial guardada', 'success', 'extras');
addLog('❌ Error al eliminar credencial', 'error', 'extras');
```
