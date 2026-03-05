import { useState, useEffect } from 'react';
import { Trash2, Plus, LogOut, Monitor, User, Globe, Calendar, RefreshCw, Settings } from 'lucide-react';
import AdminPanel from './AdminPanel'; // Importa o painel de administração

export default function Playlists({ token, onSelectPlaylist, onLogout, sessaoUsuario }) {
  const [playlists, setPlaylists] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarAdmin, setMostrarAdmin] = useState(false); // NOVO: Estado para abrir o painel admin

  const [nome, setNome] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [iptvUser, setIptvUser] = useState('');
  const [iptvPass, setIptvPass] = useState('');
  const [erro, setErro] = useState('');

  const carregarPlaylists = async () => {
    setCarregando(true);
    try {
      const response = await fetch('http://72.60.3.89:8006/api/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401 || response.status === 403) {
        onLogout(); 
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error("Erro ao carregar playlists:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPlaylists();
  }, [token]);

  const handleAdicionarPlaylist = async (e) => {
    e.preventDefault();
    setErro('');
    if (!nome || !serverUrl || !iptvUser || !iptvPass) {
      setErro('Preencha todos os campos.');
      return;
    }

    try {
      const response = await fetch('http://72.60.3.89:8006/api/playlists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nome,
          server_url: serverUrl,
          iptv_username: iptvUser,
          iptv_password: iptvPass
        })
      });

      if (!response.ok) throw new Error('Erro ao adicionar playlist');
      setMostrarForm(false);
      setNome(''); setServerUrl(''); setIptvUser(''); setIptvPass('');
      carregarPlaylists();
    } catch (error) {
      setErro(error.message);
    }
  };

  const handleDeletarPlaylist = async (e, id) => {
    e.stopPropagation(); 
    if (!window.confirm("Deseja realmente remover esta lista?")) return;

    try {
      const response = await fetch(`http://72.60.3.89:8006/api/playlists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) carregarPlaylists();
    } catch (error) {
      alert("Erro ao deletar playlist");
    }
  };

  const formatarData = (data) => {
    if (!data) return "N/A";
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Se o botão Admin for clicado, renderiza apenas o Painel Admin
  if (mostrarAdmin) {
    return <AdminPanel token={token} onVoltar={() => setMostrarAdmin(false)} />;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER COM INFO DO USUÁRIO */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        maxWidth: '1000px', margin: '0 auto 40px auto', flexWrap: 'wrap', gap: '20px',
        padding: '20px', background: '#1f1f1f', borderRadius: '12px'
      }}>
        <h1 style={{ color: '#e50914', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>BoxIPTV Pro</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: '#e50914', padding: '10px', borderRadius: '50%' }}>
            <User size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{sessaoUsuario?.username}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aaa', fontSize: '13px' }}>
              <Calendar size={14} /> 
              <span>Premium até: {formatarData(sessaoUsuario?.premiumUntil)}</span>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO: ADMIN E SAIR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(sessaoUsuario?.is_admin || sessaoUsuario?.isAdmin) && (
            <button className="tv-focusable" onClick={() => setMostrarAdmin(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              <Settings size={18} /> Admin
            </button>
          )}
          <button className="tv-focusable" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <RefreshCw className="animate-spin" size={40} color="#e50914" />
            <p style={{ marginTop: '10px', color: '#aaa' }}>Buscando suas listas...</p>
          </div>
        ) : playlists.length === 0 && !mostrarForm ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#1f1f1f', borderRadius: '15px', border: '1px solid #333' }}>
            <Monitor size={60} color="#333" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '10px' }}>Nenhuma playlist encontrada</h2>
            <p style={{ color: '#aaa', marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px auto' }}>Adicione os dados do seu provedor IPTV para começar a assistir seus canais e filmes favoritos.</p>
            <button className="tv-focusable" onClick={() => setMostrarForm(true)} style={{ padding: '15px 40px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
               Configurar Primeira Lista
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {playlists.map(pl => (
              <div key={pl.id} className="tv-focusable" onClick={() => onSelectPlaylist(pl)} style={{ backgroundColor: '#1f1f1f', padding: '25px', borderRadius: '12px', cursor: 'pointer', border: '1px solid #333', position: 'relative', transition: '0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Monitor size={20} color="#e50914" /> {pl.name}
                        </h3>
                        <div style={{ color: '#aaa', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> {pl.iptv_username}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Globe size={14} /> {pl.server_url}</div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => handleDeletarPlaylist(e, pl.id)}
                        className="tv-focusable"
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#ff4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                        title="Remover Lista"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>
            ))}
            
            {!mostrarForm && (
              <div className="tv-focusable" onClick={() => setMostrarForm(true)} style={{ backgroundColor: 'transparent', padding: '25px', borderRadius: '12px', cursor: 'pointer', border: '2px dashed #333', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', color: '#555' }}>
                <Plus size={30} />
                <span style={{ fontWeight: 'bold', marginTop: '10px' }}>Nova Playlist</span>
              </div>
            )}
          </div>
        )}

        {mostrarForm && (
          <div style={{ backgroundColor: '#1f1f1f', padding: '30px', borderRadius: '15px', border: '1px solid #333', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ marginTop: 0, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={20} color="#e50914" /> Configurar Nova Playlist
            </h3>
            {erro && <div style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #ff4444' }}>{erro}</div>}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '5px' }}>NOME DA LISTA</label>
                    <input type="text" placeholder="Ex: Minha TV Premium" value={nome} onChange={e => setNome(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '5px' }}>URL DO SERVIDOR</label>
                    <input type="text" placeholder="http://exemplo.com:8080" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '5px' }}>USUÁRIO</label>
                    <input type="text" placeholder="Seu usuário" value={iptvUser} onChange={e => setIptvUser(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '5px' }}>SENHA</label>
                    <input type="password" placeholder="Sua senha" value={iptvPass} onChange={e => setIptvPass(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: 'white', boxSizing: 'border-box' }} />
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={handleAdicionarPlaylist} className="tv-focusable" style={{ flex: 2, padding: '14px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Salvar e Conectar</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="tv-focusable" style={{ flex: 1, padding: '14px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}