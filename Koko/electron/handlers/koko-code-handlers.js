/**
 * Koko-Code Handlers
 * Maneja el window parenting para embeber VS Code en la aplicación
 */

import { ipcMain, BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

let vscodeProcess = null;
let vscodeHwnd = null;
let mainWindowHandle = null;
let vscodeWorkspacePath = null;
let vscodePid = null; // Guardar el PID del proceso de VS Code
let isEmbedding = false; // Flag para prevenir llamadas concurrentes
let styleMonitorInterval = null; // Intervalo para monitorear y forzar estilos

/**
 * Encuentra el HWND de una ventana por su título con reintentos
 */
async function findWindowByTitle(title, maxRetries = 10, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const scriptPath = join(tmpdir(), `find-window-${Date.now()}.ps1`);
    
    try {
      console.log(`🔍 Intento ${attempt}/${maxRetries} buscando: ${title}`);
      
      // Crear script PowerShell temporal
      const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32FindWindow {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@

$foundHwnd = 0
[Win32FindWindow]::EnumWindows({
    param($hwnd, $lParam)
    if ([Win32FindWindow]::IsWindowVisible($hwnd)) {
        $sb = New-Object System.Text.StringBuilder 256
        [Win32FindWindow]::GetWindowText($hwnd, $sb, 256) | Out-Null
        $windowTitle = $sb.ToString()
        if ($windowTitle -like '*${title}*') {
            $script:foundHwnd = [int]$hwnd
            return $false
        }
    }
    return $true
}, [IntPtr]::Zero) | Out-Null

if ($foundHwnd -ne 0) { 
    Write-Output $foundHwnd
}
`;
      
      writeFileSync(scriptPath, psScript);
      const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
      
      console.log(`📋 PowerShell stdout: "${stdout.trim()}"`);
      if (stderr) console.log(`⚠️ PowerShell stderr: "${stderr.trim()}"`);
      
      const hwnd = stdout.trim();
      if (hwnd && hwnd !== '' && hwnd !== '0') {
        const hwndInt = parseInt(hwnd);
        if (!isNaN(hwndInt)) {
          console.log(`✅ Ventana encontrada: HWND=${hwndInt}`);
          return hwndInt;
        } else {
          console.error(`❌ No se pudo parsear HWND: "${hwnd}"`);
        }
      }
      
      // No encontrada, reintentar si quedan intentos
      if (attempt < maxRetries) {
        console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error en intento ${attempt}:`, error);
      if (attempt >= maxRetries) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } finally {
      try {
        unlinkSync(scriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  console.error(`❌ No se pudo encontrar la ventana después de ${maxRetries} intentos`);
  return null;
}

/**
 * Establece el foco en una ventana
 */
async function setWindowFocus(hwnd) {
  const scriptPath = join(tmpdir(), `set-focus-${Date.now()}.ps1`);
  
  try {
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32SetFocus {
    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

[Win32SetFocus]::ShowWindow([IntPtr]${hwnd}, 5)
[Win32SetFocus]::SetForegroundWindow([IntPtr]${hwnd})
[Win32SetFocus]::SetFocus([IntPtr]${hwnd})
`;
    
    writeFileSync(scriptPath, psScript);
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    return true;
  } catch (error) {
    console.error('Error setting window focus:', error);
    return false;
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Cierra una ventana específica usando WM_CLOSE (sin matar el proceso)
 */
async function closeWindow(hwnd) {
  const scriptPath = join(tmpdir(), `close-window-${Date.now()}.ps1`);
  
  try {
    console.log(`🔒 Cerrando ventana ${hwnd} con WM_CLOSE...`);
    
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32CloseWindow {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    public const uint WM_CLOSE = 0x0010;
}
"@

# Enviar WM_CLOSE a la ventana específica (no mata el proceso, solo cierra esta ventana)
[Win32CloseWindow]::PostMessage([IntPtr]${hwnd}, [Win32CloseWindow]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
`;
    
    writeFileSync(scriptPath, psScript);
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    console.log(`✅ WM_CLOSE enviado a ventana ${hwnd}`);
    return true;
  } catch (error) {
    console.error('Error closing window:', error);
    return false;
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Mata un proceso específico por PID
 */
async function killProcessByPid(pid) {
  const scriptPath = join(tmpdir(), `kill-process-${Date.now()}.ps1`);
  
  try {
    console.log(`💀 Matando proceso PID ${pid}...`);
    
    const psScript = `
try {
  # Matar proceso por PID específico
  Stop-Process -Id ${pid} -Force -ErrorAction Stop
  Write-Output "Proceso ${pid} terminado"
} catch {
  Write-Error "Error matando proceso ${pid}: $_"
}
`;
    
    writeFileSync(scriptPath, psScript);
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    console.log(`✅ Proceso ${pid} terminado`);
    return true;
  } catch (error) {
    console.error(`Error matando proceso ${pid}:`, error);
    return false;
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Fuerza los estilos de ventana para prevenir resize manual
 * Se ejecuta periódicamente para contrarrestar que VS Code restaure sus estilos
 */
async function enforceWindowStyles(hwnd) {
  if (!hwnd) return;
  
  const scriptPath = join(tmpdir(), `enforce-styles-${Date.now()}.ps1`);
  
  try {
    const psLines = [
      'Add-Type @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class Win32Enforce {',
      '    [DllImport("user32.dll")]',
      '    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);',
      '    [DllImport("user32.dll")]',
      '    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);',
      '    [DllImport("user32.dll")]',
      '    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
      '    ',
      '    public const int GWL_STYLE = -16;',
      '    public const int WS_CHILD = 0x40000000;',
      '    public const int WS_VISIBLE = 0x10000000;',
      '    public const int WS_THICKFRAME = 0x00040000;',
      '    public const int WS_MAXIMIZEBOX = 0x00010000;',
      '    public const int WS_MINIMIZEBOX = 0x00020000;',
      '    public const int WS_CAPTION = 0x00C00000;',
      '    public const int WS_BORDER = 0x00800000;',
      '    public const int WS_DLGFRAME = 0x00400000;',
      '    public const int WS_SIZEBOX = 0x00040000;',
      '    public const int WS_SYSMENU = 0x00080000;',
      '}',
      '"@',
      '',
      `$currentStyle = [Win32Enforce]::GetWindowLong([IntPtr]${hwnd}, [Win32Enforce]::GWL_STYLE)`,
      '$newStyle = $currentStyle',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_THICKFRAME)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_MAXIMIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_MINIMIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_CAPTION)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_BORDER)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_DLGFRAME)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_SIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32Enforce]::WS_SYSMENU)',
      '$newStyle = $newStyle -bor [Win32Enforce]::WS_CHILD -bor [Win32Enforce]::WS_VISIBLE',
      '',
      'if ($currentStyle -ne $newStyle) {',
      `    [Win32Enforce]::SetWindowLong([IntPtr]${hwnd}, [Win32Enforce]::GWL_STYLE, $newStyle) | Out-Null`,
      `    [Win32Enforce]::SetWindowPos([IntPtr]${hwnd}, [IntPtr]0, 0, 0, 0, 0, 0x0067) | Out-Null`,
      '    Write-Host "[StyleEnforce] ⚠️ Estilos restaurados - VS Code intentó modificarlos"',
      '}'
    ];
    
    writeFileSync(scriptPath, psLines.join('\n'), { encoding: 'utf8' });
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
  } catch (error) {
    // Silenciar errores del monitor
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Establece el parent de una ventana usando PowerShell
 */
async function setWindowParent(childHwnd, parentHwnd) {
  const scriptPath = join(tmpdir(), `set-parent-${Date.now()}.ps1`);
  
  try {
    // Construir script PowerShell línea por línea para evitar problemas de escapado
    const psLines = [
      'Add-Type @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class Win32SetParent {',
      '    [DllImport("user32.dll")]',
      '    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);',
      '    [DllImport("user32.dll")]',
      '    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
      '    [DllImport("user32.dll")]',
      '    public static extern IntPtr SetFocus(IntPtr hWnd);',
      '    [DllImport("user32.dll")]',
      '    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);',
      '    [DllImport("user32.dll")]',
      '    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);',
      '    ',
      '    public const int GWL_STYLE = -16;',
      '    public const int GWL_EXSTYLE = -20;',
      '    public const int WS_CHILD = 0x40000000;',
      '    public const int WS_VISIBLE = 0x10000000;',
      '    public const int WS_THICKFRAME = 0x00040000;',
      '    public const int WS_MAXIMIZEBOX = 0x00010000;',
      '    public const int WS_MINIMIZEBOX = 0x00020000;',
      '    public const int WS_SYSMENU = 0x00080000;',
      '    public const int WS_CAPTION = 0x00C00000;',
      '    public const int WS_BORDER = 0x00800000;',
      '    public const int WS_DLGFRAME = 0x00400000;',
      '    public const int WS_SIZEBOX = 0x00040000;',
      '}',
      '"@',
      '',
      '# Establecer parent primero',
      `[Win32SetParent]::SetParent([IntPtr]${childHwnd}, [IntPtr]${parentHwnd}) | Out-Null`,
      '',
      '# Obtener estilo actual',
      `$style = [Win32SetParent]::GetWindowLong([IntPtr]${childHwnd}, [Win32SetParent]::GWL_STYLE)`,
      '$styleHex = "0x{0:X8}" -f $style',
      'Write-Host "[SetParent] Estilo original: $styleHex"',
      '',
      '# Remover TODOS los estilos que permiten resize, bordes, caption, etc.',
      '$newStyle = $style',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_THICKFRAME)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_MAXIMIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_MINIMIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_CAPTION)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_BORDER)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_DLGFRAME)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_SIZEBOX)',
      '$newStyle = $newStyle -band (-bnot [Win32SetParent]::WS_SYSMENU)',
      '',
      '# Añadir solo WS_CHILD y WS_VISIBLE',
      '$newStyle = $newStyle -bor [Win32SetParent]::WS_CHILD -bor [Win32SetParent]::WS_VISIBLE',
      '',
      '$newStyleHex = "0x{0:X8}" -f $newStyle',
      'Write-Host "[SetParent] Estilo nuevo: $newStyleHex"',
      '',
      '# Aplicar nuevo estilo',
      `$result = [Win32SetParent]::SetWindowLong([IntPtr]${childHwnd}, [Win32SetParent]::GWL_STYLE, $newStyle)`,
      '$resultHex = "0x{0:X8}" -f $result',
      'Write-Host "[SetParent] Estilo aplicado, anterior: $resultHex"',
      '',
      '# Forzar actualización con SWP_FRAMECHANGED (0x0020) + SWP_NOMOVE (0x0002) + SWP_NOSIZE (0x0001) = 0x0063',
      `[Win32SetParent]::SetWindowPos([IntPtr]${childHwnd}, [IntPtr]0, 0, 0, 0, 0, 0x0063) | Out-Null`,
      'Write-Host "[SetParent] Frame actualizado con SWP_FRAMECHANGED"',
      '',
      '# Verificar el estilo final después de aplicar cambios',
      `$finalStyle = [Win32SetParent]::GetWindowLong([IntPtr]${childHwnd}, [Win32SetParent]::GWL_STYLE)`,
      '$finalStyleHex = "0x{0:X8}" -f $finalStyle',
      'Write-Host "[SetParent] Estilo final verificado: $finalStyleHex"',
      '',
      '# Verificar si tiene flags de resize',
      '$hasThickFrame = ($finalStyle -band [Win32SetParent]::WS_THICKFRAME) -ne 0',
      '$hasMaxBox = ($finalStyle -band [Win32SetParent]::WS_MAXIMIZEBOX) -ne 0',
      '$hasMinBox = ($finalStyle -band [Win32SetParent]::WS_MINIMIZEBOX) -ne 0',
      '$hasSizeBox = ($finalStyle -band [Win32SetParent]::WS_SIZEBOX) -ne 0',
      '',
      'if ($hasThickFrame -or $hasMaxBox -or $hasMinBox -or $hasSizeBox) {',
      '    Write-Host "[SetParent] ⚠️ VENTANA PUEDE REDIMENSIONARSE MANUALMENTE"',
      '    Write-Host "   - WS_THICKFRAME: $hasThickFrame"',
      '    Write-Host "   - WS_MAXIMIZEBOX: $hasMaxBox"',
      '    Write-Host "   - WS_MINIMIZEBOX: $hasMinBox"',
      '    Write-Host "   - WS_SIZEBOX: $hasSizeBox"',
      '} else {',
      '    Write-Host "[SetParent] ✅ VENTANA NO PUEDE REDIMENSIONARSE MANUALMENTE"',
      '}',
      '',
      `[Win32SetParent]::SetFocus([IntPtr]${childHwnd}) | Out-Null`
    ];
    
    writeFileSync(scriptPath, psLines.join('\n'), { encoding: 'utf8' });
    const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    
    // Imprimir los logs del PowerShell
    if (stdout) {
      console.log('📋 [SetParent PowerShell]:');
      console.log(stdout);
    }
    if (stderr) {
      console.error('⚠️ [SetParent PowerShell Error]:');
      console.error(stderr);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting window parent:', error);
    return false;
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Actualiza la posición y tamaño de una ventana
 */
async function updateWindowBounds(hwnd, x, y, width, height) {
  console.log(`📐 Actualizando bounds de ventana ${hwnd}:`, { x, y, width, height });
  const scriptPath = join(tmpdir(), `update-bounds-${Date.now()}.ps1`);
  
  try {
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32UpdateBounds {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool InvalidateRect(IntPtr hWnd, IntPtr lpRect, bool bErase);
    [DllImport("user32.dll")]
    public static extern bool UpdateWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr GetParent(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    
    public const int GWL_STYLE = -16;
    public const int WS_CHILD = 0x40000000;
    public const int WS_VISIBLE = 0x10000000;
    public const int WS_THICKFRAME = 0x00040000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_BORDER = 0x00800000;
    public const int WS_DLGFRAME = 0x00400000;
    public const int WS_SIZEBOX = 0x00040000;
    public const int WS_SYSMENU = 0x00080000;
}
"@

# Actualizar posición y tamaño (SWP_NOZORDER = 0x0004)
[Win32UpdateBounds]::SetWindowPos([IntPtr]${hwnd}, [IntPtr]0, ${x}, ${y}, ${width}, ${height}, 0x0004) | Out-Null

# RE-APLICAR estilos no-redimensionables después del resize
# (Windows puede restaurar los estilos al hacer SetWindowPos)
\$currentStyle = [Win32UpdateBounds]::GetWindowLong([IntPtr]${hwnd}, [Win32UpdateBounds]::GWL_STYLE)
\$newStyle = \$currentStyle
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_THICKFRAME)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_MAXIMIZEBOX)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_MINIMIZEBOX)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_CAPTION)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_BORDER)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_DLGFRAME)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_SIZEBOX)
\$newStyle = \$newStyle -band (-bnot [Win32UpdateBounds]::WS_SYSMENU)
\$newStyle = \$newStyle -bor [Win32UpdateBounds]::WS_CHILD -bor [Win32UpdateBounds]::WS_VISIBLE

