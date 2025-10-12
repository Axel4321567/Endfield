import React, { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Copy, Trash2, Edit2, Key, Globe, Clock, Check, X } from 'lucide-react';

interface Credential {
  id: number;
  url: string;
  domain: string;
  username: string;
  password: string;
  email?: string;
  notes?: string;
  favicon_url?: string;
  times_used: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

interface Token {
  id: number;
  service_name: string;
  domain: string;
  token_type: string;
  token_value: string;
  expires_at?: string;
  created_at: string;
}

export default function PasswordManager() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [view, setView] = useState<'credentials' | 'tokens'>('credentials');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.passwordManager.getAll();
      if (result.success) {
        setCredentials(result.credentials || []);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async (serviceName: string) => {
    try {
      const result = await window.electronAPI.passwordManager.getTokens(serviceName);
      if (result.success) {
        setTokens(result.tokens || []);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const deleteCredential = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta credencial?')) {
      try {
        await window.electronAPI.passwordManager.deleteCredential(id);
        loadCredentials();
      } catch (error) {
        console.error('Error deleting credential:', error);
      }
    }
  };

  const filteredCredentials = credentials.filter(cred => 
    cred.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando credenciales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6 text-purple-400" />
            Gestor de Contraseñas
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('credentials')}
              className={`px-4 py-2 rounded-lg transition ${
                view === 'credentials'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Credenciales
            </button>
            <button
              onClick={() => setView('tokens')}
              className={`px-4 py-2 rounded-lg transition ${
                view === 'tokens'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tokens
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por dominio, usuario o URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'credentials' && (
          <div className="space-y-4">
            {filteredCredentials.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay credenciales guardadas</p>
                <p className="text-gray-500 text-sm mt-2">
                  Las credenciales se guardarán automáticamente cuando inicies sesión en sitios web
                </p>
              </div>
            ) : (
              filteredCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {cred.favicon_url ? (
                        <img src={cred.favicon_url} alt="" className="w-8 h-8 rounded" />
                      ) : (
                        <Globe className="w-8 h-8 text-gray-500" />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{cred.domain}</h3>
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-400 hover:underline"
                        >
                          {cred.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteCredential(cred.id)}
                        className="p-2 hover:bg-red-600 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Credentials */}
                  <div className="space-y-2">
                    {/* Username */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-24">Usuario:</span>
                      <code className="flex-1 bg-gray-900 px-3 py-1 rounded text-sm">{cred.username}</code>
                      <button
                        onClick={() => copyToClipboard(cred.username, cred.id * 1000)}
                        className="p-2 hover:bg-gray-700 rounded transition"
                        title="Copiar usuario"
                      >
                        {copiedId === cred.id * 1000 ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-24">Contraseña:</span>
                      <code className="flex-1 bg-gray-900 px-3 py-1 rounded text-sm">
                        {showPasswords.has(cred.id) ? cred.password : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => togglePasswordVisibility(cred.id)}
                        className="p-2 hover:bg-gray-700 rounded transition"
                        title={showPasswords.has(cred.id) ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPasswords.has(cred.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(cred.password, cred.id * 1001)}
                        className="p-2 hover:bg-gray-700 rounded transition"
                        title="Copiar contraseña"
                      >
                        {copiedId === cred.id * 1001 ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {cred.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm w-24">Email:</span>
                        <code className="flex-1 bg-gray-900 px-3 py-1 rounded text-sm">{cred.email}</code>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Usado {cred.times_used} veces
                    </span>
                    {cred.last_used && (
                      <span>Último uso: {new Date(cred.last_used).toLocaleDateString()}</span>
                    )}
                  </div>

                  {cred.notes && (
                    <div className="mt-2 p-2 bg-gray-900 rounded text-sm text-gray-300">
                      {cred.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {view === 'tokens' && (
          <div className="text-center py-12">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Vista de tokens en desarrollo</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="bg-gray-800 border-t border-gray-700 p-3 flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {filteredCredentials.length} credenciales guardadas
        </span>
        <button
          onClick={loadCredentials}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded transition"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
