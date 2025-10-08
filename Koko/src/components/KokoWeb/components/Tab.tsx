import type { Tab as TabType } from '../../../hooks/useTabs';
import './Tab.css';

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const LoadingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="loading-spinner">
    <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
    <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
  </svg>
);

const DefaultFavicon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

export const Tab = ({ tab, isActive, onSelect, onClose }: TabProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const getDisplayTitle = () => {
    if (tab.title && tab.title !== 'Nueva pestaña') {
      return tab.title;
    }
    if (tab.url) {
      try {
        return new URL(tab.url).hostname;
      } catch {
        return tab.url;
      }
    }
    return 'Nueva pestaña';
  };

  return (
    <div 
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      title={tab.url || tab.title}
    >
      <div className="tab-favicon">
        {tab.isLoading ? (
          <LoadingIcon />
        ) : tab.favicon ? (
          <img src={tab.favicon} alt="" width="16" height="16" />
        ) : (
          <DefaultFavicon />
        )}
      </div>
      
      <span className="tab-title">
        {getDisplayTitle()}
      </span>
      
      <button 
        className="tab-close"
        onClick={handleClose}
        title="Cerrar pestaña"
      >
        <CloseIcon />
      </button>
    </div>
  );
};