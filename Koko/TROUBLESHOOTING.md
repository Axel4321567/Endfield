# 🔧 Guía de Solución de Problemas - Base de Datos

## ❌ **Error en la Instalación - Diagnóstico Automático**

Tu sistema ahora incluye diagnósticos automáticos que se ejecutan antes de la instalación. Aquí te explico cómo usarlos:

### 🔍 **Ejecutar Diagnósticos**

1. **En el panel de Base de Datos**, haz clic en el botón **🔍** (Diagnósticos)
2. **El sistema verificará automáticamente:**
   - ✅ Permisos de administrador
   - ✅ Disponibilidad del puerto 3306
   - ✅ Servicios MySQL/MariaDB conflictivos
   - ✅ Espacio en disco disponible

### 🛠️ **Soluciones por Tipo de Error**

#### 🔐 **Error de Permisos de Administrador**
```
Problema: "Se requieren permisos de administrador"
Solución:
1. Cierra Koko Browser
2. Clic derecho en el ejecutable
3. "Ejecutar como administrador"
4. Vuelve a intentar la instalación
```

#### 🔌 **Error de Puerto 3306 en Uso**
```
Problema: "Puerto 3306 está en uso"
Solución:
1. Abre PowerShell como administrador
2. Ejecuta: netstat -ano | findstr :3306
3. Identifica el proceso (PID)
4. Detén el proceso: taskkill /PID [número] /F
5. O cambia el puerto en la configuración
```

#### ⚙️ **Servicios MySQL/MariaDB Conflictivos**
```
Problema: "Servicios MySQL/MariaDB existentes detectados"
Solución:
1. Abre Servicios de Windows (services.msc)
2. Busca servicios MySQL o MariaDB
3. Detén los servicios activos
4. O desinstala las versiones antiguas
```

#### 💾 **Espacio en Disco Insuficiente**
```
Problema: "No se pudo verificar espacio en disco"
Solución:
1. Libera al menos 2GB de espacio
2. Verifica la carpeta: C:\Users\[usuario]\AppData\Local\KokoBrowser
3. Limpia archivos temporales si es necesario
```

### 🎯 **Pasos Recomendados para Instalación**

1. **PRIMERO**: Ejecuta diagnósticos 🔍
2. **SEGUNDO**: Soluciona problemas encontrados
3. **TERCERO**: Ejecuta como administrador si es necesario
4. **CUARTO**: Instala MariaDB 📦

### 📋 **Verificación Post-Instalación**

Después de una instalación exitosa deberías ver:
- ✅ Estado: **"Ejecutándose"** (verde)
- ✅ Versión de MariaDB mostrada
- ✅ Información de conexión completa
- ✅ Botones activos para HeidiSQL

### 🔄 **Si la Instalación Falla**

1. **Revisa los diagnósticos** para problemas específicos
2. **Ejecuta como administrador** siempre
3. **Verifica el antivirus** (puede bloquear la instalación)
4. **Reinicia** y vuelve a intentar
5. **Consulta los logs** en la consola del desarrollador

### 🆘 **Reinstalación Limpia**

Si necesitas empezar desde cero:

```powershell
# PowerShell como Administrador
# Detener servicio si existe
Stop-Service -Name "KokoDB" -ErrorAction SilentlyContinue

# Eliminar servicio
sc delete KokoDB

# Limpiar archivos
Remove-Item -Path "$env:LOCALAPPDATA\KokoBrowser\mariadb" -Recurse -Force -ErrorAction SilentlyContinue
```

### 📞 **Información de Depuración**

Para reportar problemas, incluye:
- **Resultado de diagnósticos** (copia el texto)
- **Versión de Windows**
- **Permisos de usuario** (administrador/estándar)
- **Otros servicios de BD** instalados
- **Mensaje de error específico**

---

## 🎉 **¡Instalación Exitosa!**

Una vez completada la instalación:
1. **Estado verde**: ✅ MariaDB ejecutándose
2. **HeidiSQL**: 🖥️ Abre la interfaz visual
3. **Conexión**: localhost:3306/KokoDB
4. **Gestión**: Control completo desde Koko Browser

**¡Tu base de datos está lista para usar!** 🚀