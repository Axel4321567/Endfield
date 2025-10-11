import React from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Play, AlertCircle } from 'lucide-react';

interface UpdateButtonProps {
  hasUpdate: boolean;
  isLoading: boolean;
  phase: 'checking' | 'downloading' | 'validating' | 'installing' | 'complete' | 'error' | 'idle';
  onUpdate: () => void;
  onLaunch: () => void;
  onRetry: () => void;
  disabled?: boolean;
  className?: string;
  isInstalled?: boolean | null; // Nuevo prop para saber si está instalado
  browserRunning?: boolean; // Nuevo prop para saber si el browser está ejecutándose
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({
  hasUpdate,
  isLoading,
  phase,
  onUpdate,
  onLaunch,
  onRetry,
  disabled = false,
  className = '',
  isInstalled = null,
  browserRunning = false
}) => {
  const getButtonContent = () => {
    switch (phase) {
      case 'checking':
        return {
          icon: <RefreshCw className="w-5 h-5 animate-spin" />,
          text: 'Verificando...',
          action: () => {},
          disabled: true,
          variant: 'loading'
        };
      
      case 'downloading':
        return {
          icon: <Download className="w-5 h-5" />,
          text: 'Descargando...',
          action: () => {},
          disabled: true,
          variant: 'loading'
        };
      
      case 'validating':
        return {
          icon: <RefreshCw className="w-5 h-5 animate-spin" />,
          text: 'Validando...',
          action: () => {},
          disabled: true,
          variant: 'loading'
        };
      
      case 'installing':
        return {
          icon: <RefreshCw className="w-5 h-5 animate-spin" />,
          text: 'Instalando...',
          action: () => {},
          disabled: true,
          variant: 'loading'
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'Reintentar',
          action: onRetry,
          disabled: false,
          variant: 'error'
        };
      
      case 'complete':
      case 'idle':
      default:
        if (browserRunning) {
          return {
            icon: <Play className="w-5 h-5 text-green-400" />,
            text: 'Ejecutándose',
            action: () => {},
            disabled: true,
            variant: 'running'
          };
        }
        
        if (hasUpdate) {
          return {
            icon: <Download className="w-5 h-5" />,
            text: isInstalled === false ? 'Descargar' : 'Actualizar',
            action: onUpdate,
            disabled: false,
            variant: 'update'
          };
        } else {
          return {
            icon: <Play className="w-5 h-5" />,
            text: 'Iniciar Koko Browser',
            action: onLaunch,
            disabled: false,
            variant: 'launch'
          };
        }
    }
  };

  const buttonConfig = getButtonContent();
  const isButtonDisabled = disabled || buttonConfig.disabled || isLoading;

  const getVariantStyles = () => {
    switch (buttonConfig.variant) {
      case 'loading':
        return 'bg-white/20 border-white/30 text-white/80 cursor-not-allowed';
      
      case 'error':
        return 'bg-red-500/20 border-red-400/50 text-red-200 hover:bg-red-500/30';
      
      case 'update':
        return 'koko-gradient border-koko-400/50 text-white hover:shadow-lg hover:shadow-koko-500/25';
      
      case 'launch':
        return 'bg-green-500/20 border-green-400/50 text-green-200 hover:bg-green-500/30';
      
      case 'running':
        return 'bg-blue-500/20 border-blue-400/50 text-blue-200 cursor-not-allowed';
      
      default:
        return 'glass-button text-white';
    }
  };

  return (
    <motion.button
      whileHover={!isButtonDisabled ? { scale: 1.02 } : {}}
      whileTap={!isButtonDisabled ? { scale: 0.98 } : {}}
      onClick={buttonConfig.action}
      disabled={isButtonDisabled}
      className={`
        relative overflow-hidden px-8 py-4 rounded-xl font-semibold
        transition-all duration-300 flex items-center justify-center space-x-3
        min-w-[200px] h-14 text-lg
        ${getVariantStyles()}
        ${isButtonDisabled ? 'opacity-75' : ''}
        ${className}
      `}
    >
      {/* Efecto de brillo para el botón de actualización */}
      {buttonConfig.variant === 'update' && !isButtonDisabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      )}

      {/* Contenido del botón */}
      <motion.div
        className="flex items-center space-x-3"
        animate={buttonConfig.variant === 'loading' ? {
          opacity: [1, 0.7, 1],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: buttonConfig.variant === 'loading' ? Infinity : 0,
        }}
      >
        {buttonConfig.icon}
        <span>{buttonConfig.text}</span>
      </motion.div>

      {/* Indicador de progreso para estados de carga */}
      {buttonConfig.variant === 'loading' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-white/30"
          animate={{
            width: ['0%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.button>
  );
};

export default UpdateButton;