import { useEffect, useRef, useState } from 'react';
import mpegts from 'mpegts.js';
import { Play, Pause, Maximize, ArrowLeft, Loader2 } from 'lucide-react';

export default function Player({ channel, onClose, startTime }) {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    
    const [isPlaying, setIsPlaying] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true); // NOVO: Estado de carregamento
    const [progresso, setProgresso] = useState(0);
    const [duracao, setDuracao] = useState(0);
    const [showControls, setShowControls] = useState(true);
    let timeoutRef = useRef(null);

    if (!channel || !channel.url) return null;

    const isVod = channel.url.toLowerCase().includes('.mp4') || channel.url.toLowerCase().includes('.mkv') || channel.url.toLowerCase().includes('.avi');

    const toggleTelaCheia = () => {
        if (!document.fullscreenElement) {
            if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
            else if (containerRef.current.webkitRequestFullscreen) containerRef.current.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    const fecharPlayer = () => {
        if (document.fullscreenElement || document.webkitIsFullScreen) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
        if (onClose) onClose(videoRef.current?.currentTime || 0, videoRef.current?.duration || 0);
    };

    const resetControlsTimeout = () => {
        setShowControls(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    // NOVO: Atalhos de Teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            resetControlsTimeout();
            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleTelaCheia();
                    break;
                case 'arrowright':
                    if (videoRef.current && isVod) videoRef.current.currentTime += 10;
                    break;
                case 'arrowleft':
                    if (videoRef.current && isVod) videoRef.current.currentTime -= 10;
                    break;
                case 'escape':
                    fecharPlayer();
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isVod]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !document.webkitIsFullScreen) {
                const tempoAtual = videoRef.current ? videoRef.current.currentTime : 0;
                const durTotal = videoRef.current ? videoRef.current.duration : 0;
                if (onClose) onClose(tempoAtual, durTotal);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [onClose]);

    useEffect(() => {
        setIsBuffering(true); // Começa a carregar
        
        if (isVod) {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            videoRef.current.src = channel.url;
            videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
        } else {
            if (mpegts.getFeatureList().mseLivePlayback) {
                if (playerRef.current) playerRef.current.destroy();
                playerRef.current = mpegts.createPlayer({ type: 'mse', isLive: true, url: channel.url });
                playerRef.current.attachMediaElement(videoRef.current);
                playerRef.current.load();
                playerRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
            }
        }

        resetControlsTimeout();

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [channel]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowControls(true);
        }
    };

    const handleTimeUpdate = () => {
        setProgresso(videoRef.current.currentTime);
        setDuracao(videoRef.current.duration);
    };

    const handleSeek = (e) => {
        const time = (e.target.value / 100) * duracao;
        videoRef.current.currentTime = time;
        setProgresso(time);
    };

    const formatTime = (time) => {
        if (isNaN(time) || !isFinite(time)) return "00:00";
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = Math.floor(time % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div 
            ref={containerRef} 
            onMouseMove={resetControlsTimeout}
            onClick={resetControlsTimeout}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            <video 
                ref={videoRef} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => { if (startTime > 0) videoRef.current.currentTime = startTime; }}
                onClick={togglePlay}
                onDoubleClick={toggleTelaCheia} // NOVO: Duplo clique
                onWaiting={() => setIsBuffering(true)} // NOVO: Sabe quando travou
                onPlaying={() => setIsBuffering(false)} // NOVO: Sabe quando voltou
                referrerPolicy="no-referrer" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />

            {/* NOVO: SPINNER DE LOADING */}
            {isBuffering && (
                <div style={{ position: 'absolute', pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 size={60} color="#e50914" className="animate-spin" />
                </div>
            )}

            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.9) 100%)' : 'none',
                opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease-in-out',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px'
            }}>
                
                <div style={{ display: 'flex', alignItems: 'center', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <button className="tv-focusable" onClick={fecharPlayer} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        <ArrowLeft size={30} /> {channel.nome}
                    </button>
                </div>

                <div style={{ width: '100%', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', fontWeight: 'bold' }}>
                        <button className="tv-focusable" onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            {isPlaying ? <Pause size={35} fill="currentColor" /> : <Play size={35} fill="currentColor" />}
                        </button>
                        
                        {/* LÓGICA INTELIGENTE: VOD ou AO VIVO */}
                        {isVod ? (
                            <>
                                <span style={{ fontSize: '14px' }}>{formatTime(progresso)}</span>
                                <input 
                                    type="range" min="0" max="100" 
                                    value={duracao ? (progresso / duracao) * 100 : 0} 
                                    onChange={handleSeek}
                                    style={{ flex: 1, cursor: 'pointer', accentColor: '#e50914' }} 
                                />
                                <span style={{ fontSize: '14px' }}>{formatTime(duracao)}</span>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                <span style={{ backgroundColor: '#e50914', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                    ● AO VIVO
                                </span>
                            </div>
                        )}
                        
                        <button className="tv-focusable" onClick={toggleTelaCheia} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px' }}>
                            <Maximize size={25} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}