if (\$currentStyle -ne \$newStyle) {
    [Win32UpdateBounds]::SetWindowLong([IntPtr]${hwnd}, [Win32UpdateBounds]::GWL_STYLE, \$newStyle) | Out-Null
    # Forzar actualización del frame con SWP_FRAMECHANGED
    [Win32UpdateBounds]::SetWindowPos([IntPtr]${hwnd}, [IntPtr]0, 0, 0, 0, 0, 0x0063) | Out-Null
}

# Forzar redibujado de la ventana
[Win32UpdateBounds]::InvalidateRect([IntPtr]${hwnd}, [IntPtr]::Zero, \$true) | Out-Null
[Win32UpdateBounds]::UpdateWindow([IntPtr]${hwnd}) | Out-Null

# Si es ventana hijo (WS_CHILD), necesitamos restaurar foco de forma diferente
# Primero obtener la ventana padre
\$parent = [Win32UpdateBounds]::GetParent([IntPtr]${hwnd})

if (\$parent -ne [IntPtr]::Zero) {
    # Es una ventana hijo, usar SetFocus directamente
    [Win32UpdateBounds]::ShowWindow([IntPtr]${hwnd}, 5) | Out-Null
    [Win32UpdateBounds]::BringWindowToTop([IntPtr]${hwnd}) | Out-Null
    [Win32UpdateBounds]::SetFocus([IntPtr]${hwnd}) | Out-Null
} else {
    # Es ventana top-level, usar SetForegroundWindow
    [Win32UpdateBounds]::ShowWindow([IntPtr]${hwnd}, 5) | Out-Null
    [Win32UpdateBounds]::SetForegroundWindow([IntPtr]${hwnd}) | Out-Null
    [Win32UpdateBounds]::SetFocus([IntPtr]${hwnd}) | Out-Null
}
`;
    
    writeFileSync(scriptPath, psScript);
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    
    // Aplicar múltiples veces para asegurar que se aplica (como BrowserView)
    setTimeout(async () => {
      try {
        await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
      } catch (e) {
        // Ignorar errores en reintentos
      }
    }, 50);
    
    console.log(`✅ Bounds actualizados correctamente`);
    return true;
  } catch (error) {
    console.error('Error updating window bounds:', error);
    return false;
  } finally {
    // Eliminar después de un pequeño delay para permitir reintentos
    setTimeout(() => {
      try {
        unlinkSync(scriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 200);
  }
}

/**
 * Lanza VS Code si no está abierto
 */
function launchVSCode() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Lanzando VS Code en nueva ventana...');
    
    // Crear carpeta temporal única para esta instancia de VS Code
    vscodeWorkspacePath = join(tmpdir(), `koko-vscode-${Date.now()}`);
    
    if (!existsSync(vscodeWorkspacePath)) {
      mkdirSync(vscodeWorkspacePath, { recursive: true });
    }
    
    console.log(`📁 Workspace: ${vscodeWorkspacePath}`);
    
    // Lanzar VS Code con --new-window para crear una instancia separada
    const vscodePath = 'code';
    
    vscodeProcess = spawn(vscodePath, ['--new-window', '--disable-workspace-trust', vscodeWorkspacePath], {
      detached: false,
      shell: true
    });

    vscodeProcess.on('error', (error) => {
      console.error('❌ Error lanzando VS Code:', error);
      reject(error);
    });

    // Guardar el PID del proceso
    vscodePid = vscodeProcess.pid;
    console.log(`📌 VS Code PID: ${vscodePid}`);

    // Esperar más tiempo para que VS Code se inicie completamente
    console.log('⏳ Esperando 4 segundos para que VS Code se inicialice...');
    setTimeout(() => {
      console.log('✅ VS Code debería estar listo');
      resolve();
    }, 4000);
  });
}

/**
 * Registra los handlers IPC para Koko-Code
 */
export function registerKokoCodeHandlers(mainWindow) {
  console.log('📝 Registrando handlers de Koko-Code');

  mainWindowHandle = mainWindow;

  // Lanzar VS Code
  ipcMain.handle('koko-code:launch', async () => {
    try {
      console.log('🚀 Lanzando VS Code...');
      await launchVSCode();
      return { success: true };
    } catch (error) {
      console.error('Error launching VS Code:', error);
      return { success: false, error: error.message };
    }
  });

  // Embeber VS Code en la aplicación
  ipcMain.handle('koko-code:embed', async (event, { x, y, width, height }) => {
    try {
      console.log('🔗 Embebiendo VS Code...', { x, y, width, height });
      console.log('🔍 Estado actual:', { 
        tieneHwnd: !!vscodeHwnd, 
        hwnd: vscodeHwnd,
        tieneProceso: !!vscodeProcess,
        pid: vscodePid,
        isEmbedding: isEmbedding
      });

      // Si ya tenemos la ventana embebida, solo actualizar posición
      if (vscodeHwnd) {
        console.log('♻️ Ventana ya embebida, solo actualizando posición...');
        await updateWindowBounds(vscodeHwnd, x, y, width, height);
        return { success: true, hwnd: vscodeHwnd };
      }

      // Si ya hay un proceso de embedding en curso, esperar
      if (isEmbedding) {
        console.log('⏳ Proceso de embedding ya en curso, esperando...');
        // Esperar hasta que termine
        let attempts = 0;
        while (isEmbedding && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        // Si ya se embebió mientras esperábamos, devolver el HWND
        if (vscodeHwnd) {
          console.log('✅ Embedding completado por otra llamada');
          await updateWindowBounds(vscodeHwnd, x, y, width, height);
          return { success: true, hwnd: vscodeHwnd };
        }
      }

      // Marcar que estamos embebiendo
      isEmbedding = true;
      console.log('🔒 Lock de embedding activado');

      // Si VS Code no está corriendo, lanzarlo
      if (!vscodeProcess) {
        await launchVSCode();
      } else {
        // Si ya está corriendo, esperar un poco por si acaso
        console.log('⏳ VS Code ya está corriendo, esperando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Buscar la ventana de VS Code con reintentos (10 intentos x 500ms = 5 segundos máximo)
      // Buscamos el título que incluye el nombre de la carpeta temporal
      const workspaceName = vscodeWorkspacePath ? vscodeWorkspacePath.split(/[/\\]/).pop() : 'Visual Studio Code';
      console.log(`🔍 Buscando ventana con título que contenga: ${workspaceName}`);
      vscodeHwnd = await findWindowByTitle(workspaceName, 10, 500);
      
      // Fallback: buscar por "Visual Studio Code" si no encontramos por workspace
      if (!vscodeHwnd) {
        console.log('🔍 Buscando por título genérico: Visual Studio Code');
        vscodeHwnd = await findWindowByTitle('Visual Studio Code', 10, 500);
      }
      
      if (!vscodeHwnd) {
        return { success: false, error: 'No se pudo encontrar la ventana de VS Code' };
      }

      console.log('✅ Ventana de VS Code encontrada:', vscodeHwnd);
      console.log(`📊 Información de VS Code embebido:`);
      console.log(`   - PID: ${vscodePid}`);
      console.log(`   - HWND: ${vscodeHwnd}`);
      console.log(`   - Workspace: ${vscodeWorkspacePath}`);

      // Obtener el HWND de la ventana principal de Electron
      const mainHwnd = mainWindow.getNativeWindowHandle().readInt32LE(0);
      
      console.log('📐 Bounds recibidos:', { x, y, width, height });
      
      // Establecer el parent
      const parentSet = await setWindowParent(vscodeHwnd, mainHwnd);
      
      if (!parentSet) {
        return { success: false, error: 'No se pudo establecer el parent de la ventana' };
      }

      // Actualizar posición y tamaño - usar coordenadas directas de React
      await updateWindowBounds(vscodeHwnd, x, y, width, height);

      // Establecer foco en la ventana embebida para poder usarla
      console.log('🎯 Estableciendo foco en VS Code...');
      await setWindowFocus(vscodeHwnd);

      // Iniciar monitoreo de estilos cada 500ms para prevenir que VS Code restaure sus bordes
      if (styleMonitorInterval) {
        clearInterval(styleMonitorInterval);
      }
      styleMonitorInterval = setInterval(() => {
        enforceWindowStyles(vscodeHwnd);
      }, 500);
      console.log('🔒 Monitor de estilos iniciado - previniendo resize manual');

      console.log('✅ VS Code embebido exitosamente');
      
      // Liberar el lock
      isEmbedding = false;
      console.log('🔓 Lock de embedding liberado');
      
      return { success: true, hwnd: vscodeHwnd };
    } catch (error) {
      console.error('Error embedding VS Code:', error);
      isEmbedding = false; // Liberar lock en caso de error
      return { success: false, error: error.message };
    }
  });

  // Actualizar posición de VS Code
  ipcMain.handle('koko-code:update-position', async (event, { hwnd, x, y, width, height }) => {
    try {
      console.log('🔄 Solicitud de actualización de posición:', { hwnd, x, y, width, height });
      // Usar el HWND proporcionado o el guardado
      const targetHwnd = hwnd || vscodeHwnd;
      if (targetHwnd) {
        console.log(`🎯 Actualizando posición de HWND: ${targetHwnd} x=${x}, y=${y}`);
        await updateWindowBounds(targetHwnd, x, y, width, height);
      } else {
        console.warn('⚠️ No hay HWND disponible para actualizar posición');
      }
    } catch (error) {
      console.error('Error updating VS Code position:', error);
    }
  });

  // Handler para cuando el sidebar cambie (collapse/expand)
  ipcMain.handle('koko-code:update-sidebar', async () => {
    try {
      if (vscodeHwnd) {
        // Obtener las dimensiones del contenedor desde el DOM
        const bounds = await mainWindow.webContents.executeJavaScript(`
          (() => {
            const container = document.querySelector('.koko-code-embed-container');
            if (container) {
              const rect = container.getBoundingClientRect();
              return {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              };
            }
            return null;
          })()
        `);

        if (bounds) {
          console.log('🔄 [Sidebar Change] Actualizando VS Code embebido:', bounds);
          await updateWindowBounds(vscodeHwnd, bounds.x, bounds.y, bounds.width, bounds.height);
          return { success: true };
        }
      }
      return { success: false, error: 'VS Code no está embebido o no se pudo obtener bounds' };
    } catch (error) {
      console.error('❌ [Sidebar] Error actualizando VS Code:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler directo para actualizar con bounds específicos (desde sidebar)
  ipcMain.handle('koko-code:resize', async (event, { x, y, width, height }) => {
    try {
      if (vscodeHwnd) {
        console.log('📐 [Sidebar Resize] Bounds recibidos:', { x, y, width, height });
        await updateWindowBounds(vscodeHwnd, x, y, width, height);
        return { success: true };
      }
      return { success: false, error: 'VS Code no está embebido' };
    } catch (error) {
      console.error('❌ [Sidebar Resize] Error:', error);
      return { success: false, error: error.message };
    }
  });
  // Mostrar u ocultar la ventana de VS Code
  ipcMain.handle('koko-code:set-visibility', async (event, { visible }) => {
    try {
      if (!vscodeHwnd) {
        return { success: false, error: 'VS Code no está embebido' };
      }

      if (visible) {
        // Restaurar tamaño normal - se actualizará con updatePosition
        console.log('👁️ VS Code visible - tamaño se actualizará con updatePosition');
      } else {
        // Ocultar redimensionando a 0x0
        console.log('👁️ Ocultando VS Code - redimensionando a 0x0');
        await updateWindowBounds(vscodeHwnd, 0, 0, 0, 0);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error setting VS Code visibility:', error);
      return { success: false, error: error.message };
    }
  });

  // Desembeber VS Code
  ipcMain.handle('koko-code:detach', async () => {
    try {
      console.log('🔓 Desembebiendo VS Code...');
      
      // Detener el monitor de estilos
      if (styleMonitorInterval) {
        clearInterval(styleMonitorInterval);
        styleMonitorInterval = null;
        console.log('🔓 Monitor de estilos detenido');
      }
      
      // Matar el proceso usando el PID específico
      if (vscodePid) {
        console.log(`💀 Cerrando VS Code con PID ${vscodePid}...`);
        await killProcessByPid(vscodePid);
        vscodePid = null;
      }

      // Limpiar referencias
      vscodeHwnd = null;
      vscodeProcess = null;

      console.log('✅ VS Code cerrado correctamente');
    } catch (error) {
      console.error('Error detaching VS Code:', error);
    }
  });

  // Obtener información de VS Code embebido (PID, HWND, Workspace)
  ipcMain.handle('koko-code:get-info', async () => {
    const info = {
      pid: vscodePid,
      hwnd: vscodeHwnd,
      workspace: vscodeWorkspacePath,
      isRunning: vscodeProcess !== null
    };
    console.log('📊 [KokoCode] Info:', info);
    return info;
  });

  // Listener para resize de ventana principal
  let resizeTimeout = null;
  mainWindow.on('resize', () => {
    // Debouncing para evitar demasiadas llamadas
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(async () => {
      if (vscodeHwnd) {
        try {
          // Obtener las dimensiones del contenedor desde el DOM
          const bounds = await mainWindow.webContents.executeJavaScript(`
            (() => {
              const container = document.querySelector('.koko-code-embed-container');
              if (container) {
                const rect = container.getBoundingClientRect();
                return {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height)
                };
              }
              return null;
            })()
          `);

          if (bounds) {
            console.log('🔄 [MainWindow Resize] Actualizando VS Code:', bounds);
            await updateWindowBounds(vscodeHwnd, bounds.x, bounds.y, bounds.width, bounds.height);
          }
        } catch (error) {
          console.warn('⚠️ [MainWindow Resize] Error:', error.message);
        }
      }
    }, 100); // 100ms para sincronizar con otros delays
  });

  console.log('✅ Handlers de Koko-Code registrados');
}

/**
 * Limpia recursos al cerrar la aplicación
 */
export function cleanupKokoCode() {
  console.log('🧹 Limpiando recursos de Koko-Code...');
  
  // Detener el monitor de estilos
  if (styleMonitorInterval) {
    clearInterval(styleMonitorInterval);
    styleMonitorInterval = null;
    console.log('🔓 Monitor de estilos detenido');
  }
  
  // Matar el proceso usando el PID específico
  if (vscodePid) {
    console.log(`💀 Cerrando VS Code con PID ${vscodePid}...`);
    killProcessByPid(vscodePid).catch(err => {
      console.error('Error cerrando proceso VS Code:', err);
    });
  }
  
  // Limpiar referencias
  vscodeHwnd = null;
  vscodeProcess = null;
  vscodePid = null;
  mainWindowHandle = null;
  
  console.log('✅ Cleanup completado');
}
