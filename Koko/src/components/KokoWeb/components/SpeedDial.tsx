import React, { useState, useEffect } from 'react';
import './SpeedDial.css';

interface SpeedDialSite {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  icon?: string;
  color?: string;
}

interface SpeedDialProps {
  onNavigate: (url: string, title: string) => void;
  onAddSite?: (site: SpeedDialSite) => void;
  onOpenBookmarks?: () => void;
}

const defaultSites: SpeedDialSite[] = [
  {
    id: '1',
    title: 'Google',
    url: 'https://www.google.com',
    icon: '🔍',
    color: '#4285f4'
  },
  {
    id: '2',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    icon: '📺',
    color: '#ff0000'
  },
  {
    id: '3',
    title: 'GitHub',
    url: 'https://github.com',
    icon: '🐙',
    color: '#333'
  },
  {
    id: '4',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: '💻',
    color: '#f48024'
  },
  {
    id: '5',
    title: 'Wikipedia',
    url: 'https://wikipedia.org',
    icon: '📚',
    color: '#000'
  },
  {
    id: '6',
    title: 'Reddit',
    url: 'https://reddit.com',
    icon: '🤖',
    color: '#ff4500'
  },
  {
    id: '7',
    title: 'Netflix',
    url: 'https://www.netflix.com',
    icon: '🎬',
    color: '#e50914'
  },
  {
    id: '8',
    title: 'Twitter',
    url: 'https://twitter.com',
    icon: '🐦',
    color: '#1da1f2'
  },
  {
    id: '9',
    title: 'Instagram',
    url: 'https://www.instagram.com',
    icon: '�',
    color: '#e4405f'
  },
  {
    id: '10',
    title: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: '🤖',
    color: '#10a37f'
  },
  {
    id: '11',
    title: 'Discord',
    url: 'https://discord.com',
    icon: '🎮',
    color: '#7289da'
  },
  {
    id: '12',
    title: 'Amazon',
    url: 'https://www.amazon.com',
    icon: '🛒',
    color: '#ff9900'
  }
];

export const SpeedDial: React.FC<SpeedDialProps> = ({ onNavigate, onAddSite, onOpenBookmarks }) => {
  const [sites, setSites] = useState<SpeedDialSite[]>(defaultSites);
  const [isAdding, setIsAdding] = useState(false);
  const [newSite, setNewSite] = useState({
    title: '',
    url: '',
    icon: '🌐'
  });

  // Cargar sitios del localStorage
  useEffect(() => {
    const savedSites = localStorage.getItem('koko-speed-dial-sites');
    if (savedSites) {
      try {
        setSites(JSON.parse(savedSites));
      } catch (error) {
        console.error('Error loading speed dial sites:', error);
      }
    }
  }, []);

  // Guardar sitios en localStorage
  const saveSites = (newSites: SpeedDialSite[]) => {
    setSites(newSites);
    localStorage.setItem('koko-speed-dial-sites', JSON.stringify(newSites));
  };

  const handleSiteClick = (site: SpeedDialSite) => {
    onNavigate(site.url, site.title);
  };

  const handleAddSite = () => {
    if (newSite.title && newSite.url) {
      const site: SpeedDialSite = {
        id: Date.now().toString(),
        title: newSite.title,
        url: newSite.url.startsWith('http') ? newSite.url : `https://${newSite.url}`,
        icon: newSite.icon,
        color: '#6366f1'
      };
      
      saveSites([...sites, site]);
      setNewSite({ title: '', url: '', icon: '🌐' });
      setIsAdding(false);
      
      if (onAddSite) {
        onAddSite(site);
      }
    }
  };

  const handleRemoveSite = (siteId: string) => {
    const newSites = sites.filter(site => site.id !== siteId);
    saveSites(newSites);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  return (
    <div className="speed-dial">
      <div className="speed-dial-header">
        <h1 className="greeting">{getTimeGreeting()}</h1>
        <p className="subtitle">¿A dónde quieres ir hoy?</p>
      </div>

      <div className="speed-dial-grid">
        {sites.map((site) => (
          <div
            key={site.id}
            className="speed-dial-item"
            onClick={() => handleSiteClick(site)}
            style={{ '--site-color': site.color } as any}
          >
            <div className="site-icon">{site.icon}</div>
            <div className="site-title">{site.title}</div>
            <button
              className="remove-site"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSite(site.id);
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Botón para agregar nuevo sitio */}
        <div
          className={`speed-dial-item add-site ${isAdding ? 'adding' : ''}`}
          onClick={() => setIsAdding(true)}
        >
          {isAdding ? (
            <div className="add-site-form" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Título"
                value={newSite.title}
                onChange={(e) => setNewSite({ ...newSite, title: e.target.value })}
                className="add-site-input"
                autoFocus
              />
              <input
                type="text"
                placeholder="URL"
                value={newSite.url}
                onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                className="add-site-input"
              />
              <input
                type="text"
                placeholder="Emoji"
                value={newSite.icon}
                onChange={(e) => setNewSite({ ...newSite, icon: e.target.value })}
                className="add-site-input"
                maxLength={2}
              />
              <div className="add-site-buttons">
                <button onClick={handleAddSite} className="add-btn">✓</button>
                <button onClick={() => setIsAdding(false)} className="cancel-btn">×</button>
              </div>
            </div>
          ) : (
            <>
              <div className="site-icon">+</div>
              <div className="site-title">Agregar sitio</div>
            </>
          )}
        </div>
      </div>

      <div className="speed-dial-footer">
        <p className="tip">💡 Haz clic en cualquier sitio para navegarlo, o agrega tus favoritos</p>
        {onOpenBookmarks && (
          <button 
            className="bookmarks-button"
            onClick={onOpenBookmarks}
          >
            ⭐ Ver Marcadores
          </button>
        )}
      </div>
    </div>
  );
};

export default SpeedDial;