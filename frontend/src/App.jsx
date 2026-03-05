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
  
  // REGRA DE OURO: Verifica apenas UMA VEZ ao abrir o App.
  // Combina o tamanho da tela com a deteção do sistema Android/iOS.
  const [isMobile] = useState(() => {
    const isMobileSize = window.innerWidth < 768 || window.innerHeight < 500;
    const isMobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobileSize || isMobileAgent;
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

  // Como retiramos o 'useEffect' do 'resize', o layout agora é imutável até recarregar a app!
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