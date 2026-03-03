import { useState } from 'react';

export default function Login({ onLogin }) {
  const [modoLogin, setModoLogin] = useState(true); // true = Login, false = Registo
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    
    if (!username || !password) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    setCarregando(true);

    try {
      const endpoint = modoLogin ? '/api/login' : '/api/register';
      const response = await fetch(`http://localhost:8006${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocorreu um erro.');
      }

      if (modoLogin) {
        // Se for login, passa os dados (incluindo o token JWT) para o App.jsx
        onLogin({
          token: data.access_token,
          username: username,
          isAdmin: data.is_admin,
          premiumUntil: data.premium_until
        });
      } else {
        // Se for registo, mostra sucesso e muda para a aba de login
        setSucesso(data.message);
        setModoLogin(true);
      }

    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#141414', color: 'white' }}>
      <form onSubmit={handleSubmit} style={{ background: '#222', padding: '40px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', color: '#e50914', marginBottom: '10px' }}>BoxIPTV Pro</h2>
        <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '30px' }}>
          {modoLogin ? 'Entre na sua conta' : 'Crie sua conta (7 dias grátis)'}
        </p>
        
        {erro && <div style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontSize: '14px', background: 'rgba(255,68,68,0.1)', padding: '10px', borderRadius: '5px' }}>{erro}</div>}
        {sucesso && <div style={{ color: '#00C851', marginBottom: '15px', textAlign: 'center', fontSize: '14px', background: 'rgba(0,200,81,0.1)', padding: '10px', borderRadius: '5px' }}>{sucesso}</div>}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Usuário</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="tv-focusable"
            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: 'none', background: '#333', color: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Senha</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="tv-focusable"
            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: 'none', background: '#333', color: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          className="tv-focusable"
          style={{ width: '100%', padding: '14px', backgroundColor: carregando ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: carregando ? 'not-allowed' : 'pointer', transition: '0.3s', marginBottom: '15px' }}
        >
          {carregando ? 'Aguarde...' : (modoLogin ? 'Entrar' : 'Registar')}
        </button>

        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button 
            type="button" 
            onClick={() => { setModoLogin(!modoLogin); setErro(''); setSucesso(''); }}
            className="tv-focusable"
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {modoLogin ? 'Não tem conta? Registe-se' : 'Já tem conta? Faça Login'}
          </button>
        </div>
      </form>
    </div>
  );
}