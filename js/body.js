// 3D anatomy figure (Three.js). A stylised low-poly astronaut built from primitives:
// no external model file, so nothing to license and nothing to download.
//
// This module is replaceable (for example by a 2D SVG figure). The rest of the app only uses:
//   const body = createBody(container, { onSelect(systemId) {} });
//   body.setStatuses({ cardio: 'green' | 'yellow' | 'red', ... });
//   body.setSelected(systemId | null);
//   body.dispose();
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

// Healthy systems are a neutral colour; only systems that need attention are amber or red.
const COLORS = { green: 0xa9bbdd, yellow: 0xffa000, red: 0xff3344, none: 0x7f8fb5 };

export function createBody(container, { onSelect } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // throws if WebGL is missing
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.0, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.0;
  controls.maxDistance = 6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.zoomToCursor = true; // zoom toward the point under the mouse / between the fingers

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4cc9f0, 0.8);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  /* ----- translucent body shell ----- */
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x6fb7ff, transparent: true, opacity: 0.13, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide,
  });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x4cc9f0, wireframe: true, transparent: true, opacity: 0.07, depthWrite: false });
  const shell = new THREE.Group();
  scene.add(shell);

  function shellPart(geo, pos, scale = [1, 1, 1], rotZ = 0) {
    for (const mat of [shellMat, wireMat]) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.scale.set(...scale);
      mesh.rotation.z = rotZ;
      mesh.renderOrder = 2;
      shell.add(mesh);
    }
  }
  const sphere = (r) => new THREE.SphereGeometry(r, 20, 14);
  const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

  shellPart(sphere(0.125), [0, 1.62, 0], [1, 1.12, 1.05]);          // head
  shellPart(capsule(0.05, 0.06), [0, 1.46, 0]);                     // neck
  shellPart(capsule(0.16, 0.28), [0, 1.21, 0], [1.15, 1, 0.72]);    // chest
  shellPart(sphere(0.17), [0, 0.95, 0], [1.08, 0.72, 0.72]);        // pelvis
  for (const s of [-1, 1]) {
    shellPart(capsule(0.05, 0.52), [s * 0.275, 1.1, 0], [1, 1, 1], s * 0.14);  // arm
    shellPart(sphere(0.055), [s * 0.32, 0.77, 0], [0.8, 1.2, 0.6]);            // hand
    shellPart(capsule(0.072, 0.7), [s * 0.095, 0.46, 0]);                      // leg
    shellPart(sphere(0.07), [s * 0.095, 0.04, 0.05], [0.9, 0.55, 1.6]);        // foot
  }

  // Floor ring, for a "scanner" look.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.006, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  /* ----- organ systems ----- */
  const systems = {};   // id -> { material, meshes[], status }
  const pickables = []; // meshes that react to taps

  function system(id) {
    const material = new THREE.MeshStandardMaterial({ color: COLORS.none, emissive: COLORS.none, emissiveIntensity: 0.5, roughness: 0.45, transparent: true });
    systems[id] = { material, meshes: [], status: 'none', pulse: true };
    return systems[id];
  }
  function add(sys, id, geo, pos, scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geo, sys.material);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.userData = { system: id, base: mesh.scale.clone() };
    scene.add(mesh);
    sys.meshes.push(mesh);
    pickables.push(mesh);
    return mesh;
  }
  // Invisible, larger tap target for small organs (gloved fingers).
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  function hit(id, r, pos) {
    const mesh = new THREE.Mesh(sphere(r), hitMat);
    mesh.position.set(...pos);
    mesh.userData = { system: id };
    scene.add(mesh);
    pickables.push(mesh);
  }
  function bone(sys, a, b, r = 0.016) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 8), sys.material);
    mesh.position.copy(va).add(vb).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    mesh.userData = { system: 'bones' };
    scene.add(mesh);
    sys.meshes.push(mesh);
    pickables.push(mesh);
  }

  const brain = system('brain');
  add(brain, 'brain', sphere(0.085), [0, 1.655, -0.01], [1, 0.82, 1.12]);

  const eyes = system('eyes');
  for (const s of [-1, 1]) add(eyes, 'eyes', sphere(0.02), [s * 0.045, 1.6, 0.108]);
  hit('eyes', 0.06, [0, 1.6, 0.1]);

  const lungs = system('lungs');
  for (const s of [-1, 1]) add(lungs, 'lungs', sphere(0.07), [s * 0.09, 1.3, 0], [0.72, 1.45, 0.85]);

  const cardio = system('cardio');
  add(cardio, 'cardio', sphere(0.048), [0.025, 1.29, 0.055], [1, 1.15, 0.9]);
  hit('cardio', 0.07, [0.025, 1.29, 0.075]);

  const blood = system('blood');
  add(blood, 'blood', sphere(0.07), [-0.05, 1.09, 0.035], [1.35, 0.7, 0.85]); // liver
  add(blood, 'blood', sphere(0.032), [0.1, 1.09, 0.0]);                        // spleen
  add(blood, 'blood', sphere(0.03), [0.03, 1.03, 0.04], [1.8, 0.6, 0.8]);      // pancreas
  hit('blood', 0.11, [0, 1.07, 0.05]);

  const bones = system('bones');
  bones.pulse = false; // long thin parts: pulse with glow only, not with size
  bone(bones, [0, 0.93, -0.075], [0, 1.5, -0.075], 0.02);               // spine
  bone(bones, [-0.2, 1.4, -0.02], [0.2, 1.4, -0.02], 0.013);            // collarbones
  bone(bones, [-0.13, 0.93, -0.02], [0.13, 0.93, -0.02], 0.028);        // pelvis
  for (const s of [-1, 1]) {
    bone(bones, [s * 0.235, 1.38, 0], [s * 0.275, 1.1, 0]);             // upper arm
    bone(bones, [s * 0.275, 1.08, 0], [s * 0.315, 0.82, 0], 0.013);     // forearm
    bone(bones, [s * 0.095, 0.9, 0], [s * 0.095, 0.5, 0], 0.02);        // thigh
    bone(bones, [s * 0.095, 0.47, 0], [s * 0.095, 0.08, 0], 0.017);     // shin
  }
  for (const y of [1.2, 1.27, 1.34]) {                                   // ribs
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.007, 6, 28), bones.material);
    rib.position.set(0, y, 0);
    rib.rotation.x = Math.PI / 2;
    rib.scale.set(1.08, 0.68, 1);
    rib.userData = { system: 'bones' };
    scene.add(rib);
    bones.meshes.push(rib);
  }

  /* ----- interaction ----- */
  let selected = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;

  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 8) return; // it was a drag (rotate), not a tap
    const rect = el.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length && onSelect) onSelect(hits[0].object.userData.system);
  });

  function applyLook() {
    for (const [id, sys] of Object.entries(systems)) {
      const c = COLORS[sys.status] || COLORS.none;
      sys.material.color.setHex(c);
      sys.material.emissive.setHex(c);
      sys.material.opacity = selected && selected !== id ? 0.3 : 1;
    }
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole figure in view on narrow (portrait) screens.
    camera.fov = camera.aspect < 0.7 ? 42 : 32;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!container.offsetParent) return; // hidden view: do not render
    const time = clock.getElapsedTime();
    const beat = 0.5 + 0.5 * Math.sin(time * 6);
    for (const [id, sys] of Object.entries(systems)) {
      const red = sys.status === 'red';
      const base = selected === id ? 0.95 : 0.5;
      sys.material.emissiveIntensity = red ? 0.4 + 0.9 * beat : base;
      if (sys.pulse) {
        const k = red ? 1 + 0.09 * beat : 1;
        for (const mesh of sys.meshes) mesh.scale.copy(mesh.userData.base).multiplyScalar(k);
      }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  applyLook();

  return {
    resetView() {
      controls.autoRotate = false;
      controls.target.set(0, 0.9, 0);
      camera.position.set(0, 1.0, 3.2);
      controls.update();
    },
    setStatuses(map) {
      for (const id of Object.keys(systems)) systems[id].status = (map && map[id]) || 'none';
      applyLook();
    },
    setSelected(id) {
      selected = id || null;
      applyLook();
    },
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
