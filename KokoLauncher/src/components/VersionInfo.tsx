import React from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, Download, CheckCircle } from 'lucide-react';
import { VersionInfo } from '@services/VersionService';

interface VersionInfoProps {
  versionInfo: VersionInfo;
  className?: string;
}

export const VersionInfoComponent: React.FC<VersionInfoProps> = ({
  versionInfo,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-container p-6 space-y-4 ${className}`}
    >
      <div className="flex items-center space-x-3 mb-4">
        <Package className="w-6 h-6 text-koko-400" />
        <h3 className="text-lg font-semibold text-white">Información de Versión</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Versión actual */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white/80">Versión Actual</span>
          </div>
          <div className="text-xl font-bold text-white">
            v{versionInfo.current}
          </div>
        </div>

        {/* Versión disponible */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-koko-400" />
            <span className="text-sm font-medium text-white/80">Última Versión</span>
          </div>
          <div className={`text-xl font-bold ${versionInfo.hasUpdate ? 'text-koko-300' : 'text-white'}`}>
            v{versionInfo.latest}
          </div>
        </div>
      </div>

      {/* Canal de actualización */}
      <div className="flex items-center justify-between py-3 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/60">Canal:</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          versionInfo.channel === 'stable' ? 'bg-green-500/20 text-green-300' :
          versionInfo.channel === 'beta' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-red-500/20 text-red-300'
        }`}>
          {versionInfo.channel.toUpperCase()}
        </span>
      </div>

      {/* Estado de actualización */}
      {versionInfo.hasUpdate ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 p-3 bg-koko-500/20 rounded-lg border border-koko-400/30"
        >
          <Download className="w-5 h-5 text-koko-300 animate-bounce" />
          <div>
            <p className="text-sm font-medium text-koko-200">
              Actualización disponible
            </p>
            <p className="text-xs text-koko-300/80">
              Una nueva versión está lista para descargar
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 p-3 bg-green-500/20 rounded-lg border border-green-400/30"
        >
          <CheckCircle className="w-5 h-5 text-green-300" />
          <div>
            <p className="text-sm font-medium text-green-200">
              Estás actualizado
            </p>
            <p className="text-xs text-green-300/80">
              Tienes la última versión disponible
            </p>
          </div>
        </motion.div>
      )}

      {/* Información adicional si hay actualización */}
      {versionInfo.hasUpdate && versionInfo.fileSize && (
        <div className="text-xs text-white/60 pt-2 border-t border-white/10">
          <p>Tamaño de descarga: {(versionInfo.fileSize / 1024 / 1024).toFixed(1)} MB</p>
        </div>
      )}
    </motion.div>
  );
};

export default VersionInfoComponent;