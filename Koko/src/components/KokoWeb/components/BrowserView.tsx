import React from 'react';

interface BrowserViewProps {
  url: string;
  setStatus: (status: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

const BrowserView: React.FC<BrowserViewProps> = ({ url, setStatus, iframeRef }) => {
  const handleLoad = () => {
    setStatus('listo');
  };

  const handleError = () => {
    setStatus('error');
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'white', minHeight: '400px' }}>
      <iframe
        ref={iframeRef}
        src={url}
        style={{ width: '100%', height: '100%', border: 'none', minHeight: '400px' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        onLoad={handleLoad}
        onError={handleError}
        title="Navegador Web"
      />
    </div>
  );
};

export default BrowserView;