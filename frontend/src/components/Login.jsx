import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, MonitorPlay, Download } from 'lucide-react'; // Ícone de Download adicionado

export default function Login({ onLogin }) {
  const [modoLogin, setModoLogin] = useState(true); // true = Login, false = Registo
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState(''); // Novo estado para confirmação
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false); // Visibilidade da segunda senha
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    
    // Validação de campos vazios
    if (!username || !password || (!modoLogin && !confirmarSenha)) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    // Validação de senhas iguais no registo
    if (!modoLogin && password !== confirmarSenha) {
      setErro('As palavras-passe não coincidem.');
      return;
    }

    setCarregando(true);

    try {
      const url = modoLogin ? '/api/login' : '/api/register';
      
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
        onLogin({
          token: data.access_token,
          username: username,
          isAdmin: data.is_admin,
          premiumUntil: data.premium_until
        });
      } else {
        setSucesso(data.message || 'Conta criada com sucesso! Faça Login.');
        setModoLogin(true);
        setPassword('');
        setConfirmarSenha(''); // Limpa a confirmação por segurança
      }

    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', 
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

        <div style={{ marginBottom: modoLogin ? '30px' : '20px', position: 'relative' }}>
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

        {/* CAMPO DE CONFIRMAR SENHA (Apenas no Registo) */}
        {!modoLogin && (
          <div style={{ marginBottom: '30px', position: 'relative' }}>
            <Lock size={20} color="#888" style={{ position: 'absolute', left: '15px', top: '14px' }} />
            <input 
              type={mostrarConfirmarSenha ? "text" : "password"} 
              placeholder="Confirmar Palavra-passe"
              value={confirmarSenha} 
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="tv-focusable"
              style={{ width: '100%', padding: '14px 45px 14px 45px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a1a', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '15px', transition: 'border 0.3s' }}
              onFocus={(e) => e.target.style.border = '1px solid #e50914'}
              onBlur={(e) => e.target.style.border = '1px solid #444'}
            />
            <button 
              type="button"
              onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              tabIndex="-1"
              style={{ position: 'absolute', right: '15px', top: '14px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
            >
              {mostrarConfirmarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        )}

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
            onClick={() => { 
              setModoLogin(!modoLogin); 
              setErro(''); 
              setSucesso(''); 
              setPassword(''); 
              setConfirmarSenha(''); // Limpa campos ao trocar de aba
            }}
            className="tv-focusable"
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '5px' }}
          >
            {modoLogin ? 'Registe-se agora' : 'Inicie Sessão'}
          </button>
        </div>
      </form>

      {/* LINK DE DOWNLOAD DO APLICATIVO ANDROID */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <a 
          href="http://tecnopriv.top/download/iptv/BOXIPTV_PRO_3.0.apk" 
          target="_blank" 
          rel="noopener noreferrer"
          className="tv-focusable"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#aaa', 
            textDecoration: 'none', 
            fontSize: '15px',
            padding: '10px 20px',
            borderRadius: '20px',
            border: '1px solid #333',
            background: 'rgba(20, 20, 20, 0.6)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#e50914'; e.currentTarget.style.background = 'rgba(229, 9, 20, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)'; }}
        >
          <Download size={18} /> Baixar App Android
        </a>
      </div>

    </div>
  );
}