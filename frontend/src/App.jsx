import { useState, useEffect } from 'react';
import Player from './components/Player';
import Login from './components/Login';
import Playlists from './components/Playlists'; 
import AdminPanel from './components/AdminPanel';

// IMAGENS DE SUBSTITUIÇÃO (FALLBACK)
const CAPA_PADRAO = 'https://via.placeholder.com/300x450?text=Sem+Capa';
const EPISODIO_PADRAO = 'https://via.placeholder.com/200x110?text=Episodio';

function App() {
  // 1. ESTADOS DE SESSÃO E PLAYLIST (ATUALIZADOS)
  const [sessaoUsuario, setSessaoUsuario] = useState(() => {
    const sessaoSalva = localStorage.getItem('boxiptv_sessao');
    return sessaoSalva ? JSON.parse(sessaoSalva) : null;
  });
  
  const [playlistAtiva, setPlaylistAtiva] = useState(null);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);

  // 2. ESTADOS DE CATÁLOGO E UI
  const [conteudo, setConteudo] = useState([]);
  const [tipoAtual, setTipoAtual] = useState('filmes'); 
  const [busca, setBusca] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [limite, setLimite] = useState(50);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(''); 

  const [serieDetalhes, setSerieDetalhes] = useState(null);
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null);
  const [filmeDetalhes, setFilmeDetalhes] = useState(null);

  // 3. ESTADOS DE HISTÓRICO E PROGRESSO (Vinculados ao usuário do sistema)
  const [historico, setHistorico] = useState(() => {
    if (sessaoUsuario) {
      const historicoSalvo = localStorage.getItem(`boxiptv_hist_${sessaoUsuario.username}`);
      return historicoSalvo ? JSON.parse(historicoSalvo) : [];
    }
    return [];
  });

  const [progressos, setProgressos] = useState(() => {
    if (sessaoUsuario) {
      const progressosSalvos = localStorage.getItem(`boxiptv_progresso_${sessaoUsuario.username}`);
      return progressosSalvos ? JSON.parse(progressosSalvos) : {};
    }
    return {};
  });

  // FUNÇÃO DE VERIFICAÇÃO DE IMAGEM QUEBRADA
  const handleImageError = (e, fallback) => {
    e.target.onerror = null; 
    e.target.src = fallback;
  };

  // NAVEGAÇÃO ESPACIAL (Comandos da TV)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      const currentFocus = document.activeElement;

      if (currentFocus.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return;
      }

      const focusables = Array.from(document.querySelectorAll('.tv-focusable')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!focusables.includes(currentFocus)) {
        if (focusables.length > 0) focusables[0].focus();
        e.preventDefault();
        return;
      }

      e.preventDefault();

      const currentRect = currentFocus.getBoundingClientRect();
      let bestNext = null;
      let minDistance = Infinity;

      focusables.forEach(candidate => {
        if (candidate === currentFocus) return;
        const candidateRect = candidate.getBoundingClientRect();

        let isDirectionMatch = false;
        const tolerance = 20;

        if (e.key === 'ArrowUp') isDirectionMatch = candidateRect.bottom <= currentRect.top + tolerance;
        if (e.key === 'ArrowDown') isDirectionMatch = candidateRect.top >= currentRect.bottom - tolerance;
        if (e.key === 'ArrowLeft') isDirectionMatch = candidateRect.right <= currentRect.left + tolerance;
        if (e.key === 'ArrowRight') isDirectionMatch = candidateRect.left >= currentRect.right - tolerance;

        if (isDirectionMatch) {
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const currentCenterY = currentRect.top + currentRect.height / 2;
          const candidateCenterX = candidateRect.left + candidateRect.width / 2;
          const candidateCenterY = candidateRect.top + candidateRect.height / 2;

          const distance = Math.sqrt(
            Math.pow(currentCenterX - candidateCenterX, 2) +
            Math.pow(currentCenterY - candidateCenterY, 2)
          );

          let orthogonalDistance = 0;
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            orthogonalDistance = Math.abs(currentCenterX - candidateCenterX);
          } else {
            orthogonalDistance = Math.abs(currentCenterY - candidateCenterY);
          }

          const weightedDistance = distance + (orthogonalDistance * 3);

          if (weightedDistance < minDistance) {
            minDistance = weightedDistance;
            bestNext = candidate;
          }
        }
      });

      if (bestNext) {
        bestNext.focus();
        bestNext.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FUNÇÕES DE AUTENTICAÇÃO E SESSÃO
  const efetuarLogin = (dadosSessao) => {
    localStorage.setItem('boxiptv_sessao', JSON.stringify(dadosSessao));
    setSessaoUsuario(dadosSessao);
    
    const historicoSalvo = localStorage.getItem(`boxiptv_hist_${dadosSessao.username}`);
    if (historicoSalvo) setHistorico(JSON.parse(historicoSalvo));

    const progressosSalvos = localStorage.getItem(`boxiptv_progresso_${dadosSessao.username}`);
    if (progressosSalvos) setProgressos(JSON.parse(progressosSalvos));
  };

  const efetuarLogout = () => {
    localStorage.removeItem('boxiptv_sessao');
    setSessaoUsuario(null);
    setPlaylistAtiva(null);
    setConteudo([]);
    setItemSelecionado(null);
    setHistorico([]);
    setProgressos({});
  };

  const fecharDetalhes = () => {
    setSerieDetalhes(null);
    setFilmeDetalhes(null);
  };

  const registrarHistorico = (itemOriginal, tipo) => {
    setHistorico(prevHistorico => {
      const idUnico = itemOriginal.stream_id || itemOriginal.series_id;
      const novaLista = [
        { ...itemOriginal, tipo_salvo: tipo },
        ...prevHistorico.filter(i => (i.stream_id || i.series_id) !== idUnico)
      ].slice(0, 30);
      localStorage.setItem(`boxiptv_hist_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const handleClosePlayer = (tempoAtual, duracao) => {
    if (itemSelecionado && itemSelecionado.id && tempoAtual > 15) { 
      const percentagemVista = duracao > 0 ? (tempoAtual / duracao) : 0;
      if (percentagemVista > 0.95) {
        const novosProgressos = { ...progressos };
        delete novosProgressos[itemSelecionado.id];
        setProgressos(novosProgressos);
        localStorage.setItem(`boxiptv_progresso_${sessaoUsuario.username}`, JSON.stringify(novosProgressos));
      } else {
        const novosProgressos = { ...progressos, [itemSelecionado.id]: tempoAtual };
        setProgressos(novosProgressos);
        localStorage.setItem(`boxiptv_progresso_${sessaoUsuario.username}`, JSON.stringify(novosProgressos));
      }
    }
    setItemSelecionado(null);
    
    setTimeout(() => {
        const elementos = document.querySelectorAll('.tv-focusable');
        if(elementos.length > 0) elementos[0].focus();
    }, 100);
  };

  const formatarTempo = (segundos) => {
    if (!segundos) return '';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}m ${s}s`;
  };

  // BUSCA DE CONTEÚDO (Agora depende da playlist ativa)
  useEffect(() => {
    if (!playlistAtiva) return;
    setCarregando(true);
    fecharDetalhes();
    setLimite(50);
    setCategoriaSelecionada(''); 
    
    const endpoint = tipoAtual === 'filmes' ? 'filmes' : (tipoAtual === 'series' ? 'series' : 'ao-vivo');
    // Usa as credenciais da playlist escolhida para o proxy IPTV
    const queryParams = `?server_url=${encodeURIComponent(playlistAtiva.server_url)}&user=${encodeURIComponent(playlistAtiva.iptv_username)}&passw=${encodeURIComponent(playlistAtiva.iptv_password)}`;
    
    Promise.all([
      fetch(`http://localhost:8006/api/${endpoint}${queryParams}`).then(res => res.json()),
      fetch(`http://localhost:8006/api/categorias/${tipoAtual}${queryParams}`).then(res => res.json())
    ]).then(([dadosConteudo, dadosCategorias]) => {
      setConteudo(dadosConteudo);
      setCategorias(dadosCategorias);
      setCarregando(false);
    }).catch(err => {
      console.error(err);
      setCarregando(false);
    });
  }, [tipoAtual, playlistAtiva]);

  let conteudoParaExibir = [];
  if (categoriaSelecionada === 'recentes') {
    conteudoParaExibir = historico
      .filter(item => item.tipo_salvo === tipoAtual && item.name && item.name.toLowerCase().includes(busca.toLowerCase()))
      .slice(0, limite);
  } else {
    conteudoParaExibir = conteudo
      .filter(item => {
        const passaBusca = item.name && item.name.toLowerCase().includes(busca.toLowerCase());
        const passaCategoria = categoriaSelecionada === '' || String(item.category_id) === String(categoriaSelecionada);
        return passaBusca && passaCategoria;
      })
      .slice(0, limite);
  }

  const handleItemClick = (item) => {
    registrarHistorico(item, tipoAtual);
    const queryParams = `?server_url=${encodeURIComponent(playlistAtiva.server_url)}&user=${encodeURIComponent(playlistAtiva.iptv_username)}&passw=${encodeURIComponent(playlistAtiva.iptv_password)}`;

    if (tipoAtual === 'filmes') {
      setCarregando(true);
      fetch(`http://localhost:8006/api/filmes/${item.stream_id}${queryParams}`)
        .then(res => res.json())
        .then(data => {
          setFilmeDetalhes(data);
          setCarregando(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => { setCarregando(false); });

    } else if (tipoAtual === 'ao-vivo') {
      const streamUrl = `${playlistAtiva.server_url}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${item.stream_id}`;
      setItemSelecionado({ id: item.stream_id, nome: item.name, url: streamUrl, startTime: 0 });

    } else {
      setCarregando(true);
      fetch(`http://localhost:8006/api/series/${item.series_id}${queryParams}`)
        .then(res => res.json())
        .then(data => {
          setSerieDetalhes(data);
          if (data.episodes && Object.keys(data.episodes).length > 0) {
            setTemporadaSelecionada(Object.keys(data.episodes)[0]);
          }
          setCarregando(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => { setCarregando(false); });
    }
  };

  const handlePlayFilme = (inicio = 0) => {
    const idFilme = filmeDetalhes.movie_data.stream_id;
    const extensao = filmeDetalhes.movie_data.container_extension || 'mp4';
    const streamUrl = `${playlistAtiva.server_url}/movie/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${idFilme}.${extensao}`;
    setItemSelecionado({ id: idFilme, nome: filmeDetalhes.info.name, url: streamUrl, startTime: inicio });
  };

  const handlePlayEpisode = (episodio, inicio = 0) => {
    const extensao = episodio.container_extension || 'mp4';
    const streamUrl = `${playlistAtiva.server_url}/series/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${episodio.id}.${extensao}`;
    setItemSelecionado({
      id: episodio.id,
      nome: `${serieDetalhes.info.name} - S${temporadaSelecionada}E${episodio.episode_num} - ${episodio.title}`,
      url: streamUrl,
      startTime: inicio
    });
  };

  const acionarComEnter = (e, acao) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      acao();
    }
  };


  // ========================================================
  // RENDERIZAÇÃO CONDICIONAL DO FLUXO DO APLICATIVO
  // ========================================================

  // 1. Se não tem sessão (token), mostra o Login/Registo
  if (!sessaoUsuario) {
    return <Login onLogin={efetuarLogin} />;
  }

  // 2. Se a flag de Admin estiver ativa, mostra o Painel
  if (mostrarAdmin) {
    return <AdminPanel token={sessaoUsuario.token} onVoltar={() => setMostrarAdmin(false)} />;
  }

  // 3. Se tem sessão mas não escolheu a playlist, mostra o Painel de Playlists
  if (!playlistAtiva) {
    // Vamos adicionar um botão aqui para o Admin poder aceder ao painel antes de escolher a playlist
    return (
      <>
        {sessaoUsuario.isAdmin && (
          <div style={{ position: 'absolute', top: '40px', left: '40px' }}>
            <button className="tv-focusable" onClick={() => setMostrarAdmin(true)} style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>⚙️ Painel Admin</button>
          </div>
        )}
        <Playlists 
          token={sessaoUsuario.token} 
          onSelectPlaylist={(pl) => setPlaylistAtiva(pl)} 
          onLogout={efetuarLogout} 
        />
      </>
    );
  }

  // 4. Se passou pelas barreiras, renderiza o Catálogo (Código Principal)
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#141414', minHeight: '100vh', color: '#fff' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#e50914', margin: 0 }}>BoxIPTV Pro</h1>
        <div>
          <span style={{ marginRight: '15px', color: '#aaa' }}>Usuário: <strong>{sessaoUsuario.username}</strong></span>
          
          {/* Botão de Admin no catálogo também */}
          {sessaoUsuario.isAdmin && (
             <button tabIndex={0} className="tv-focusable" onClick={() => setMostrarAdmin(true)} style={{ padding: '8px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}>Painel Admin</button>
          )}

          <button tabIndex={0} className="tv-focusable" onClick={() => setPlaylistAtiva(null)} style={{ padding: '8px 15px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}>Trocar Playlist</button>
          <button tabIndex={0} className="tv-focusable" onClick={efetuarLogout} style={{ padding: '8px 15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        <div style={{ width: '250px', backgroundColor: '#222', padding: '15px', borderRadius: '8px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: '20px' }}>
          
          <h3 style={{ marginTop: 0, color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Categorias</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', marginBottom: '15px' }}>
            {carregando && !filmeDetalhes && !serieDetalhes ? (
              <p style={{ color: '#888', fontSize: '14px' }}>A carregar...</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li 
                  tabIndex={0}
                  className="tv-focusable"
                  onClick={() => { setCategoriaSelecionada('recentes'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada('recentes'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                  style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', backgroundColor: categoriaSelecionada === 'recentes' ? '#e50914' : '#333', fontWeight: 'bold', color: '#fff', border: '1px solid #444' }}
                >
                  🕒 Assistidos Recentemente
                </li>
                <li 
                  tabIndex={0}
                  className="tv-focusable"
                  onClick={() => { setCategoriaSelecionada(''); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada(''); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                  style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', backgroundColor: categoriaSelecionada === '' ? '#e50914' : 'transparent', fontWeight: categoriaSelecionada === '' ? 'bold' : 'normal' }}
                >
                  Todas as Categorias
                </li>
                {categorias.map((cat, idx) => (
                  <li 
                    key={idx} 
                    tabIndex={0}
                    className="tv-focusable"
                    onClick={() => { setCategoriaSelecionada(cat.category_id); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                    onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada(cat.category_id); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                    title={cat.category_name} 
                    style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: String(categoriaSelecionada) === String(cat.category_id) ? '#e50914' : 'transparent', fontWeight: String(categoriaSelecionada) === String(cat.category_id) ? 'bold' : 'normal' }}
                  >
                    {cat.category_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button 
            tabIndex={0}
            className="tv-focusable"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            ⬆ Voltar ao Início
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>

          {itemSelecionado && (
             <Player channel={itemSelecionado} onClose={handleClosePlayer} startTime={itemSelecionado.startTime || 0} />
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('filmes'); fecharDetalhes(); }} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'filmes' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>🎬 Filmes</button>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('series'); fecharDetalhes(); }} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'series' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>📺 Séries</button>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('ao-vivo'); fecharDetalhes(); }} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'ao-vivo' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>📡 TV ao Vivo</button>
            </div>
            <input tabIndex={0} className="tv-focusable" type="text" placeholder={`Buscar ${tipoAtual.replace('-', ' ')}...`} value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '12px 20px', width: '100%', maxWidth: '350px', borderRadius: '25px', border: 'none', outline: 'none', fontSize: '16px', backgroundColor: '#333', color: 'white' }} />
          </div>

          {filmeDetalhes ? (
            <div style={{ backgroundColor: '#222', padding: '30px', borderRadius: '8px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <img 
                src={filmeDetalhes.info.movie_image || CAPA_PADRAO} 
                alt={filmeDetalhes.info.name || 'Sem Título'} 
                onError={(e) => handleImageError(e, CAPA_PADRAO)} 
                style={{ width: '250px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} 
              />
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h1 style={{ marginTop: 0, marginBottom: '10px', fontSize: '32px' }}>{filmeDetalhes.info.name || 'Título Indisponível'}</h1>
                <div style={{ display: 'flex', gap: '15px', color: '#aaa', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {filmeDetalhes.info.rating && <span>⭐ {filmeDetalhes.info.rating} / 10</span>}
                  {filmeDetalhes.info.releasedate && <span>📅 {filmeDetalhes.info.releasedate}</span>}
                  {filmeDetalhes.info.duration && <span>⏱️ {filmeDetalhes.info.duration}</span>}
                </div>
                <p style={{ lineHeight: '1.6', fontSize: '16px', color: '#ccc', marginBottom: '20px' }}>{filmeDetalhes.info.plot || "Sinopse não disponível."}</p>
                {filmeDetalhes.info.cast && <p style={{ color: '#aaa', marginBottom: '30px' }}><strong>Elenco:</strong> {filmeDetalhes.info.cast}</p>}

                {progressos[filmeDetalhes.movie_data.stream_id] > 15 ? (
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(progressos[filmeDetalhes.movie_data.stream_id])} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                      ▶ Continuar ({formatarTempo(progressos[filmeDetalhes.movie_data.stream_id])})
                    </button>
                    <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                      🔄 Reiniciar
                    </button>
                  </div>
                ) : (
                  <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    ▶ Iniciar Filme
                  </button>
                )}
              </div>
            </div>

          ) : serieDetalhes ? (
            <div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', backgroundColor: '#222', padding: '20px', borderRadius: '8px' }}>
                <img 
                  src={serieDetalhes.info.cover || CAPA_PADRAO} 
                  alt={serieDetalhes.info.name || 'Sem Título'} 
                  onError={(e) => handleImageError(e, CAPA_PADRAO)} 
                  style={{ width: '150px', borderRadius: '5px' }} 
                />
                <div>
                  <h2 style={{ marginTop: 0 }}>{serieDetalhes.info.name || 'Título Indisponível'}</h2>
                  <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>{serieDetalhes.info.plot || "Sinopse não disponível."}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
                {serieDetalhes.episodes && Object.keys(serieDetalhes.episodes).map(temp => (
                  <button tabIndex={0} className="tv-focusable" key={temp} onClick={() => setTemporadaSelecionada(temp)} style={{ padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: temporadaSelecionada === temp ? '#e50914' : '#333', color: 'white' }}>
                    Temporada {temp}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {serieDetalhes.episodes[temporadaSelecionada]?.map((ep, idx) => {
                  const tempoEp = progressos[ep.id] || 0; 
                  return (
                    <div 
                      key={idx} 
                      tabIndex={0}
                      className="tv-focusable"
                      onClick={() => handlePlayEpisode(ep, tempoEp > 15 ? tempoEp : 0)} 
                      onKeyDown={(e) => acionarComEnter(e, () => handlePlayEpisode(ep, tempoEp > 15 ? tempoEp : 0))}
                      style={{ background: '#222', padding: '10px', borderRadius: '5px', border: '1px solid #444', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                    >
                      <img 
                        src={ep.info?.movie_image || EPISODIO_PADRAO} 
                        alt={ep.title || 'Episódio'} 
                        loading="lazy" 
                        onError={(e) => handleImageError(e, EPISODIO_PADRAO)}
                        style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} 
                      />
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', flex: 1 }}>
                        {ep.episode_num}. {ep.title || 'Título Indisponível'}
                      </div>
                      
                      {tempoEp > 15 ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, tempoEp); }} style={{ flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>▶ Cont.</button>
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>🔄 Do Zero</button>
                        </div>
                      ) : (
                        <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ width: '100%', padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>▶ Assistir</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            <>
              {carregando ? (
                <p style={{ textAlign: 'center', marginTop: '50px' }}>A carregar a grelha de {tipoAtual.replace('-', ' ')}...</p>
              ) : (
                <>
                  {conteudoParaExibir.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>{categoriaSelecionada === 'recentes' ? 'Nenhum histórico recente nesta secção.' : 'Nenhum conteúdo encontrado nesta categoria.'}</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                      {conteudoParaExibir.map((item, index) => (
                        <div 
                          key={index} 
                          tabIndex={0} 
                          className="tv-focusable"
                          onClick={() => handleItemClick(item)} 
                          onKeyDown={(e) => acionarComEnter(e, () => handleItemClick(item))} 
                          style={{ background: '#222', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden', border: '1px solid #333' }}
                        >
                          <img 
                            src={item.stream_icon || item.cover || CAPA_PADRAO} 
                            alt={item.name || 'Sem Título'} 
                            loading="lazy" 
                            onError={(e) => handleImageError(e, CAPA_PADRAO)}
                            style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '150px' : '225px', objectFit: 'contain', backgroundColor: '#000', padding: '10px' }} 
                          />
                          <div style={{ padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name || 'Título Indisponível'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {categoriaSelecionada !== 'recentes' && conteudoParaExibir.length < conteudo.filter(item => categoriaSelecionada === '' || String(item.category_id) === String(categoriaSelecionada)).length && !busca && (
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                      <button tabIndex={0} className="tv-focusable" onClick={() => setLimite(limite + 50)} style={{ padding: '12px 30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px' }}>Carregar mais</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;