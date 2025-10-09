#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completado`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error en: ${description}`, 'red');
    log(error.message, 'red');
    return false;
  }
}

function main() {
  log('🚀 Iniciando proceso de construcción del instalador Koko Browser', 'blue');
  
  // Verificar que estamos en el directorio correcto
  if (!existsSync('package.json')) {
    log('❌ Error: No se encontró package.json. Asegúrate de estar en el directorio correcto.', 'red');
    process.exit(1);
  }

  // Crear directorio de distribución si no existe
  if (!existsSync('dist-electron')) {
    mkdirSync('dist-electron', { recursive: true });
  }

  // Proceso de construcción
  const steps = [
    {
      command: 'npm run build',
      description: 'Construyendo aplicación web con Vite'
    },
    {
      command: 'npm run electron-pack',
      description: 'Creando instalador con Electron Builder'
    }
  ];

  let success = true;
  for (const step of steps) {
    if (!runCommand(step.command, step.description)) {
      success = false;
      break;
    }
  }

  if (success) {
    log('\n🎉 ¡Instalador creado exitosamente!', 'green');
    log('📦 Los archivos del instalador están en la carpeta: dist-electron/', 'yellow');
    log('📋 Archivos generados:', 'blue');
    
    try {
      const files = execSync('dir dist-electron /b', { encoding: 'utf8' }).trim().split('\n');
      files.forEach(file => {
        if (file.trim()) {
          log(`   - ${file.trim()}`, 'yellow');
        }
      });
    } catch (error) {
      log('   - Revisa la carpeta dist-electron/ para ver los archivos generados', 'yellow');
    }
  } else {
    log('\n❌ Error al crear el instalador', 'red');
    process.exit(1);
  }
}

main();