import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, CAMERA_NAMES, TALK_ANIM_BY_CHARACTER, TIMING_BY_CHARACTER } from '../state/useStore.js';

// Live-update the renderer's tone-mapping exposure from the store.
function ExposureController() {
  const gl = useThree((s) => s.gl);
  const exposure = useStore((s) => s.exposure);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

// In production the 445MB GLB is hosted on Cloudflare R2 (set VITE_GLB_URL).
// In development it falls back to /public/podcastelon.glb.
const GLB_URL = import.meta.env.VITE_GLB_URL || '/podcastelon.glb';
useGLTF.preload(GLB_URL);

export default function Scene() {
  const { scene, animations, cameras } = useGLTF(GLB_URL);
  const { actions, names, mixer } = useAnimations(animations, scene);
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);

  const activeCamera = useStore((s) => s.activeCamera);
  const devCameraIndex = useStore((s) => s.devCameraIndex);

  // Collect all cameras from the scene graph by traversal (so we get the
  // actual in-scene camera objects with proper parent transforms), and sort
  // them deterministically by name so index 0/1/2 maps consistently to
  // "RenderCamera.001" / "RenderCamera.002" / "RenderCamera".
  const camerasByIndex = useMemo(() => {
    const found = new Map();
    scene.traverse((obj) => {
      if (obj.isCamera) {
        // Prefer the node's name over the camera's internal name — with this
        // exporter the node is what carries the unique label.
        const name = obj.name || obj.parent?.name || '';
        if (!found.has(name)) found.set(name, obj);
      }
    });
    const ordered = CAMERA_NAMES
      .map((n) => found.get(n))
      .filter(Boolean);
    // Fallback: if names didn't match, just use traversal order.
    if (ordered.length < CAMERA_NAMES.length) {
      return Array.from(found.values());
    }
    return ordered;
  }, [scene]);

  // Cache the original light intensities once so we can rescale them live
  // without losing the authored values.
  const originalIntensities = useRef(new WeakMap());
  const lightMultiplier = useStore((s) => s.lightMultiplier);
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isLight) {
        if (!originalIntensities.current.has(obj)) {
          originalIntensities.current.set(obj, obj.intensity);
        }
        obj.intensity = originalIntensities.current.get(obj) * lightMultiplier;
      }
    });
  }, [scene, lightMultiplier]);

  // The GLB camera "meshes" for softboxes / ambient fill panels represent
  // physical lights from the Blender scene. They were invisible to the camera
  // in the original render (Blender's "ray visibility > camera" flag) but
  // glTF has no such flag, so they show up as giant white rectangles in our
  // frame. Real lighting still comes from the KHR_lights_punctual entries,
  // so we just hide the visual proxies.
  useMemo(() => {
    const HIDE_PREFIXES = ['KEY_', 'FILL_', 'ACCENT_', 'TV_Glow_Boost'];
    scene.traverse((obj) => {
      if (!obj.name) return;
      if (HIDE_PREFIXES.some((p) => obj.name.startsWith(p))) {
        obj.visible = false;
      }
    });
  }, [scene]);

  useEffect(() => {
    console.log('[Scene] cameras found:', camerasByIndex.length);
    camerasByIndex.forEach((c, i) => {
      const wp = new THREE.Vector3();
      c.getWorldPosition(wp);
      console.log(`  [${i}] name="${c.name || '(unnamed)'}" worldPos=`, wp.toArray().map((v) => +v.toFixed(2)));
    });
    console.log('[Scene] available animations:', names);
  }, [camerasByIndex, names]);

  // Pick which camera to use: dev override wins, otherwise the stage-driven
  // activeCamera from the store (an index 0..2).
  const targetIndex = devCameraIndex !== null ? devCameraIndex : activeCamera;
  const targetCam = camerasByIndex[targetIndex];

  useEffect(() => {
    if (!targetCam) return;
    // Adapt the camera's aspect to the actual canvas size. This preserves the
    // vertical fov from the GLB (character height in frame stays correct)
    // and just shows more/less horizontal content. Softbox meshes are hidden
    // above, so widening the frustum no longer pulls light rigs into view.
    targetCam.aspect = size.width / Math.max(1, size.height);
    targetCam.updateProjectionMatrix();
    set({ camera: targetCam });
    const wp = new THREE.Vector3();
    targetCam.getWorldPosition(wp);
    console.log('[Scene] -> active camera idx', targetIndex, 'name="' + (targetCam.name || '?') + '" worldPos=', wp.toArray().map((v) => +v.toFixed(2)));
  }, [targetCam, targetIndex, set, size.width, size.height]);

  // Register the animation names in the store so the DevPanel can show
  // toggles. Default state is "all paused" — the user toggles the ones they
  // want to play while identifying which anim drives which character.
  const initAnimations = useStore((s) => s.initAnimations);
  useEffect(() => {
    if (!names) return;
    initAnimations(names);
  }, [names, initAnimations]);

  // Simple, stable animation policy:
  //   - One original action per character (mixamo.com / mixamo.com.001 / Take 01)
  //   - Paused at a natural pose (pauseSec) when silent
  //   - Unpaused + playing from talkSec when speaking
  //   - No gestures (yes/no sub-clips caused too many issues; skip for now)
  //   - Action time is only modified on TRANSITIONS (idle<->speaking) so
  //     nothing gets restarted by unrelated re-renders.
  const animationEnabled = useStore((s) => s.animationEnabled);
  const prevSpeakingRef = useRef({});

  useEffect(() => {
    if (!actions) return;

    // Disable the NEW split clips (they exist in the GLB but their bindings
    // aren't driving the skeleton for some reason — we use the original
    // full-length action instead, which is known-working).
    for (const character of ['penguin', 'elon', 'punch']) {
      for (const key of ['idle', 'talk', 'yes', 'no']) {
        const a = actions[`${character}_${key}`];
        if (a) { a.stop(); a.enabled = false; }
      }
    }

    for (const [character, cfg] of Object.entries(TIMING_BY_CHARACTER)) {
      const talkName = TALK_ANIM_BY_CHARACTER[character];
      const action = actions[talkName];
      if (!action) continue;

      const speaking = !!animationEnabled[talkName];
      const prev = prevSpeakingRef.current[character];
      const firstRun = prev === undefined;

      action.enabled = true;
      action.timeScale = 1.0;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      if (!action.isRunning()) action.play();

      if (firstRun) {
        if (speaking) {
          action.time = cfg.talkSec;
          action.paused = false;
        } else {
          action.time = cfg.pauseSec;
          action.paused = true;
        }
      } else if (!prev && speaking) {
        action.time = cfg.talkSec;
        action.paused = false;
        console.log(`[anim] ${character} START speaking, loop=Repeat, time=${action.time.toFixed(2)}s, dur=${action.getClip().duration.toFixed(2)}s`);
      } else if (prev && !speaking) {
        action.paused = true;
        console.log(`[anim] ${character} STOP speaking, froze at time=${action.time.toFixed(2)}s`);
      }

      prevSpeakingRef.current[character] = speaking;
    }

    // Dev-only clips (Action / EmptyAction / Turnaround_Action) — honor
    // the checkbox in DevPanel.
    const reserved = new Set([
      ...Object.values(TALK_ANIM_BY_CHARACTER),
      'penguin_idle', 'penguin_talk', 'penguin_yes', 'penguin_no',
      'elon_idle', 'elon_talk', 'elon_yes', 'elon_no',
      'punch_idle', 'punch_talk', 'punch_yes', 'punch_no',
    ]);
    for (const [name, action] of Object.entries(actions)) {
      if (!action || reserved.has(name)) continue;
      const manuallyOn = !!animationEnabled[name];
      const alreadyPlaying = action.isRunning() && !action.paused;
      if (manuallyOn && !alreadyPlaying) {
        action.reset().play();
        action.timeScale = 1.0;
      } else if (!manuallyOn && alreadyPlaying) {
        action.stop();
      }
    }
  }, [actions, animationEnabled]);

  // Gesture trigger is a no-op (gestures disabled to avoid bugs)
  const setTriggerGesture = useStore((s) => s.setTriggerGesture);
  useEffect(() => {
    setTriggerGesture(() => {});
  }, [setTriggerGesture]);

  // Breathing — find each character's spine/chest bone and apply a subtle
  // scale pulse every frame AFTER the mixer. We snapshot the rest scale on
  // first sight and SET the scale each frame (not multiply) — otherwise it
  // accumulates if the animation doesn't write scale (mixer overwrites only
  // what's keyed, and spine bones typically have no scale track).
  const spineBonesRef = useRef({});
  const spineRestScaleRef = useRef({});
  const spinePhaseRef = useRef({});
  useEffect(() => {
    if (!scene) return;
    for (const [character, cfg] of Object.entries(TIMING_BY_CHARACTER)) {
      const bareName = cfg.spineBone.replace(/[.:]/g, '');
      scene.traverse((obj) => {
        if (!obj.isBone || spineBonesRef.current[character]) return;
        if (obj.name === cfg.spineBone || obj.name === bareName || obj.name.replace(/[.:]/g, '') === bareName) {
          spineBonesRef.current[character] = obj;
          spineRestScaleRef.current[character] = obj.scale.clone();
          spinePhaseRef.current[character] = Math.random() * Math.PI * 2;
          console.log(`[breath] ${character} spine:`, obj.name, 'rest scale:', obj.scale.toArray());
        }
      });
    }
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const character of Object.keys(TIMING_BY_CHARACTER)) {
      const bone = spineBonesRef.current[character];
      const rest = spineRestScaleRef.current[character];
      if (!bone || !rest) continue;
      // 1 breath per ~3s, amplitude ~1.5%
      const phase = t * (2 * Math.PI / 3) + (spinePhaseRef.current[character] || 0);
      const k = 1 + Math.sin(phase) * 0.015;
      bone.scale.set(rest.x * k, rest.y * k, rest.z * k);
    }
  });

  return (
    <>
      <ExposureController />
      <primitive object={scene} />
    </>
  );
}
