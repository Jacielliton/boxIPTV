import React, { useState, useEffect } from 'react';
import { Film, Tv, Radio, Search, User, LogOut, Settings, RefreshCw, Play, X, Star } from 'lucide-react';
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
  
  // Estado do Player
  const [itemSelecionado, setItemSelecionado] = useState(null);
  
  // Menus e Modais
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  
  // NOVO: Estados para o Modal de Detalhes (Bottom Sheet)
  const [itemDetalhes, setItemDetalhes] = useState(null); // O item clicado na grelha
  const [dadosDetalhes, setDadosDetalhes] = useState(null); // Os dados da API (sinopse, episódios, etc)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null);

  // Rotação de Tela (Landscape para o vídeo)
  useEffect(() => {
    if (itemSelecionado) {
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (error) {}
    } else {
      try {
        if (window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (error) {}
    }
  }, [itemSelecionado]);

  // Busca de Conteúdo e Categorias
  useEffect(() => {
    if (!playlistAtiva) return;
    setCarregando(true);
    setCategoriaSelecionada('');
    
    const endpoint = tipoAtual === 'filmes' ? 'filmes' : (tipoAtual === 'series' ? 'series' : 'ao-vivo');
    const query = `?server_url=${encodeURIComponent(playlistAtiva.server_url)}&user=${encodeURIComponent(playlistAtiva.iptv_username)}&passw=${encodeURIComponent(playlistAtiva.iptv_password)}`;
    
    Promise.all([
      fetch(`http://localhost:8006/api/${endpoint}${query}`).then(res => res.json()),
      fetch(`http://localhost:8006/api/categorias/${tipoAtual}${query}`).then(res => res.json())
    ]).then(([dCont, dCat]) => {
      setConteudo(Array.isArray(dCont) ? dCont : []);
      setCategorias(Array.isArray(dCat) ? dCat : []);
      setCarregando(false);
      setLimite(50);
    }).catch(() => { setConteudo([]); setCategorias([]); setCarregando(false); });
  }, [tipoAtual, playlistAtiva]);

  // Filtros
  const conteudoFiltrado = conteudo.filter(item => {
    const matchesBusca = !busca || item.name.toLowerCase().includes(busca.toLowerCase());
    const matchesCat = !categoriaSelecionada || String(item.category_id) === String(categoriaSelecionada);
    return matchesBusca && matchesCat;
  });

  // NOVO: Abrir Modal de Detalhes
  const abrirDetalhes = (item) => {
    setItemDetalhes(item);
    setCarregandoDetalhes(true);
    setDadosDetalhes(null);

    const queryParams = `?server_url=${encodeURIComponent(playlistAtiva.server_url)}&user=${encodeURIComponent(playlistAtiva.iptv_username)}&passw=${encodeURIComponent(playlistAtiva.iptv_password)}`;
    
    fetch(`http://localhost:8006/api/${tipoAtual}/${item.stream_id || item.series_id}${queryParams}`)
      .then(res => res.json())
      .then(data => {
        setDadosDetalhes(data);
        if (tipoAtual === 'series' && data.episodes) {
          setTemporadaSelecionada(Object.keys(data.episodes)[0]); // Seleciona a 1ª temporada por defeito
        }
        setCarregandoDetalhes(false);
      })
      .catch(() => setCarregandoDetalhes(false));
  };

  // NOVO: Play a partir do Modal de Detalhes
  const handlePlay = (id, extensao = 'mp4', isSeries = false) => {
    const tipoUrl = isSeries ? 'series' : 'movie';
    const streamUrl = `${playlistAtiva.server_url}/${tipoUrl}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${id}.${extensao}`;
    setItemSelecionado({ id, nome: itemDetalhes.name, url: streamUrl, startTime: 0 });
  };

  const handlePlayLive = (stream_id) => {
    const streamUrl = `${playlistAtiva.server_url}/${playlistAtiva.iptv_username}/${playlistAtiva.iptv_password}/${stream_id}`;
    setItemSelecionado({ id: stream_id, nome: itemDetalhes.name, url: streamUrl, startTime: 0 });
  };

  if (mostrarAdmin) return <AdminPanel token={sessaoUsuario.token} onVoltar={() => setMostrarAdmin(false)} />;

  return (
    <div style={{ paddingBottom: '70px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* OCULTAR SCROLLBARS */}
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .bottom-sheet {
          position: fixed; bottom: 0; left: 0; width: 100%; height: 85vh; background: #1a1a1a;
          border-top-left-radius: 20px; border-top-right-radius: 20px; z-index: 1000;
          box-shadow: 0 -5px 20px rgba(0,0,0,0.8); display: flex; flexDirection: column;
          transform: translateY(100%); animation: slideUp 0.3s forwards;
        }
        @keyframes slideUp { to { transform: translateY(0); } }
      `}</style>

      {itemSelecionado && <Player channel={itemSelecionado} onClose={() => setItemSelecionado(null)} startTime={0} />}
      {menuAberto && <div onClick={() => setMenuAberto(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 55 }}></div>}

      {/* HEADER FIXO: PESQUISA E PERFIL */}
      <div style={{ padding: '15px', backgroundColor: 'rgba(20,20,20,0.95)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#888' }} />
            <input 
              type="text" placeholder={`Pesquisar ${tipoAtual.replace('-', ' ')}...`} value={busca} onChange={(e) => setBusca(e.target.value)}
              style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '25px', border: 'none', backgroundColor: '#222', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
            />
          </div>
          <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: '#e50914', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <User size={20} />
          </button>
        </div>

        {/* NOVO: BARRA DE CATEGORIAS DESLIZANTE HORIZONTAL */}
        <div className="hide-scroll" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button onClick={() => setCategoriaSelecionada('')} style={{ padding: '6px 15px', borderRadius: '20px', border: '1px solid #444', backgroundColor: categoriaSelecionada === '' ? '#fff' : '#222', color: categoriaSelecionada === '' ? '#000' : '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
            Todas
          </button>
          {categorias.map(cat => (
            <button key={cat.category_id} onClick={() => setCategoriaSelecionada(cat.category_id)} style={{ padding: '6px 15px', borderRadius: '20px', border: '1px solid #444', backgroundColor: String(categoriaSelecionada) === String(cat.category_id) ? '#fff' : '#222', color: String(categoriaSelecionada) === String(cat.category_id) ? '#000' : '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* MENU DO UTILIZADOR */}
      {menuAberto && (
        <div style={{ position: 'fixed', top: '65px', right: '15px', backgroundColor: '#222', borderRadius: '8px', padding: '10px', zIndex: 60, boxShadow: '0 4px 15px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', minWidth: '160px', border: '1px solid #444' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #444', marginBottom: '5px', fontSize: '14px' }}>
            <span style={{ color: '#aaa' }}>Olá, </span><br/><strong>{sessaoUsuario?.username}</strong>
          </div>
          {(sessaoUsuario?.role === 'admin' || sessaoUsuario?.isAdmin) && (
            <button onClick={() => { setMostrarAdmin(true); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'white', padding: '12px 10px', textAlign: 'left', borderRadius: '5px' }}><Settings size={18} /> Admin</button>
          )}
          <button onClick={() => { setPlaylistAtiva(null); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#ccc', padding: '12px 10px', textAlign: 'left', borderRadius: '5px' }}><RefreshCw size={18} /> Trocar Playlist</button>
          <button onClick={() => { efetuarLogout(); setMenuAberto(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#e50914', padding: '12px 10px', textAlign: 'left', borderRadius: '5px', fontWeight: 'bold' }}><LogOut size={18} /> Sair</button>
        </div>
      )}

      {/* GRELHA DE CONTEÚDO */}
      <div style={{ padding: '10px 15px' }}>
        {carregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><RefreshCw className="animate-spin" size={40} color="#e50914" /></div>
        ) : conteudoFiltrado.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: tipoAtual === 'ao-vivo' ? 'repeat(auto-fill, minmax(100px, 1fr))' : 'repeat(auto-fill, minmax(105px, 1fr))', gap: '12px' }}>
                {conteudoFiltrado.slice(0, limite).map((item, index) => (
                <div key={item.stream_id || index} onClick={() => abrirDetalhes(item)} style={{ backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <img src={item.stream_icon || item.cover || CAPA_PADRAO} alt={item.name} loading="lazy" onError={(e) => { e.target.src = CAPA_PADRAO; }} style={{ width: '100%', height: tipoAtual === 'ao-vivo' ? '90px' : '150px', objectFit: 'cover', backgroundColor: '#000' }} />
                    <div style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontWeight: 'normal', fontSize: '11px', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{item.name}</div>
                    </div>
                </div>
                ))}
            </div>
            {conteudoFiltrado.length > limite && (
               <div style={{ textAlign: 'center', marginTop: '20px' }}>
                 <button onClick={() => setLimite(limite + 50)} style={{ padding: '10px 30px', fontSize: '14px', fontWeight: 'bold', background: '#333', color: 'white', border: 'none', borderRadius: '25px' }}>Ver Mais</button>
               </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>Nenhum conteúdo encontrado.</div>
        )}
      </div>

      {/* NOVO: MODAL DE DETALHES (BOTTOM SHEET) */}
      {itemDetalhes && (
        <>
          <div onClick={() => setItemDetalhes(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 999 }}></div>
          <div className="bottom-sheet">
            {/* Barra de Fechar */}
            <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
               <h3 style={{ margin: 0, fontSize: '16px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{itemDetalhes.name}</h3>
               <button onClick={() => setItemDetalhes(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>
            </div>

            {/* Corpo do Detalhe */}
            <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <img src={itemDetalhes.stream_icon || itemDetalhes.cover || CAPA_PADRAO} alt="Capa" onError={(e) => e.target.src = CAPA_PADRAO} style={{ width: '100px', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
                <div>
                  {carregandoDetalhes ? (
                    <p style={{ color: '#888', fontSize: '14px' }}>A carregar informações...</p>
                  ) : dadosDetalhes?.info ? (
                    <>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#aaa', marginBottom: '10px', alignItems: 'center' }}>
                        {dadosDetalhes.info.rating && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5c518' }}><Star size={12} fill="#f5c518" /> {dadosDetalhes.info.rating}</span>}
                        {dadosDetalhes.info.releasedate && <span>{dadosDetalhes.info.releasedate}</span>}
                      </div>
                      <p style={{ fontSize: '13px', color: '#ddd', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {dadosDetalhes.info.plot || "Nenhuma sinopse disponível."}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: '#888', fontSize: '14px' }}>Informação indisponível.</p>
                  )}
                </div>
              </div>

              {/* Botões de Ação baseados no Tipo */}
              {tipoAtual === 'filmes' && dadosDetalhes?.movie_data && (
                <button onClick={() => handlePlay(dadosDetalhes.movie_data.stream_id, dadosDetalhes.movie_data.container_extension)} style={{ width: '100%', padding: '15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Play fill="currentColor" size={20} /> Assistir Filme
                </button>
              )}

              {tipoAtual === 'ao-vivo' && (
                <button onClick={() => handlePlayLive(itemDetalhes.stream_id)} style={{ width: '100%', padding: '15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Play fill="currentColor" size={20} /> Assistir ao Vivo
                </button>
              )}

              {/* Lógica Exclusiva para SÉRIES (Temporadas e Episódios) */}
              {tipoAtual === 'series' && dadosDetalhes?.episodes && (
                <div>
                  <div className="hide-scroll" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '15px', paddingBottom: '5px' }}>
                    {Object.keys(dadosDetalhes.episodes).map(temp => (
                      <button key={temp} onClick={() => setTemporadaSelecionada(temp)} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', backgroundColor: temporadaSelecionada === temp ? '#fff' : '#333', color: temporadaSelecionada === temp ? '#000' : '#fff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Temporada {temp}
                      </button>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dadosDetalhes.episodes[temporadaSelecionada]?.map((ep) => (
                      <div key={ep.id} onClick={() => handlePlay(ep.id, ep.container_extension, true)} style={{ display: 'flex', gap: '15px', padding: '10px', backgroundColor: '#222', borderRadius: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                          <img src={ep.info?.movie_image || EPISODIO_PADRAO} alt="ep" onError={e=>e.target.src=CAPA_PADRAO} style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '5px' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '5px' }}><Play size={16} color="white" fill="white" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{ep.episode_num}. {ep.title || `Episódio ${ep.episode_num}`}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Clique para assistir</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #333', zIndex: 100 }}>
        <button onClick={() => { setTipoAtual('filmes'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'filmes' ? '#e50914' : '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Film size={22} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'filmes' ? 'bold' : 'normal' }}>Filmes</span>
        </button>
        <button onClick={() => { setTipoAtual('series'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'series' ? '#e50914' : '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Tv size={22} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'series' ? 'bold' : 'normal' }}>Séries</span>
        </button>
        <button onClick={() => { setTipoAtual('ao-vivo'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', color: tipoAtual === 'ao-vivo' ? '#e50914' : '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
          <Radio size={22} /> <span style={{ fontSize: '11px', fontWeight: tipoAtual === 'ao-vivo' ? 'bold' : 'normal' }}>TV</span>
        </button>
      </div>

    </div>
  );
}