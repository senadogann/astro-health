// Plain-language name for a structure tapped on the 3D model.
// "Distal phalanx of second finger of hand.l" -> "Left hand · Index finger" + tissue "Bone".
//
// 1. The side comes from the ".l" / ".r" suffix of the model's structure names.
// 2. The body region and, for hands and feet, the finger come from keywords in the anatomical name.
// 3. If no keyword matches, the region is estimated from where the tap hit the body (height and distance from
//    the midline), using standard adult body proportions. This is only a coarse fallback.
import { getLang } from './i18n.js';

const W = {
  head: ['Head', 'Baş'], face: ['Face', 'Yüz'], eye: ['Eye', 'Göz'], ear: ['Ear', 'Kulak'], mouth: ['Mouth', 'Ağız'],
  nose: ['Nose', 'Burun'], brain: ['Brain', 'Beyin'], neck: ['Neck', 'Boyun'], throat: ['Throat', 'Boğaz'],
  chest: ['Chest', 'Göğüs'], back: ['Back', 'Sırt'], spine: ['Spine', 'Omurga'], abdomen: ['Abdomen', 'Karın'],
  pelvis: ['Pelvis and hip', 'Leğen ve kalça'], shoulder: ['Shoulder', 'Omuz'], upperArm: ['Upper arm', 'Üst kol'],
  elbow: ['Elbow', 'Dirsek'], forearm: ['Forearm', 'Ön kol'], wrist: ['Wrist', 'El bileği'], hand: ['Hand', 'El'],
  thigh: ['Thigh', 'Uyluk'], knee: ['Knee', 'Diz'], leg: ['Lower leg', 'Baldır'], ankle: ['Ankle', 'Ayak bileği'],
  foot: ['Foot', 'Ayak'], arm: ['Arm', 'Kol'], body: ['Body', 'Gövde'],
  // tissues
  bone: ['Bone', 'Kemik'], cartilage: ['Cartilage', 'Kıkırdak'], tooth: ['Tooth', 'Diş'], muscle: ['Muscle', 'Kas'],
  tendon: ['Tendon', 'Tendon'], artery: ['Artery', 'Atardamar'], vein: ['Vein', 'Toplardamar'], heart: ['Heart tissue', 'Kalp dokusu'],
  nerve: ['Nerve', 'Sinir'], brainTissue: ['Brain', 'Beyin dokusu'], cord: ['Spinal cord', 'Omurilik'], eyeTissue: ['Eye', 'Göz yapısı'],
  organ: ['Organ', 'Organ'], airway: ['Airway', 'Hava yolu'],
  // sides
  left: ['Left', 'Sol'], right: ['Right', 'Sağ'],
  // fingers and toes
  thumb: ['Thumb', 'Başparmak'], index: ['Index finger', 'İşaret parmağı'], middle: ['Middle finger', 'Orta parmak'],
  ring: ['Ring finger', 'Yüzük parmağı'], little: ['Little finger', 'Serçe parmak'], fingers: ['Fingers', 'Parmaklar'],
  bigToe: ['Big toe', 'Ayak başparmağı'], toe2: ['Second toe', '2. ayak parmağı'], toe3: ['Third toe', '3. ayak parmağı'],
  toe4: ['Fourth toe', '4. ayak parmağı'], littleToe: ['Little toe', 'Serçe ayak parmağı'], toes: ['Toes', 'Ayak parmakları'],
  movesFingers: ['moves the fingers', 'parmakları hareket ettirir'], movesThumb: ['moves the thumb', 'başparmağı hareket ettirir'],
  movesToes: ['moves the toes', 'ayak parmaklarını hareket ettirir'],
  // organs
  liver: ['Liver', 'Karaciğer'], stomach: ['Stomach', 'Mide'], spleen: ['Spleen', 'Dalak'], pancreas: ['Pancreas', 'Pankreas'],
  kidney: ['Kidney', 'Böbrek'], adrenal: ['Adrenal gland', 'Böbreküstü bezi'], bladder: ['Urinary bladder', 'İdrar kesesi'],
  gallbladder: ['Gallbladder', 'Safra kesesi'], esophagus: ['Oesophagus', 'Yemek borusu'], smallIntestine: ['Small intestine', 'İnce bağırsak'],
  largeIntestine: ['Large intestine', 'Kalın bağırsak'], lung: ['Lung', 'Akciğer'], bronchus: ['Bronchus', 'Bronş'],
  trachea: ['Trachea', 'Soluk borusu'], larynx: ['Larynx', 'Gırtlak'], thyroid: ['Thyroid gland', 'Tiroid bezi'],
  salivary: ['Salivary gland', 'Tükürük bezi'], tongue: ['Tongue', 'Dil'], ureter: ['Ureter', 'Üreter'], urethra: ['Urethra', 'Üretra'],
  heartOrgan: ['Heart', 'Kalp'],
};
const w = (key) => (W[key] ? W[key][getLang() === 'tr' ? 1 : 0] : key);

