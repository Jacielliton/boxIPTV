import { useState, useEffect } from 'react';
import { 
  UserCheck, UserX, Plus, Search, Users, Activity, AlertCircle, 
  Trash2, Settings, List, Edit, Save, X 
} from 'lucide-react';

const estiloInput = {
  width: '100%', padding: '12px', background: '#000', border: '1px solid #444', color: 'white', borderRadius: '5px', boxSizing: 'border-box', outline: 'none'
};

export default function AdminPanel({ token, onVoltar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [diasInput, setDiasInput] = useState({});
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // ESTADOS PARA GESTÃO DE PLAYLISTS
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [playlistsUsuario, setPlaylistsUsuario] = useState([]);
  const [editandoPlaylist, setEditandoPlaylist] = useState(null);
  
  // NOVO: Estados para criar uma Playlist Nova
  const [mostrarFormNova, setMostrarFormNova] = useState(false);
  const [novaPlaylist, setNovaPlaylist] = useState({ name: '', server_url: '', iptv_username: '', iptv_password: '' });

  // ==========================================
  // FUNÇÕES DE UTILIZADORES
  // ==========================================
  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const res = await fetch('https://iptv.tecnopriv.top/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Falha ao carregar utilizadores.');
      if (Array.isArray(data)) setUsuarios(data);
      else throw new Error('Formato de dados inválido.');
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
      setUsuarios([]); 
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarUsuarios(); }, [token]);

  const handleAdicionarDias = async (userId) => {
    const dias = parseInt(diasInput[userId] || 0);
    if (dias <= 0 || isNaN(dias)) return;
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/users/${userId}/premium`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dias_adicionais: dias })
      });
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Premium atualizado!' });
        setDiasInput(prev => ({ ...prev, [userId]: '' }));
        carregarUsuarios();
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
      }
    } catch (err) {}
  };

  const handleToggleStatus = async (userId, statusAtual) => {
    const novoStatus = statusAtual === 'Ativo' ? 'Desabilitado' : 'Ativo';
    if (!window.confirm(`Tem certeza que deseja alterar o status para ${novoStatus}?`)) return;
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) carregarUsuarios();
    } catch (err) {}
  };

  const handleApagarUsuario = async (userId, username) => {
    if (!window.confirm(`ATENÇÃO: Deseja apagar permanentemente o utilizador ${username || 'Desconhecido'} e todas as suas playlists?`)) return;
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Utilizador apagado com sucesso.' });
        carregarUsuarios();
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
      }
    } catch (err) {}
  };

  // ==========================================
  // FUNÇÕES DE PLAYLISTS
  // ==========================================
  const abrirGerenciadorPlaylists = async (user) => {
    setUsuarioSelecionado(user);
    setEditandoPlaylist(null); 
    setMostrarFormNova(false); // Reseta o form novo
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/users/${user.id}/playlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPlaylistsUsuario(data);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar listas do utilizador.' });
    }
  };

  const deletarPlaylistAdmin = async (playlistId) => {
    if (!window.confirm("Remover esta playlist permanentemente?")) return;
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Playlist removida.' });
        abrirGerenciadorPlaylists(usuarioSelecionado);
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
      }
    } catch (e) {}
  };

  const iniciarEdicao = (pl) => {
    setMostrarFormNova(false);
    setEditandoPlaylist({
      id: pl.id,
      name: pl.name || '',
      server_url: pl.server_url || '',
      iptv_username: pl.iptv_username || '',
      iptv_password: pl.iptv_password || ''
    });
  };

  const salvarEdicaoPlaylist = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/playlists/${editandoPlaylist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editandoPlaylist)
      });
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Playlist atualizada com sucesso!' });
        setEditandoPlaylist(null);
        abrirGerenciadorPlaylists(usuarioSelecionado);
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
      }
    } catch (e) {}
  };

  // NOVO: Função para salvar playlist nova
  const salvarNovaPlaylist = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`https://iptv.tecnopriv.top/api/admin/users/${usuarioSelecionado.id}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(novaPlaylist)
      });
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Nova playlist adicionada ao cliente!' });
        setMostrarFormNova(false);
        setNovaPlaylist({ name: '', server_url: '', iptv_username: '', iptv_password: '' }); // Limpa o formulário
        abrirGerenciadorPlaylists(usuarioSelecionado);
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
      }
    } catch (e) {}
  };

  const formatarData = (dataString) => {
    if (!dataString) return '---';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '---'; }
  };

  const listaSegura = Array.isArray(usuarios) ? usuarios : [];
  const usuariosFiltrados = listaSegura.filter(user => {
    const nome = user?.username || ''; 
    const idStr = user?.id ? user.id.toString() : '';
    const termo = (termoPesquisa || '').toLowerCase();
    return nome.toLowerCase().includes(termo) || idStr.includes(termo);
  });

  const totalUsuarios = listaSegura.length;
  const usuariosAtivos = listaSegura.filter(u => u?.status === 'Ativo').length;
  const usuariosInativos = totalUsuarios - usuariosAtivos;

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#e50914', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={28} /> Painel de Administração
          </h1>
          <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Gestão de Contas e Playlists</p>
        </div>
        <button className="tv-focusable" onClick={onVoltar} style={{ padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⬅ Voltar ao Início
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* DASHBOARD DE ESTATÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0056b3', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Users size={32} color="#0056b3" />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalUsuarios}</div>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Total de Utilizadores</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #00C851', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Activity size={32} color="#00C851" />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{usuariosAtivos}</div>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Contas Ativas</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ff4444', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <AlertCircle size={32} color="#ff4444" />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{usuariosInativos}</div>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Expirados / Desabilitados</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#222', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          
          {/* MENSAGENS DE FEEDBACK */}
          {mensagem.texto && (
            <div style={{ 
              padding: '15px', marginBottom: '20px', borderRadius: '5px', 
              backgroundColor: mensagem.tipo === 'sucesso' ? 'rgba(0,200,81,0.1)' : 'rgba(255,68,68,0.1)',
              color: mensagem.tipo === 'sucesso' ? '#00C851' : '#ff4444',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#00C851' : '#ff4444'}`
            }}>
              {mensagem.texto}
            </div>
          )}

          {/* BARRA DE PESQUISA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Lista de Clientes</h2>
            <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#888' }} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou ID..." 
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="tv-focusable"
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '25px', border: '1px solid #444', backgroundColor: '#141414', color: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* TABELA DE UTILIZADORES */}
          {carregando ? (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '40px 0' }}>A carregar base de dados...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #444', color: '#aaa', backgroundColor: '#1a1a1a' }}>
                    <th style={{ padding: '15px' }}>Usuário</th>
                    <th style={{ padding: '15px' }}>Status</th>
                    <th style={{ padding: '15px' }}>Válido Até</th>
                    <th style={{ padding: '15px' }}>Renovação</th>
                    <th style={{ padding: '15px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length > 0 ? usuariosFiltrados.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #333', opacity: user.status === 'Ativo' ? 1 : 0.6, transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#2a2a2a'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: user.is_admin ? '#e50914' : 'white', fontSize: '16px' }}>
                          {user.username || 'Sem Nome'} {user.is_admin && <span style={{fontSize: '11px', verticalAlign:'super'}}>(Admin)</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>ID: #{user.id}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                          backgroundColor: user.status === 'Ativo' ? 'rgba(0,200,81,0.2)' : 'rgba(255,68,68,0.2)', 
                          color: user.status === 'Ativo' ? '#00C851' : '#ff4444', border: `1px solid ${user.status === 'Ativo' ? '#00C851' : '#ff4444'}`
                        }}>
                          {user.status || 'Desconhecido'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', color: '#aaa', fontSize: '14px' }}>
                        {formatarData(user.premium_until)}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="number" min="1" placeholder="Dias" className="tv-focusable"
                            value={diasInput[user.id] || ''} 
                            onChange={(e) => setDiasInput({...diasInput, [user.id]: e.target.value})}
                            style={{ width: '70px', padding: '8px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#141414', color: 'white', outline: 'none' }}
                          />
                          <button 
                            onClick={() => handleAdicionarDias(user.id)}
                            className="tv-focusable"
                            style={{ padding: '8px 12px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            title="Adicionar Dias"
                          >
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          
                          <button 
                            onClick={() => abrirGerenciadorPlaylists(user)}
                            className="tv-focusable"
                            style={{ padding: '8px', border: 'none', borderRadius: '5px', cursor: 'pointer', backgroundColor: '#444', color: 'white' }}
                            title="Gerir Playlists"
                          >
                            <List size={18} />
                          </button>

                          <button 
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className="tv-focusable"
                            style={{ 
                              padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer',
                              backgroundColor: user.status === 'Ativo' ? '#333' : '#e50914',
                              color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            {user.status === 'Ativo' ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                          
                          <button 
                            onClick={() => handleApagarUsuario(user.id, user.username)}
                            className="tv-focusable"
                            style={{ padding: '8px', border: '1px solid #ff4444', borderRadius: '5px', cursor: 'pointer', backgroundColor: 'transparent', color: '#ff4444' }}
                            title="Apagar Utilizador"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                        Nenhum utilizador encontrado para exibição.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: GERENCIADOR DE PLAYLISTS            */}
      {/* ========================================== */}
      {usuarioSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#222', width: '100%', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
            
            {/* CABEÇALHO DO MODAL COM BOTÃO + NOVA LISTA */}
            <div style={{ padding: '20px', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <List size={20} color="#e50914" /> Listas de {usuarioSelecionado.username}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!mostrarFormNova && !editandoPlaylist && (
                  <button className="tv-focusable" onClick={() => setMostrarFormNova(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#00C851', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    <Plus size={16} /> Nova Lista
                  </button>
                )}
                <button className="tv-focusable" onClick={() => setUsuarioSelecionado(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
              </div>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* FORMULÁRIO DE NOVA PLAYLIST */}
              {mostrarFormNova && (
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px dashed #00C851', marginBottom: '20px' }}>
                  <h3 style={{ marginTop: 0, color: '#00C851', fontSize: '16px' }}>Adicionar Nova Playlist</h3>
                  <form onSubmit={salvarNovaPlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" value={novaPlaylist.name} onChange={e => setNovaPlaylist({...novaPlaylist, name: e.target.value})} style={estiloInput} placeholder="Nome da Lista" required />
                    <input type="url" value={novaPlaylist.server_url} onChange={e => setNovaPlaylist({...novaPlaylist, server_url: e.target.value})} style={estiloInput} placeholder="URL do Servidor (ex: http://servidor.com)" required />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input type="text" value={novaPlaylist.iptv_username} onChange={e => setNovaPlaylist({...novaPlaylist, iptv_username: e.target.value})} style={estiloInput} placeholder="Usuário IPTV" required />
                      <input type="text" value={novaPlaylist.iptv_password} onChange={e => setNovaPlaylist({...novaPlaylist, iptv_password: e.target.value})} style={estiloInput} placeholder="Senha IPTV" required />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="tv-focusable" style={{ flex: 1, background: '#00C851', border: 'none', color: 'white', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Playlist</button>
                      <button type="button" className="tv-focusable" onClick={() => setMostrarFormNova(false)} style={{ flex: 1, background: '#444', border: 'none', color: 'white', padding: '12px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {playlistsUsuario.length === 0 && !mostrarFormNova ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Este utilizador ainda não cadastrou nenhuma playlist.</p> 
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {playlistsUsuario.map(pl => (
                    <div key={pl.id} style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                      
                      {/* FORMULÁRIO DE EDIÇÃO */}
                      {editandoPlaylist?.id === pl.id ? (
                        <form onSubmit={salvarEdicaoPlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input type="text" value={editandoPlaylist.name || ''} onChange={e => setEditandoPlaylist({...editandoPlaylist, name: e.target.value})} style={estiloInput} placeholder="Nome da Lista" required />
                          <input type="url" value={editandoPlaylist.server_url || ''} onChange={e => setEditandoPlaylist({...editandoPlaylist, server_url: e.target.value})} style={estiloInput} placeholder="URL do Servidor" required />
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <input type="text" value={editandoPlaylist.iptv_username || ''} onChange={e => setEditandoPlaylist({...editandoPlaylist, iptv_username: e.target.value})} style={estiloInput} placeholder="Usuário IPTV" required />
                            <input type="text" value={editandoPlaylist.iptv_password || ''} onChange={e => setEditandoPlaylist({...editandoPlaylist, iptv_password: e.target.value})} style={estiloInput} placeholder="Senha IPTV" required />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="submit" className="tv-focusable" style={{ flex: 1, background: '#0056b3', border: 'none', color: 'white', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                              <Save size={18} /> Salvar Edição
                            </button>
                            <button type="button" className="tv-focusable" onClick={() => setEditandoPlaylist(null)} style={{ flex: 1, background: '#444', border: 'none', color: 'white', padding: '12px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        
                        /* MODO VISUALIZAÇÃO DA PLAYLIST */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff', marginBottom: '5px' }}>{pl.name}</div>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '3px' }}><strong>URL:</strong> {pl.server_url}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}><strong>User:</strong> {pl.iptv_username}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="tv-focusable" onClick={() => iniciarEdicao(pl)} style={{ background: '#333', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '5px', cursor: 'pointer' }} title="Editar">
                              <Edit size={18} />
                            </button>
                            <button className="tv-focusable" onClick={() => deletarPlaylistAdmin(pl.id)} style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '10px', borderRadius: '5px', cursor: 'pointer' }} title="Apagar">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}