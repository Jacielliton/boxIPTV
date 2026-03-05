import { useState, useEffect } from 'react';
import Login from './components/Login';
import Playlists from './components/Playlists'; 
import AppTV from './AppTV'; // O antigo App.jsx gigante vai para aqui
import AppMobile from './AppMobile'; // O novo layout de celular

function App() {
  const [sessaoUsuario, setSessaoUsuario] = useState(() => {
    try {
      const sessaoSalva = localStorage.getItem('boxiptv_sessao');
      return sessaoSalva ? JSON.parse(sessaoSalva) : null;
    } catch(e) { return null; }
  });
  
  const [playlistAtiva, setPlaylistAtiva] = useState(null);
  
  // Lógica inteligente: deteta telemóvel em pé (largura < 768) ou deitado (altura < 500)
  const checkIsMobile = () => {
    return window.innerWidth < 768 || window.innerHeight < 500;
  };

  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const efetuarLogin = (dadosSessao) => {
    localStorage.setItem('boxiptv_sessao', JSON.stringify(dadosSessao));
    setSessaoUsuario(dadosSessao);
  };

  const efetuarLogout = () => {
    localStorage.removeItem('boxiptv_sessao');
    setSessaoUsuario(null);
    setPlaylistAtiva(null);
  };

  // 1. Ecrã de Login
  if (!sessaoUsuario) return <Login onLogin={efetuarLogin} />;

  // 2. Ecrã de Escolha de Playlist
  if (!playlistAtiva) return <Playlists token={sessaoUsuario.token} onSelectPlaylist={setPlaylistAtiva} onLogout={efetuarLogout} sessaoUsuario={sessaoUsuario} />;

  // 3. Ecrã da Aplicação (Roteamento Inteligente)
  return isMobile ? (
    <AppMobile 
      sessaoUsuario={sessaoUsuario} 
      playlistAtiva={playlistAtiva} 
      efetuarLogout={efetuarLogout} 
      setPlaylistAtiva={setPlaylistAtiva}
    />
  ) : (
    <AppTV 
      sessaoUsuario={sessaoUsuario} 
      playlistAtiva={playlistAtiva} 
      efetuarLogout={efetuarLogout} 
      setPlaylistAtiva={setPlaylistAtiva}
    />
  );
}

export default App;