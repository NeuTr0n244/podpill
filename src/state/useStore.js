import { create } from 'zustand';

// We address the 3 embedded GLB cameras by INDEX (0, 1, 2) into the array
// that drei's useGLTF returns. Index is authoritative — name lookups have
// been flaky because some exporters reuse the same name on the node and on
// the camera child, causing collisions.
//
// Order in the current GLB file (from glb inspection):
//   0 -> "RenderCamera.001"   pos ~[0.90, 1.26, -0.97]
//   1 -> "RenderCamera.002"   pos ~[1.48, 1.14, -0.97]
//   2 -> "RenderCamera"       pos ~[0.03, 1.27,  1.02]   // confirmed Penguin
export const CAMERA_NAMES = ['RenderCamera.001', 'RenderCamera.002', 'RenderCamera'];

// TODO: user is still identifying which camera index is Elon / Punch.
// Camera index 2 is confirmed Penguin.
export const CAMERA_BY_CHARACTER = {
  elon: 0,    // index 0 until user confirms
  penguin: 2, // confirmed
  punch: 1,   // index 1 until user confirms
};

// Which animation plays while each character is *speaking*. Initial guess:
//   "mixamo.com"     -> Elon    (human rig, mixamo export)
//   "Take 01"        -> Penguin (Blender default name, 144 channels w/ mouth)
//   "mixamo.com.001" -> Punch   (second mixamo-rigged human/humanoid)
// User will correct this once they watch each anim play.
export const TALK_ANIM_BY_CHARACTER = {
  elon: 'mixamo.com',
  penguin: 'Take 01',
  punch: 'mixamo.com.001',
};

// Animations that loop permanently as background idle motion (subtle neck /
// arm / blink motions the user said are baked into the scene). These are
// always playing, regardless of who is speaking.
export const IDLE_ANIMS = ['Action', 'EmptyAction', 'Turnaround_Action'];

// Per-character timing on the original talk clip:
//   - pauseSec : time to pause at when silent (natural pose, not T-pose,
//                no motion).
//   - talkSec  : time to seek to when starting to speak.
// Plus the spine/chest bone name used by the breathing effect.
export const TIMING_BY_CHARACTER = {
  penguin: { pauseSec: 1.0, talkSec: 0.5, spineBone: 'spine.001_emperor_Arma' },
  elon:    { pauseSec: 2.0, talkSec: 1.0, spineBone: 'mixamorig:Spine1_016' },
  punch:   { pauseSec: 2.0, talkSec: 0.5, spineBone: 'mixamorig:Spine1' },
};

// Stages of the experience.
// idle_intro   -> Elon greets the user
// awaiting_q   -> question box is open, user types
// elon_asking  -> Elon speaks the user's question
// penguin_ans  -> Penguin (GPT) answers
// punch_react  -> Punch (GPT) reacts
// back_to_elon -> Elon wraps up, returns to awaiting_q
export const STAGES = {
  IDLE_INTRO: 'idle_intro',
  AWAITING_Q: 'awaiting_q',
  ELON_ASKING: 'elon_asking',
  PENGUIN_ANS: 'penguin_ans',
  PUNCH_REACT: 'punch_react',
  BACK_TO_ELON: 'back_to_elon',
};

export const useStore = create((set, get) => ({
  stage: STAGES.IDLE_INTRO,
  activeCamera: CAMERA_BY_CHARACTER.elon, // now an index (0, 1, or 2)
  subtitle: { speaker: '', text: '' },
  question: '',
  devCameraIndex: null, // when not null, overrides activeCamera (dev mode)
  exposure: 0.02,
  lightMultiplier: 0.25, // scales KHR_lights_punctual intensities
  // Per-animation enabled flag. Populated by <Scene/> once the GLB is loaded
  // so the DevPanel can toggle each one individually.
  animationEnabled: {},

  setStage: (stage) => set({ stage }),
  setActiveCamera: (name) => set({ activeCamera: name }),
  setSubtitle: (speaker, text) => set({ subtitle: { speaker, text } }),
  clearSubtitle: () => set({ subtitle: { speaker: '', text: '' } }),
  setQuestion: (q) => set({ question: q }),

  setExposure: (v) => set({ exposure: v }),
  setLightMultiplier: (v) => set({ lightMultiplier: v }),

  initAnimations: (names) => set((s) => {
    const next = { ...s.animationEnabled };
    names.forEach((n) => { if (!(n in next)) next[n] = false; });
    return { animationEnabled: next };
  }),
  toggleAnimation: (name) => set((s) => ({
    animationEnabled: { ...s.animationEnabled, [name]: !s.animationEnabled[name] },
  })),
  setAnimationEnabled: (name, enabled) => set((s) => ({
    animationEnabled: { ...s.animationEnabled, [name]: enabled },
  })),
  stopAllAnimations: () => set((s) => {
    const next = {};
    Object.keys(s.animationEnabled).forEach((k) => { next[k] = false; });
    return { animationEnabled: next };
  }),

  // Gesture trigger function. Populated by <Scene/> once the mixer and
  // sub-clip actions are ready. Call with e.g. triggerGesture('penguin','yes').
  triggerGesture: null,
  setTriggerGesture: (fn) => set({ triggerGesture: fn }),

  cycleDevCamera: () => {
    const cur = get().devCameraIndex;
    const next = cur === null ? 0 : (cur + 1) % CAMERA_NAMES.length;
    set({ devCameraIndex: next });
  },
  resetDevCamera: () => set({ devCameraIndex: null }),
}));
