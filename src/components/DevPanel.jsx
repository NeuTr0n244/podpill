import { useEffect, useState } from 'react';
import { useStore, CAMERA_NAMES } from '../state/useStore.js';

// Dev-only overlay. Hidden by default; press `D` to toggle. This keeps the
// main UI clean while still being one keystroke away when we need to tune
// exposure, cycle cameras, or inspect animations.
export default function DevPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      // Ignore if user is typing in an input/textarea.
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'd' || e.key === 'D') setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const devIndex = useStore((s) => s.devCameraIndex);
  const cycle = useStore((s) => s.cycleDevCamera);
  const reset = useStore((s) => s.resetDevCamera);
  const exposure = useStore((s) => s.exposure);
  const setExposure = useStore((s) => s.setExposure);
  const lightMultiplier = useStore((s) => s.lightMultiplier);
  const setLightMultiplier = useStore((s) => s.setLightMultiplier);
  const animationEnabled = useStore((s) => s.animationEnabled);
  const toggleAnimation = useStore((s) => s.toggleAnimation);
  const stopAllAnimations = useStore((s) => s.stopAllAnimations);

  if (!visible) return null;

  const current = devIndex === null ? 'auto (state-driven)' : `${devIndex}: ${CAMERA_NAMES[devIndex]}`;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      right: 12,
      padding: '10px 12px',
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      fontSize: 12,
      color: '#ccc',
      zIndex: 100,
      fontFamily: 'monospace',
    }}>
      <div style={{ marginBottom: 6, color: '#7dd3fc', fontWeight: 700, letterSpacing: 1 }}>DEV</div>
      <div style={{ marginBottom: 8 }}>camera: {current}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={cycle} style={btnStyle}>Cycle Camera</button>
        <button onClick={reset} style={btnStyle}>Auto</button>
      </div>
      <div style={{ marginTop: 4, marginBottom: 6 }}>
        <div style={{ marginBottom: 4 }}>exposure: {exposure.toFixed(2)}</div>
        <input
          type="range"
          min="0.02" max="2" step="0.01"
          value={exposure}
          onChange={(e) => setExposure(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: 4, marginBottom: 10 }}>
        <div style={{ marginBottom: 4 }}>light x{lightMultiplier.toFixed(2)}</div>
        <input
          type="range"
          min="0" max="1.5" step="0.01"
          value={lightMultiplier}
          onChange={(e) => setLightMultiplier(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ color: '#7dd3fc', fontWeight: 700, letterSpacing: 1 }}>ANIMATIONS</div>
          <button onClick={stopAllAnimations} style={{ ...btnStyle, padding: '3px 8px', fontSize: 10 }}>Stop All</button>
        </div>
        {Object.keys(animationEnabled).length === 0 && (
          <div style={{ color: '#666' }}>loading...</div>
        )}
        {Object.entries(animationEnabled).map(([name, on]) => (
          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, cursor: 'pointer' }}>
            <input type="checkbox" checked={on} onChange={() => toggleAnimation(name)} />
            <span style={{ fontSize: 11 }}>{name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '6px 10px',
  fontSize: 11,
  background: 'rgba(125,211,252,0.15)',
  color: '#7dd3fc',
  border: '1px solid rgba(125,211,252,0.3)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
