# 🔍 Google Search Proxy - Guía de Uso Completa

## 📋 Resumen

Este proyecto implementa un **microservicio proxy en Python (FastAPI)** que permite realizar búsquedas en Google desde tu aplicación Electron sin ser detectado como bot.

### ✅ Ventajas
- ✅ **Sin detección de bots**: Google no bloquea las peticiones
- ✅ **Sin CAPTCHA**: Headers realistas de Chrome 131
- ✅ **Control total**: Modificar headers, cookies, etc.
- ✅ **Fácil integración**: API REST simple

---

## 🚀 Inicio Rápido (3 pasos)

### 1️⃣ Instalar Python (si no lo tienes)

**Windows:**
```bash
# Descargar desde https://python.org
# Asegúrate de marcar "Add Python to PATH"
python --version  # Debería mostrar 3.8+
```

**Linux/Mac:**
```bash
python3 --version  # Debería mostrar 3.8+
```

### 2️⃣ Iniciar el servicio proxy

**Windows:**
```bash
cd src\Apis\SearchProxy
start.bat
```

**Linux/Mac:**
```bash
cd src/Apis/SearchProxy
chmod +x start.sh
./start.sh
```

**O manualmente:**
```bash
cd src/Apis/SearchProxy
pip install -r requirements.txt
python main.py
```

### 3️⃣ Verificar que funciona

Abre en tu navegador:
- **Servicio**: http://localhost:8001
- **Documentación**: http://localhost:8001/docs
- **Búsqueda de prueba**: http://localhost:8001/search?q=python

---

## 💻 Integración con Electron

### Opción A: Usando el componente React

```tsx
import GoogleSearchProxy from './components/GoogleSearchProxy/GoogleSearchProxy';

function App() {
  return (
    <div>
      <GoogleSearchProxy />
    </div>
  );
}
```

### Opción B: Usando el servicio directamente

```typescript
import { searchGoogle } from './services/GoogleSearchService';

async function buscar() {
  const resultado = await searchGoogle('inteligencia artificial');
  
  if (resultado.error) {
    console.error('Error:', resultado.error);
  } else {
    // Hacer algo con resultado.html
    document.getElementById('results').innerHTML = resultado.html;
  }
}
```

### Opción C: Desde Electron Main Process

```javascript
// En electron/main.js o handlers
async function searchFromElectron(query) {
  const response = await fetch(`http://localhost:8001/search?q=${query}`);
  const html = await response.text();
  return html;
}
```

---

## 🛠️ Configuración Avanzada

### Cambiar puerto

Edita `src/Apis/SearchProxy/main.py`:

```python
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,  # ← Cambiar aquí
        log_level="info"
    )
```

También actualiza `src/services/GoogleSearchService.ts`:

```typescript
const PROXY_BASE_URL = 'http://localhost:8080';  // ← Cambiar aquí
```

### Implementar caché

Instalar Redis:
```bash
pip install redis
```

Agregar a `main.py`:
```python
import redis
cache = redis.Redis(host='localhost', port=6379, decode_responses=True)

@app.get("/search")
def search(q: str):
    # Buscar en caché
    cached = cache.get(f"search:{q}")
    if cached:
        return HTMLResponse(cached)
    
    # Si no está en caché, buscar en Google
    response = requests.get(...)
    
    # Guardar en caché (5 minutos)
    cache.setex(f"search:{q}", 300, response.text)
    
    return HTMLResponse(response.text)
```

### Rate limiting

Instalar SlowAPI:
```bash
pip install slowapi
```

Agregar a `main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/search")
@limiter.limit("10/minute")  # 10 búsquedas por minuto
def search(request: Request, q: str):
    # ...
