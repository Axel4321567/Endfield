# VirtualMachines Component

## 📋 Descripción
Componente placeholder para futura implementación de gestión de máquinas virtuales. Actualmente no implementado pero reservado para integración con Docker, WSL2, o VirtualBox.

## 📁 Ubicación
```
components/VirtualMachines/
└── VirtualMachines.tsx
```

## 🎯 Funcionalidades Planeadas

### 1. Gestión de Contenedores Docker
- Listar contenedores
- Iniciar/detener contenedores
- Ver logs de contenedores
- Gestionar imágenes Docker

### 2. Integración WSL2
- Listar distribuciones WSL
- Acceso a terminal WSL
- Compartir archivos con WSL
- Estado de servicios en WSL

### 3. VirtualBox (Futuro)
- Listar VMs
- Iniciar/detener VMs
- Snapshots
- Configuración de red

## 📊 Estructura Planeada

```typescript
interface VirtualMachine {
  id: string;
  name: string;
  type: 'docker' | 'wsl' | 'virtualbox';
  status: 'running' | 'stopped' | 'paused';
  image?: string;
  ports?: number[];
  volumes?: string[];
}
```

## 🔗 Integraciones Futuras

### Docker Desktop
```typescript
await window.electronAPI.docker.listContainers();
await window.electronAPI.docker.startContainer(id);
```

### WSL
```typescript
await window.electronAPI.wsl.listDistros();
await window.electronAPI.wsl.exec(distro, command);
```

## 💡 Estado Actual
**No implementado** - Componente reservado para desarrollo futuro.

## 🚀 Roadmap
1. Integración básica con Docker
2. Soporte para WSL2
3. Gestión de redes Docker
4. Compose file support
5. VirtualBox integration (low priority)

## 📝 Notas
- Requiere Docker Desktop instalado (para Docker)
- Requiere WSL2 habilitado (para WSL)
- Componente de baja prioridad
- Posible refactor a plugin separado
