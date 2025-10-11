import type { FC } from 'react';

interface SessionStatusProps {
  tabsCount: number;
  activeTabId: string | null;
  hasSession: boolean;
}

export const SessionStatus: FC<SessionStatusProps> = ({ 
  tabsCount, 
  activeTabId, 
  hasSession 
}) => {
  return (
    <div className="session-status">
      <p className="session-status__title">Estado Actual:</p>
      <div className="session-status__items">
        <div className="session-status__item">
          <span className="session-status__label">• Pestañas:</span>
          <span className="session-status__value session-status__value--count">
            {tabsCount}
          </span>
        </div>
        <div className="session-status__item">
          <span className="session-status__label">• Pestaña Activa:</span>
          <span className="session-status__value session-status__value--monospace">
            {activeTabId || 'Ninguna'}
          </span>
        </div>
        <div className="session-status__item">
          <span className="session-status__label">• Sesión:</span>
          <span className={`session-status__value session-status__value--${hasSession ? 'success' : 'error'}`}>
            {hasSession ? '✓ Guardada' : '⚠ Sin guardar'}
          </span>
        </div>
      </div>
    </div>
  );
};
