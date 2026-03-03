import { useEffect, useRef } from 'react';
import mpegts from 'mpegts.js';

export default function Player({ channel, onClose, startTime }) {
    const videoRef = useRef(null);
    const playerRef = useRef(null);

    if (!channel || !channel.url) return null;

    const abrirTelaCheia = () => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        try {
            if (videoElement.requestFullscreen) {
                videoElement.requestFullscreen().catch(e => console.log(e));
            } else if (videoElement.webkitRequestFullscreen) {
                videoElement.webkitRequestFullscreen();
            } else if (videoElement.msRequestFullscreen) {
                videoElement.msRequestFullscreen();
            }
        } catch (error) {
            console.log(error);
        }
    };

    // QUANDO O VÍDEO CARREGA OS METADADOS, AVANÇA PARA O TEMPO SALVO
    const handleLoadedMetadata = () => {
        if (startTime && startTime > 0 && videoRef.current) {
            videoRef.current.currentTime = startTime;
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
                
                // Lê o tempo em que o utilizador parou e a duração total do vídeo
                const tempoAtual = videoRef.current ? videoRef.current.currentTime : 0;
                const duracao = videoRef.current ? videoRef.current.duration : 0;
                
                if (onClose) onClose(tempoAtual, duracao);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
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
            videoRef.current.play().catch(e => console.log("Aguardando interação:", e));

        } else {
            if (mpegts.getFeatureList().mseLivePlayback) {
                if (playerRef.current) {
                    playerRef.current.destroy();
                }
                playerRef.current = mpegts.createPlayer({
                    type: 'mse',
                    isLive: true,
                    url: channel.url
                });
                playerRef.current.attachMediaElement(videoRef.current);
                playerRef.current.load();
                abrirTelaCheia();
                playerRef.current.play().catch(e => console.log(e));
            }
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [channel]);

    return (
        <div style={{ background: '#000', textAlign: 'center' }}>
            <video 
                ref={videoRef} 
                controls 
                autoPlay 
                preload="auto" 
                onLoadedMetadata={handleLoadedMetadata} /* ACIONA O AVANÇO DO TEMPO AQUI */
                style={{ width: '100%', background: 'black' }} 
            />
        </div>
    );
}