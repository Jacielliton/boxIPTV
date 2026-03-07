import { useState } from 'react';
import Login from './components/Login';
import Playlists from './components/Playlists'; 
import AppTV from './AppTV'; 
import AppMobile from './AppMobile'; 

function App() {
  const [sessaoUsuario, setSessaoUsuario] = useState(() => {
    try {
      const sessaoSalva = localStorage.getItem('boxiptv_sessao');
      return sessaoSalva ? JSON.parse(sessaoSalva) : null;
    } catch(e) { return null; }
  });
  
  const [playlistAtiva, setPlaylistAtiva] = useState(null);
  
  // REGRA DE OURO ATUALIZADA:
  // A verificação anterior considerava qualquer "Android" como mobile (TV Boxes rodam Android).
  // Agora, verificamos ativamente se é uma TV ou se o dispositivo NÃO tem touch (TV Box).
  const [isTV] = useState(() => {
    const ua = navigator.userAgent.toLowerCase();
    
    // 1. Verifica nomes comuns de TV e TV Boxes no navegador
    const isTVString = /(tv|smarttv|googletv|appletv|hbbtv|bravia|netcast|viera|vidaa|webos|box|mibox|aft|android tv)/i.test(ua);
    
    // 2. Heurística para TV Box genérica (como MXQ Pro, TX9, etc):
    // Se a tela for deitada (paisagem) e o dispositivo NÃO tiver tela touch, é uma TV Box.
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    const isLandscape = window.innerWidth > window.innerHeight;
    
    // Se tiver string de TV ou (for paisagem e não tiver touch)
    return isTVString || (!hasTouch && isLandscape);
  });

  const efetuarLogin = (dadosSessao) => {
    localStorage.setItem('boxiptv_sessao', JSON.stringify(dadosSessao));
    setSessaoUsuario(dadosSessao);
  };

  const efetuarLogout = () => {
    localStorage.removeItem('boxiptv_sessao');
    setSessaoUsuario(null);
    setPlaylistAtiva(null);
  };

  if (!sessaoUsuario) return <Login onLogin={efetuarLogin} />;

  if (!playlistAtiva) return <Playlists token={sessaoUsuario.token} onSelectPlaylist={setPlaylistAtiva} onLogout={efetuarLogout} sessaoUsuario={sessaoUsuario} />;

  // Se a verificação detectar que é uma TV (isTV = true), renderiza AppTV.
  // Caso contrário, renderiza AppMobile.
  return isTV ? (
    <AppTV 
      sessaoUsuario={sessaoUsuario} 
      playlistAtiva={playlistAtiva} 
      efetuarLogout={efetuarLogout} 
      setPlaylistAtiva={setPlaylistAtiva}
    />
  ) : (
    <AppMobile 
      sessaoUsuario={sessaoUsuario} 
      playlistAtiva={playlistAtiva} 
      efetuarLogout={efetuarLogout} 
      setPlaylistAtiva={setPlaylistAtiva}
    />
  );
}

export default App;