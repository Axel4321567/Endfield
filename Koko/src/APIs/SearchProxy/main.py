"""
🔍 Google Search Proxy Service
Microservicio FastAPI que actúa como proxy para búsquedas de Google
Evita la detección de bots al realizar las peticiones desde el servidor
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Google Search Proxy",
    description="Proxy service para búsquedas de Google sin detección de bots",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones desde Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User-Agent realista de Chrome en Windows (actualizado)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# Headers adicionales para parecer navegador real
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}


@app.get("/")
def root():
    """Endpoint raíz con información del servicio"""
    return {
        "service": "Google Search Proxy",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/search": "GET - Realizar búsqueda en Google",
            "/health": "GET - Estado del servicio"
        },
        "example": "http://localhost:8001/search?q=inteligencia+artificial"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "google-search-proxy",
        "version": "1.0.0"
    }


@app.get("/search", response_class=HTMLResponse)
def search(q: str = Query(..., description="Término de búsqueda", min_length=1)):
    """
    Realiza una búsqueda en Google y devuelve el HTML completo
    
    Args:
        q (str): Término de búsqueda
    
    Returns:
        HTMLResponse: HTML completo de la página de resultados de Google
    
    Raises:
        HTTPException: Si ocurre un error en la petición
    """
    try:
        logger.info(f"🔍 Nueva búsqueda: {q}")
        
        # Realizar petición a Google
        response = requests.get(
            "https://www.google.com/search",
            params={"q": q},
            headers=HEADERS,
            timeout=10,
            allow_redirects=True
        )
        
        # Verificar si Google bloqueó la petición
        if response.status_code == 429:
            logger.warning("⚠️ Google bloqueó la petición (rate limit)")
            raise HTTPException(
                status_code=429,
                detail="Demasiadas peticiones. Intenta de nuevo en unos segundos."
            )
        
        # Verificar si es página de CAPTCHA
        if "sorry/index" in response.url or "detected unusual traffic" in response.text.lower():
            logger.warning("⚠️ Google mostró CAPTCHA")
            raise HTTPException(
                status_code=403,
                detail="Google requiere verificación CAPTCHA. Intenta más tarde."
            )
        
        # Verificar status code
        response.raise_for_status()
        
        logger.info(f"✅ Búsqueda exitosa: {len(response.text)} bytes")
        
        # Devolver HTML completo
        return HTMLResponse(
            content=response.text,
            status_code=200,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "X-Proxy-Service": "google-search-proxy",
                "X-Search-Query": q
            }
        )
        
    except requests.exceptions.Timeout:
        logger.error("❌ Timeout en petición a Google")
        raise HTTPException(
            status_code=504,
            detail="La petición a Google tardó demasiado tiempo"
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error en petición: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"Error al conectar con Google: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"❌ Error inesperado: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )


@app.get("/search/json")
def search_json(q: str = Query(..., description="Término de búsqueda", min_length=1)):
    """
    Realiza una búsqueda en Google y devuelve información en JSON
    (Alternativa para debugging o procesamiento)
    """
    try:
        logger.info(f"🔍 Nueva búsqueda JSON: {q}")
        
        response = requests.get(
            "https://www.google.com/search",
            params={"q": q},
            headers=HEADERS,
            timeout=10,
            allow_redirects=True
        )
        
        response.raise_for_status()
        
        return {
            "success": True,
            "query": q,
            "status_code": response.status_code,
            "url": response.url,
            "content_length": len(response.text),
            "headers": dict(response.headers),
            "html_preview": response.text[:500] + "..."
        }
        
    except Exception as e:
        logger.error(f"❌ Error en búsqueda JSON: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "query": q
            }
        )


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Iniciando Google Search Proxy Service...")
    logger.info("📡 Servidor corriendo en http://localhost:8001")
    logger.info("📝 Documentación en http://localhost:8001/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )
