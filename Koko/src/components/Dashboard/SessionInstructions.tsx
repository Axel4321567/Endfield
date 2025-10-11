import type { FC } from 'react';

export const SessionInstructions: FC = () => {
  return (
    <div className="session-instructions">
      <div className="session-instructions__header">
        <span className="session-instructions__icon">💡</span>
        <strong className="session-instructions__title">Instrucciones:</strong>
      </div>
      <ol className="session-instructions__list">
        <li>Ve a "Koko-Web" y abre varias pestañas</li>
        <li>Cierra la aplicación completamente</li>
        <li>Reabre la app - las pestañas deberían restaurarse automáticamente</li>
        <li>Usa "Limpiar Sesión" para probar la pestaña por defecto (Google)</li>
      </ol>
    </div>
  );
};
