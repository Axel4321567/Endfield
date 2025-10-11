import type { FC, ReactNode } from 'react';

interface ActionButtonProps {
  onClick: () => void;
  variant: 'primary' | 'danger' | 'success';
  icon: string;
  children: ReactNode;
}

export const ActionButton: FC<ActionButtonProps> = ({ 
  onClick, 
  variant, 
  icon, 
  children 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`action-button action-button--${variant}`}
    >
      {icon} {children}
    </button>
  );
};
