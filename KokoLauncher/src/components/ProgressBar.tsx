import React from 'react';
import { motion } from 'framer-motion';
import { DownloadProgress } from '@services/UpdateService';
import { FileUtils } from '@utils/FileUtils';

interface ProgressBarProps {
  progress: DownloadProgress;
  phase: string;
  isIndeterminate?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  phase,
  isIndeterminate = false,
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, progress.percentage || 0));

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Información de progreso */}
      <div className="flex justify-between items-center text-sm text-white/80">
        <span className="font-medium">{phase}</span>
        <span>{Math.round(percentage)}%</span>
      </div>

      {/* Barra de progreso principal */}
      <div className="progress-bar h-3">
        {isIndeterminate ? (
          <motion.div
            className="h-full bg-gradient-to-r from-koko-400 to-purple-500 rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ width: '30%' }}
          />
        ) : (
          <motion.div
            className="progress-fill rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            key={percentage} // Forzar re-render cuando cambia el porcentaje
          />
        )}
      </div>

      {/* Información detallada de descarga */}
      {!isIndeterminate && progress.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center text-xs text-white/60"
          key={`${progress.downloaded}-${progress.total}`} // Forzar re-render
        >
          <div className="flex items-center space-x-4">
            <span>
              {FileUtils.formatFileSize(progress.downloaded || 0)} / {FileUtils.formatFileSize(progress.total || 0)}
            </span>
            {progress.speed > 0 && (
              <span className="text-koko-300">
                {FileUtils.formatSpeed(progress.speed)}
              </span>
            )}
          </div>
          
          {progress.timeRemaining && progress.timeRemaining < Infinity && progress.timeRemaining > 0 && (
            <span>
              Tiempo restante: {FileUtils.formatTime(progress.timeRemaining)}
            </span>
          )}
        </motion.div>
      )}

      {/* Pulso de actividad para progreso indeterminado */}
      {isIndeterminate && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-koko-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProgressBar;