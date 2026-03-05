import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, MonitorPlay } from 'lucide-react';

export default function Login({ onLogin }) {
  const [modoLogin, setModoLogin] = useState(true); // true = Login, false = Registo
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
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
      // Os caminhos relativos puros ('http://localhost:8006/api/...') garantem que o mudar_ambiente.py funciona perfeitamente!
      const url = modoLogin ? 'http://localhost:8006/api/login' : 'http://localhost:8006/api/register';
      
      const response = await fetch(url, {
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
        // Se for registo, mostra sucesso, muda para a aba de login e limpa a senha por segurança
        setSucesso(data.message || 'Conta criada com sucesso! Faça Login.');
        setModoLogin(true);
        setPassword('');
      }

    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', 
      backgroundColor: '#141414', color: 'white',
      background: 'radial-gradient(circle at center, #2a0808 0%, #141414 100%)',
      padding: '20px', boxSizing: 'border-box'
    }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'rgba(20, 20, 20, 0.95)', padding: '40px 30px', borderRadius: '12px', 
        width: '100%', maxWidth: '400px', boxShadow: '0 15px 35px rgba(0,0,0,0.8)',
        border: '1px solid #333', backdropFilter: 'blur(10px)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <MonitorPlay size={48} color="#e50914" style={{ marginBottom: '10px' }} />
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '1px' }}>BoxIPTV <span style={{color: '#e50914'}}>Pro</span></h2>
            <p style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '14px' }}>
            {modoLogin ? 'Aceda à sua conta para continuar' : 'Crie a sua conta (7 dias grátis)'}
            </p>
        </div>
        
        {erro && <div style={{ color: '#ff4444', marginBottom: '20px', textAlign: 'center', fontSize: '14px', background: 'rgba(255,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.3)' }}>{erro}</div>}
        {sucesso && <div style={{ color: '#00C851', marginBottom: '20px', textAlign: 'center', fontSize: '14px', background: 'rgba(0,200,81,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,200,81,0.3)' }}>{sucesso}</div>}

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <User size={20} color="#888" style={{ position: 'absolute', left: '15px', top: '14px' }} />
          <input 
            type="text" 
            placeholder="Nome de Utilizador"
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="tv-focusable"
            style={{ width: '100%', padding: '14px 15px 14px 45px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a1a', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '15px', transition: 'border 0.3s' }}
            onFocus={(e) => e.target.style.border = '1px solid #e50914'}
            onBlur={(e) => e.target.style.border = '1px solid #444'}
          />
        </div>

        <div style={{ marginBottom: '30px', position: 'relative' }}>
          <Lock size={20} color="#888" style={{ position: 'absolute', left: '15px', top: '14px' }} />
          <input 
            type={mostrarSenha ? "text" : "password"} 
            placeholder="Palavra-passe"
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="tv-focusable"
            style={{ width: '100%', padding: '14px 45px 14px 45px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a1a', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '15px', transition: 'border 0.3s' }}
            onFocus={(e) => e.target.style.border = '1px solid #e50914'}
            onBlur={(e) => e.target.style.border = '1px solid #444'}
          />
          <button 
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            tabIndex="-1"
            style={{ position: 'absolute', right: '15px', top: '14px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
          >
            {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          className="tv-focusable"
          style={{ width: '100%', padding: '14px', backgroundColor: carregando ? '#e5091480' : '#e50914', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: carregando ? 'not-allowed' : 'pointer', transition: 'all 0.3s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)' }}
        >
          {carregando ? <><Loader2 size={20} className="animate-spin" /> A processar...</> : (modoLogin ? 'Entrar' : 'Registar Conta')}
        </button>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <span style={{ color: '#888', fontSize: '14px' }}>
            {modoLogin ? 'Ainda não é membro? ' : 'Já tem uma conta? '}
          </span>
          <button 
            type="button" 
            onClick={() => { setModoLogin(!modoLogin); setErro(''); setSucesso(''); }}
            className="tv-focusable"
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '5px' }}
          >
            {modoLogin ? 'Registe-se agora' : 'Inicie Sessão'}
          </button>
        </div>
      </form>
    </div>
  );
}