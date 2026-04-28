import { useState } from 'react';
import { useStore, STAGES } from '../state/useStore.js';

const SUGGESTIONS = [
  'Is Bitcoin still a good buy?',
  'Will Solana flip Ethereum?',
  'Is AI a bubble?',
  'What makes a coin pump?',
];

export default function QuestionBox({ onSubmit }) {
  const stage = useStore((s) => s.stage);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  if (stage !== STAGES.AWAITING_Q) return null;

  const submit = (e) => {
    e?.preventDefault();
    const q = value.trim();
    if (!q) return;
    setValue('');
    onSubmit(q);
  };

  const pickSuggestion = (s) => {
    setValue('');
    onSubmit(s);
  };

  return (
    <form
      onSubmit={submit}
      style={{
        position: 'fixed',
        bottom: '6%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 90vw)',
        padding: '22px 24px 18px',
        background: 'linear-gradient(180deg, rgba(10,10,18,0.85) 0%, rgba(6,6,12,0.93) 100%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${focused ? 'rgba(125,211,252,0.6)' : 'rgba(125,211,252,0.25)'}`,
        borderRadius: 12,
        boxShadow: focused
          ? '0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(125,211,252,0.2)'
          : '0 20px 50px rgba(0,0,0,0.5)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        fontFamily: '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        animation: 'qboxIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
      }}>
        <span style={{
          width: 6,
          height: 6,
          background: '#7dd3fc',
          borderRadius: '50%',
          boxShadow: '0 0 8px #7dd3fc',
          animation: 'livePulse 1.6s ease-in-out infinite',
        }} />
        <span style={{
          color: '#7dd3fc',
          fontSize: 10,
          letterSpacing: 4,
          fontWeight: 700,
        }}>
          ASK ANYTHING
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'stretch',
      }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Type your question…"
          style={{
            flex: 1,
            padding: '14px 16px',
            fontSize: 17,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#fff',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button type="submit" disabled={!value.trim()} style={{
          padding: '0 24px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          background: value.trim() ? '#7dd3fc' : 'rgba(255,255,255,0.06)',
          color: value.trim() ? '#0a0a0a' : '#555',
          border: 'none',
          borderRadius: 8,
          cursor: value.trim() ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s, transform 0.1s',
          fontFamily: 'inherit',
        }}
          onMouseDown={(e) => { if (value.trim()) e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ASK →
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 14,
      }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pickSuggestion(s)}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              background: 'rgba(255,255,255,0.04)',
              color: '#aaa',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 100,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s, border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(125,211,252,0.1)';
              e.currentTarget.style.color = '#7dd3fc';
              e.currentTarget.style.borderColor = 'rgba(125,211,252,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#aaa';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes qboxIn {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </form>
  );
}
