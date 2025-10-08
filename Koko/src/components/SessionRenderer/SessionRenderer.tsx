import React from 'react';
import type { SessionState } from '../../hooks/useSession';
import './SessionRenderer.css';

interface SessionRendererProps {
  sessions: SessionState[];
  activeSessionId: string | null;
  className?: string;
}

export const SessionRenderer: React.FC<SessionRendererProps> = ({ 
  sessions, 
  className = ""
}) => {
  console.log('🎬 SessionRenderer renderizando:', {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isActive).map(s => s.id),
    allSessions: sessions.map(s => ({ id: s.id, isActive: s.isActive }))
  });

  return (
    <div className={`session-renderer ${className}`}>
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`session-container ${session.isActive ? 'session-active' : 'session-hidden'}`}
        >
          {session.component}
        </div>
      ))}
    </div>
  );
};

export default SessionRenderer;