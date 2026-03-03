import { useState, useEffect, useRef } from 'react';
import Player from './components/Player';
import Login from './components/Login';
import Playlists from './components/Playlists'; 
import AdminPanel from './components/AdminPanel';
import { Film, Tv, Radio, Clock, LayoutGrid, LogOut, Settings, Play, RefreshCw, Star, Bookmark, Check, Search } from 'lucide-react';

const CAPA_PADRAO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const EPISODIO_PADRAO = CAPA_PADRAO;

function App() {
  const [sessaoUsuario, setSessaoUsuario] = useState(() => {
    try {
      const sessaoSalva = localStorage.getItem('boxiptv_sessao');
      return sessaoSalva ? JSON.parse(sessaoSalva) : null;
    } catch(e) { return null; }
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
  const [canalDetalhes, setCanalDetalhes] = useState(null);
  
  const [itemAtualDetalhes, setItemAtualDetalhes] = useState(null);
  
  const dragRef = useRef({ isDown: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, dragged: false });
  const categoriasScrollRef = useRef(null); 

  const [indiceDestaque, setIndiceDestaque] = useState(0);

  const [historico, setHistorico] = useState(() => {
    if (sessaoUsuario) {
      try {
        const salvo = localStorage.getItem(`boxiptv_hist_${sessaoUsuario.username}`);
        const parsed = salvo ? JSON.parse(salvo) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [minhaLista, setMinhaLista] = useState(() => {
    if (sessaoUsuario) {
      try {
        const salvo = localStorage.getItem(`boxiptv_lista_${sessaoUsuario.username}`);
        const parsed = salvo ? JSON.parse(salvo) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [progressos, setProgressos] = useState(() => {
    if (sessaoUsuario) {
      try {
        const salvo = localStorage.getItem(`boxiptv_progresso_${sessaoUsuario.username}`);
        const parsed = salvo ? JSON.parse(salvo) : {};
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (e) { return {}; }
    }
    return {};
  });

  const handleImageError = (e, fallback) => {
    if (e.target.src !== fallback) {
      e.target.onerror = null; 
      e.target.src = fallback;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      const currentFocus = document.activeElement;
      if (currentFocus && currentFocus.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;

      const focusables = Array.from(document.querySelectorAll('.tv-focusable')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).opacity !== '0';
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
        let primaryDistance = 0;
        let orthogonalDistance = 0;
        const tolerance = 20;

        if (e.key === 'ArrowUp') {
          isDirectionMatch = candidateRect.bottom <= currentRect.top + tolerance;
          primaryDistance = currentRect.top - candidateRect.bottom;
          orthogonalDistance = Math.max(0, Math.max(candidateRect.left - currentRect.right, currentRect.left - candidateRect.right));
        } else if (e.key === 'ArrowDown') {
          isDirectionMatch = candidateRect.top >= currentRect.bottom - tolerance;
          primaryDistance = candidateRect.top - currentRect.bottom;
          orthogonalDistance = Math.max(0, Math.max(candidateRect.left - currentRect.right, currentRect.left - candidateRect.right));
        } else if (e.key === 'ArrowLeft') {
          isDirectionMatch = candidateRect.right <= currentRect.left + tolerance;
          primaryDistance = currentRect.left - candidateRect.right;
          orthogonalDistance = Math.max(0, Math.max(candidateRect.top - currentRect.bottom, currentRect.top - candidateRect.bottom));
        } else if (e.key === 'ArrowRight') {
          isDirectionMatch = candidateRect.left >= currentRect.right - tolerance;
          primaryDistance = candidateRect.left - currentRect.right;
          orthogonalDistance = Math.max(0, Math.max(candidateRect.top - currentRect.bottom, currentRect.top - candidateRect.bottom));
        }

        if (isDirectionMatch) {
          if (primaryDistance < 0) primaryDistance = 0;
          const edgeDistance = Math.sqrt(Math.pow(primaryDistance, 2) + Math.pow(orthogonalDistance, 2));
          const weightedDistance = edgeDistance + (orthogonalDistance * 5); 

          if (weightedDistance < minDistance) {
            minDistance = weightedDistance;
            bestNext = candidate;
          }
        }
      });

      if (bestNext) {
        bestNext.focus({ preventScroll: true });
        
        if (bestNext.closest('.conteudo-container')) {
          bestNext.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else if (categoriasScrollRef.current && categoriasScrollRef.current.contains(bestNext)) {
          const container = categoriasScrollRef.current;
          
          if (window.innerWidth <= 900) {
            container.scrollTo({
              left: bestNext.offsetLeft - (container.clientWidth / 2) + (bestNext.clientWidth / 2),
              behavior: 'smooth'
            });
          } else {
            container.scrollTo({
              top: bestNext.offsetTop - (container.clientHeight / 2) + (bestNext.clientHeight / 2),
              behavior: 'smooth'
            });
          }
        } else if (!bestNext.closest('.sidebar-container')) {
          bestNext.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const efetuarLogin = (dadosSessao) => {
    localStorage.setItem('boxiptv_sessao', JSON.stringify(dadosSessao));
    setSessaoUsuario(dadosSessao);
    
    try {
      const hist = localStorage.getItem(`boxiptv_hist_${dadosSessao.username}`);
      setHistorico(hist ? JSON.parse(hist) : []);
      const lista = localStorage.getItem(`boxiptv_lista_${dadosSessao.username}`);
      setMinhaLista(lista ? JSON.parse(lista) : []);
      const prog = localStorage.getItem(`boxiptv_progresso_${dadosSessao.username}`);
      setProgressos(prog ? JSON.parse(prog) : {});
    } catch(e) {}
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
    setCanalDetalhes(null);
    setItemAtualDetalhes(null);
  };

  const registrarHistorico = (itemOriginal, tipo) => {
    setHistorico(prevHistorico => {
      const idUnico = itemOriginal.stream_id || itemOriginal.series_id;
      const seguro = Array.isArray(prevHistorico) ? prevHistorico : [];
      const novaLista = [
        { ...itemOriginal, tipo_salvo: tipo },
        ...seguro.filter(i => (i.stream_id || i.series_id) !== idUnico)
      ].slice(0, 30);
      localStorage.setItem(`boxiptv_hist_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const toggleMinhaLista = (item) => {
    if (!item) return;
    setMinhaLista(prevLista => {
      const idUnico = item.stream_id || item.series_id;
      const seguro = Array.isArray(prevLista) ? prevLista : [];
      const jaExiste = seguro.find(i => (i.stream_id || i.series_id) === idUnico);
      let novaLista;
      if (jaExiste) {
        novaLista = seguro.filter(i => (i.stream_id || i.series_id) !== idUnico);
      } else {
        novaLista = [{ ...item, tipo_salvo: tipoAtual }, ...seguro];
      }
      localStorage.setItem(`boxiptv_lista_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const handleClosePlayer = (tempoAtual, duracao) => {
    if (itemSelecionado && itemSelecionado.id && tempoAtual > 15) { 
      const percentagemVista = duracao > 0 ? (tempoAtual / duracao) : 0;
      let novosProgressos = { ...progressos };
      if (percentagemVista > 0.95) {
        delete novosProgressos[itemSelecionado.id];
      } else {
        novosProgressos[itemSelecionado.id] = tempoAtual;
      }
      setProgressos(novosProgressos);
      localStorage.setItem(`boxiptv_progresso_${sessaoUsuario.username}`, JSON.stringify(novosProgressos));
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
      setConteudo(Array.isArray(dadosConteudo) ? dadosConteudo : []);
      setCategorias(Array.isArray(dadosCategorias) ? dadosCategorias : []);
      setCarregando(false);
      setIndiceDestaque(0); 
    }).catch(err => {
      console.error("Erro na API:", err);
      setConteudo([]);
      setCategorias([]);
      setCarregando(false);
    });
  }, [tipoAtual, playlistAtiva]);

  let conteudoParaExibir = [];
  const historicoSeguro = Array.isArray(historico) ? historico : [];
  const minhaListaSegura = Array.isArray(minhaLista) ? minhaLista : [];
  const conteudoSeguro = Array.isArray(conteudo) ? conteudo : [];

  if (categoriaSelecionada === 'recentes') {
    conteudoParaExibir = historicoSeguro.filter(item => item && item.tipo_salvo === tipoAtual && item.name && item.name.toLowerCase().includes(busca.toLowerCase())).slice(0, limite);
  } else if (categoriaSelecionada === 'minha-lista') {
    conteudoParaExibir = minhaListaSegura.filter(item => item && item.tipo_salvo === tipoAtual && item.name && item.name.toLowerCase().includes(busca.toLowerCase())).slice(0, limite);
  } else {
    conteudoParaExibir = conteudoSeguro.filter(item => {
        if (!item) return false;
        const passaBusca = item.name && item.name.toLowerCase().includes(busca.toLowerCase());
        const passaCategoria = categoriaSelecionada === '' || String(item.category_id) === String(categoriaSelecionada);
        return passaBusca && passaCategoria;
    }).slice(0, limite);
  }

  const modoCarrossel = categoriaSelecionada === '' && busca === '';
  const conteudoAgrupado = {};
  
  if (modoCarrossel) {
      conteudoSeguro.forEach(item => {
          if (!item) return;
          if (!conteudoAgrupado[item.category_id]) {
              const cat = Array.isArray(categorias) ? categorias.find(c => String(c.category_id) === String(item.category_id)) : null;
              conteudoAgrupado[item.category_id] = {
                  nome: cat ? cat.category_name : 'Outros',
                  itens: []
              };
          }
          if (conteudoAgrupado[item.category_id].itens.length < 25) { 
             conteudoAgrupado[item.category_id].itens.push(item);
          }
      });
  }

  const itensDestaqueRaw = conteudoParaExibir.length > 0 && modoCarrossel ? conteudoParaExibir.slice(0, 6) : [];
  const paresDestaque = [];
  
  for (let i = 0; i < itensDestaqueRaw.length; i += 2) {
    if (itensDestaqueRaw[i + 1]) {
      paresDestaque.push([itensDestaqueRaw[i], itensDestaqueRaw[i + 1]]);
    } else if (itensDestaqueRaw[i]) {
      paresDestaque.push([itensDestaqueRaw[i], itensDestaqueRaw[0]]);
    }
  }

  useEffect(() => {
    if (paresDestaque.length <= 1) return;
    const interval = setInterval(() => {
      setIndiceDestaque(prev => (prev + 1) % paresDestaque.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [paresDestaque.length]);

  const handleCategoriaClick = (categoriaId) => {
    if (dragRef.current.dragged) return;
    setCategoriaSelecionada(categoriaId);
    setLimite(50);
    fecharDetalhes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMouseDown = (e) => {
    dragRef.current.isDown = true;
    dragRef.current.dragged = false;
    dragRef.current.startX = e.pageX - e.currentTarget.offsetLeft;
    dragRef.current.startY = e.pageY - e.currentTarget.offsetTop;
    dragRef.current.scrollLeft = e.currentTarget.scrollLeft;
    dragRef.current.scrollTop = e.currentTarget.scrollTop;
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleMouseLeave = (e) => {
    dragRef.current.isDown = false;
    e.currentTarget.style.cursor = 'grab';
  };

  const handleMouseUp = (e) => {
    dragRef.current.isDown = false;
    e.currentTarget.style.cursor = 'grab';
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.isDown) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const y = e.pageY - e.currentTarget.offsetTop;
    const walkX = (x - dragRef.current.startX) * 1.5; 
    const walkY = (y - dragRef.current.startY) * 1.5; 
    
    if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) dragRef.current.dragged = true; 
    
    e.currentTarget.scrollLeft = dragRef.current.scrollLeft - walkX;
    e.currentTarget.scrollTop = dragRef.current.scrollTop - walkY;
  };

  const handleItemClick = (item) => {
    if (dragRef.current.dragged || !item) return;
    registrarHistorico(item, tipoAtual);
    setItemAtualDetalhes(item); 
    
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
      setCarregando(true);
      fetch(`http://localhost:8006/api/epg?stream_id=${item.stream_id}${queryParams}`)
        .then(res => res.json())
        .then(data => {
          setCanalDetalhes({ info: item, epg: Array.isArray(data?.epg_listings) ? data.epg_listings : [] });
          setCarregando(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => {
          setCanalDetalhes({ info: item, epg: [] }); 
          setCarregando(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

    } else {
      setCarregando(true);
      fetch(`http://localhost:8006/api/series/${item.series_id}${queryParams}`)
        .then(res => res.json())
        .then(data => {
          setSerieDetalhes(data);
          if (data && data.episodes && typeof data.episodes === 'object' && Object.keys(data.episodes).length > 0) {
            setTemporadaSelecionada(Object.keys(data.episodes)[0]);
          }
          setCarregando(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => { setCarregando(false); });
    }
  };

  const handlePlayFilme = (inicio = 0) => {
    if (!filmeDetalhes || !filmeDetalhes.movie_data) return;
    const idFilme = filmeDetalhes.movie_data.stream_id;
    const extensao = filmeDetalhes.movie_data.container_extension || 'mp4';
    const streamUrl = `${playlistAtiva.server_url}/movie/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${idFilme}.${extensao}`;
    setItemSelecionado({ id: idFilme, nome: filmeDetalhes.info?.name || 'Filme', url: streamUrl, startTime: inicio });
  };

  const handlePlayEpisode = (episodio, inicio = 0) => {
    if (!episodio) return;
    const extensao = episodio.container_extension || 'mp4';
    const streamUrl = `${playlistAtiva.server_url}/series/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${episodio.id}.${extensao}`;
    setItemSelecionado({
      id: episodio.id,
      nome: `${serieDetalhes?.info?.name || 'Série'} - S${temporadaSelecionada}E${episodio.episode_num} - ${episodio.title || ''}`,
      url: streamUrl,
      startTime: inicio
    });
  };

  const handlePlayCanal = () => {
    if (!canalDetalhes || !canalDetalhes.info) return;
    const streamUrl = `${playlistAtiva.server_url}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${canalDetalhes.info.stream_id}`;
    setItemSelecionado({ id: canalDetalhes.info.stream_id, nome: canalDetalhes.info.name, url: streamUrl, startTime: 0 });
  };

  const acionarComEnter = (e, acao) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      acao();
    }
  };

  const itemEstaNaLista = itemAtualDetalhes && minhaListaSegura.some(i => (i.stream_id || i.series_id) === (itemAtualDetalhes.stream_id || itemAtualDetalhes.series_id));

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
        <Playlists token={sessaoUsuario.token} onSelectPlaylist={(pl) => setPlaylistAtiva(pl)} onLogout={efetuarLogout} />
      </>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#141414', minHeight: '100vh', color: '#fff' }}>
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
        .hide-scrollbar {
          overflow-x: auto !important;
          -ms-overflow-style: none !important;  
          scrollbar-width: none !important;  
        }
        .hide-scrollbar::-webkit-scrollbar,
        .hide-scrollbar *::-webkit-scrollbar {
          display: none !important; 
          width: 0px !important;
          height: 0px !important;
          background: transparent !important;
          -webkit-appearance: none !important;
        }
        .banner-focusable.tv-focusable:focus,
        .banner-focusable.tv-focusable:hover {
          outline: none !important;
          transform: none !important;
          box-shadow: none !important;
        }
        .banner-focusable:focus button,
        .banner-focusable:hover button {
          outline: 3px solid white !important;
          outline-offset: 2px;
          transform: scale(1.05) !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.8) !important;
          background-color: #e50914 !important;
          color: white !important;
        }

        /* ========================================================
           DESIGN RESPONSIVO (TELEMÓVEIS E TABLETS)
           ======================================================== */
        @media (max-width: 900px) {
          .main-layout { flex-direction: column !important; }
          
          /* Oculta/Minimiza a barra lateral no mobile e FIXA NO TOPO */
          .sidebar-container { 
            width: 100% !important; 
            height: auto !important; 
            position: sticky !important; 
            top: 0 !important; 
            z-index: 999 !important;
            padding: 10px !important;
            background-color: rgba(34, 34, 34, 0.98) !important;
            backdrop-filter: blur(10px);
            border-bottom: 1px solid #444;
          }

          /* Oculta o título "Menu" */
          .sidebar-container h3 { display: none !important; }
          
          /* Altera as listas verticais para carrosséis horizontais flexíveis */
          .sidebar-menus { 
            display: flex !important; 
            overflow-x: auto !important; 
            flex-direction: row !important; 
            padding-bottom: 5px !important; 
            border-bottom: none !important;
            margin-bottom: 0 !important;
          }
          .sidebar-menus li { 
            flex: 0 0 auto !important; 
            margin-bottom: 0 !important; 
            margin-right: 10px !important; 
            white-space: nowrap;
            padding: 8px 10px !important;
          }
          
          /* Ajuste do topo e botões */
          .top-nav { justify-content: center !important; margin-bottom: 10px !important; }
          .top-nav-user-controls { justify-content: center; flex-wrap: wrap; }
          
          .type-selectors { flex-direction: column !important; align-items: stretch !important; margin-top: 10px; }
          .type-selectors-buttons { justify-content: center !important; flex-wrap: wrap !important; }
          .search-input-container { margin-bottom: 10px !important; }
          
          /* Painel de detalhes empilhado e centralizado */
          .detail-view { flex-direction: column !important; align-items: center !important; text-align: center !important; padding: 20px !important; }
          .detail-view-info { min-width: 100% !important; }
          .detail-view-buttons { width: 100% !important; align-items: center !important; justify-content: center !important; }
          
          /* Banners Diminuídos para Mobile */
          .hero-banner-container { height: 300px !important; marginBottom: 20px !important; }
          .hero-banner-wrapper { flex-direction: column !important; gap: 10px !important; }
          .hero-banner-item { height: 140px !important; padding: 15px !important; justify-content: center !important; align-items: center !important; text-align: center !important;}
          .hero-banner-item h1 { font-size: 1.3rem !important; margin-bottom: 5px !important; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;}
          .hero-banner-item button { padding: 6px 12px !important; font-size: 13px !important; }
          .hero-banner-item span { font-size: 9px !important; padding: 3px 8px !important; margin-bottom: 5px !important; }
          
          /* Esconder botão de subir pois a lista já está horizontal e fixa no topo */
          .btn-voltar-topo { display: none !important; }
        }
      `}</style>

      
      
      
      <div className="main-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        <div className="sidebar-container" style={{ width: '250px', backgroundColor: '#222', padding: '15px', borderRadius: '8px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Menu</h3>
          
          <div className="search-input-container" style={{ marginBottom: '15px', position: 'relative' }}>
            <Search size={16} color="#aaa" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              tabIndex={0} 
              className="tv-focusable search-input" 
              type="text" 
              placeholder={`Buscar ${tipoAtual.replace('-', ' ')}...`} 
              value={busca} 
              onChange={(e) => { 
                setBusca(e.target.value); 
                setLimite(50); 
                fecharDetalhes(); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
              style={{ 
                width: '100%', 
                padding: '10px 10px 10px 35px', 
                borderRadius: '5px', 
                border: 'none', 
                outline: 'none', 
                fontSize: '14px', 
                backgroundColor: '#333', 
                color: 'white',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <ul className="sidebar-menus hide-scrollbar" style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <li tabIndex={0} className="tv-focusable" onClick={() => handleCategoriaClick('minha-lista')} onKeyDown={(e) => acionarComEnter(e, () => handleCategoriaClick('minha-lista'))} style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', backgroundColor: categoriaSelecionada === 'minha-lista' ? '#e50914' : 'transparent', fontWeight: 'bold', color: '#fff' }}>
              <Bookmark size={16} style={{ marginRight: '8px' }} fill={categoriaSelecionada === 'minha-lista' ? 'currentColor' : 'none'} /> A Minha Lista
            </li>
            <li tabIndex={0} className="tv-focusable" onClick={() => handleCategoriaClick('recentes')} onKeyDown={(e) => acionarComEnter(e, () => handleCategoriaClick('recentes'))} style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', backgroundColor: categoriaSelecionada === 'recentes' ? '#e50914' : '#333', fontWeight: 'bold', color: '#fff', border: '1px solid #444' }}>
              <Clock size={16} style={{ marginRight: '8px' }} /> Assistidos Recentes
            </li>
            <li tabIndex={0} className="tv-focusable" onClick={() => {
                handleCategoriaClick('');
                if (categoriasScrollRef.current) categoriasScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }} onKeyDown={(e) => acionarComEnter(e, () => {
                handleCategoriaClick('');
                if (categoriasScrollRef.current) categoriasScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              })} style={{ display: 'flex', alignItems: 'center', padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', backgroundColor: categoriaSelecionada === '' ? '#e50914' : 'transparent', fontWeight: categoriaSelecionada === '' ? 'bold' : 'normal', color: '#fff' }}>
              <LayoutGrid size={16} style={{ marginRight: '8px' }} /> Todas as Categorias
            </li>
          </ul>

          <div 
            ref={categoriasScrollRef}
            className="hide-scrollbar sidebar-menus" 
            onMouseDown={handleMouseDown} 
            onMouseLeave={handleMouseLeave} 
            onMouseUp={handleMouseUp} 
            onMouseMove={handleMouseMove} 
            style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', marginBottom: '15px', cursor: 'grab', position: 'relative' }}
          >
            <ul className="sidebar-menus" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {Array.isArray(categorias) && categorias.map((cat, idx) => (
                <li key={idx} tabIndex={0} className="tv-focusable" onClick={() => handleCategoriaClick(cat.category_id)} onKeyDown={(e) => acionarComEnter(e, () => handleCategoriaClick(cat.category_id))} title={cat.category_name} style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: String(categoriaSelecionada) === String(cat.category_id) ? '#e50914' : 'transparent', fontWeight: String(categoriaSelecionada) === String(cat.category_id) ? 'bold' : 'normal', color: '#ccc' }}>
                  {cat.category_name}
                </li>
              ))}
            </ul>
          </div>

          <button tabIndex={0} className="tv-focusable btn-voltar-topo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            ⬆ Voltar ao Início
          </button>
        </div>

        <div className="conteudo-container" style={{ flex: 1, minWidth: 0 }}>
          {itemSelecionado && <Player channel={itemSelecionado} onClose={handleClosePlayer} startTime={itemSelecionado.startTime || 0} />}

          {/* CABEÇALHO PRINCIPAL REVISADO E ORGANIZADO */}
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: '15px 30px', 
  backgroundColor: 'rgba(20, 20, 20, 0.95)', // Fundo levemente transparente/escuro
  borderBottom: '1px solid #333',
  position: 'sticky', 
  top: 0, 
  zIndex: 100,
  width: '100%',
  boxSizing: 'border-box'
}}>
  
  {/* LADO ESQUERDO: Abas de Navegação */}
  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
    <button 
      tabIndex={0} 
      className="tv-focusable" 
      onClick={() => { setTipoAtual('filmes'); fecharDetalhes(); setLimite(50); setCategoriaSelecionada(''); }} 
      style={{ 
        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', gap: '8px', border: 'none', transition: '0.2s',
        backgroundColor: tipoAtual === 'filmes' ? '#e50914' : 'transparent', 
        color: tipoAtual === 'filmes' ? 'white' : '#aaa', 
        fontWeight: 'bold', fontSize: '16px'
      }}
    >
      <Film size={20} /> Filmes
    </button>
    
    <button 
      tabIndex={0} 
      className="tv-focusable" 
      onClick={() => { setTipoAtual('series'); fecharDetalhes(); setLimite(50); setCategoriaSelecionada(''); }} 
      style={{ 
        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', gap: '8px', border: 'none', transition: '0.2s',
        backgroundColor: tipoAtual === 'series' ? '#e50914' : 'transparent', 
        color: tipoAtual === 'series' ? 'white' : '#aaa', 
        fontWeight: 'bold', fontSize: '16px'
      }}
    >
      <Tv size={20} /> Séries
    </button>
    
    <button 
      tabIndex={0} 
      className="tv-focusable" 
      onClick={() => { setTipoAtual('ao-vivo'); fecharDetalhes(); setLimite(50); setCategoriaSelecionada(''); }} 
      style={{ 
        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', gap: '8px', border: 'none', transition: '0.2s',
        backgroundColor: tipoAtual === 'ao-vivo' ? '#e50914' : 'transparent', 
        color: tipoAtual === 'ao-vivo' ? 'white' : '#aaa', 
        fontWeight: 'bold', fontSize: '16px'
      }}
    >
      <Radio size={20} /> TV ao Vivo
    </button>
  </div>

  {/* LADO DIREITO: Usuário, Admin, Playlist e Sair */}
  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>   
    
    {/* Nome do Usuário */}
    {sessaoUsuario && (
      <span style={{ color: '#aaa', fontSize: '14px', marginRight: '5px' }}>
        Usuário: <strong style={{ color: 'white' }}>{sessaoUsuario.username}</strong>
      </span>
    )}

    {/* Botão Admin (Unificado) */}
    {(sessaoUsuario?.role === 'admin' || sessaoUsuario?.isAdmin) && (
      <button 
        tabIndex={0} 
        className="tv-focusable" 
        onClick={() => setMostrarAdmin(true)} 
        style={{ 
          padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
          alignItems: 'center', gap: '8px', border: 'none', backgroundColor: '#0056b3', 
          color: 'white', fontWeight: 'bold', fontSize: '14px' 
        }}
      >
        <Settings size={16} /> Admin
      </button>
    )}

    {/* Divisor Visual */}
    <div style={{ width: '1px', height: '30px', backgroundColor: '#333', margin: '0 5px' }}></div> 

    {/* Botão Trocar Playlist */}
    <button 
      tabIndex={0} 
      className="tv-focusable" 
      onClick={() => setPlaylistAtiva(null)} 
      style={{ 
        padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', gap: '8px', border: '1px solid #333', backgroundColor: '#222', 
        color: 'white', fontWeight: 'bold', fontSize: '14px' 
      }}
    >
      <RefreshCw size={16} /> Trocar Playlist
    </button>
    
    {/* Botão Sair */}
    <button 
      tabIndex={0} 
      className="tv-focusable" 
      onClick={efetuarLogout} 
      style={{ 
        padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: 'transparent', 
        color: '#aaa', transition: '0.2s' 
      }}
      title="Sair"
    >
      <LogOut size={20} />
    </button>
  </div>
</div>

          {filmeDetalhes && filmeDetalhes.info ? (
            <div className="detail-view" style={{ backgroundColor: '#222', padding: '30px', borderRadius: '8px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <img src={filmeDetalhes.info.movie_image || CAPA_PADRAO} alt={filmeDetalhes.info.name || 'Sem Título'} onError={(e) => handleImageError(e, CAPA_PADRAO)} style={{ width: '250px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} />
              <div className="detail-view-info" style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{ marginTop: 0, marginBottom: '10px', fontSize: '32px' }}>{filmeDetalhes.info.name || 'Título Indisponível'}</h1>
                <div style={{ display: 'flex', gap: '15px', color: '#aaa', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', alignItems: 'center', flexWrap: 'wrap' }}>
                  {filmeDetalhes.info.rating && <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Star size={16} color="#f5c518" fill="#f5c518" /> {filmeDetalhes.info.rating} / 10</span>}
                  {filmeDetalhes.info.releasedate && <span>📅 {filmeDetalhes.info.releasedate}</span>}
                  {filmeDetalhes.info.duration && <span>⏱️ {filmeDetalhes.info.duration}</span>}
                </div>
                <p style={{ lineHeight: '1.6', fontSize: '16px', color: '#ccc', marginBottom: '20px' }}>{filmeDetalhes.info.plot || "Sinopse não disponível."}</p>
                {filmeDetalhes.info.cast && <p style={{ color: '#aaa', marginBottom: '30px' }}><strong>Elenco:</strong> {filmeDetalhes.info.cast}</p>}
                <div className="detail-view-buttons" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {filmeDetalhes.movie_data && progressos[filmeDetalhes.movie_data.stream_id] > 15 ? (
                    <>
                      <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(progressos[filmeDetalhes.movie_data.stream_id])} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}><Play fill="currentColor" size={20} /> Continuar ({formatarTempo(progressos[filmeDetalhes.movie_data.stream_id])})</button>
                      <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}><RefreshCw size={20} /> Reiniciar</button>
                    </>
                  ) : (
                    <button tabIndex={0} className="tv-focusable" onClick={() => handlePlayFilme(0)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}><Play fill="currentColor" size={20} /> Iniciar Filme</button>
                  )}
                  <button tabIndex={0} className="tv-focusable" onClick={() => toggleMinhaLista(itemAtualDetalhes)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 20px', fontSize: '16px', fontWeight: 'bold', backgroundColor: itemEstaNaLista ? '#111' : '#333', color: itemEstaNaLista ? '#aaa' : 'white', border: `1px solid ${itemEstaNaLista ? '#333' : '#555'}`, borderRadius: '5px', cursor: 'pointer', transition: '0.2s' }}>{itemEstaNaLista ? <><Check size={20} /> Na Minha Lista</> : <><Bookmark size={20} /> Adicionar à Lista</>}</button>
                </div>
              </div>
            </div>

          ) : serieDetalhes && serieDetalhes.info ? (
            <div>
              <div className="detail-view" style={{ display: 'flex', gap: '20px', marginBottom: '30px', backgroundColor: '#222', padding: '20px', borderRadius: '8px' }}>
                <img src={serieDetalhes.info.cover || CAPA_PADRAO} alt={serieDetalhes.info.name || 'Sem Título'} onError={(e) => handleImageError(e, CAPA_PADRAO)} style={{ width: '150px', borderRadius: '5px' }} />
                <div className="detail-view-info" style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '10px' }}>{serieDetalhes.info.name || 'Título Indisponível'}</h2>
                    <button tabIndex={0} className="tv-focusable" onClick={() => toggleMinhaLista(itemAtualDetalhes)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', fontSize: '14px', fontWeight: 'bold', backgroundColor: itemEstaNaLista ? '#111' : '#333', color: itemEstaNaLista ? '#aaa' : 'white', border: `1px solid ${itemEstaNaLista ? '#333' : '#555'}`, borderRadius: '5px', cursor: 'pointer' }}>{itemEstaNaLista ? <><Check size={16} /> Na Minha Lista</> : <><Bookmark size={16} /> Favoritar</>}</button>
                  </div>
                  <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>{serieDetalhes.info.plot || "Sinopse não disponível."}</p>
                </div>
              </div>
              <div className="detail-view-buttons hide-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '5px' }}>
                {serieDetalhes.episodes && typeof serieDetalhes.episodes === 'object' && Object.keys(serieDetalhes.episodes).map(temp => (
                  <button tabIndex={0} className="tv-focusable" key={temp} onClick={() => setTemporadaSelecionada(temp)} style={{ padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: temporadaSelecionada === temp ? '#e50914' : '#333', color: 'white', whiteSpace: 'nowrap' }}>Temporada {temp}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {serieDetalhes.episodes && Array.isArray(serieDetalhes.episodes[temporadaSelecionada]) && serieDetalhes.episodes[temporadaSelecionada].map((ep, idx) => {
                  const tempoEp = progressos[ep.id] || 0; 
                  return (
                    <div key={idx} tabIndex={0} className="tv-focusable" onClick={() => handlePlayEpisode(ep, tempoEp > 15 ? tempoEp : 0)} onKeyDown={(e) => acionarComEnter(e, () => handlePlayEpisode(ep, tempoEp > 15 ? tempoEp : 0))} style={{ background: '#222', padding: '10px', borderRadius: '5px', border: '1px solid #444', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                      <img src={ep.info?.movie_image || EPISODIO_PADRAO} alt={ep.title || 'Episódio'} loading="lazy" onError={(e) => handleImageError(e, EPISODIO_PADRAO)} style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', flex: 1 }}>{ep.episode_num}. {ep.title || 'Título Indisponível'}</div>
                      {tempoEp > 15 ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, tempoEp); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}><Play fill="currentColor" size={14} style={{ marginRight: '4px' }} /> Cont.</button>
                          <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}><RefreshCw size={14} style={{ marginRight: '4px' }} /> Do Zero</button>
                        </div>
                      ) : (
                        <button tabIndex="-1" onClick={(e) => { e.stopPropagation(); handlePlayEpisode(ep, 0); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px', fontSize: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}><Play fill="currentColor" size={14} style={{ marginRight: '4px' }} /> Assistir</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : canalDetalhes && canalDetalhes.info ? (
            
            <div className="detail-view" style={{ backgroundColor: '#222', padding: '30px', borderRadius: '8px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div className="detail-view-buttons" style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <img src={canalDetalhes.info.stream_icon || CAPA_PADRAO} alt={canalDetalhes.info.name} onError={(e) => handleImageError(e, CAPA_PADRAO)} style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000', padding: '20px', objectFit: 'contain' }} />
                <button tabIndex={0} className="tv-focusable" onClick={handlePlayCanal} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}><Play fill="currentColor" size={20} /> Assistir ao Vivo</button>
                <button tabIndex={0} className="tv-focusable" onClick={() => toggleMinhaLista(itemAtualDetalhes)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: itemEstaNaLista ? '#111' : '#333', color: itemEstaNaLista ? '#aaa' : 'white', border: `1px solid ${itemEstaNaLista ? '#333' : '#555'}`, borderRadius: '5px', cursor: 'pointer', transition: '0.2s' }}>{itemEstaNaLista ? <><Check size={18} /> Na Minha Lista</> : <><Bookmark size={18} /> Favoritar Canal</>}</button>
              </div>
              <div className="detail-view-info" style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{ marginTop: 0, marginBottom: '20px', fontSize: '32px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}><Radio color="#e50914" size={32} /> {canalDetalhes.info.name}</h1>
                <h3 style={{ color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '20px' }}>Guia de Programação (EPG)</h3>
                {Array.isArray(canalDetalhes.epg) && canalDetalhes.epg.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    {canalDetalhes.epg.map((prog, idx) => {
                      if (!prog) return null;
                      const ts_inicio = typeof prog.start_timestamp === 'string' ? parseInt(prog.start_timestamp) : prog.start_timestamp;
                      const ts_fim = typeof prog.stop_timestamp === 'string' ? parseInt(prog.stop_timestamp) : prog.stop_timestamp;
                      const dataInicio = new Date(ts_inicio * 1000);
                      const dataFim = new Date(ts_fim * 1000);
                      const agora = new Date();
                      const isCurrent = agora >= dataInicio && agora <= dataFim;
                      
                      return (
                        <div key={idx} style={{ padding: '15px', borderRadius: '5px', backgroundColor: isCurrent ? 'rgba(229, 9, 20, 0.1)' : '#1a1a1a', borderLeft: `4px solid ${isCurrent ? '#e50914' : '#333'}`, display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ color: isCurrent ? '#fff' : '#aaa', fontWeight: 'bold', minWidth: '100px', fontSize: '14px' }}>
                            {dataInicio.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {dataFim.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: isCurrent ? '#fff' : '#ccc', marginBottom: '5px' }}>{prog.title ? (prog.title) : 'Sem título'} {isCurrent && <span style={{ fontSize: '10px', backgroundColor: '#e50914', padding: '2px 6px', borderRadius: '3px', marginLeft: '10px', verticalAlign: 'middle' }}>AGORA</span>}</div>
                            {prog.description && <div style={{ fontSize: '13px', color: '#888' }}>{prog.description.length > 150 ? prog.description.substring(0, 150) + '...' : prog.description}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#888', fontStyle: 'italic', padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '5px' }}>A informação de programação não está disponível para este canal.</p>
                )}
              </div>
            </div>

          ) : (
            <>
              {carregando ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{ background: '#222', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', height: tipoAtual === 'ao-vivo' ? '150px' : '225px' }}><div className="skeleton-loader" style={{ width: '100%', height: '100%' }}></div></div>
                  ))}
                </div>
              ) : (
                <>
                  {paresDestaque.length > 0 && modoCarrossel && (
                    <div className="hero-banner-container" style={{ position: 'relative', width: '100%', height: '380px', marginBottom: '50px' }}>
                      {paresDestaque.map((par, idx) => (
                        <div 
                          key={idx} 
                          className={`hero-banner-wrapper ${idx === indiceDestaque ? 'active' : ''}`}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            opacity: idx === indiceDestaque ? 1 : 0, transition: 'opacity 1s ease-in-out',
                            display: 'flex', gap: '20px', zIndex: idx === indiceDestaque ? 1 : 0,
                            pointerEvents: idx === indiceDestaque ? 'auto' : 'none'
                          }}
                        >
                          {par.map((item, subIdx) => (
                            <div 
                              key={subIdx}
                              className={`hero-banner-item ${idx === indiceDestaque ? "tv-focusable banner-focusable" : ""}`} 
                              tabIndex={idx === indiceDestaque ? 0 : -1} 
                              onClick={() => handleItemClick(item)} 
                              onKeyDown={(e) => { if (idx === indiceDestaque) acionarComEnter(e, () => handleItemClick(item)) }}
                              style={{
                                flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333',
                                backgroundImage: `url(${item?.stream_icon || item?.cover || CAPA_PADRAO})`,
                                backgroundSize: 'cover', backgroundPosition: 'center 20%', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '30px', boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(20,20,20,0.95) 0%, rgba(20,20,20,0.4) 50%, rgba(20,20,20,0.1) 100%)' }}></div>
                              <div style={{ position: 'relative', zIndex: 1, maxWidth: '100%' }}>
                                <span style={{ backgroundColor: '#e50914', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', display: 'inline-block', letterSpacing: '1px' }}>DESTAQUE</span>
                                <h1 style={{ fontSize: '2rem', margin: '0 0 15px 0', textShadow: '2px 2px 8px rgba(0,0,0,1)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item?.name}</h1>
                                <button style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '5px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', transition: 'all 0.2s' }}><Play size={20} fill="currentColor" /> Ver Detalhes</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      
                      <div style={{ position: 'absolute', bottom: '-25px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 2 }}>
                        {paresDestaque.map((_, idx) => (
                          <div key={idx} style={{ width: idx === indiceDestaque ? '35px' : '12px', height: '6px', backgroundColor: idx === indiceDestaque ? '#e50914' : 'rgba(255,255,255,0.4)', borderRadius: '3px', transition: 'all 0.4s ease' }}></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {modoCarrossel ? (
                    Object.values(conteudoAgrupado).filter(grupo => grupo && Array.isArray(grupo.itens) && grupo.itens.length > 0).map((grupo, idx) => (
                      <div key={idx} style={{ marginBottom: '40px' }}>
                        <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '4px', height: '20px', backgroundColor: '#e50914', borderRadius: '2px' }}></span>{grupo.nome}</h3>
                        <div className="hide-scrollbar" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '15px', cursor: 'grab' }}>
                          {(paresDestaque.length > 0 && idx === 0 ? grupo.itens.slice(paresDestaque.length * 2) : grupo.itens).map((item, index) => (
                            <div key={index} tabIndex={0} className="tv-focusable carousel-item" onClick={() => handleItemClick(item)} onKeyDown={(e) => acionarComEnter(e, () => handleItemClick(item))} style={{ flex: '0 0 auto', width: tipoAtual === 'ao-vivo' ? '250px' : '180px', background: '#222', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden', border: '1px solid #333', transition: 'transform 0.3s' }}>
                              <img src={item?.stream_icon || item?.cover || CAPA_PADRAO} alt={item?.name} loading="lazy" onError={(e) => handleImageError(e, CAPA_PADRAO)} style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '140px' : '270px', objectFit: 'cover', backgroundColor: '#000' }} />
                              <div style={{ padding: '10px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item?.name}</div></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {conteudoParaExibir.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>Nenhum conteúdo encontrado nesta vista.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                          {conteudoParaExibir.map((item, index) => (
                            <div key={index} tabIndex={0} className="tv-focusable" onClick={() => handleItemClick(item)} onKeyDown={(e) => acionarComEnter(e, () => handleItemClick(item))} style={{ background: '#222', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden', border: '1px solid #333' }}>
                              <img src={item?.stream_icon || item?.cover || CAPA_PADRAO} alt={item?.name} loading="lazy" onError={(e) => handleImageError(e, CAPA_PADRAO)} style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '140px' : '270px', objectFit: 'cover', backgroundColor: '#000' }} />
                              <div style={{ padding: '10px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item?.name}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {categoriaSelecionada !== 'recentes' && categoriaSelecionada !== 'minha-lista' && conteudoParaExibir.length < conteudoSeguro.filter(item => String(item?.category_id) === String(categoriaSelecionada)).length && (
                        <div style={{ textAlign: 'center', marginTop: '30px' }}>
                          <button tabIndex={0} className="tv-focusable" onClick={() => setLimite(limite + 50)} style={{ padding: '12px 30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px' }}>Carregar mais da categoria</button>
                        </div>
                      )}
                    </>
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