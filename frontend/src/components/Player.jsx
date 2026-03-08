import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import mpegts from 'mpegts.js';
import Hls from 'hls.js';
import { Play, Pause, Maximize, ArrowLeft, Loader2 } from 'lucide-react';

export default function Player({ channel, onClose, startTime, poster, onPlayNext }) {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const btnNextRef = useRef(null);
    
    const [isPlaying, setIsPlaying] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [progresso, setProgresso] = useState(0);
    const [duracao, setDuracao] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [erroPlayback, setErroPlayback] = useState(false);
    const [showNextEp, setShowNextEp] = useState(false);
    let timeoutRef = useRef(null);

    if (!channel || !channel.url) return null;

    // A URL VEM PURA, SEM FORÇAR EXTENSÕES
    let finalUrl = channel.url.trim();

    const isVod = finalUrl.toLowerCase().includes('.mp4') || finalUrl.toLowerCase().includes('.mkv') || finalUrl.toLowerCase().includes('.avi');
    const isHls = finalUrl.toLowerCase().includes('.m3u8');
    const isMkv = finalUrl.toLowerCase().includes('.mkv');

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

    useEffect(() => {
        if (containerRef.current) containerRef.current.focus();

        let listenerHandler = null;
        const setupListener = async () => {
            listenerHandler = await CapacitorApp.addListener('backButton', () => {
                fecharPlayer(); 
            });
        };
        setupListener();
        
        return () => {
            if (listenerHandler) {
                listenerHandler.remove();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetControlsTimeout = () => {
        setShowControls(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 4000); 
    };

    // Foca automaticamente no botão de próximo episódio quando ele aparecer
    useEffect(() => {
        if (showNextEp && btnNextRef.current) {
            btnNextRef.current.focus();
        }
    }, [showNextEp]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            resetControlsTimeout();
            switch(e.key.toLowerCase()) {
                case 'enter': 
                case ' ':
                case 'k':
                    // Não dar toggle play se o foco estiver no botão de próximo episódio
                    if (document.activeElement !== btnNextRef.current) {
                        e.preventDefault();
                        togglePlay();
                    }
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
                case 'backspace': 
                    e.preventDefault();
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
                fecharPlayer();
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
        setIsBuffering(true); 
        setErroPlayback(false);
        setShowNextEp(false);
        
        const destroyPlayer = () => {
            if (playerRef.current) {
                if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
                playerRef.current = null;
            }
        };

        const onVideoError = () => {
            if (!videoRef.current?.error) return; 
            console.error("Erro nativo de vídeo:", videoRef.current?.error);
            setIsBuffering(false);
            setErroPlayback(true);
        };

        if (videoRef.current) {
            videoRef.current.addEventListener('error', onVideoError);
        }

        const tentarPlay = () => {
            if (!videoRef.current) return;
            const playPromise = videoRef.current.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(e => {
                        if (e.name === 'AbortError') {
                            setTimeout(() => {
                                if (videoRef.current) {
                                    videoRef.current.play()
                                        .then(() => setIsPlaying(true))
                                        .catch(() => setIsPlaying(false));
                                }
                            }, 300);
                            return;
                        }
                        console.error("Erro ao reproduzir:", e);
                        if (e.name !== 'NotAllowedError') {
                            setIsBuffering(false);
                            setErroPlayback(true);
                        } else {
                            setIsBuffering(false);
                            setIsPlaying(false);
                        }
                    });
            }
        };

        if (isVod) {
            destroyPlayer();
            videoRef.current.src = finalUrl;
            videoRef.current.load(); // Força carregamento
            tentarPlay();
            
        } else if (isHls) {
            destroyPlayer();
            if (Hls.isSupported()) {
                const hls = new Hls({ 
                    maxBufferLength: 30, maxMaxBufferLength: 60,
                    enableWorker: true, lowLatencyMode: false 
                });
                playerRef.current = hls;
                hls.loadSource(finalUrl);
                hls.attachMedia(videoRef.current);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    tentarPlay();
                });
                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                destroyPlayer();
                                setIsBuffering(false);
                                setErroPlayback(true);
                                break;
                        }
                    }
                });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = finalUrl;
                tentarPlay();
            }
            
        } else {
            if (mpegts.getFeatureList().mseLivePlayback) {
                destroyPlayer();
                playerRef.current = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: finalUrl });
                playerRef.current.attachMediaElement(videoRef.current);
                playerRef.current.load();
                tentarPlay();
            }
        }

        resetControlsTimeout();

        return () => {
            destroyPlayer();
            if (videoRef.current) videoRef.current.removeEventListener('error', onVideoError);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalUrl]);

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    resetControlsTimeout();
                })
                .catch(e => { if (e.name !== 'AbortError') console.log(e); });
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowControls(true);
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const atual = videoRef.current.currentTime;
        const total = videoRef.current.duration;
        setProgresso(atual);
        setDuracao(total);

        // Lógica de aparecer o botão faltando 20 segundos
        if (channel.proximoEpisodio && total > 0 && (total - atual) <= 20) {
            setShowNextEp(true);
        } else {
            setShowNextEp(false);
        }
    };

    const handleVideoEnded = () => {
        // Avança automaticamente quando o vídeo chega ao fim
        if (channel.proximoEpisodio && onPlayNext) {
            onPlayNext();
        } else {
            fecharPlayer();
        }
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const time = (e.target.value / 100) * duracao;
        videoRef.current.currentTime = time;
        setProgresso(time);
        resetControlsTimeout();
    };

    const formatTime = (time) => {
        if (isNaN(time) || !isFinite(time)) return "00:00";
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = Math.floor(time % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Função interna para o onLoadedMetadata
    const handleLoadedMetadata = () => {
        if (startTime > 0 && videoRef.current) {
            videoRef.current.currentTime = startTime; 
        }
        if (videoRef.current && videoRef.current.paused) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(() => {});
            }
        }
    };

    return (
        <div 
            ref={containerRef} 
            onMouseMove={resetControlsTimeout}
            onClick={resetControlsTimeout}
            tabIndex={0}
            className="tv-focusable" 
            style={{ 
                position: 'fixed', top: 0, left: 0, 
                width: '100%', height: '100%', 
                background: '#000', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' 
            }}
        >
            <video 
                ref={videoRef}
                autoPlay
                poster={poster}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onClick={togglePlay}
                onDoubleClick={toggleTelaCheia} 
                onWaiting={() => setIsBuffering(true)} 
                onPlaying={() => { setIsBuffering(false); setErroPlayback(false); }} 
                referrerPolicy="no-referrer" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', minWidth: '100vw', minHeight: '100vh' }} 
            />

            {/* BOTÃO DE PRÓXIMO EPISÓDIO */}
            {showNextEp && channel.proximoEpisodio && (
                <div style={{ position: 'absolute', bottom: showControls ? '130px' : '40px', right: '40px', zIndex: 20, transition: 'bottom 0.3s ease-in-out' }}>
                    <button
                        ref={btnNextRef}
                        tabIndex={0}
                        className="tv-focusable"
                        onClick={(e) => { e.stopPropagation(); onPlayNext(); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                onPlayNext();
                            }
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '15px 25px', backgroundColor: 'rgba(20, 20, 20, 0.9)', 
                            color: 'white', border: '2px solid #e50914', borderRadius: '8px', 
                            cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', 
                            boxShadow: '0 10px 20px rgba(0,0,0,0.8)'
                        }}
                    >
                        Próximo Episódio <Play size={20} fill="#e50914" />
                    </button>
                </div>
            )}

            {!isPlaying && !isBuffering && !erroPlayback && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 7, pointerEvents: 'none' }}>
                    <Play size={80} color="rgba(255,255,255,0.7)" fill="currentColor" />
                </div>
            )}

            {erroPlayback && (
                <div style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '400px', zIndex: 10 }}>
                    <p style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>Erro de Reprodução</p>
                    <p style={{ color: 'white', fontSize: '14px' }}>
                        {isMkv ? "O reprodutor da sua TV Box pode não suportar o codec deste arquivo MKV nativamente." : "Não foi possível carregar este canal. Tente novamente ou escolha outro."}
                    </p>
                    <button onClick={fecharPlayer} style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
                </div>
            )}

            {isBuffering && !erroPlayback && (
                <div style={{ position: 'absolute', pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5 }}>
                    <Loader2 size={60} color="#e50914" className="animate-spin" />
                </div>
            )}

            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.9) 100%)' : 'none',
                opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease-in-out',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px', zIndex: 6
            }}>
                
                <div style={{ display: 'flex', alignItems: 'center', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <button tabIndex={0} onClick={fecharPlayer} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        <ArrowLeft size={30} /> {channel.nome}
                    </button>
                </div>

                <div style={{ width: '100%', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', fontWeight: 'bold' }}>
                        <button tabIndex={0} onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            {isPlaying ? <Pause size={35} fill="currentColor" /> : <Play size={35} fill="currentColor" />}
                        </button>
                        
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
                                    ● AO VIVO {isHls && '(HLS)'}
                                </span>
                            </div>
                        )}
                        
                        <button tabIndex={0} onClick={toggleTelaCheia} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px' }}>
                            <Maximize size={25} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}