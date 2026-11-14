// Detailed 3D anatomy (Three.js + GLTFLoader + Meshopt).
//
// Models: Z-Anatomy (github.com/LluisV/Z-Anatomy), derived from BodyParts3D (DBCLS), CC BY-SA 4.0.
// Converted, compressed and simplified; colours are applied here at runtime. See assets/model/NOTICE.md.
//
// Same interface as the simple figure in js/body.js, plus layers:
//   const body = createBody(container, { onSelect(systemId, structureName), onProgress(info), onLayers(list), onSlow() });
//   body.setStatuses({ cardio: 'green' | 'yellow' | 'red', ... });
//   body.setSelected(systemId | null);      // also loads the layer that shows this system
//   body.setLayer(layerId, on);             // loads the file the first time a layer is switched on
//   body.getLayers();  body.dispose();
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/libs/meshopt_decoder.module.js';

const MODEL_DIR = 'assets/model/';
const COLORS = { green: 0x2ee59d, yellow: 0xffc93c, red: 0xff4d5e, none: 0x8fa3cc };

// The first two layers load at start; the others load when their button is switched on.
export const LAYERS = [
  { id: 'visceral', file: 'VisceralSystem100.glb', bytes: 1280484, initial: true },
  { id: 'cardio', file: 'CardioVascular41.glb', bytes: 2960232, initial: true },
  { id: 'skeletal', file: 'SkeletalSystem100.glb', bytes: 4159376 },
  { id: 'muscular', file: 'MuscularSystem100.glb', bytes: 3763844 },
  { id: 'nervous', file: 'NervousSystem100.glb', bytes: 3485808 },
];

// Which layer has to be visible to see each health system.
export const SYSTEM_LAYER = { cardio: 'cardio', lungs: 'visceral', blood: 'visceral', bones: 'skeletal', brain: 'nervous', eyes: 'nervous' };

/* ----- structure name -> health system ----- */
const EYE = /eyeball|retina|sclera|vitreous|\blens\b|\biris\b|cornea|zonular|lacrimal|choroid|ciliary|conjunctiva|optic (nerve|chiasm|tract)/;
const AIRWAY = /lung|bronch|trachea|larynx|laryng|epiglott/;

export function systemOf(layerId, name) {
  const n = name.toLowerCase();
  if (layerId === 'cardio') return 'cardio';                         // heart, arteries, veins
  if (layerId === 'skeletal' || layerId === 'muscular') return 'bones'; // bones, joints, muscles
  if (layerId === 'nervous') return EYE.test(n) ? 'eyes' : 'brain';  // brain, spinal cord, nerves; eye structures
  return AIRWAY.test(n) ? 'lungs' : 'blood';                         // lungs and airways; other organs = immunity / metabolism
}

// Helper meshes and covering surfaces that would hide the organs underneath.
const HIDE = {
  // (reproductive organs are left out: they are not part of the six health systems shown here)
  visceral: /^vh_f_|^pleura$|omentum|penis|testis|epididymis|deferens|seminal|ejaculatory|prostate|scrotum|spermatic|bulbo-?urethral|corpus (cavernosum|spongiosum)/,
  cardio: /pericardium/,
  skeletal: /\.(o|e)\d*[lr]?$/,   // muscle origin / insertion markers
  muscular: /\bfascia\b|aponeurosis|retinaculum|sheath|bursa|septum/,
  nervous: /falx|tentorium|dura|arachnoid/,
};

