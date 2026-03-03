import { useEffect, useRef, useState } from 'react';
import mpegts from 'mpegts.js';
import { Play, Pause, Maximize, ArrowLeft } from 'lucide-react';

export default function Player({ channel, onClose, startTime }) {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    
    const [isPlaying, setIsPlaying] = useState(true);
    const [progresso, setProgresso] = useState(0);
    const [duracao, setDuracao] = useState(0);
    const [showControls, setShowControls] = useState(true);
    let timeoutRef = useRef(null);

    if (!channel || !channel.url) return null;

    const abrirTelaCheia = () => {
        const el = containerRef.current;
        if (!el) return;
        try {
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        } catch (error) {
            console.log(error);
        }
    };

    const fecharPlayer = () => {
        if (document.fullscreenElement || document.webkitIsFullScreen) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
        if (onClose) onClose(videoRef.current?.currentTime || 0, videoRef.current?.duration || 0);
    };

    // Auto-hide dos controlos
    const resetControlsTimeout = () => {
        setShowControls(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
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
        const url = channel.url.toLowerCase();
        const isVod = url.includes('.mp4') || url.includes('.mkv') || url.includes('.avi');

        if (isVod) {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            videoRef.current.src = channel.url;
            abrirTelaCheia(); 
            videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
        } else {
            if (mpegts.getFeatureList().mseLivePlayback) {
                if (playerRef.current) playerRef.current.destroy();
                playerRef.current = mpegts.createPlayer({ type: 'mse', isLive: true, url: channel.url });
                playerRef.current.attachMediaElement(videoRef.current);
                playerRef.current.load();
                abrirTelaCheia();
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
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowControls(true); // Se pausar, mantém os controlos visíveis
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
        if (isNaN(time)) return "00:00";
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
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />

            {/* OVERLAY DE CONTROLOS PERSONALIZADOS */}
            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.9) 100%)' : 'none',
                opacity: showControls ? 1 : 0, transition: 'opacity 0.5s ease-in-out',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px'
            }}>
                
                {/* Topo: Botão Voltar e Título */}
                <div style={{ display: 'flex', alignItems: 'center', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <button className="tv-focusable" onClick={fecharPlayer} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold' }}>
                        <ArrowLeft size={30} /> {channel.nome}
                    </button>
                </div>

                {/* Base: Barra de Progresso e Play/Pause */}
                <div style={{ width: '100%', pointerEvents: showControls ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', fontWeight: 'bold' }}>
                        <button className="tv-focusable" onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            {isPlaying ? <Pause size={35} fill="currentColor" /> : <Play size={35} fill="currentColor" />}
                        </button>
                        
                        <span style={{ fontSize: '14px' }}>{formatTime(progresso)}</span>
                        
                        <input 
                            type="range" min="0" max="100" 
                            value={duracao ? (progresso / duracao) * 100 : 0} 
                            onChange={handleSeek}
                            style={{ flex: 1, cursor: 'pointer', accentColor: '#e50914' }} 
                        />
                        
                        <span style={{ fontSize: '14px' }}>{formatTime(duracao)}</span>
                        
                        <button className="tv-focusable" onClick={abrirTelaCheia} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px' }}>
                            <Maximize size={25} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}