import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import Scene from './components/Scene.jsx';
import TVScreen from './components/TVScreen.jsx';
import Subtitle from './components/Subtitle.jsx';
import QuestionBox from './components/QuestionBox.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import DevPanel from './components/DevPanel.jsx';
import TopBar from './components/TopBar.jsx';
import { useStore, STAGES, CAMERA_BY_CHARACTER, TALK_ANIM_BY_CHARACTER } from './state/useStore.js';
import { speakAs, cancelSpeech } from './lib/tts.js';
import { generateIntro, generateConversation } from './lib/gpt.js';

// Only unambiguous affirmatives / negatives — "right" / "correct" / "sure"
// show up in normal speech too often and trigger unwanted nods.
const YES_WORDS = new Set(['yes', 'yeah', 'yep', 'yup', 'sim', 'absolutely', 'definitely']);
const NO_WORDS  = new Set(['no', 'nope', 'nah', 'never', 'nao', 'não']);

// Play the talking anim during TTS, stop it when speech ends. During speech,
// watch word boundaries and fire a yes/no head-gesture sub-clip when the
// spoken word matches.
async function speakWithAnim(character, text, setAnimationEnabled, triggerGesture) {
  const animName = TALK_ANIM_BY_CHARACTER[character];
  if (animName) setAnimationEnabled(animName, true);

  const onWord = (word) => {
    if (YES_WORDS.has(word)) {
      console.log(`[app] YES gesture for ${character} on word "${word}"`);
      triggerGesture?.(character, 'yes');
    } else if (NO_WORDS.has(word)) {
      console.log(`[app] NO gesture for ${character} on word "${word}"`);
      triggerGesture?.(character, 'no');
    }
  };

  try {
    await speakAs(character, text, onWord);
  } finally {
    if (animName) setAnimationEnabled(animName, false);
  }
}

const ELON_INTRO = "Welcome to PODPILL. I'm Elon, your host. Fire away — ask me anything.";
const ELON_BACK = "Alright, next pill. What else you got?";

export default function App() {
  const setStage = useStore((s) => s.setStage);
  const setActiveCamera = useStore((s) => s.setActiveCamera);
  const setSubtitle = useStore((s) => s.setSubtitle);
  const clearSubtitle = useStore((s) => s.clearSubtitle);
  const setAnimationEnabled = useStore((s) => s.setAnimationEnabled);
  const triggerGesture = useStore((s) => s.triggerGesture);

  // When the user first clicks Enter on the intro overlay.
  const handleStart = useCallback(async () => {
    setActiveCamera(CAMERA_BY_CHARACTER.elon);
    setStage(STAGES.ELON_ASKING); // reuse ELON_ASKING so subtitle+speak fires
    setSubtitle('Elon', ELON_INTRO);
    await speakWithAnim('elon', ELON_INTRO, setAnimationEnabled, triggerGesture);
    clearSubtitle();
    setStage(STAGES.AWAITING_Q);
  }, [setActiveCamera, setStage, setSubtitle, clearSubtitle, setAnimationEnabled, triggerGesture]);

  // Dynamic conversation — Gemini scripts a 4-8 turn back-and-forth between
  // Penguin / Punch / occasional Elon interjections, ending with Elon's wrap.
  // We fire TWO calls in parallel: Elon's intro (small, fast) starts speaking
  // immediately while the rest of the conversation generates in the background.
  const handleAsk = useCallback(async (question) => {
    setActiveCamera(CAMERA_BY_CHARACTER.elon);
    setStage(STAGES.ELON_ASKING);
    setSubtitle('Elon', '...');

    const introPromise = generateIntro(question);
    const convoPromise = generateConversation(question);

    // 1) Elon intro — speaks as soon as it's ready.
    const intro = await introPromise;
    setSubtitle('Elon', intro);
    await speakWithAnim('elon', intro, setAnimationEnabled, triggerGesture);

    // 2) Walk through the dynamic conversation turns.
    const turns = await convoPromise;
    const STAGE_BY_SPEAKER = {
      elon: STAGES.BACK_TO_ELON,
      penguin: STAGES.PENGUIN_ANS,
      punch: STAGES.PUNCH_REACT,
    };
    const LABEL_BY_SPEAKER = { elon: 'Elon', penguin: 'Penguin', punch: 'Punch' };

    for (const turn of turns) {
      setActiveCamera(CAMERA_BY_CHARACTER[turn.speaker]);
      setStage(STAGE_BY_SPEAKER[turn.speaker]);
      setSubtitle(LABEL_BY_SPEAKER[turn.speaker], turn.text);
      await speakWithAnim(turn.speaker, turn.text, setAnimationEnabled, triggerGesture);
    }

    clearSubtitle();
    setStage(STAGES.AWAITING_Q);
  }, [setActiveCamera, setStage, setSubtitle, clearSubtitle, setAnimationEnabled, triggerGesture]);

  // If the tab is hidden mid-speech, cancel so we don't come back to a
  // zombie utterance.
  useEffect(() => {
    const onVis = () => { if (document.hidden) cancelSpeech(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <>
      <Canvas
        gl={{
          antialias: true,
          preserveDrawingBuffer: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.02,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        style={{ position: 'fixed', inset: 0, background: '#000' }}
      >
        <Suspense fallback={null}>
          <Scene />
          <TVScreen src="/tv.mp4" />
        </Suspense>
      </Canvas>

      <LoadingScreen onEnter={handleStart} />
      <QuestionBox onSubmit={handleAsk} />
      <Subtitle />
      <TopBar />
      <DevPanel />
    </>
  );
}
