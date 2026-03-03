import { useState, useEffect } from 'react';

export default function AdminPanel({ token, onVoltar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [diasInput, setDiasInput] = useState({});

  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:8006/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar utilizadores. Verifique se tem permissões de Admin.');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
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
      setMensagem({ tipo: 'erro', texto: 'Insira um valor numérico válido de dias.' });
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

      if (!res.ok) throw new Error('Erro ao atualizar o período premium.');
      const data = await res.json();

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setDiasInput(prev => ({ ...prev, [userId]: '' })); // Limpa o input
      carregarUsuarios(); // Recarrega a lista para mostrar a nova data
      
      // Esconde a mensagem de sucesso após 5 segundos
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#e50914', margin: 0 }}>Painel de Administração</h1>
          <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Gestão de Contas e Acessos</p>
        </div>
        <button className="tv-focusable" onClick={onVoltar} style={{ padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⬅ Voltar ao Início
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#222', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        
        {mensagem.texto && (
          <div style={{ 
            padding: '15px', 
            marginBottom: '20px', 
            borderRadius: '5px', 
            backgroundColor: mensagem.tipo === 'sucesso' ? 'rgba(0,200,81,0.1)' : 'rgba(255,68,68,0.1)',
            color: mensagem.tipo === 'sucesso' ? '#00C851' : '#ff4444',
            border: `1px solid ${mensagem.tipo === 'sucesso' ? '#00C851' : '#ff4444'}`
          }}>
            {mensagem.texto}
          </div>
        )}

        {carregando ? (
          <p style={{ textAlign: 'center', color: '#aaa' }}>A carregar base de dados...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444', color: '#aaa' }}>
                  <th style={{ padding: '15px 10px' }}>ID</th>
                  <th style={{ padding: '15px 10px' }}>Usuário</th>
                  <th style={{ padding: '15px 10px' }}>Status</th>
                  <th style={{ padding: '15px 10px' }}>Válido Até</th>
                  <th style={{ padding: '15px 10px' }}>Ação (Adicionar Dias)</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '15px 10px' }}>#{user.id}</td>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: user.is_admin ? '#e50914' : 'white' }}>
                      {user.username} {user.is_admin && '(Admin)'}
                    </td>
                    <td style={{ padding: '15px 10px' }}>
                      <span style={{ 
                        padding: '5px 10px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        backgroundColor: user.status === 'Ativo' ? '#00C851' : '#ff4444',
                        color: 'white'
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '15px 10px', color: '#aaa', fontSize: '14px' }}>
                      {formatarData(user.premium_until)}
                    </td>
                    <td style={{ padding: '15px 10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="number" 
                          min="1"
                          placeholder="Dias" 
                          className="tv-focusable"
                          value={diasInput[user.id] || ''} 
                          onChange={(e) => setDiasInput({...diasInput, [user.id]: e.target.value})}
                          style={{ width: '70px', padding: '8px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white', outline: 'none' }}
                        />
                        <button 
                          onClick={() => handleAdicionarDias(user.id)}
                          className="tv-focusable"
                          style={{ padding: '8px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Adicionar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}