```

---

## 🐛 Troubleshooting

### Error: "Proxy no disponible"

**Solución:**
1. Verifica que Python esté instalado: `python --version`
2. Inicia el servicio: `cd src/Apis/SearchProxy && python main.py`
3. Verifica que esté corriendo: http://localhost:8001/health

### Error: "ModuleNotFoundError: No module named 'fastapi'"

**Solución:**
```bash
cd src/Apis/SearchProxy
pip install -r requirements.txt
```

### Error: "Address already in use" (puerto 8001 ocupado)

**Solución:**

**Windows:**
```powershell
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
lsof -ti:8001 | xargs kill -9
```

O cambia el puerto (ver Configuración Avanzada).

### Google sigue bloqueando con CAPTCHA

**Soluciones:**
1. **Rotar User-Agents**: Cambiar el User-Agent periódicamente
2. **Implementar delays**: Agregar `time.sleep(random.uniform(1, 3))` entre búsquedas
3. **Usar proxies**: Rotar IPs usando proxies externos
4. **Usar Selenium**: Para casos extremos, usar navegador headless

---

## 📊 Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Información del servicio |
| `/health` | GET | Health check |
| `/search` | GET | Búsqueda en Google (devuelve HTML) |
| `/search/json` | GET | Búsqueda en Google (devuelve JSON) |
| `/docs` | GET | Documentación interactiva (Swagger) |
| `/redoc` | GET | Documentación alternativa (ReDoc) |

### Ejemplos de uso

**Búsqueda simple:**
```bash
curl "http://localhost:8001/search?q=python+fastapi"
```

**Metadata de búsqueda:**
```bash
curl "http://localhost:8001/search/json?q=javascript"
```

**Health check:**
```bash
curl "http://localhost:8001/health"
```

---

## 🚢 Deployment en Producción

### Docker

Crear `Dockerfile` en `src/Apis/SearchProxy/`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build y run:
```bash
docker build -t google-search-proxy .
docker run -p 8001:8001 google-search-proxy
```

### Con Gunicorn (production-ready)

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

### Configurar como servicio del sistema

**Linux (systemd):**

Crear `/etc/systemd/system/google-proxy.service`:

```ini
[Unit]
Description=Google Search Proxy
After=network.target

[Service]
Type=simple
User=koko
WorkingDirectory=/path/to/Koko/src/Apis/SearchProxy
ExecStart=/usr/bin/python3 main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Habilitar:
```bash
sudo systemctl enable google-proxy
sudo systemctl start google-proxy
sudo systemctl status google-proxy
```

---

## 📈 Monitoreo y Logs

### Ver logs en tiempo real

```bash
cd src/Apis/SearchProxy
python main.py 2>&1 | tee google-proxy.log
```

### Logs guardados

Los logs se guardan automáticamente con timestamps:

```
INFO:     🔍 Nueva búsqueda: inteligencia artificial
INFO:     ✅ Búsqueda exitosa: 256789 bytes
WARNING:  ⚠️ Google bloqueó la petición (rate limit)
```

---

## 🔐 Seguridad

### Recomendaciones

1. **Limitar CORS en producción:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Solo tu app
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

2. **Implementar autenticación:**
```python
from fastapi import Header, HTTPException

@app.get("/search")
def search(q: str, x_api_key: str = Header(...)):
    if x_api_key != "tu-clave-secreta":
        raise HTTPException(status_code=401, detail="Unauthorized")
    # ...
```

3. **Rate limiting por IP** (ver sección Configuración Avanzada)

---

## 🎯 Próximos Pasos

Una vez que el proxy funcione correctamente:

1. ✅ Integrar en tu componente `KokoWeb`
2. ✅ Reemplazar el webview directo a Google
3. ✅ Implementar caché para mejorar performance
4. ✅ Agregar soporte para YouTube Search (opcional)
5. ✅ Implementar rate limiting
6. ✅ Configurar como servicio del sistema

---

## 📞 Soporte

Si tienes problemas:

1. Verifica que Python 3.8+ esté instalado
2. Verifica que el puerto 8001 esté libre
3. Revisa los logs en la terminal donde corriste `python main.py`
4. Prueba directamente en el navegador: http://localhost:8001/docs

---

## 📝 Licencia

Este código es parte del proyecto Koko Browser.
