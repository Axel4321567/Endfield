# 🔍 Google Search Proxy Service

Microservicio FastAPI que actúa como proxy para búsquedas de Google, evitando la detección de bots al realizar las peticiones desde el servidor backend.

## 📦 Instalación

```bash
cd src/Apis/SearchProxy
pip install -r requirements.txt
```

## 🚀 Uso

### Iniciar el servicio

```bash
python main.py
```

El servicio estará disponible en: `http://localhost:8001`

### Endpoints

#### 1. **GET /** - Información del servicio
```bash
curl http://localhost:8001/
```

#### 2. **GET /search** - Realizar búsqueda
```bash
curl "http://localhost:8001/search?q=inteligencia+artificial"
```

Devuelve el HTML completo de la página de resultados de Google.

#### 3. **GET /search/json** - Búsqueda con respuesta JSON
```bash
curl "http://localhost:8001/search/json?q=python"
```

Devuelve información sobre la búsqueda en formato JSON (útil para debugging).

#### 4. **GET /health** - Health check
```bash
curl http://localhost:8001/health
```

## 🔧 Integración con Electron

### Desde el renderer process (React):

```typescript
async function searchGoogle(query: string) {
  try {
    const response = await fetch(`http://localhost:8001/search?q=${encodeURIComponent(query)}`);
    const html = await response.text();
    
    // Mostrar HTML en un iframe o BrowserView
    const iframe = document.getElementById('search-results') as HTMLIFrameElement;
    iframe.srcdoc = html;
  } catch (error) {
    console.error('Error en búsqueda:', error);
  }
}
```

### Desde el main process (Electron):

```javascript
const { BrowserView } = require('electron');

async function loadGoogleSearch(mainWindow, query) {
  const view = new BrowserView();
  mainWindow.setBrowserView(view);
  
  const response = await fetch(`http://localhost:8001/search?q=${query}`);
  const html = await response.text();
  
  // Cargar HTML en el BrowserView
  view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}
```

## 🛡️ Headers Anti-Detección

El servicio incluye headers realistas para evitar la detección:

- **User-Agent**: Chrome 131.0.0.0 en Windows 10
- **Accept-Language**: es-ES,es;q=0.9,en;q=0.8
- **DNT**: 1 (Do Not Track)
- **Sec-Fetch-*** headers de Chrome
- **Accept-Encoding**: gzip, deflate, br

## 📝 Documentación Automática

FastAPI genera documentación interactiva automáticamente:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## ⚠️ Manejo de Errores

| Error | Status Code | Descripción |
|-------|-------------|-------------|
| Rate Limit | 429 | Google bloqueó por demasiadas peticiones |
| CAPTCHA | 403 | Google requiere verificación CAPTCHA |
| Timeout | 504 | La petición tardó demasiado |
| Connection Error | 502 | Error al conectar con Google |
| Internal Error | 500 | Error interno del servidor |

## 🔒 Consideraciones de Seguridad

1. **CORS**: El servicio acepta peticiones de cualquier origen (`allow_origins=["*"]`). En producción, limitar a dominios específicos.

2. **Rate Limiting**: Considerar implementar rate limiting para evitar abuso:
```bash
pip install slowapi
```

3. **Caching**: Para mejorar rendimiento, implementar caché de resultados:
```bash
pip install redis
```

## 🎯 Ventajas vs. Webview Directo

| Aspecto | Webview Directo | Proxy Service |
|---------|-----------------|---------------|
| Detección | ❌ Google detecta Electron | ✅ Parecemos navegador real |
| Headers HTTP | ❌ Limitado | ✅ Control total |
| CAPTCHA | ❌ Frecuente | ✅ Muy raro |
| Performance | ⚡ Directo | 🔄 1 hop extra |
| Cookies | ⚠️ Limitado | ✅ Gestión completa |

## 🚀 Producción

Para producción, usar un servidor ASGI como Gunicorn:

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

O usar Docker:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## 📊 Logs

El servicio registra todas las búsquedas:

```
INFO:     🔍 Nueva búsqueda: inteligencia artificial
INFO:     ✅ Búsqueda exitosa: 256789 bytes
```

## 🔄 Próximas Mejoras

- [ ] Implementar caché de resultados
- [ ] Rate limiting por IP
- [ ] Soporte para búsquedas de imágenes
- [ ] Proxy para otros servicios (YouTube, etc.)
- [ ] Modo headless con Selenium para casos extremos