export function createBody(container, { onSelect, onProgress, onLayers, onSlow } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); // throws without WebGL
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  camera.position.set(0, 0.9, 3.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 0.25;
  controls.maxDistance = 7;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4cc9f0, 0.9);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.005, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // One shared material per health system: changing a status recolours every structure of that system.
  // Muscles get a second, see-through material so they do not hide the organs underneath.
  const newMaterial = () => new THREE.MeshStandardMaterial({ color: COLORS.none, emissive: COLORS.none, emissiveIntensity: 0.18, roughness: 0.55, transparent: true, side: THREE.DoubleSide, forceSinglePass: true });
  const systems = {};
  for (const id of ['cardio', 'lungs', 'brain', 'bones', 'eyes', 'blood']) {
    systems[id] = { status: 'none', material: newMaterial(), soft: id === 'bones' ? newMaterial() : null };
  }

  const layers = {}; // id -> { on, loaded, loading, group }
  for (const def of LAYERS) layers[def.id] = { ...def, on: !!def.initial, loaded: false, loading: false, group: null };

  let selected = null;
  let dirty = true;       // something changed: draw a frame
  let disposed = false;
  let fitted = false;
  const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);

  const layerList = () => LAYERS.map((d) => ({ id: d.id, on: layers[d.id].on, loaded: layers[d.id].loaded, loading: layers[d.id].loading }));
  const notifyLayers = () => { if (onLayers) onLayers(layerList()); };

  /* ----- loading ----- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  // Build one mesh per health system from the hundreds of small structures in a file.
  // The files store positions as compressed integers with a transform per structure. Here they are unpacked
  // into plain numbers in world space and joined, so a layer is drawn with a few draw calls instead of hundreds.
  // The structure names are kept as index ranges, so a tap can still name what was hit.
  function prepare(layer, root) {
    const hide = HIDE[layer.id];
    root.updateMatrixWorld(true);
    const parts = {}; // system -> [{ mesh, name }]
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      // GLTFLoader strips dots and spaces from node names; the original name is kept in userData.
      const name = obj.userData.name || (obj.parent && obj.parent.userData.name) || obj.name || '';
      if (hide && hide.test(name.toLowerCase())) return;
      const system = systemOf(layer.id, name);
      (parts[system] = parts[system] || []).push({ mesh: obj, name });
    });

    const group = new THREE.Group();
    const v = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    for (const [system, list] of Object.entries(parts)) {
      let vertCount = 0, indexCount = 0;
      for (const { mesh } of list) {
        const g = mesh.geometry;
        vertCount += g.attributes.position.count;
        indexCount += g.index ? g.index.count : g.attributes.position.count;
      }
      const positions = new Float32Array(vertCount * 3);
      const normals = new Float32Array(vertCount * 3);
      const indices = new Uint32Array(indexCount);
      const ranges = []; // [{ start, name }] sorted by start index
      let vo = 0, io = 0, hasNormals = true;
      for (const { mesh, name } of list) {
        const g = mesh.geometry;
        const pos = g.attributes.position;
        const nor = g.attributes.normal;
        const m = mesh.matrixWorld;
        normalMatrix.getNormalMatrix(m);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m);
          positions[(vo + i) * 3] = v.x; positions[(vo + i) * 3 + 1] = v.y; positions[(vo + i) * 3 + 2] = v.z;
          if (nor) {
            v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
            normals[(vo + i) * 3] = v.x; normals[(vo + i) * 3 + 1] = v.y; normals[(vo + i) * 3 + 2] = v.z;
          }
        }
        if (!nor) hasNormals = false;
        ranges.push({ start: io, name });
        const flip = m.determinant() < 0; // mirrored structure: keep triangles facing outward
        const count = g.index ? g.index.count : pos.count;
        for (let i = 0; i < count; i += 3) {
          const a = g.index ? g.index.getX(i) : i;
          const b = g.index ? g.index.getX(i + 1) : i + 1;
          const c = g.index ? g.index.getX(i + 2) : i + 2;
          indices[io + i] = vo + a;
          indices[io + i + 1] = vo + (flip ? c : b);
          indices[io + i + 2] = vo + (flip ? b : c);
        }
        vo += pos.count;
        io += count;
        g.dispose();
        if (mesh.material && mesh.material.dispose) mesh.material.dispose();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      if (hasNormals) geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      else geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      const merged = new THREE.Mesh(geometry, layer.id === 'muscular' ? systems[system].soft : systems[system].material);
      merged.userData = { system, ranges };
      group.add(merged);
    }
    return group;
  }

  // Name of the structure that owns a triangle of a merged mesh.
  function structureAt(mesh, faceIndex) {
    const ranges = mesh.userData.ranges;
    const index = faceIndex * 3;
    let lo = 0, hi = ranges.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ranges[mid].start <= index) lo = mid; else hi = mid - 1;
    }
    if (!ranges[lo]) return '';
    // "Kidney.l" -> "Kidney (left)"; drop the numeric suffixes the loader adds to repeated names.
    return ranges[lo].name.replace(/_\d+$/, '').replace(/\.l$/, ' (left)').replace(/\.r$/, ' (right)');
  }

  // Frame the whole body once the first full-height layer (vessels) is in.
  function fit(group) {
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(size.y / 2 / Math.tan(vFov / 2), size.x / 2 / Math.tan(hFov / 2)) * 1.12;
    controls.target.copy(center);
    camera.position.set(center.x, center.y, center.z + dist);
    ring.position.set(center.x, box.min.y, center.z);
    fitted = true;
  }

  function load(id) {
    const layer = layers[id];
    if (layer.loaded || layer.loading) return;
    layer.loading = true;
    notifyLayers();
    const report = (ratio) => { if (onProgress) onProgress({ layer: id, ratio: Math.max(0, Math.min(1, ratio)) }); };
    report(0);
    loader.load(
      MODEL_DIR + layer.file,
      (gltf) => {
        if (disposed) return;
        layer.group = prepare(layer, gltf.scene);
        layer.group.visible = layer.on;
        scene.add(layer.group);
        layer.loaded = true;
        layer.loading = false;
        if (!fitted && (id === 'cardio' || id === 'skeletal' || id === 'muscular')) fit(layer.group);
        if (onProgress) onProgress({ layer: id, ratio: 1, done: true });
        notifyLayers();
        invalidate();
      },
      (xhr) => report(xhr.loaded / (xhr.total || layer.bytes)),
      () => {
        layer.loading = false;
        layer.on = false;
        if (onProgress) onProgress({ layer: id, error: true });
        notifyLayers();
      }
    );
  }

  function setLayer(id, on) {
    const layer = layers[id];
    if (!layer) return;
    layer.on = on;
    if (on && !layer.loaded) load(id);
    if (layer.group) layer.group.visible = on;
    notifyLayers();
    invalidate();
  }

  /* ----- look ----- */
  function applyLook() {
    for (const [id, sys] of Object.entries(systems)) {
      const c = COLORS[sys.status] || COLORS.none;
      sys.material.color.setHex(c);
      sys.material.emissive.setHex(c);
      const ghost = selected && selected !== id;
      sys.material.opacity = ghost ? 0.1 : 1;
      if (sys.material.transparent !== !!ghost) { sys.material.transparent = !!ghost; sys.material.needsUpdate = true; }
      sys.material.depthWrite = !ghost;
      sys.material.emissiveIntensity = selected === id ? 0.45 : 0.18;
      if (sys.soft) {
        sys.soft.color.setHex(c);
        sys.soft.emissive.setHex(c);
        sys.soft.opacity = ghost ? 0.05 : selected === id ? 0.55 : 0.22;
        sys.soft.depthWrite = false;
      }
    }
    invalidate();
  }

  /* ----- picking ----- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 8) return; // a drag rotates; only a tap selects
    const rect = el.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const groups = Object.values(layers).filter((l) => l.group && l.on).map((l) => l.group);
    const hits = raycaster.intersectObjects(groups, true).filter((h) => h.object.userData.system);
    if (!hits.length) return;
    // Prefer the first structure that is not ghosted.
    const hit = hits.find((h) => !selected || h.object.userData.system === selected) || hits[0];
    if (onSelect) onSelect(hit.object.userData.system, structureAt(hit.object, hit.faceIndex));
  });

  /* ----- size and render loop ----- */
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let raf = 0;
  let lastPulse = 0;
  let slowFrames = 0, timedFrames = 0, slowReported = false, lastFrame = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!container.offsetParent) { lastFrame = 0; return; } // hidden view: do nothing
    const moving = controls.update();

    // Red systems pulse (glow only). About 30 updates a second is enough.
    const anyRed = Object.values(systems).some((s) => s.status === 'red');
    if (anyRed && now - lastPulse > 33) {
      lastPulse = now;
      const beat = 0.5 + 0.5 * Math.sin(now / 160);
      for (const sys of Object.values(systems)) if (sys.status === 'red') sys.material.emissiveIntensity = 0.15 + 0.75 * beat;
      dirty = true;
    }
    if (!moving && !dirty) { lastFrame = 0; return; } // nothing changed: save battery
    dirty = false;
    renderer.render(scene, camera);

    // Watch the frame time while the figure is moving; tell the app if this device is too slow.
    if (moving && lastFrame) {
      timedFrames++;
      const dt = now - lastFrame;
      if (dt > 66 && dt < 400 && !document.hidden) slowFrames++; // slower than 15 frames a second (longer gaps = tab in background)
      if (timedFrames === 90) {
        if (!slowReported && slowFrames > 45 && onSlow) { slowReported = true; onSlow(); }
        timedFrames = 0; slowFrames = 0;
      }
    }
    lastFrame = now;
  }
  raf = requestAnimationFrame(frame);

  applyLook();
  LAYERS.filter((d) => d.initial).forEach((d) => load(d.id));
  notifyLayers();

  return {
    detailed: true,
    setStatuses(map) {
      for (const id of Object.keys(systems)) systems[id].status = (map && map[id]) || 'none';
      applyLook();
    },
    setSelected(id) {
      if ((id || null) === selected) return;
      selected = id || null;
      // Show the layer this system lives in (loads it the first time).
      const need = selected && SYSTEM_LAYER[selected];
      if (need && !layers[need].on) setLayer(need, true);
      applyLook();
    },
    setLayer,
    getLayers: layerList,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); });
      Object.values(systems).forEach((s) => { s.material.dispose(); if (s.soft) s.soft.dispose(); });
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
