import { useStore, STAGES } from '../state/useStore.js';

// Broadcast-style header overlay: brand mark on the left, LIVE badge on the
// right. Hidden during the loading screen.
export default function TopBar() {
  const stage = useStore((s) => s.stage);
  if (stage === STAGES.IDLE_INTRO) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 18,
        left: 24,
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <img
          src="/logo.png"
          alt="PODPILL"
          style={{
            height: 80,
            width: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
            marginLeft: -16,
            marginTop: -16,
          }}
        />
      </div>

      <div style={{
        position: 'fixed',
        top: 22,
        right: 28,
        zIndex: 50,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <span style={{
          width: 8,
          height: 8,
          background: '#ef4444',
          borderRadius: '50%',
          boxShadow: '0 0 8px #ef4444',
          animation: 'livePulse 1.4s ease-in-out infinite',
        }} />
        <span style={{
          color: '#fff',
          fontSize: 11,
          letterSpacing: 3,
          fontWeight: 700,
        }}>
          LIVE · EP 001
        </span>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
      `}</style>
    </>
  );
}
