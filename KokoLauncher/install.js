const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Koko Launcher - Script de instalación de dependencias');

// Verificar Node.js y npm
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  
  console.log(`✅ Node.js: ${nodeVersion}`);
  console.log(`✅ npm: ${npmVersion}`);
} catch (error) {
  console.error('❌ Node.js o npm no están instalados');
  process.exit(1);
}

// Instalar dependencias
console.log('\n📦 Instalando dependencias...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencias instaladas correctamente');
} catch (error) {
  console.error('❌ Error instalando dependencias');
  process.exit(1);
}

// Verificar archivos de configuración
console.log('\n🔧 Verificando configuración...');

const configPath = path.join(__dirname, 'resources', 'config', 'update.json');
if (!fs.existsSync(configPath)) {
  console.log('⚠️  Creando archivo de configuración por defecto...');
  const defaultConfig = {
    version: '1.0.0',
    updateChannel: 'stable',
    browserPath: '',
    lastUpdate: new Date().toISOString()
  };
  
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Configuración creada');
}

// Crear directorios necesarios
const dirs = [
  'resources/launcher/logs',
  'temp',
  'dist-electron'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Directorio creado: ${dir}`);
  }
});

console.log('\n🎉 Instalación completada!');
console.log('\nComandos disponibles:');
console.log('  npm run dev      - Modo desarrollo');
console.log('  npm run build    - Build para producción');
console.log('  npm run dist     - Crear distribución');
console.log('  npm run preview  - Vista previa del build');
console.log('\n🚀 Para iniciar en modo desarrollo: npm run dev');