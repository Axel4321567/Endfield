# GitHub Actions - Release Workflow

## 📋 Descripción
Workflow automatizado de GitHub Actions que crea releases automáticos cuando se hace push de un tag de versión, construye el instalador de producción y lo adjunta al release.

## 📁 Ubicación
```
.github/workflows/release.yml
```

## 🎯 Propósito
- Automatizar el proceso de release
- Construir instaladores de producción en la nube
- Crear GitHub Releases con binarios adjuntos
- Generar release notes automáticas o desde CHANGELOG.md

## 🔧 Trigger del Workflow

### Activación
Se ejecuta automáticamente cuando se hace push de un tag que empiece con `v`:

```bash
git tag v1.3.3
git push origin v1.3.3
```

### Patrón de tags
```yaml
on:
  push:
    tags:
      - 'v*'
```

Ejemplos válidos: `v1.0.0`, `v1.3.2`, `v2.0.0-beta.1`

## 📊 Flujo de Trabajo

```
Push de tag (v1.3.3)
    ↓
Checkout del repositorio (con historial completo)
    ↓
Setup Node.js LTS + npm cache
    ↓
npm ci (instalación limpia de dependencias)
    ↓
npm run dist (build de producción)
    ↓
Extraer versión del tag (1.3.3)
    ↓
¿Existe CHANGELOG.md?
    ├─► SÍ → Extraer sección de la versión
    │        ├─► ¿Sección encontrada?
    │        │   ├─► SÍ → Usar release notes del CHANGELOG
    │        │   └─► NO → Generar automáticamente desde commits
    │        
    └─► NO → Generar automáticamente desde commits
    ↓
Crear GitHub Release
    ↓
Adjuntar archivos:
    ├─► *.exe (instalador)
    ├─► *.blockmap (actualizaciones incrementales)
    └─► latest.yml (metadata)
    ↓
Upload artifacts (30 días de retención)
```

## 🔑 Componentes Principales

### 1. Checkout con Historial
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Historial completo para release notes
```

**Por qué `fetch-depth: 0`:**
- Necesario para generar release notes desde commits
- Permite acceder al historial completo del proyecto

### 2. Setup Node.js
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 'lts/*'
    cache: 'npm'
```

**Características:**
- Usa la última versión LTS de Node.js
- Cache de npm para acelerar instalación

### 3. Build de Producción
```yaml
- run: npm run dist
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Por qué `GH_TOKEN`:**
- electron-builder lo usa para publicar releases
- Automáticamente disponible en GitHub Actions

### 4. Extracción de Versión
```yaml
- id: get_version
  run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
```

**Transformación:**
- Input: `refs/tags/v1.3.2`
- Output: `1.3.2`

### 5. Extracción de Release Notes

#### Formato esperado en CHANGELOG.md
```markdown
## [1.3.2] - 2025-12-15
### Added
- Nueva funcionalidad X
- Componente Y

### Fixed
- Bug en componente Z

