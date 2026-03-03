import { useState, useEffect } from 'react';
import Player from './components/Player';
import Login from './components/Login';
import Playlists from './components/Playlists'; 
import AdminPanel from './components/AdminPanel';
// Importação dos ícones profissionais (adicionado Bookmark e Check)
import { Film, Tv, Radio, Clock, LayoutGrid, LogOut, Settings, Play, RefreshCw, Star, Bookmark, Check } from 'lucide-react';

const CAPA_PADRAO = 'https://via.placeholder.com/300x450?text=Sem+Capa';
const EPISODIO_PADRAO = 'https://via.placeholder.com/200x110?text=Episodio';

function App() {
  const [sessaoUsuario, setSessaoUsuario] = useState(() => {
    const sessaoSalva = localStorage.getItem('boxiptv_sessao');
    return sessaoSalva ? JSON.parse(sessaoSalva) : null;
  });
  
  const [playlistAtiva, setPlaylistAtiva] = useState(null);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);

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
  
  // NOVO ESTADO: Guarda o item original clicado para podermos adicioná-lo à Minha Lista
  const [itemAtualDetalhes, setItemAtualDetalhes] = useState(null);

  const [historico, setHistorico] = useState(() => {
    if (sessaoUsuario) {
      const historicoSalvo = localStorage.getItem(`boxiptv_hist_${sessaoUsuario.username}`);
      return historicoSalvo ? JSON.parse(historicoSalvo) : [];
    }
    return [];
  });

  // NOVO ESTADO: A Minha Lista (Favoritos)
  const [minhaLista, setMinhaLista] = useState(() => {
    if (sessaoUsuario) {
      const listaSalva = localStorage.getItem(`boxiptv_lista_${sessaoUsuario.username}`);
      return listaSalva ? JSON.parse(listaSalva) : [];
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

  const handleImageError = (e, fallback) => {
    e.target.onerror = null; 
    e.target.src = fallback;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      const currentFocus = document.activeElement;

      if (currentFocus.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;

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
            Math.pow(currentCenterX - candidateCenterX, 2) + Math.pow(currentCenterY - candidateCenterY, 2)
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

  const efetuarLogin = (dadosSessao) => {
    localStorage.setItem('boxiptv_sessao', JSON.stringify(dadosSessao));
    setSessaoUsuario(dadosSessao);
    
    const historicoSalvo = localStorage.getItem(`boxiptv_hist_${dadosSessao.username}`);
    if (historicoSalvo) setHistorico(JSON.parse(historicoSalvo));

    const listaSalva = localStorage.getItem(`boxiptv_lista_${dadosSessao.username}`);
    if (listaSalva) setMinhaLista(JSON.parse(listaSalva));

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
    setMinhaLista([]);
    setProgressos({});
  };

  const fecharDetalhes = () => {
    setSerieDetalhes(null);
    setFilmeDetalhes(null);
    setItemAtualDetalhes(null);
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

  // FUNÇÃO DE ADICIONAR/REMOVER DOS FAVORITOS
  const toggleMinhaLista = (item) => {
    if (!item) return;
    setMinhaLista(prevLista => {
      const idUnico = item.stream_id || item.series_id;
      const jaExiste = prevLista.find(i => (i.stream_id || i.series_id) === idUnico);
      let novaLista;
      
      if (jaExiste) {
        novaLista = prevLista.filter(i => (i.stream_id || i.series_id) !== idUnico);
      } else {
        novaLista = [{ ...item, tipo_salvo: tipoAtual }, ...prevLista];
      }
      
      localStorage.setItem(`boxiptv_lista_${sessaoUsuario.username}`, JSON.stringify(novaLista));
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

  useEffect(() => {
    if (!playlistAtiva) return;
    setCarregando(true);
    fecharDetalhes();
    setLimite(50);
    setCategoriaSelecionada(''); 
    
    const endpoint = tipoAtual === 'filmes' ? 'filmes' : (tipoAtual === 'series' ? 'series' : 'ao-vivo');
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

  // FILTRA O CONTEÚDO BASEADO NA CATEGORIA ATUAL (INCLUINDO A MINHA LISTA)
  let conteudoParaExibir = [];
  if (categoriaSelecionada === 'recentes') {
    conteudoParaExibir = historico
      .filter(item => item.tipo_salvo === tipoAtual && item.name && item.name.toLowerCase().includes(busca.toLowerCase()))
      .slice(0, limite);
  } else if (categoriaSelecionada === 'minha-lista') {
    conteudoParaExibir = minhaLista
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

  const itemDestaque = conteudoParaExibir.length > 0 && !busca && categoriaSelecionada !== 'recentes' && categoriaSelecionada !== 'minha-lista' ? conteudoParaExibir[0] : null;

  const handleItemClick = (item) => {
    registrarHistorico(item, tipoAtual);
    setItemAtualDetalhes(item); // Salva o item para a Minha Lista
    
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

  // VERIFICA SE O ITEM ATUAL ESTÁ NA LISTA PARA MUDAR O BOTÃO
  const itemEstaNaLista = itemAtualDetalhes && minhaLista.some(i => (i.stream_id || i.series_id) === (itemAtualDetalhes.stream_id || itemAtualDetalhes.series_id));

  if (!sessaoUsuario) return <Login onLogin={efetuarLogin} />;

  if (mostrarAdmin) return <AdminPanel token={sessaoUsuario.token} onVoltar={() => setMostrarAdmin(false)} />;

  if (!playlistAtiva) {
    return (
      <>
        {sessaoUsuario.isAdmin && (
          <div style={{ position: 'absolute', top: '40px', left: '40px' }}>
            <button className="tv-focusable" onClick={() => setMostrarAdmin(true)} style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Painel Admin
            </button>
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#141414', minHeight: '100vh', color: '#fff' }}>
      
      {/* INJEÇÃO DO CSS PARA OS SKELETONS (Evita necessidade de mexer no App.css) */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .skeleton-loader {
          background-image: linear-gradient(90deg, #222 0px, #333 40px, #222 80px);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      {/* HEADER TOP NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#e50914', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>BoxIPTV Pro</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#aaa' }}>Usuário: <strong style={{color: 'white'}}>{sessaoUsuario.username}</strong></span>
          
          {sessaoUsuario.isAdmin && (
             <button tabIndex={0} className="tv-focusable" onClick={() => setMostrarAdmin(true)} style={{ padding: '8px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
               <Settings size={16} /> Admin
             </button>
          )}

          <button tabIndex={0} className="tv-focusable" onClick={() => setPlaylistAtiva(null)} style={{ padding: '8px 15px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RefreshCw size={16} /> Trocar Playlist
          </button>
          <button tabIndex={0} className="tv-focusable" onClick={efetuarLogout} style={{ padding: '8px 15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* SIDEBAR CATEGORIES */}
        <div style={{ width: '250px', backgroundColor: '#222', padding: '15px', borderRadius: '8px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Menu</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', marginBottom: '15px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              
              {/* NOVA OPÇÃO: A MINHA LISTA */}
              <li 
                tabIndex={0}
                className="tv-focusable"
                onClick={() => { setCategoriaSelecionada('minha-lista'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada('minha-lista'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', backgroundColor: categoriaSelecionada === 'minha-lista' ? '#e50914' : 'transparent', fontWeight: 'bold', color: '#fff' }}
              >
                <Bookmark size={16} style={{ marginRight: '8px' }} fill={categoriaSelecionada === 'minha-lista' ? 'currentColor' : 'none'} /> A Minha Lista
              </li>

              <li 
                tabIndex={0}
                className="tv-focusable"
                onClick={() => { setCategoriaSelecionada('recentes'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada('recentes'); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', backgroundColor: categoriaSelecionada === 'recentes' ? '#e50914' : '#333', fontWeight: 'bold', color: '#fff', border: '1px solid #444' }}
              >
                <Clock size={16} style={{ marginRight: '8px' }} /> Assistidos Recentes
              </li>
              
              <li 
                tabIndex={0}
                className="tv-focusable"
                onClick={() => { setCategoriaSelecionada(''); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada(''); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', backgroundColor: categoriaSelecionada === '' ? '#e50914' : 'transparent', fontWeight: categoriaSelecionada === '' ? 'bold' : 'normal' }}
              >
                <LayoutGrid size={16} style={{ marginRight: '8px' }} /> Todas as Categorias
              </li>

              {categorias.map((cat, idx) => (
                <li 
                  key={idx} 
                  tabIndex={0}
                  className="tv-focusable"
                  onClick={() => { setCategoriaSelecionada(cat.category_id); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  onKeyDown={(e) => acionarComEnter(e, () => { setCategoriaSelecionada(cat.category_id); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                  title={cat.category_name} 
                  style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: String(categoriaSelecionada) === String(cat.category_id) ? '#e50914' : 'transparent', fontWeight: String(categoriaSelecionada) === String(cat.category_id) ? 'bold' : 'normal', color: '#ccc' }}
                >
                  {cat.category_name}
                </li>
              ))}
            </ul>
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

          {/* TYPE SELECTORS (FILMES, SERIES, AO VIVO) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('filmes'); fecharDetalhes(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'filmes' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>
                <Film size={18} /> Filmes
              </button>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('series'); fecharDetalhes(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'series' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>
                <Tv size={18} /> Séries
              </button>
              <button tabIndex={0} className="tv-focusable" onClick={() => { setTipoAtual('ao-vivo'); fecharDetalhes(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', backgroundColor: tipoAtual === 'ao-vivo' ? '#e50914' : '#333', color: 'white', fontWeight: 'bold' }}>
                <Radio size={18} /> TV ao Vivo
              </button>
            </div>
            <input tabIndex={0} className="tv-focusable" type="text" placeholder={`Buscar ${tipoAtual.replace('-', ' ')}...`} value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(50); fecharDetalhes(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '12px 20px', width: '100%', maxWidth: '350px', borderRadius: '25px', border: 'none', outline: 'none', fontSize: '16px', backgroundColor: '#333', color: 'white' }} />
          </div>

          {/* DETAIL VIEWS */}
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
                <div style={{ display: 'flex', gap: '15px', color: '#aaa', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', alignItems: 'center' }}>
                  {filmeDetalhes.info.rating && <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Star size={16} color="#f5c518" fill="#f5c518" /> {filmeDetalhes.info.rating} / 10</span>}
                  {filmeDetalhes.info.releasedate && <span>📅 {filmeDetalhes.info.releasedate}</span>}
                  {filmeDetalhes.info.duration && <span>⏱️ {filmeDetalhes.info.duration}</span>}
                </div>
                <p style={{ lineHeight: '1.6', fontSize: '16px', color: '#ccc', marginBottom: '20px' }}>{filmeDetalhes.info.plot || "Sinopse não disponível."}</p>
                {filmeDetalhes.info.cast && <p style={{ color: '#aaa', marginBottom: '30px' }}><strong>Elenco:</strong> {filmeDetalhes.info.cast}</p>}

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {progressos[filmeDetalhes.movie_data.stream_id] > 15 ? (
                    <>
                      <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(progressos[filmeDetalhes.movie_data.stream_id])} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        <Play fill="currentColor" size={20} /> Continuar ({formatarTempo(progressos[filmeDetalhes.movie_data.stream_id])})
                      </button>
                      <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        <RefreshCw size={20} /> Reiniciar
                      </button>
                    </>
                  ) : (
                    <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                      <Play fill="currentColor" size={20} /> Iniciar Filme
                    </button>
                  )}
                  
                  {/* BOTÃO DA MINHA LISTA */}
                  <button 
                    tabIndex={0} 
                    className="tv-focusable" 
                    onClick={() => toggleMinhaLista(itemAtualDetalhes)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 20px', fontSize: '16px', fontWeight: 'bold', backgroundColor: itemEstaNaLista ? '#111' : '#333', color: itemEstaNaLista ? '#aaa' : 'white', border: `1px solid ${itemEstaNaLista ? '#333' : '#555'}`, borderRadius: '5px', cursor: 'pointer', transition: '0.2s' }}
                  >
                    {itemEstaNaLista ? <><Check size={20} /> Na Minha Lista</> : <><Bookmark size={20} /> Adicionar à Lista</>}
                  </button>
                </div>
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
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '10px' }}>{serieDetalhes.info.name || 'Título Indisponível'}</h2>
                    
                    {/* BOTÃO DA MINHA LISTA PARA SÉRIES */}
                    <button 
                      tabIndex={0} 
                      className="tv-focusable" 
                      onClick={() => toggleMinhaLista(itemAtualDetalhes)} 
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', fontSize: '14px', fontWeight: 'bold', backgroundColor: itemEstaNaLista ? '#111' : '#333', color: itemEstaNaLista ? '#aaa' : 'white', border: `1px solid ${itemEstaNaLista ? '#333' : '#555'}`, borderRadius: '5px', cursor: 'pointer' }}
                    >
                      {itemEstaNaLista ? <><Check size={16} /> Na Minha Lista</> : <><Bookmark size={16} /> Favoritar</>}
                    </button>
                  </div>
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
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, tempoEp); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>
                            <Play fill="currentColor" size={14} style={{ marginRight: '4px' }} /> Cont.
                          </button>
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                            <RefreshCw size={14} style={{ marginRight: '4px' }} /> Do Zero
                          </button>
                        </div>
                      ) : (
                        <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>
                          <Play fill="currentColor" size={14} style={{ marginRight: '4px' }} /> Assistir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            <>
              {carregando ? (
                /* NOVOS SKELETON LOADERS */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{ background: '#222', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', height: tipoAtual === 'ao-vivo' ? '150px' : '225px' }}>
                      <div className="skeleton-loader" style={{ width: '100%', height: '100%' }}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* HERO BANNER */}
                  {itemDestaque && !busca && (
                    <div className="tv-focusable" onClick={() => handleItemClick(itemDestaque)} style={{
                      position: 'relative',
                      width: '100%',
                      height: '400px',
                      borderRadius: '12px',
                      marginBottom: '30px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '40px',
                      boxSizing: 'border-box',
                      backgroundImage: `url(${itemDestaque.stream_icon || itemDestaque.cover || CAPA_PADRAO})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center 20%',
                      cursor: 'pointer',
                      border: '1px solid #333'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to top, rgba(20,20,20,1) 0%, rgba(20,20,20,0.6) 40%, rgba(20,20,20,0) 100%)'
                      }}></div>
                      <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                        <span style={{ backgroundColor: '#e50914', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', display: 'inline-block', letterSpacing: '1px' }}>
                          DESTAQUE DA SEMANA
                        </span>
                        <h1 style={{ fontSize: '2.5rem', margin: '0 0 15px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{itemDestaque.name}</h1>
                        <button style={{ padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Play size={20} fill="currentColor" /> Ver Detalhes
                        </button>
                      </div>
                    </div>
                  )}

                  {conteudoParaExibir.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>
                      {categoriaSelecionada === 'recentes' ? 'Nenhum histórico recente nesta secção.' : 
                       categoriaSelecionada === 'minha-lista' ? 'Ainda não adicionou nenhum conteúdo à sua lista.' : 
                       'Nenhum conteúdo encontrado nesta categoria.'}
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                      {/* O slice(1) remove o primeiro item da grelha caso ele já esteja sendo mostrado no Hero Banner */}
                      {(itemDestaque && !busca ? conteudoParaExibir.slice(1) : conteudoParaExibir).map((item, index) => (
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
                            style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '150px' : '225px', objectFit: 'cover', backgroundColor: '#000' }} 
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

                  {categoriaSelecionada !== 'recentes' && categoriaSelecionada !== 'minha-lista' && conteudoParaExibir.length < conteudo.filter(item => categoriaSelecionada === '' || String(item.category_id) === String(categoriaSelecionada)).length && !busca && (
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