// ElevenLabs TTS. One voice per character. Falls back to the browser's
// SpeechSynthesis if no key / voice is configured.

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_BY_CHARACTER = {
  elon:    import.meta.env.VITE_ELEVENLABS_VOICE_ELON,
  penguin: import.meta.env.VITE_ELEVENLABS_VOICE_PENGUIN,
  punch:   import.meta.env.VITE_ELEVENLABS_VOICE_PUNCH,
};

// Per-character voice tuning. Higher style = more expressive but less stable.
const VOICE_SETTINGS_BY_CHARACTER = {
  elon:    { stability: 0.45, similarity_boost: 0.78, style: 0.45, use_speaker_boost: true },
  penguin: { stability: 0.55, similarity_boost: 0.75, style: 0.30, use_speaker_boost: true },
  punch:   { stability: 0.35, similarity_boost: 0.80, style: 0.65, use_speaker_boost: true },
};

let currentAudio = null;

export async function speakAs(character, text, onWord) {
  cancelSpeech();
  if (!text || !text.trim()) return;

  const voiceId = VOICE_BY_CHARACTER[character];
  const useEleven = !!(API_KEY && voiceId);

  if (!useEleven) {
    console.warn(`[tts] ElevenLabs not configured for ${character} — using browser fallback`);
    return browserSpeak(text);
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: VOICE_SETTINGS_BY_CHARACTER[character] || {
            stability: 0.5, similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn('[tts] ElevenLabs', res.status, err.slice(0, 200));
      return browserSpeak(text);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    return await new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
      };
      audio.onended = () => { cleanup(); resolve(); };
      audio.onerror = () => { cleanup(); resolve(); };

      // Word-level callback estimation: schedule onWord at evenly spaced
      // intervals once we know the audio duration.
      if (onWord) {
        audio.onloadedmetadata = () => {
          const words = text.split(/\s+/).filter(Boolean);
          const total = audio.duration || words.length * 0.35;
          const step = (total / Math.max(1, words.length)) * 1000;
          words.forEach((w, i) => {
            setTimeout(() => {
              const clean = w.toLowerCase().replace(/[^a-zà-ſ]/gi, '');
              if (clean) onWord(clean, i);
            }, i * step);
          });
        };
      }

      audio.play().catch((e) => {
        console.warn('[tts] play failed:', e.message);
        cleanup();
        resolve();
      });
    });
  } catch (e) {
    console.warn('[tts] fetch failed:', e.message);
    return browserSpeak(text);
  }
}

export function cancelSpeech() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch {}
}

function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    try { window.speechSynthesis.cancel(); } catch {}
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}