const PAIRED = ['eye', 'ear', 'shoulder', 'upperArm', 'elbow', 'forearm', 'wrist', 'hand', 'thigh', 'knee', 'leg', 'ankle', 'foot', 'arm'];
const ORDINAL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
// Names without a side suffix that still belong to one side of the body.
const PAIRED_HINT = /phalan|finger|toe|metacarp|metatars/i;
const FINGER = [null, 'thumb', 'index', 'middle', 'ring', 'little'];
const TOE = [null, 'bigToe', 'toe2', 'toe3', 'toe4', 'littleToe'];

// [pattern, region] — checked in order, first match wins. Names are lower case, side suffix removed.
const RULES = [
  // specific names that the broader rules below would miss or misplace
  [/ophthalm|rectus muscle|oblique muscle|common tendinous ring|trochlea of superior|abducens|levator palpebrae/, 'eye'],
  [/olfactory/, 'nose'],
  [/hypophys|pineal|commissure|culmen|cuneus|declive|flocculus|vermis|habenula|geniculate|mamillary|\bolive\b|septal nuclei|interpeduncular|lat_fis|basilar|communicating artery|striate|pontine|frontobasal|choroid plexus|intermediate substance/, 'brain'],
  [/meningeal|cavernous sinus|intercavernous|petrosal sinus|sagittal sinus|trigeminal|corrugator|depressor (anguli|labii|septi)|levator (anguli|labii)|risorius|mentalis|bucinator|buccal|pterygoid|angular (artery|vein)|sphenoid/, 'head'],
  [/genioglossus|hyoglossus/, 'mouth'],
  [/accessory nerve|hypoglossal|corniculate/, 'neck'],
  [/axis \(c2|cauda equina|fasciculus|sympathetic trunk|levatores .*costarum/, 'spine'],
  [/palmaris|common interosseous/, 'forearm'],
  [/brachial cutaneous/, 'upperArm'],
  [/adductor minimus|sciatic/, 'thigh'],
  [/calcaneal tendon|achilles/, 'ankle'],
  [/dorsalis pedis|pedis/, 'foot'],
  [/subclavian|interventricular artery/, 'chest'],
  [/coeliac|psoas|taenia/, 'abdomen'],
  [/pudendal|sacral|testicular|penis|coccygeus|levator ani|pyramidalis/, 'pelvis'],

  // hands and feet (finger-level detail is added below)
  [/phalan.*of (hand)|finger of hand/, 'hand'],
  [/phalan.*of foot|finger of foot|toe|hallu|sesamoid bones of foot/, 'foot'],
  [/scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|(?<!meta)carpal|wrist|retinaculum of wrist/, 'wrist'],
  [/metacarp|of hand|palmar(?!is)|thenar|hypothenar|pollicis brevis|adductor pollicis|opponens pollicis/, 'hand'],
  [/talus|calcaneus|navicular|cuboid|cuneiform|tars|ankle|malleol|of foot|plantar(?!is)|extensor digitorum brevis|flexor digitorum brevis|quadratus plantae/, 'foot'],
  // arm
  [/clavicle|scapula|deltoid|supraspinatus|infraspinatus|teres|subscapular|axillary|acromi/, 'shoulder'],
  [/humer|biceps brachii|triceps|brachialis|coracobrachialis|(?<!ante)brachial (artery|vein|veins|fascia|plexus)|of arm|musculocutaneous/, 'upperArm'],
  [/cubital|anconeus|elbow|olecran/, 'elbow'],
  [/radius|ulna|forearm|antebrach|pronator|supinator|brachioradialis|carpi|digitorum superficialis|digitorum profundus|pollicis longus|extensor pollicis brevis|extensor indicis|extensor digiti minimi$|^extensor digitorum$|radial (artery|vein|nerve)|cephalic|basilic|median nerve/, 'forearm'],
  // leg
  [/patella|menisc|cruciate|popliteus|genicular|popliteal|knee/, 'knee'],
  [/femur|femoris|vastus|sartorius|gracilis|adductor (longus|brevis|magnus)|pectineus|semitendinosus|semimembranosus|tensor fasciae latae|femoral|fascia lata|obturator|saphenous/, 'thigh'],
  [/tibia|fibula|fibular|peroneus|gastrocnemius|soleus|plantaris|tibialis|crural|digitorum longus|hallucis longus|of leg|sural/, 'leg'],
  // trunk
  [/hip bone|ilium|ischium|pubi|sacrum|coccyx|glute|piriformis|iliacus|gemell|pelvi|perine|bladder|urethra|prostate|rectum|anal|ilio|uterus|ovar/, 'pelvis'],
  [/vertebra|atlas|axis \(c2\)|spin|erector|longissimus|iliocostalis|multifidus|rotatores|semispinalis|intertransvers|interspinal|levatores costarum|thoracolumbar/, 'spine'],
  [/trapezius|latissimus|rhomboid|serratus posterior|quadratus lumborum|lumbar|back/, 'back'],
  [/rib|costal|stern|xiphoid|intercostal|pectoral|serratus anterior|subclavius|thorac|heart|cardiac|coronary|aort|pulmonary|pleura|lung|bronch|mediastin|diaphragm|azygos|esophag/, 'chest'],
  [/abdomin|rectus sheath|linea alba|liver|hepat|stomach|gastr|spleen|splen|pancrea|kidney|renal|suprarenal|ureter|duoden|jejun|ileum|ileal|colon|colic|cec|caec|appendi|mesenter|mesocolon|omentum|celiac|portal|gallbladder|cystic|bile|umbilic|inguinal|epigastric|iliac/, 'abdomen'],
  // head and neck
  [/eye|retina|sclera|cornea|\biris\b|\blens\b|vitreous|lacrimal|\borbit(al)?\b|optic|ciliary|choroid|conjunctiv|palpebr|oculomotor|trochlear|abducent|rectus (superior|inferior|medialis|lateralis) bulbi|levator palpebrae/, 'eye'],
  [/malleus|incus|stapes|cochlea|vestibul|tympan|auricul|auditory|\bear\b/, 'ear'],
  [/incisor|canine|molar|premolar|tooth|teeth|tongue|\blingual\b|palat|gingiv|buccinator|orbicularis oris|mandib|maxill|alveolar|labial|\bmental\b/, 'mouth'],
  [/nasal|nose|alar|vomer|concha|ethmoid|sphenoid sinus|naso/, 'nose'],
  [/gyrus|sulcus|lobule|cerebr|cerebell|thalam|hippocamp|amygdal|ventricle|nucleus|cortex|callos|midbrain|pons|medulla oblongata|fornix|putamen|caudate|pallid|insula|chiasm|tract|peduncle|aqueduct|pituitar|hypothal|brain|falx|tentorium/, 'brain'],
  [/frontal|parietal|occipital|temporal|zygomat|skull|crani|calvar|epicranial|scalp|masseter|temporalis|procerus|frontalis|occipitalis|facial|face|lacrimal bone/, 'head'],
  [/hyoid|larynx|laryng|thyroid|cricoid|arytenoid|epiglott|pharyn|trachea|sternocleido|scalen|platysma|carotid|jugular|vertebral artery|cervical|colli|capitis|splenius|digastric|mylohyoid|stylohyoid|omohyoid|sternohyoid|vagus|phrenic|parotid|submandibular|sublingual/, 'neck'],
];

// Tissue type, from the model layer and the name.
function tissueOf(layer, n) {
  if (layer === 'skeletal') {
    if (/incisor|canine|molar|premolar|tooth/.test(n)) return 'tooth';
    if (/cartilage|menisc|disc/.test(n)) return 'cartilage';
    if (/muscle|tendon|fascia/.test(n)) return 'muscle';
    return 'bone';
  }
  if (layer === 'muscular') return /tendon|aponeuros/.test(n) ? 'tendon' : 'muscle';
  if (layer === 'cardio') {
    if (/atri|ventricle|valve|leaflet|papillary|chordae|auricle|heart|myocard|trabecul|septum/.test(n)) return 'heart';
    return /vein|vena|venous|sinus/.test(n) ? 'vein' : 'artery';
  }
  if (layer === 'nervous') {
    if (/eye|retina|sclera|cornea|iris|lens|vitreous|lacrimal|zonular|chamber/.test(n)) return 'eyeTissue';
    if (/spinal cord|medulla|cauda/.test(n)) return 'cord';
    if (/nerve|branch|plexus|ganglion|ramus|rami|root|trunk|division|cutaneous/.test(n)) return 'nerve';
    return 'brainTissue';
  }
  if (/lung|bronch|trachea|larynx/.test(n)) return 'airway';
  return 'organ';
}

// Specific organ name for the visceral layer.
const ORGANS = [
  [/liver/, 'liver'], [/gallbladder|cystic duct|bile/, 'gallbladder'], [/stomach/, 'stomach'], [/spleen/, 'spleen'],
  [/pancrea/, 'pancreas'], [/suprarenal|adrenal/, 'adrenal'], [/kidney|renal pelvis/, 'kidney'], [/ureter/, 'ureter'],
  [/urinary bladder/, 'bladder'], [/urethra/, 'urethra'], [/esophag|oesophag/, 'esophagus'],
  [/duoden|jejun|ileum/, 'smallIntestine'], [/colon|cec|caec|rectum|appendi|taenia|sigmoid|anal canal/, 'largeIntestine'],
  [/lobe of .*lung|lung/, 'lung'], [/bronch/, 'bronchus'], [/trachea/, 'trachea'], [/larynx|laryng|epiglott/, 'larynx'],
  [/thyroid/, 'thyroid'], [/parotid|submandibular|sublingual/, 'salivary'], [/tongue/, 'tongue'],
];

// Coarse region from where the tap hit, relative to the body's bounding box (adult body proportions:
// shoulders ~0.82 of height, elbows ~0.63, wrists ~0.49, finger tips ~0.38, hips ~0.53, knees ~0.29).
function regionFromPoint(p) {
  if (!p) return 'body';
  const { h, dx } = p;
  if (h > 0.87) return 'head';
  if (h > 0.81) return dx > 0.1 ? 'shoulder' : 'neck';
  if (dx > 0.13) {
    if (h > 0.63) return 'upperArm';
    if (h > 0.49) return 'forearm';
    return 'hand';
  }
  if (h > 0.72) return 'chest';
  if (h > 0.58) return 'abdomen';
  if (h > 0.48) return 'pelvis';
  if (h > 0.31) return 'thigh';
  if (h > 0.25) return 'knee';
  if (h > 0.05) return 'leg';
  return 'foot';
}

// info: { name (as in the model), layer, point: { h, dx } }
export function describeStructure(info) {
  if (!info || !info.name) return null;
  const raw = String(info.name).replace(/_\d+$/, '');
  // Side: from where the tap landed (left/right of the body's midline). The model stores some left-side parts as
  // mirrored copies that carry the right-side name, so the name suffix is only used when there is no tap point.
  const nameSide = /\.l$/.test(raw) ? 'left' : /\.r$/.test(raw) ? 'right' : null;
  const p = info.point;
  const offMidline = !!p && typeof p.sx === 'number' && Math.abs(p.sx) > 0.015;
  const sided = !!nameSide || PAIRED_HINT.test(raw);
  const sideKey = !sided ? null : offMidline ? (p.sx > 0 ? 'left' : 'right') : nameSide;
  const bare = raw.replace(/\.(l|r)$/, '');
  // Some names are wrapped in brackets in the model, e.g. "(Adductor minimus)"; "Axis (C2)" keeps its own.
  const name = /^\(.*\)$/.test(bare) ? bare.slice(1, -1) : bare;
  const n = name.toLowerCase();

  // Heart structures are always in the chest (some are named like the brain's ventricles).
  const tissue = tissueOf(info.layer, n);
  let region = tissue === 'heart' ? 'chest' : null;
  if (!region) for (const [re, key] of RULES) { if (re.test(n)) { region = key; break; } }
  const byKeyword = !!region;
  if (!region) region = regionFromPoint(info.point);

  // Finger / toe detail.
  let part = null;
  // Only phalanges get a finger name; metacarpals and metatarsals lie in the palm and the sole.
  const ord = /\b(first|second|third|fourth|fifth) (finger|toe)/.exec(n);
  if (ord) {
    const i = ORDINAL[ord[1]];
    const foot = region === 'foot' || /foot|metatars|toe/.test(n);
    part = (foot ? TOE : FINGER)[i];
  } else if (/pollicis/.test(n)) part = region === 'hand' ? 'thumb' : 'movesThumb';
  else if (/indicis/.test(n)) part = region === 'hand' ? 'index' : 'movesFingers';
  else if (/digiti minimi/.test(n)) part = /foot/.test(n) ? 'littleToe' : region === 'hand' ? 'little' : 'movesFingers';
  else if (/hallucis/.test(n)) part = region === 'foot' ? 'bigToe' : 'movesToes';
  else if (/digit|lumbrical|inteross/.test(n)) {
    if (region === 'hand') part = 'fingers';
    else if (region === 'foot') part = 'toes';
    else if (region === 'forearm') part = 'movesFingers';
    else if (region === 'leg') part = 'movesToes';
  }
  if (!part && tissue === 'heart') part = 'heartOrgan';
  if (!part && info.layer === 'visceral') {
    const organ = ORGANS.find(([re]) => re.test(n));
    if (organ) part = organ[1];
  }

  // A side written in the name ("left lung") goes on the organ, not on the region.
  const lower = (x) => x.toLocaleLowerCase(getLang() === 'tr' ? 'tr-TR' : 'en-US');
  const wordSide = !sideKey && part && tissue !== 'heart' ? (/\bleft\b/.test(n) ? 'left' : /\bright\b/.test(n) ? 'right' : null) : null;
  // "Left hand", but "Mouth · Tooth (right)": only paired body parts take the side in front.
  const paired = PAIRED.includes(region);
  const head = sideKey && paired ? `${w(sideKey)} ${lower(w(region))}` : w(region);
  const partText = part ? (wordSide ? `${w(wordSide)} ${lower(w(part))}` : w(part)) : '';
  let label = partText ? `${head} · ${partText}` : head;
  if (sideKey && !paired) label += ` (${lower(w(sideKey))})`;
  return {
    label: label.charAt(0).toLocaleUpperCase(getLang() === 'tr' ? 'tr-TR' : 'en-US') + label.slice(1),
    tissue: w(tissue),
    anatomical: name + (sideKey ? ` (${sideKey})` : ''),
    exact: byKeyword, // false = region estimated from the tap position
  };
}
