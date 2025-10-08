import { Tab } from './Tab';
import type { Tab as TabType } from '../../../hooks/useTabs';
import './TabBar.css';

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

export const TabBar = ({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab }: TabBarProps) => {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSelect(tab.id)}
            onClose={() => onTabClose(tab.id)}
          />
        ))}
      </div>
      
      <button 
        className="new-tab-button"
        onClick={onNewTab}
        title="Nueva pestaña (Ctrl+T)"
      >
        <PlusIcon />
      </button>
    </div>
  );
};