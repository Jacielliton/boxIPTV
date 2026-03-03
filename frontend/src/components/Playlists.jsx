import { useState, useEffect } from 'react';

export default function Playlists({ token, onSelectPlaylist, onLogout }) {
  const [playlists, setPlaylists] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estados para o formulário de nova playlist
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [iptvUser, setIptvUser] = useState('');
  const [iptvPass, setIptvPass] = useState('');
  const [erro, setErro] = useState('');

  const carregarPlaylists = async () => {
    setCarregando(true);
    try {
      const response = await fetch('http://localhost:8006/api/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      setErro('Preencha todos os campos da Playlist.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8006/api/playlists', {
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

      // Limpa form e recarrega a lista
      setMostrarForm(false);
      setNome(''); setServerUrl(''); setIptvUser(''); setIptvPass('');
      carregarPlaylists();

    } catch (error) {
      setErro(error.message);
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#141414', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto', marginBottom: '30px' }}>
        <h1 style={{ color: '#e50914' }}>Minhas Playlists</h1>
        <button className="tv-focusable" onClick={onLogout} style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Sair</button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {carregando ? (
          <p>A carregar as suas listas...</p>
        ) : playlists.length === 0 && !mostrarForm ? (
          <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#222', borderRadius: '8px' }}>
            <h2>Nenhuma playlist encontrada.</h2>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>Adicione os dados do seu provedor IPTV para começar.</p>
            <button className="tv-focusable" onClick={() => setMostrarForm(true)} style={{ padding: '12px 25px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>+ Adicionar IPTV</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {playlists.map(pl => (
                <div key={pl.id} className="tv-focusable" onClick={() => onSelectPlaylist(pl)} style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #333', transition: '0.2s' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>📺 {pl.name}</h3>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>Usuário: {pl.iptv_username}</p>
                </div>
              ))}
              
              {!mostrarForm && (
                <div className="tv-focusable" onClick={() => setMostrarForm(true)} style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '2px dashed #444', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
                  <span style={{ color: '#888', fontWeight: 'bold', fontSize: '18px' }}>+ Nova Playlist</span>
                </div>
              )}
            </div>
          </>
        )}

        {mostrarForm && (
          <form onSubmit={handleAdicionarPlaylist} style={{ backgroundColor: '#222', padding: '30px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Adicionar Nova Playlist</h3>
            {erro && <p style={{ color: '#ff4444' }}>{erro}</p>}
            
            <input type="text" placeholder="Nome da Lista (ex: Minha TV)" value={nome} onChange={e => setNome(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white' }} />
            <input type="text" placeholder="URL do Servidor IPTV (ex: http://servidor.top)" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white' }} />
            <input type="text" placeholder="Usuário IPTV" value={iptvUser} onChange={e => setIptvUser(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white' }} />
            <input type="password" placeholder="Senha IPTV" value={iptvPass} onChange={e => setIptvPass(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white' }} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="tv-focusable" style={{ padding: '10px 20px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Playlist</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="tv-focusable" style={{ padding: '10px 20px', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}