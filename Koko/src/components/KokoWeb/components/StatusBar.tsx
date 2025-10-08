import React from 'react';

interface StatusBarProps {
  status: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'cargando...':
        return '#2563eb';
      case 'listo':
        return '#059669';
      case 'error':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'cargando...':
        return '⏳';
      case 'listo':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🌐';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '8px 12px', 
      backgroundColor: '#f9fafb', 
      borderTop: '1px solid #e5e7eb', 
      fontSize: '14px' 
    }}>
      <span style={{ color: getStatusColor(), fontWeight: '500' }}>
        {getStatusIcon()} Estado: {status}
      </span>
    </div>
  );
};

export default StatusBar;