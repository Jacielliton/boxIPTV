import React, { useState, useEffect } from 'react';
import { Film, Tv, Radio, Search, User, LogOut, Settings, RefreshCw, Play, X, Star, Bookmark, Check, Trash2, Clock } from 'lucide-react';
import Player from './components/Player';
import AdminPanel from './components/AdminPanel';

const CAPA_PADRAO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export default function AppMobile({ sessaoUsuario, playlistAtiva, efetuarLogout, setPlaylistAtiva }) {
  const [tipoAtual, setTipoAtual] = useState('filmes');
  const [busca, setBusca] = useState('');
  const [conteudo, setConteudo] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [limite, setLimite] = useState(50);
  
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  
  const [itemDetalhes, setItemDetalhes] = useState(null); 
  const [dadosDetalhes, setDadosDetalhes] = useState(null); 
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null);

  const [historico, setHistorico] = useState(() => {
    try {
      const salvo = localStorage.getItem(`boxiptv_hist_${sessaoUsuario?.username}`);
      return salvo ? JSON.parse(salvo) : [];
    } catch (e) { return []; }
  });

  const [minhaLista, setMinhaLista] = useState(() => {
    try {
      const salvo = localStorage.getItem(`boxiptv_lista_${sessaoUsuario?.username}`);
      return salvo ? JSON.parse(salvo) : [];
    } catch (e) { return []; }
  });

  const [progressos, setProgressos] = useState(() => {
    try {
      const salvo = localStorage.getItem(`boxiptv_progresso_${sessaoUsuario?.username}`);
      return salvo ? JSON.parse(salvo) : {};
    } catch (e) { return {}; }
  });

  useEffect(() => {
    if (itemSelecionado) {
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (error) {}
    } else {
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('portrait').then(() => {
            window.screen.orientation.unlock();
          }).catch(() => {
            if (window.screen.orientation.unlock) window.screen.orientation.unlock();
          });
        }
      } catch (error) {}
    }
  }, [itemSelecionado]);

  // ==========================================
  // MÁGICA DO CLIENT-SIDE: URL Builder Direto
  // ==========================================
  const getIptvUrl = (action, extraParams = '') => {
    let baseUrl = playlistAtiva.server_url.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) baseUrl = "http://" + baseUrl;
    baseUrl = baseUrl.replace(/\/$/, "");
    if (baseUrl.endsWith("player_api.php")) baseUrl = baseUrl.replace("/player_api.php", "");
    return `${baseUrl}/player_api.php?username=${playlistAtiva.iptv_username}&password=${playlistAtiva.iptv_password}&action=${action}${extraParams}`;
  };

  // Busca de Conteúdo e Categorias Diretamente do IPTV
  useEffect(() => {
    if (!playlistAtiva) return;
    setCarregando(true);
    setCategoriaSelecionada('');
    
    const actionStream = tipoAtual === 'filmes' ? 'get_vod_streams' : (tipoAtual === 'series' ? 'get_series' : 'get_live_streams');
    const actionCat = tipoAtual === 'filmes' ? 'get_vod_categories' : (tipoAtual === 'series' ? 'get_series_categories' : 'get_live_categories');
    
    Promise.all([
      fetch(getIptvUrl(actionStream)).then(res => res.json()),
      fetch(getIptvUrl(actionCat)).then(res => res.json())
    ]).then(([dCont, dCat]) => {
      setConteudo(Array.isArray(dCont) ? dCont : []);
      
      // Ordenação Alfabética A-Z no Frontend
      let cats = Array.isArray(dCat) ? dCat : [];
      cats.sort((a, b) => (a.category_name || '').trim().localeCompare((b.category_name || '').trim(), 'pt-BR', {sensitivity: 'base'}));
      setCategorias(cats);
      
      setCarregando(false);
      setLimite(50);
    }).catch(() => { 
      setConteudo([]); setCategorias([]); setCarregando(false); 
      alert("Falha ao conectar ao servidor IPTV. Verifique a internet ou dados da lista.");
    });
  }, [tipoAtual, playlistAtiva]);

  const registrarHistorico = (itemOriginal, tipo) => {
    setHistorico(prev => {
      const idUnico = itemOriginal.stream_id || itemOriginal.series_id;
      const novaLista = [ { ...itemOriginal, tipo_salvo: tipo }, ...prev.filter(i => (i.stream_id || i.series_id) !== idUnico) ].slice(0, 30);
      localStorage.setItem(`boxiptv_hist_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const removerDoHistorico = (itemParaRemover, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setHistorico(prev => {
      const idUnico = itemParaRemover.stream_id || itemParaRemover.series_id;
      const novaLista = prev.filter(i => (i.stream_id || i.series_id) !== idUnico);
      localStorage.setItem(`boxiptv_hist_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const limparTodoHistorico = () => {
    if (window.confirm(`Deseja limpar todo o histórico de ${tipoAtual === 'filmes' ? 'Filmes' : tipoAtual === 'series' ? 'Séries' : 'TV ao Vivo'}?`)) {
      setHistorico(prev => {
        const novaLista = prev.filter(i => i.tipo_salvo !== tipoAtual);
        localStorage.setItem(`boxiptv_hist_${sessaoUsuario.username}`, JSON.stringify(novaLista));
        return novaLista;
      });
    }
  };

  const toggleMinhaLista = (item) => {
    if (!item) return;
    setMinhaLista(prev => {
      const idUnico = item.stream_id || item.series_id;
      const jaExiste = prev.find(i => (i.stream_id || i.series_id) === idUnico);
      let novaLista;
      if (jaExiste) {
        novaLista = prev.filter(i => (i.stream_id || i.series_id) !== idUnico);
      } else {
        novaLista = [{ ...item, tipo_salvo: tipoAtual }, ...prev];
      }
      localStorage.setItem(`boxiptv_lista_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const removerDaMinhaLista = (itemParaRemover, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setMinhaLista(prev => {
      const idUnico = itemParaRemover.stream_id || itemParaRemover.series_id;
      const novaLista = prev.filter(i => (i.stream_id || i.series_id) !== idUnico);
      localStorage.setItem(`boxiptv_lista_${sessaoUsuario.username}`, JSON.stringify(novaLista));
      return novaLista;
    });
  };

  const limparTodaMinhaLista = () => {
    if (window.confirm(`Deseja limpar a sua lista de ${tipoAtual === 'filmes' ? 'Filmes' : tipoAtual === 'series' ? 'Séries' : 'TV ao Vivo'}?`)) {
      setMinhaLista(prev => {
        const novaLista = prev.filter(i => i.tipo_salvo !== tipoAtual);
        localStorage.setItem(`boxiptv_lista_${sessaoUsuario.username}`, JSON.stringify(novaLista));
        return novaLista;
      });
    }
  };

  let conteudoFiltrado = [];
  if (categoriaSelecionada === 'recentes') {
    conteudoFiltrado = historico.filter(item => item && item.tipo_salvo === tipoAtual && (!busca || item.name.toLowerCase().includes(busca.toLowerCase())));
  } else if (categoriaSelecionada === 'minha-lista') {
    conteudoFiltrado = minhaLista.filter(item => item && item.tipo_salvo === tipoAtual && (!busca || item.name.toLowerCase().includes(busca.toLowerCase())));
  } else {
    conteudoFiltrado = conteudo.filter(item => {
      const matchesBusca = !busca || item.name.toLowerCase().includes(busca.toLowerCase());
      const matchesCat = !categoriaSelecionada || String(item.category_id) === String(categoriaSelecionada);
      return matchesBusca && matchesCat;
    });
  }

  // Abrir Detalhes Direto do IPTV
  const abrirDetalhes = (item) => {
    registrarHistorico(item, tipoAtual);
    setItemDetalhes(item);
    setCarregandoDetalhes(true);
    setDadosDetalhes(null);

    let url = '';
    if (tipoAtual === 'filmes') url = getIptvUrl('get_vod_info', `&vod_id=${item.stream_id}`);
    else if (tipoAtual === 'series') url = getIptvUrl('get_series_info', `&series_id=${item.series_id}`);
    else url = getIptvUrl('get_short_epg', `&stream_id=${item.stream_id}&limit=10`);
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (tipoAtual === 'ao-vivo') {
            setDadosDetalhes({ info: item, epg: Array.isArray(data?.epg_listings) ? data.epg_listings : [] });
        } else {
            setDadosDetalhes(data);
            if (tipoAtual === 'series' && data.episodes) {
              setTemporadaSelecionada(Object.keys(data.episodes)[0]); 
            }
        }
        setCarregandoDetalhes(false);
      })
      .catch(() => setCarregandoDetalhes(false));
  };

  const handlePlay = (id, extensao = 'mp4', isSeries = false, inicio = 0) => {
    let baseUrl = playlistAtiva.server_url.trim().replace(/\/$/, "").replace("/player_api.php", "");
    if (!baseUrl.startsWith("http")) baseUrl = "http://" + baseUrl;
    const tipoUrl = isSeries ? 'series' : 'movie';
    const streamUrl = `${baseUrl}/${tipoUrl}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${id}.${extensao}`;
    setItemSelecionado({ id, nome: itemDetalhes.name, url: streamUrl, startTime: inicio });
  };

  const handlePlayLive = (stream_id) => {
    let baseUrl = playlistAtiva.server_url.trim().replace(/\/$/, "").replace("/player_api.php", "");
    if (!baseUrl.startsWith("http")) baseUrl = "http://" + baseUrl;
    const streamUrl = `${baseUrl}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${stream_id}`;
    setItemSelecionado({ id: stream_id, nome: itemDetalhes.name, url: streamUrl, startTime: 0 });
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
  };

  const formatarTempo = (segundos) => {
    if (!segundos) return '';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}m ${s}s`;
  };

  const itemEstaNaLista = itemDetalhes && minhaLista.some(i => (i.stream_id || i.series_id) === (itemDetalhes.stream_id || itemDetalhes.series_id));

  if (mostrarAdmin) return <AdminPanel token={sessaoUsuario.token} onVoltar={() => setMostrarAdmin(false)} />;

  return (
    <div style={{ paddingBottom: '70px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .bottom-sheet {
          position: fixed; bottom: 0; left: 0; width: 100%; height: 92vh; background: #141414;
          border-top-left-radius: 20px; border-top-right-radius: 20px; z-index: 1000;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.9); display: flex; flex-direction: column;
          transform: translateY(100%); animation: slideUp 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        @keyframes slideUp { to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {itemSelecionado && <Player channel={itemSelecionado} onClose={handleClosePlayer} startTime={itemSelecionado.startTime || 0} />}
      {menuAberto && <div onClick={() => setMenuAberto(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 55, background: 'transparent' }}></div>}

      <div style={{ padding: '15px', backgroundColor: 'rgba(20,20,20,0.95)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#888' }} />
            <input 
              type="text" placeholder={`Pesquisar ${tipoAtual.replace('-', ' ')}...`} value={busca} onChange={(e) => setBusca(e.target.value)}
              style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
            />
          </div>
          <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: '#e50914', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <User size={20} />
          </button>
        </div>

        <div className="hide-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button onClick={() => {setCategoriaSelecionada('minha-lista'); setLimite(50);}} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 15px', borderRadius: '20px', border: categoriaSelecionada === 'minha-lista' ? 'none' : '1px solid #444', backgroundColor: categoriaSelecionada === 'minha-lista' ? '#e50914' : '#1a1a1a', color: categoriaSelecionada === 'minha-lista' ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
            <Bookmark size={14} /> Minha Lista
          </button>
          <button onClick={() => {setCategoriaSelecionada('recentes'); setLimite(50);}} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 15px', borderRadius: '20px', border: categoriaSelecionada === 'recentes' ? 'none' : '1px solid #444', backgroundColor: categoriaSelecionada === 'recentes' ? '#e50914' : '#1a1a1a', color: categoriaSelecionada === 'recentes' ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
            <Clock size={14} /> Recentes
          </button>
          <button onClick={() => {setCategoriaSelecionada(''); setLimite(50);}} style={{ padding: '6px 15px', borderRadius: '20px', border: categoriaSelecionada === '' ? 'none' : '1px solid #444', backgroundColor: categoriaSelecionada === '' ? '#e50914' : '#1a1a1a', color: categoriaSelecionada === '' ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
            Todas
          </button>
          {categorias.map(cat => (
            <button key={cat.category_id} onClick={() => {setCategoriaSelecionada(cat.category_id); setLimite(50);}} style={{ padding: '6px 15px', borderRadius: '20px', border: String(categoriaSelecionada) === String(cat.category_id) ? 'none' : '1px solid #444', backgroundColor: String(categoriaSelecionada) === String(cat.category_id) ? '#e50914' : '#1a1a1a', color: String(categoriaSelecionada) === String(cat.category_id) ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {menuAberto && (
        <div style={{ position: 'fixed', top: '70px', right: '15px', backgroundColor: '#222', borderRadius: '12px', padding: '10px', zIndex: 60, boxShadow: '0 10px 30px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', minWidth: '180px', border: '1px solid #333' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #333', marginBottom: '5px', fontSize: '14px' }}>
            <span style={{ color: '#aaa', fontSize: '12px' }}>Logado como</span><br/><strong style={{ fontSize: '16px' }}>{sessaoUsuario?.username}</strong>
          </div>
          {(sessaoUsuario?.role === 'admin' || sessaoUsuario?.isAdmin) && (
            <button onClick={() => { setMostrarAdmin(true); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'white', padding: '12px 10px', textAlign: 'left', borderRadius: '8px' }}><Settings size={18} /> Admin Panel</button>
          )}
          <button onClick={() => { setPlaylistAtiva(null); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#ccc', padding: '12px 10px', textAlign: 'left', borderRadius: '8px' }}><RefreshCw size={18} /> Trocar Playlist</button>
          <button onClick={() => { efetuarLogout(); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#ff4444', padding: '12px 10px', textAlign: 'left', borderRadius: '8px', fontWeight: 'bold' }}><LogOut size={18} /> Terminar Sessão</button>
        </div>
      )}

      <div style={{ padding: '10px 15px' }}>
        {(categoriaSelecionada === 'recentes' || categoriaSelecionada === 'minha-lista') && conteudoFiltrado.length > 0 && !carregando && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                <button
                    onClick={categoriaSelecionada === 'recentes' ? limparTodoHistorico : limparTodaMinhaLista}
                    style={{ padding: '8px 15px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #444', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}
                >
                    <Trash2 size={14} color="#ff4444" /> Limpar {categoriaSelecionada === 'recentes' ? 'Histórico' : 'Lista'}
                </button>
            </div>
        )}

        {carregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><RefreshCw className="animate-spin" size={35} color="#e50914" /></div>
        ) : conteudoFiltrado.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: tipoAtual === 'ao-vivo' ? 'repeat(auto-fill, minmax(110px, 1fr))' : 'repeat(auto-fill, minmax(105px, 1fr))', gap: '12px' }}>
                {conteudoFiltrado.slice(0, limite).map((item, index) => (
                <div key={item.stream_id || item.series_id || index} onClick={() => abrirDetalhes(item)} style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    
                    {(categoriaSelecionada === 'recentes' || categoriaSelecionada === 'minha-lista') && (
                        <button
                            onClick={(e) => categoriaSelecionada === 'recentes' ? removerDoHistorico(item, e) : removerDaMinhaLista(item, e)}
                            style={{ position: 'absolute', top: '5px', left: '5px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#ff4444', border: 'none', borderRadius: '50%', width: '26px', height: '26px', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}

                    <img src={item.stream_icon || item.cover || CAPA_PADRAO} alt={item.name} loading="lazy" onError={(e) => { e.target.src = CAPA_PADRAO; }} style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '90px' : '150px', objectFit: 'cover', backgroundColor: '#000' }} />
                    
                    {item.rating && item.rating !== "0" && item.rating !== 0 && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#f5c518', padding: '3px 7px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', backdropFilter: 'blur(3px)' }}>
                            <Star size={12} fill="#f5c518" /> {parseFloat(item.rating).toFixed(1)}
                        </div>
                    )}

                    <div style={{ padding: '10px 8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontWeight: '500', fontSize: '11px', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3', color: '#eaeaea' }}>{item.name}</div>
                    </div>
                </div>
                ))}
            </div>
            {conteudoFiltrado.length > limite && (
               <div style={{ textAlign: 'center', marginTop: '25px', marginBottom: '20px' }}>
                 <button onClick={() => setLimite(limite + 50)} style={{ padding: '12px 40px', fontSize: '14px', fontWeight: 'bold', background: '#e50914', color: 'white', border: 'none', borderRadius: '25px', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)' }}>Carregar Mais</button>
               </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>Nenhum conteúdo encontrado.</div>
        )}
      </div>

      {itemDetalhes && (
        <>
          <div onClick={() => setItemDetalhes(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 999, animation: 'fadeIn 0.3s' }}></div>
          
          <div className="bottom-sheet">
            <div style={{ position: 'relative', width: '100%', height: '35vh', minHeight: '220px', backgroundColor: '#000', flexShrink: 0 }}>
              <img 
                src={dadosDetalhes?.info?.movie_image || dadosDetalhes?.info?.cover || itemDetalhes.stream_icon || itemDetalhes.cover || CAPA_PADRAO} 
                alt="Banner" 
                onError={(e) => e.target.src = CAPA_PADRAO} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to top, #141414 0%, transparent 100%)' }}></div>
              <button onClick={() => setItemDetalhes(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 30px 20px', position: 'relative', marginTop: '-60px', zIndex: 10 }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: '900', textShadow: '0 2px 8px rgba(0,0,0,0.9)', lineHeight: '1.2' }}>{itemDetalhes.name}</h2>

              {carregandoDetalhes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#aaa', marginTop: '20px' }}>
                  <RefreshCw className="animate-spin" size={18} /> Carregando detalhes...
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#ccc', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', fontWeight: '500' }}>
                    {dadosDetalhes?.info?.rating && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f5c518', fontWeight: 'bold' }}>
                        <Star size={14} fill="#f5c518" /> {parseFloat(dadosDetalhes.info.rating).toFixed(1)}
                      </span>
                    )}
                    {dadosDetalhes?.info?.releasedate && <span>{dadosDetalhes.info.releasedate}</span>}
                    {dadosDetalhes?.info?.duration && <span>{dadosDetalhes.info.duration}</span>}
                    {dadosDetalhes?.info?.genre && <span style={{ background: '#333', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', color: '#fff' }}>{dadosDetalhes.info.genre}</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                    {tipoAtual === 'filmes' && dadosDetalhes?.movie_data && (
                      (() => {
                        const idFilme = dadosDetalhes.movie_data.stream_id;
                        const ext = dadosDetalhes.movie_data.container_extension;
                        const prog = progressos[idFilme] || 0;
                        return (
                          <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                            {prog > 15 ? (
                              <>
                                <button onClick={() => handlePlay(idFilme, ext, false, prog)} style={{ flex: 2, padding: '14px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                  <Play fill="currentColor" size={18} /> Continuar
                                </button>
                                <button onClick={() => handlePlay(idFilme, ext, false, 0)} style={{ flex: 1, padding: '14px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                  <RefreshCw size={16} /> Zero
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handlePlay(idFilme, ext, false, 0)} style={{ flex: 1, padding: '14px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <Play fill="currentColor" size={20} /> Assistir Filme
                              </button>
                            )}
                          </div>
                        );
                      })()
                    )}

                    {tipoAtual === 'ao-vivo' && (
                      <button onClick={() => handlePlayLive(itemDetalhes.stream_id)} style={{ flex: 1, padding: '14px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <Play fill="currentColor" size={20} /> Assistir ao Vivo
                      </button>
                    )}

                    <button onClick={() => toggleMinhaLista(itemDetalhes)} style={{ width: '50px', flexShrink: 0, backgroundColor: itemEstaNaLista ? '#1a1a1a' : '#333', color: itemEstaNaLista ? '#aaa' : '#fff', border: `1px solid ${itemEstaNaLista ? '#333' : '#444'}`, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s' }}>
                      {itemEstaNaLista ? <Check size={22} /> : <Bookmark size={22} />}
                    </button>
                  </div>

                  <p style={{ fontSize: '14px', color: '#bbb', lineHeight: '1.6', margin: '0 0 30px 0' }}>
                    {dadosDetalhes?.info?.plot || "Nenhuma sinopse disponível para este conteúdo."}
                  </p>

                  {tipoAtual === 'series' && dadosDetalhes?.episodes && (
                    <div>
                      <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#fff', fontWeight: 'bold' }}>Episódios</h3>
                      <div className="hide-scroll" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
                        {Object.keys(dadosDetalhes.episodes).map(temp => (
                          <button 
                            key={temp} 
                            onClick={() => setTemporadaSelecionada(temp)} 
                            style={{ 
                              flex: '0 0 auto', padding: '10px 20px', borderRadius: '25px', border: 'none', 
                              backgroundColor: temporadaSelecionada === temp ? '#fff' : '#222', 
                              color: temporadaSelecionada === temp ? '#000' : '#fff', 
                              fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s' 
                            }}
                          >
                            Temporada {temp}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {dadosDetalhes.episodes[temporadaSelecionada]?.map((ep) => {
                          const tempoEp = progressos[ep.id] || 0;
                          return (
                            <div key={ep.id} onClick={() => handlePlay(ep.id, ep.container_extension, true, tempoEp > 15 ? tempoEp : 0)} style={{ display: 'flex', gap: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '12px', alignItems: 'center', cursor: 'pointer', border: '1px solid #2a2a2a' }}>
                              <div style={{ position: 'relative', width: '130px', height: '75px', flexShrink: 0 }}>
                                <img src={ep.info?.movie_image || ep.info?.cover || CAPA_PADRAO} alt={ep.title} onError={e=>e.target.src=CAPA_PADRAO} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                {tempoEp > 15 && <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', backgroundColor: '#e50914', width: '60%', borderBottomLeftRadius: '8px' }}></div>}
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '8px', display: 'flex', backdropFilter: 'blur(2px)' }}>
                                  <Play size={16} color="white" fill="white" />
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ep.episode_num}. {ep.title || `Episódio ${ep.episode_num}`}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {tempoEp > 15 ? <span style={{color: '#e50914', fontWeight: 'bold'}}>Continuar assistindo...</span> : (ep.info?.plot || 'Toque para assistir agora.')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(20, 20, 20, 0.98)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #2a2a2a', zIndex: 100 }}>
        <button onClick={() => { setTipoAtual('filmes'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'filmes' ? '#fff' : '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Film size={22} color={tipoAtual === 'filmes' ? '#e50914' : 'currentColor'} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'filmes' ? 'bold' : 'normal' }}>Filmes</span>
        </button>
        <button onClick={() => { setTipoAtual('series'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'series' ? '#fff' : '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Tv size={22} color={tipoAtual === 'series' ? '#e50914' : 'currentColor'} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'series' ? 'bold' : 'normal' }}>Séries</span>
        </button>
        <button onClick={() => { setTipoAtual('ao-vivo'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'ao-vivo' ? '#fff' : '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Radio size={22} color={tipoAtual === 'ao-vivo' ? '#e50914' : 'currentColor'} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'ao-vivo' ? 'bold' : 'normal' }}>TV</span>
        </button>
      </div>
    </div>
  );
}