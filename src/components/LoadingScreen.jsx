import { useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useStore, STAGES } from '../state/useStore.js';

export default function LoadingScreen({ onEnter }) {
  const stage = useStore((s) => s.stage);
  const { progress, active } = useProgress();
  const [fadingOut, setFadingOut] = useState(false);

  if (stage !== STAGES.IDLE_INTRO) return null;

  const ready = progress >= 100 && !active;

  const handleEnter = () => {
    if (fadingOut || !ready) return;
    setFadingOut(true);
    setTimeout(() => onEnter(), 700);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: '#000',
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fadingOut ? 'none' : 'auto',
        fontFamily: '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Hero video — autoplay, muted, plays once and freezes on last frame.
          The source is small/low-res, so we apply a CSS sharpening filter
          chain (contrast + saturate + a tiny SVG-style sharpen) to mask the
          softness when the browser upscales it to full screen. */}
      <video
        src="/loading.mkv"
        autoPlay
        muted
        playsInline
        onEnded={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration)) {
            v.currentTime = v.duration - 0.01;
          }
          v.pause();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Dark vignette so text stays readable regardless of video */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%),' +
          'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.7) 100%)',
      }} />

      {/* Content layer */}
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 64px 56px',
      }}>
        {/* Top row — brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.9s 0.1s both',
        }}>
          <img
            src="/logo.png"
            alt="PODPILL"
            style={{
              height: 'clamp(180px, 26vw, 380px)',
              width: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 10px 48px rgba(0,0,0,0.8))',
              marginLeft: -48,
              marginTop: -80,
            }}
          />

          <div style={{
            color: '#fff',
            fontSize: 10,
            letterSpacing: 4,
            fontWeight: 600,
            textAlign: 'right',
            opacity: 0.7,
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            LIVE<br />
            UNSCRIPTED<br />
            UNFILTERED
          </div>
        </div>

        {/* Middle tagline */}
        <div style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 'clamp(16px, 1.8vw, 22px)',
          fontWeight: 400,
          maxWidth: 520,
          lineHeight: 1.45,
          marginTop: 40,
          textShadow: '0 2px 16px rgba(0,0,0,0.8)',
          animation: 'fadeIn 0.9s 0.35s both',
        }}>
          The pump.fun talk show. A tech mogul, a penguin, and a monkey who all
          made millions in memecoins explain crypto culture.
          <br />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Ask them anything.</span>
        </div>

        {/* Bottom — progress or enter */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          animation: 'fadeIn 0.9s 0.6s both',
        }}>
          <div style={{ minWidth: 320 }}>
            {!ready ? (
              <>
                <div style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 10,
                  letterSpacing: 4,
                  fontWeight: 700,
                  marginBottom: 12,
                  textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                }}>
                  PREPARING THE STUDIO · {Math.floor(progress)}%
                </div>
                <div style={{
                  height: 2,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: '#fff',
                    boxShadow: '0 0 12px rgba(255,255,255,0.5)',
                    transition: 'width 0.25s ease-out',
                  }} />
                </div>
              </>
            ) : (
              <button
                onClick={handleEnter}
                style={{
                  padding: '18px 52px',
                  background: '#fff',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 5,
                  cursor: 'pointer',
                  animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
                  transition: 'transform 0.15s, box-shadow 0.25s, background 0.25s',
                  fontFamily: 'inherit',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7dd3fc';
                  e.currentTarget.style.boxShadow = '0 8px 40px rgba(125,211,252,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                ENTER STUDIO →
              </button>
            )}
          </div>

          <div style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 10,
            letterSpacing: 3,
            fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}>
            ELON · PENGUIN · PUNCH
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
