import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, MonitorPlay, QrCode } from 'lucide-react';

export default function Login({ onLogin }) {
  const [modoLogin, setModoLogin] = useState('login'); // 'login', 'register', 'qrcode'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false); 
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [qrCode, setQrCode] = useState(''); // NOVO: Estado para o código gerado

  // Efeito de Polling do QR Code
  useEffect(() => {
    let intervalo;
    if (modoLogin === 'qrcode') {
      fetch('/api/device/code')
        .then(res => res.json())
        .then(data => {
          setQrCode(data.code);
          intervalo = setInterval(() => {
            fetch(`/api/device/poll/${data.code}`)
              .then(res => res.json())
              .then(pollData => {
                if (pollData.status === 'linked') {
                  clearInterval(intervalo);
                  setUsername(pollData.username);
                  setPassword(pollData.password);
                  efetuarLoginQr(pollData.username, pollData.password);
                }
              }).catch(() => {});
          }, 3000);
        });
    }
    return () => clearInterval(intervalo);
  }, [modoLogin]);

  const efetuarLoginQr = async (user, pass) => {
    setCarregando(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await response.json();
      if (response.ok) {
        onLogin({ token: data.access_token, username: user, isAdmin: data.is_admin, premiumUntil: data.premium_until });
      } else setErro(data.detail);
    } catch (error) { setErro(error.message); }
    setCarregando(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(''); setSucesso('');
    
    if (!username || !password || (modoLogin === 'register' && !confirmarSenha)) {
      setErro('Por favor, preencha todos os campos.'); return;
    }
    if (modoLogin === 'register' && password !== confirmarSenha) {
      setErro('As palavras-passe não coincidem.'); return;
    }

    setCarregando(true);

    try {
      const url = modoLogin === 'login' ? '/api/login' : '/api/register';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Ocorreu um erro.');

      if (modoLogin === 'login') {
        onLogin({ token: data.access_token, username: username, isAdmin: data.is_admin, premiumUntil: data.premium_until });
      } else {
        setSucesso(data.message || 'Conta criada com sucesso! Faça Login.');
        setModoLogin('login'); setPassword(''); setConfirmarSenha('');
      }
    } catch (error) { setErro(error.message); } 
    finally { setCarregando(false); }
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
            {modoLogin === 'login' ? 'Aceda à sua conta para continuar' : modoLogin === 'register' ? 'Crie a sua conta (7 dias grátis)' : 'Conecte usando o seu celular'}
            </p>
        </div>
        
        {erro && <div style={{ color: '#ff4444', marginBottom: '20px', textAlign: 'center', fontSize: '14px', background: 'rgba(255,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.3)' }}>{erro}</div>}
        {sucesso && <div style={{ color: '#00C851', marginBottom: '20px', textAlign: 'center', fontSize: '14px', background: 'rgba(0,200,81,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,200,81,0.3)' }}>{sucesso}</div>}

        {modoLogin === 'qrcode' ? (
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Login por Dispositivo</h3>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
              Acesse <strong>http://iptv.tecnopriv.top/login</strong> no seu celular e digite o código abaixo:
            </p>
            <div style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '8px', color: '#e50914', marginBottom: '20px' }}>
              {qrCode || '...'}
            </div>
            {qrCode && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://iptv.tecnopriv.top/login?code=${qrCode}&bgcolor=141414&color=ffffff`} 
                alt="QR Code" 
                style={{ border: '5px solid white', borderRadius: '10px' }} 
              />
            )}
            <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}><Loader2 size={12} className="animate-spin" style={{ display: 'inline' }}/> Aguardando aprovação...</p>
          </div>
        ) : (
          <>
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
        {modoLogin === 'register' && (
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
          {carregando ? <><Loader2 size={20} className="animate-spin" /> A processar...</> : (modoLogin === 'login' ? 'Entrar' : 'Registar Conta')}
        </button>
        </>
        )}

        {/* BOTÕES DE NAVEGAÇÃO ENTRE ABAS */}
        <div style={{ textAlign: 'center', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {modoLogin !== 'qrcode' && (
            <button type="button" onClick={() => setModoLogin('qrcode')} className="tv-focusable" style={{ background: '#333', border: 'none', color: 'white', cursor: 'pointer', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', width: '100%' }}>
              <QrCode size={18} /> Entrar com QR Code
            </button>
          )}

          <button 
            type="button" 
            onClick={() => {
              setModoLogin(modoLogin === 'login' ? 'register' : 'login');
              setErro(''); setSucesso(''); setPassword(''); setConfirmarSenha('');
            }}
            className="tv-focusable"
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px', padding: '10px' }}
          >
            {modoLogin === 'login' ? 'Não tem conta? Registe-se agora' : 'Voltar ao Login com Senha'}
          </button>
        </div>
      </form>

    </div>
  );
}