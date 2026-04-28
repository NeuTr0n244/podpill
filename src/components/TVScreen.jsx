import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Plays a looping, muted video on the scene's TV_Screen mesh.
// Approach: the TV_Screen's UVs in the GLB are non-standard, which was
// causing stretching and repetition. Instead of remapping the texture,
// we (1) paint the original TV mesh solid black (becomes the bezel), and
// (2) add a new child plane sized to the video's aspect ratio, fit inside
// the TV's bounding box. Clean, no UV hacks.
export default function TVScreen({ src = '/tv.mp4', meshName = 'TV_Screen' }) {
  const scene = useThree((s) => s.scene);

  const { texture, video } = useMemo(() => {
    const v = document.createElement('video');
    v.src = src;
    v.crossOrigin = 'anonymous';
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.play().catch((e) => console.warn('[TVScreen] autoplay failed:', e.message));

    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = true;
    return { texture: t, video: v };
  }, [src]);

  useEffect(() => {
    if (!scene) return;

    let tv = null;
    scene.traverse((o) => { if (o.isMesh && o.name === meshName) tv = o; });
    if (!tv) { console.warn(`[TVScreen] mesh "${meshName}" not found`); return; }

    // Local bbox tells us the TV's physical dimensions regardless of scene rotation.
    tv.geometry.computeBoundingBox();
    const bbox = tv.geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // The smallest axis is "depth" (perpendicular to the screen face).
    // The two larger axes are width × height of the face.
    const dims = [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => a[1] - b[1]);
    const depthAxis = dims[0][0];
    const wAxis = dims[2][0];
    const hAxis = dims[1][0];
    const tvW = dims[2][1];
    const tvH = dims[1][1];

    // Fit the video's 16:9 aspect inside the TV bounds (letterbox as needed).
    const videoAspect = 16 / 9;
    const tvAspect = tvW / tvH;
    const [vidW, vidH] = videoAspect > tvAspect
      ? [tvW * 0.98, (tvW * 0.98) / videoAspect]
      : [tvH * 0.98 * videoAspect, tvH * 0.98];

    // Paint the TV bezel solid black (covers up the previous video mess).
    const originalMat = tv.material;
    tv.material = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });

    // Build the video plane as a CHILD of TV_Screen so it inherits the TV's
    // world transform automatically.
    const planeGeom = new THREE.PlaneGeometry(vidW, vidH);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    // Mirror horizontally — the TV mesh's UV winding made the video show up
    // left-right reversed.
    plane.scale.x = -1;

    // Align plane's +Z normal to the TV's depth axis.
    if (depthAxis === 'x') plane.rotation.y = Math.PI / 2;
    else if (depthAxis === 'y') plane.rotation.x = -Math.PI / 2;

    // Put it at the TV face center, slightly forward along the depth axis
    // so it doesn't z-fight with the black bezel.
    plane.position.copy(center);
    plane.position[depthAxis] -= 0.05; // in front of the TV face

    tv.add(plane);
    console.log('[TVScreen] TV bbox size:', size.toArray());
    console.log('[TVScreen] TV bbox center:', center.toArray());
    console.log('[TVScreen] depth axis:', depthAxis, 'width:', wAxis, 'height:', hAxis);
    console.log('[TVScreen] plane size:', vidW, vidH, 'position:', plane.position.toArray());
    console.log('[TVScreen] plane world pos:', plane.getWorldPosition(new THREE.Vector3()).toArray());
    console.log('[TVScreen] tv scale:', tv.scale.toArray(), 'world scale:', tv.getWorldScale(new THREE.Vector3()).toArray());

    return () => {
      tv.remove(plane);
      planeGeom.dispose();
      planeMat.dispose();
      tv.material = originalMat;
      try { video.pause(); } catch {}
      texture.dispose();
    };
  }, [scene, texture, video, meshName]);

  return null;
}