## [1.3.1] - 2025-12-10
...
```

#### Lógica de Extracción
```bash
# Buscar sección que empiece con ## [VERSION] o ## VERSION
# Extraer hasta la siguiente sección ##
awk "/^## \[${VERSION}\]|^## ${VERSION}/,/^## \[|^## [0-9]/" CHANGELOG.md
```

**Casos:**
1. **CHANGELOG.md existe + sección encontrada** → Usa release notes del CHANGELOG
2. **CHANGELOG.md existe + sección NO encontrada** → Genera automáticamente
3. **CHANGELOG.md NO existe** → Genera automáticamente

### 6. Creación del Release
```yaml
- uses: softprops/action-gh-release@v2
  with:
    name: Release v${{ steps.get_version.outputs.VERSION }}
    body_path: release_notes.md  # Si existe
    generate_release_notes: true/false  # Según condición
    files: |
      dist-electron/*.exe
      dist-electron/*.blockmap
      dist-electron/latest.yml
```

**Archivos adjuntos:**
- `Koko Browser Setup 1.3.2.exe` - Instalador principal
- `Koko Browser Setup 1.3.2.exe.blockmap` - Para actualizaciones diferenciales
- `latest.yml` - Metadata de versión para auto-updater

## 📝 Release Notes Automáticas

Cuando se generan automáticamente (sin CHANGELOG.md):

```markdown
## What's Changed
* Fix: Corregir offset de layout en VS Code embed by @usuario in #123
* Feat: Agregar logs de debugging Win32 by @usuario in #124

**Full Changelog**: https://github.com/usuario/koko/compare/v1.3.1...v1.3.2
```

**Incluye:**
- Lista de PRs mergeados
- Lista de commits
- Nuevos contribuidores
- Link al diff completo

## 🎨 Uso del Workflow

### Escenario 1: Release Normal con CHANGELOG

```bash
# 1. Actualizar versión en package.json
npm version 1.3.3 --no-git-tag-version

# 2. Actualizar CHANGELOG.md
nano CHANGELOG.md

# Agregar:
## [1.3.3] - 2025-12-15
### Added
- Nueva funcionalidad

# 3. Commit de cambios
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.3.3"

# 4. Crear y hacer push del tag
git tag v1.3.3
git push origin main
git push origin v1.3.3
```

**Resultado:**
- GitHub Release con título "Release v1.3.3"
- Body con contenido de CHANGELOG.md sección [1.3.3]
- Instalador adjunto

### Escenario 2: Release sin CHANGELOG

```bash
# 1. Actualizar versión
npm version 1.3.3 --no-git-tag-version

# 2. Commit
git add package.json
git commit -m "chore: bump version to 1.3.3"

# 3. Tag y push
git tag v1.3.3
git push origin main
git push origin v1.3.3
```

**Resultado:**
- GitHub Release con título "Release v1.3.3"
- Body con release notes autogeneradas desde commits
- Instalador adjunto

### Escenario 3: Pre-release (Beta)

```bash
git tag v2.0.0-beta.1
git push origin v2.0.0-beta.1
```

Para marcar como pre-release, modificar workflow:
```yaml
prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
```

## 🔍 Monitoreo del Workflow

### Ver ejecución en tiempo real
1. GitHub → Actions tab
2. Seleccionar workflow "Release"
3. Ver logs en tiempo real

### Verificar artefactos
- **Releases:** GitHub → Releases
- **Artifacts:** Actions → Workflow run → Artifacts (disponible 30 días)

## 🛠️ Troubleshooting

### Error: "Resource not accessible by integration"
**Causa:** Permisos insuficientes del GITHUB_TOKEN

**Solución:**
```yaml
permissions:
  contents: write  # Necesario para crear releases
```

### Error: "Tag already exists"
**Causa:** El tag ya fue pusheado previamente

**Solución:**
```bash
# Eliminar tag local y remoto
git tag -d v1.3.3
git push origin :refs/tags/v1.3.3

# Crear nuevamente
git tag v1.3.3
git push origin v1.3.3
```

### Build falla: "Cannot create symbolic link"
**Causa:** Problema de permisos en electron-builder (solo local)

**Solución:**
- En GitHub Actions no ocurre (runner tiene permisos)
- Localmente: ejecutar PowerShell como administrador

### No se adjuntan archivos al release
**Causa:** Rutas incorrectas o archivos no generados

**Verificación:**
```yaml
- name: List dist files
  run: ls -R dist-electron
```

### Release notes vacías
**Causa:** Formato incorrecto en CHANGELOG.md

**Verificación:**
- Asegurar formato: `## [1.3.3]` o `## 1.3.3`
- No usar `###` para versiones principales
- Dejar línea en blanco después del título

## 📦 Archivos Generados

### dist-electron/
```
Koko Browser Setup 1.3.2.exe         (instalador principal, ~200MB)
Koko Browser Setup 1.3.2.exe.blockmap   (mapa de bloques para updates, ~1KB)
latest.yml                           (metadata de versión, <1KB)
builder-effective-config.yaml        (config usada por builder)
win-unpacked/                        (archivos desempaquetados, no se suben)
```

### latest.yml
```yaml
version: 1.3.2
files:
  - url: Koko Browser Setup 1.3.2.exe
    sha512: ...
    size: 209715200
path: Koko Browser Setup 1.3.2.exe
sha512: ...
releaseDate: '2025-12-15T10:30:00.000Z'
```

**Uso:** El auto-updater lo descarga para verificar nuevas versiones

## 🔐 Seguridad

### Permisos del GITHUB_TOKEN
```yaml
permissions:
  contents: write  # Solo escritura en contenido (releases)
```

**Restringido a:**
- Crear/editar releases
- Subir assets
- NO tiene acceso a secretos
- NO puede modificar workflows

### Variables de entorno sensibles
```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Auto-generado
```

**No incluir:**
- Credenciales de firma de código
- API keys privadas
- Tokens personales

## 🚀 Optimizaciones

### Cache de npm
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

**Beneficio:** Reduce tiempo de `npm ci` de ~2min a ~30s

### Artifacts con retención
```yaml
retention-days: 30
```

**Balance:**
- 30 días: suficiente para debugging
- Ahorra espacio de almacenamiento

### Paralelización (futuro)
```yaml
strategy:
  matrix:
    os: [windows-latest, macos-latest, ubuntu-latest]
```

Para builds multi-plataforma simultáneos

## 📊 Métricas de Ejecución

**Tiempo promedio:**
- Checkout: ~10s
- Setup Node: ~20s
- npm ci: ~30s (con cache) / ~2min (sin cache)
- npm run dist: ~5-8min
- Create release: ~30s

**Total:** ~6-9 minutos

**Consumo de runners:**
- Windows runner: ~10 minutos por release
- Gratis en repos públicos
- 2000 min/mes en repos privados (plan Free)

## 🔗 Referencias

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
- [electron-builder CI](https://www.electron.build/multi-platform-build.html)
- [Semantic Versioning](https://semver.org/)
