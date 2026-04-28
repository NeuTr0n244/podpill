import { useStore } from '../state/useStore.js';

const SPEAKER_ACCENT = {
  Elon:    '#7dd3fc',
  Penguin: '#fef08a',
  Punch:   '#fca5a5',
};

export default function Subtitle() {
  const { speaker, text } = useStore((s) => s.subtitle);
  if (!text) return null;

  const accent = SPEAKER_ACCENT[speaker] || '#ffffff';

  return (
    <div style={{
      position: 'fixed',
      bottom: '7%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(820px, 88vw)',
      maxHeight: '32vh',
      overflowY: 'auto',
      padding: '22px 32px 24px',
      background: 'linear-gradient(180deg, rgba(10,10,18,0.82) 0%, rgba(6,6,12,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: `1px solid ${accent}40`,
      borderRadius: 10,
      pointerEvents: 'none',
      boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${accent}15`,
      fontFamily: '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      animation: 'subtitleIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
      }}>
        <span style={{
          width: 6,
          height: 6,
          background: accent,
          borderRadius: '50%',
          boxShadow: `0 0 8px ${accent}`,
        }} />
        <span style={{
          color: accent,
          fontSize: 10,
          letterSpacing: 4,
          fontWeight: 700,
        }}>
          {speaker?.toUpperCase()}
        </span>
      </div>
      <div style={{
        color: '#fff',
        fontSize: 'clamp(17px, 1.5vw, 21px)',
        lineHeight: 1.45,
        fontWeight: 400,
      }}>
        {text}
      </div>

      <style>{`
        @keyframes subtitleIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
