import { useState, useEffect } from 'react';
import { UserCheck, UserX, Plus, Search, Users, Activity, AlertCircle, Trash2, Settings } from 'lucide-react'; // Added Settings here

export default function AdminPanel({ token, onVoltar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [diasInput, setDiasInput] = useState({});
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:8006/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao carregar utilizadores.');
      }
      
      if (Array.isArray(data)) {
        setUsuarios(data);
      } else {
        setUsuarios([]);
        setMensagem({ tipo: 'erro', texto: 'Formato de dados inválido recebido do servidor.' });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
      setUsuarios([]); 
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, [token]);

  const handleAdicionarDias = async (userId) => {
    const dias = parseInt(diasInput[userId] || 0);
    if (dias <= 0 || isNaN(dias)) {
      setMensagem({ tipo: 'erro', texto: 'Insira um valor válido de dias.' });
      return;
    }

    try {
      setMensagem({ tipo: '', texto: '' });
      const res = await fetch(`http://localhost:8006/api/admin/users/${userId}/premium`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dias_adicionais: dias })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao atualizar o período premium.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setDiasInput(prev => ({ ...prev, [userId]: '' }));
      carregarUsuarios();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleToggleStatus = async (userId, statusAtual) => {
    const novoStatus = statusAtual === 'Ativo' ? 'Desabilitado' : 'Ativo';
    if (!window.confirm(`Tem certeza que deseja alterar o status para ${novoStatus}?`)) return;

    try {
      setMensagem({ tipo: '', texto: '' });
      const res = await fetch(`http://localhost:8006/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao alterar status do usuário.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      carregarUsuarios();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleApagarUsuario = async (userId, username) => {
    if (!window.confirm(`ATENÇÃO: Deseja apagar permanentemente o utilizador ${username || 'Desconhecido'} e todas as suas playlists?`)) return;

    try {
      setMensagem({ tipo: '', texto: '' });
      const res = await fetch(`http://localhost:8006/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Erro ao apagar utilizador.');
      }
      
      setMensagem({ tipo: 'sucesso', texto: 'Utilizador apagado com sucesso.' });
      carregarUsuarios();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return 'Data Inválida';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'Data Inválida';
    }
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
          <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Gestão de Contas e Acessos</p>
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
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className="tv-focusable"
                            style={{ 
                              padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer',
                              backgroundColor: user.status === 'Ativo' ? '#444' : '#e50914',
                              color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            {user.status === 'Ativo' ? <><UserX size={16} /> Bloquear</> : <><UserCheck size={16} /> Ativar</>}
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
    </div>
  );
}