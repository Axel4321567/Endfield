import React, { useState, useEffect } from 'react';
import './BookmarkManager.css';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
  folder?: string;
  dateAdded: number;
  tags?: string[];
}

export interface BookmarkFolder {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
}

interface BookmarkManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string, title: string) => void;
  currentUrl?: string;
  currentTitle?: string;
}

const defaultFolders: BookmarkFolder[] = [
  { id: 'root', name: 'Marcadores', icon: '📚' },
  { id: 'toolbar', name: 'Barra de marcadores', icon: '⭐', parentId: 'root' },
  { id: 'development', name: 'Desarrollo', icon: '💻', parentId: 'root' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬', parentId: 'root' },
  { id: 'news', name: 'Noticias', icon: '📰', parentId: 'root' }
];

const defaultBookmarks: Bookmark[] = [
  {
    id: '1',
    title: 'GitHub',
    url: 'https://github.com',
    icon: '🐙',
    folder: 'development',
    dateAdded: Date.now(),
    tags: ['code', 'git', 'desarrollo']
  },
  {
    id: '2',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: '💻',
    folder: 'development',
    dateAdded: Date.now(),
    tags: ['programación', 'ayuda']
  },
  {
    id: '3',
    title: 'YouTube',
    url: 'https://youtube.com',
    icon: '📺',
    folder: 'entertainment',
    dateAdded: Date.now(),
    tags: ['videos', 'música']
  }
];

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentUrl,
  currentTitle
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(defaultBookmarks);
  const [folders, setFolders] = useState<BookmarkFolder[]>(defaultFolders);
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  // Cargar datos del localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('koko-bookmarks');
    const savedFolders = localStorage.getItem('koko-bookmark-folders');
    
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
    
    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    }
  }, []);

  // Guardar datos en localStorage
  const saveBookmarks = (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
    localStorage.setItem('koko-bookmarks', JSON.stringify(newBookmarks));
  };

  const saveFolders = (newFolders: BookmarkFolder[]) => {
    setFolders(newFolders);
    localStorage.setItem('koko-bookmark-folders', JSON.stringify(newFolders));
  };

  // Filtrar marcadores
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFolder = selectedFolder === 'root' || bookmark.folder === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });

  // Agregar marcador actual
  const addCurrentPageBookmark = () => {
    if (currentUrl && currentTitle) {
      const newBookmark: Bookmark = {
        id: Date.now().toString(),
        title: currentTitle,
        url: currentUrl,
        icon: '🌐',
        folder: selectedFolder === 'root' ? 'toolbar' : selectedFolder,
        dateAdded: Date.now(),
        tags: []
      };
      
      saveBookmarks([...bookmarks, newBookmark]);
    }
  };

  // Eliminar marcador
  const deleteBookmark = (bookmarkId: string) => {
    const newBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    saveBookmarks(newBookmarks);
  };

  // Agregar nueva carpeta
  const addFolder = (name: string, icon: string = '📁') => {
    const newFolder: BookmarkFolder = {
      id: Date.now().toString(),
      name,
      icon,
      parentId: selectedFolder === 'root' ? 'root' : selectedFolder
    };
    
    saveFolders([...folders, newFolder]);
    setIsAddingFolder(false);
  };

  // Obtener subcarpetas (para futura implementación)
  // const getSubfolders = (parentId: string) => {
  //   return folders.filter(folder => folder.parentId === parentId);
  // };

  if (!isOpen) return null;

  return (
    <div className="bookmark-manager-overlay">
      <div className="bookmark-manager">
        <div className="bookmark-header">
          <h2>📚 Gestor de Marcadores</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="bookmark-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Buscar marcadores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="bookmark-actions">
            {currentUrl && (
              <button
                className="add-current-btn"
                onClick={addCurrentPageBookmark}
                title="Agregar página actual"
              >
                ⭐ Marcar esta página
              </button>
            )}
            
            <button
              className="add-folder-btn"
              onClick={() => setIsAddingFolder(true)}
              title="Nueva carpeta"
            >
              📁 Nueva carpeta
            </button>
          </div>
        </div>

        <div className="bookmark-content">
          {/* Sidebar de carpetas */}
          <div className="bookmark-sidebar">
            <div className="folder-list">
              {folders.map(folder => {
                const bookmarkCount = bookmarks.filter(b => b.folder === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    className={`folder-item ${selectedFolder === folder.id ? 'active' : ''}`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <span className="folder-icon">{folder.icon}</span>
                    <span className="folder-name">{folder.name}</span>
                    <span className="bookmark-count">{bookmarkCount}</span>
                  </div>
                );
              })}
            </div>

            {isAddingFolder && (
              <div className="add-folder-form">
                <input
                  type="text"
                  placeholder="Nombre de carpeta"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addFolder((e.target as HTMLInputElement).value);
                    }
                  }}
                  autoFocus
                />
                <button onClick={() => setIsAddingFolder(false)}>Cancelar</button>
              </div>
            )}
          </div>

          {/* Lista de marcadores */}
          <div className="bookmark-list">
            {filteredBookmarks.length === 0 ? (
              <div className="empty-bookmarks">
                <p>📝 No hay marcadores en esta carpeta</p>
                {currentUrl && (
                  <button onClick={addCurrentPageBookmark} className="add-first-bookmark">
                    ⭐ Agregar el primero
                  </button>
                )}
              </div>
            ) : (
              filteredBookmarks.map(bookmark => (
                <div key={bookmark.id} className="bookmark-item">
                  <div className="bookmark-main" onClick={() => onNavigate(bookmark.url, bookmark.title)}>
                    <div className="bookmark-icon">{bookmark.icon}</div>
                    <div className="bookmark-info">
                      <div className="bookmark-title">{bookmark.title}</div>
                      <div className="bookmark-url">{bookmark.url}</div>
                      {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="bookmark-tags">
                          {bookmark.tags.map(tag => (
                            <span key={tag} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bookmark-actions">
                    <button
                      className="edit-btn"
                      onClick={() => console.log('Editar marcador:', bookmark.id)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteBookmark(bookmark.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarkManager;