// Content lives here so real images and contact details can be added independently.
const content = {
  home: { number: '00', title: 'Ajayveer Sandhu', caption: 'Computational Mathematics · University of Waterloo', image: null, placeholder: 'Your portrait here', type: 'portrait' },
  fincapes: { number: '01', title: 'Fincapes', caption: 'I built models researchers use to study geothermal energy in Indonesia.', image: null, placeholder: 'Geothermal research · image to come', type: 'project' },
  statcan: { number: '02', title: 'Statistics Canada', caption: '', image: null, placeholder: 'T4 data pipelines · image to come', type: 'project' },
  uwaterloo: { number: '03', title: 'UWaterloo', caption: 'I study Computational Mathematics at the University of Waterloo.', image: null, placeholder: 'Campus · image to come', type: 'project' },
  zocratic: { number: '04', title: 'ZocraticMMA', caption: 'I built a UFC analytics platform that 50+ people use to compare fighters.', image: null, placeholder: 'Fighter comparison · image to come', type: 'project' },
};
const returnClip = ''; // Add a local 1–2 second video URL when selected.
let powered = false;
let current = 'home';
let transitioning = false;
let timer;
let clip;
let mobileScrolled = false;
let audio;
let volume = 0.5;
let volumeBeforeMute = 0.5;
const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function clickSound(level = 1) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    if (!volume) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, audio.currentTime + 0.045);
    gain.gain.setValueAtTime(volume * level * 0.25, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.065);
    osc.connect(gain).connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + 0.07);
  } catch { /* Visual controls remain usable when audio is unavailable. */ }
}
// The recording has ~140ms of silence before the click; skip it and keep the snap.
const RED_BUTTON_OFFSET = 0.135;
const RED_BUTTON_LENGTH = 0.12;
// Below 1 plays the click slower and deeper; 0.6 is about nine semitones down.
const RED_BUTTON_RATE = 0.6;
let redButtonBuffer;
try {
  audio = new (window.AudioContext || window.webkitAudioContext)();
  fetch('sounds/red-button.flac')
    .then(response => response.arrayBuffer())
    .then(data => audio.decodeAudioData(data))
    .then(buffer => { redButtonBuffer = buffer; })
    .catch(() => {});
} catch { /* Falls back to the synthesized click. */ }
function redButtonSound(level = 1) {
  if (!redButtonBuffer) return clickSound(level);
  try {
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    if (!volume) return;
    const now = audio.currentTime;
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = redButtonBuffer;
    source.playbackRate.value = RED_BUTTON_RATE;
    const end = now + RED_BUTTON_LENGTH / RED_BUTTON_RATE;
    gain.gain.setValueAtTime(volume * level, now);
    gain.gain.setValueAtTime(volume * level, end - 0.04);
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain).connect(audio.destination);
    source.start(now, RED_BUTTON_OFFSET, RED_BUTTON_LENGTH);
  } catch { clickSound(level); }
}
// Background loops swell between a max and min, as fractions of the volume slider.
const TRAFFIC_MAX = 0.13;
const TRAFFIC_MIN = 0.07;
const TRAFFIC_SWELL_SECONDS = 13;
const AMBIENCE_LEVEL = (TRAFFIC_MAX + TRAFFIC_MIN) / 2;
// The neon hum swells between these fractions of the average traffic level.
const HUM_MAX = 0.3;
const HUM_MIN = 0.15;
const HUM_SWELL_SECONDS = 8;
const loops = [
  { url: 'sounds/city-ambience.flac', max: TRAFFIC_MAX, min: TRAFFIC_MIN, seconds: TRAFFIC_SWELL_SECONDS },
  { url: 'sounds/neon-hum.flac', max: AMBIENCE_LEVEL * HUM_MAX, min: AMBIENCE_LEVEL * HUM_MIN, seconds: HUM_SWELL_SECONDS },
];
loops.forEach(loop => { loop.data = fetch(loop.url).then(response => response.arrayBuffer()).catch(() => null); });
function loopLevels(loop) {
  return { center: volume * (loop.max + loop.min) / 2, depth: volume * (loop.max - loop.min) / 2 };
}
async function startLoop(loop) {
  try {
    audio.resume().catch(() => {});
    const data = await loop.data;
    if (!data) return;
    const source = audio.createBufferSource();
    source.buffer = await audio.decodeAudioData(data);
    source.loop = true;
    const { center, depth } = loopLevels(loop);
    loop.gain = audio.createGain();
    loop.gain.gain.setValueAtTime(0, audio.currentTime);
    loop.gain.gain.setTargetAtTime(center, audio.currentTime, 0.6);
    const swell = audio.createOscillator();
    swell.frequency.value = 1 / loop.seconds;
    loop.depth = audio.createGain();
    loop.depth.gain.value = depth;
    swell.connect(loop.depth).connect(loop.gain.gain);
    source.connect(loop.gain).connect(audio.destination);
    source.start(); swell.start();
  } catch { /* The site works without background audio. */ }
}
const STATIC_LEVEL = 0.2;
let staticBuffer;
let staticSound;
fetch('sounds/tv-static.flac')
  .then(response => response.arrayBuffer())
  .then(data => audio.decodeAudioData(data))
  .then(buffer => { staticBuffer = buffer; })
  .catch(() => {});
function setStaticSound(on) {
  if (!staticBuffer) return;
  const now = audio.currentTime;
  if (on && !staticSound) {
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = staticBuffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * STATIC_LEVEL, now + 0.015);
    source.connect(gain).connect(audio.destination);
    source.start(now, Math.random() * staticBuffer.duration);
    staticSound = { source, gain };
  } else if (!on && staticSound) {
    const { source, gain } = staticSound;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.04);
    source.stop(now + 0.05);
    staticSound = null;
  }
}
new MutationObserver(() => setStaticSound($('#static').classList.contains('active')))
  .observe($('#static'), { attributes: true, attributeFilter: ['class'] });
function updateVolume() {
  const percent = Math.round(volume * 100);
  $('#volume-label').textContent = percent ? `${percent}%` : 'OFF';
  $('#volume-range').value = percent;
  $('#volume-range').style.setProperty('--fill', `${percent}%`);
  $('#volume').dataset.level = volume === 0 ? 'off' : volume < 0.5 ? 'low' : 'high';
  $('#volume').setAttribute('aria-label', volume ? 'Mute' : 'Unmute');
  if (clip) clip.volume = volume;
  for (const loop of loops) {
    if (!loop.gain) continue;
    const { center, depth } = loopLevels(loop);
    loop.gain.gain.setTargetAtTime(center, audio.currentTime, 0.05);
    loop.depth.gain.setTargetAtTime(depth, audio.currentTime, 0.05);
  }
  staticSound?.gain.gain.setTargetAtTime(volume * STATIC_LEVEL, audio.currentTime, 0.02);
}
$('#volume').addEventListener('click', () => {
  if (volume) { volumeBeforeMute = volume; volume = 0; }
  else { volume = volumeBeforeMute || 0.5; }
  updateVolume(); clickSound();
});
$('#volume-range').addEventListener('input', event => {
  volume = Number(event.target.value) / 100;
    updateVolume();
});
$('#volume-range').addEventListener('change', () => clickSound());
function cancelTransition() {
  clearTimeout(timer);
  if (clip) { clip.pause(); clip.remove(); clip = null; }
  $('#static').classList.remove('active');
  transitioning = false;
}
function showChannel(key) {
  cancelTransition();
  $('#off-screen').hidden = true;
  const item = content[key];
  const channel = $('#channel');
  channel.replaceChildren();
  const badge = document.createElement('div'); badge.className = 'channel-id'; badge.textContent = `CH ${item.number} / ${key === 'home' ? 'ABOUT ME' : item.title.toUpperCase()}`;
  const visual = document.createElement('div'); visual.className = `channel-visual ${item.type}`;
  if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = item.title; visual.append(img); }
  else { const mark = document.createElement('span'); mark.className = 'placeholder-mark'; mark.textContent = key === 'home' ? 'AS' : item.number; const label = document.createElement('span'); label.className = 'placeholder-label'; label.textContent = item.placeholder; visual.append(mark, label); }
  const caption = document.createElement('p'); caption.className = 'channel-caption'; caption.textContent = item.caption;
  channel.append(badge, visual, caption); channel.hidden = false;
  document.body.classList.add('on');
  $('#experience-list').inert = false;
}
function selectChannel(key, first = false) {
  const interrupted = transitioning;
  const returning = key === 'home' && current !== 'home';
  cancelTransition(); current = key;
  document.querySelectorAll('.experience').forEach(row => row.setAttribute('aria-pressed', String(row.dataset.channel === key)));
  if (interrupted || reducedMotion.matches) { showChannel(key); return; }
  transitioning = true;
  $('#off-screen').hidden = true;
  $('#static').classList.add('active');
  timer = setTimeout(() => {
    if (returning && returnClip && !first) {
      $('#static').classList.remove('active');
      clip = document.createElement('video'); clip.src = returnClip; clip.playsInline = true; clip.volume = volume; clip.className = 'return-clip';
      $('#glass').append(clip);
      const finish = () => { if (!clip) return; clip.pause(); clip.remove(); clip = null; $('#static').classList.add('active'); clearTimeout(timer); timer = setTimeout(() => showChannel(key), 180); };
      clip.onended = finish; clip.onerror = finish; clip.play().catch(finish);
      timer = setTimeout(finish, 2000);
    } else showChannel(key);
  }, first ? 550 : 240);
}
let surgeTimer;
function surge(delay, first = false) {
  clearTimeout(surgeTimer);
  surgeTimer = setTimeout(() => {
    for (const el of [$('.work'), $('#volume-control')]) {
      el.classList.remove('surge', 'surge-first'); void el.offsetWidth; el.classList.add(first ? 'surge-first' : 'surge');
    }
  }, delay);
}
$('#power').addEventListener('click', () => {
  redButtonSound(powered ? 1 : 0.5);
  surge(0, !powered);
  if (!powered) { powered = true; loops.forEach(startLoop); document.body.classList.add('powered'); spreadLight(); $('#power').setAttribute('aria-label', 'Return to portrait'); selectChannel('home', true); }
  else if (current !== 'home') selectChannel('home');
});
document.querySelectorAll('.experience').forEach(row => row.addEventListener('click', () => {
  if (!powered) return;
  redButtonSound(); selectChannel(row.dataset.channel);
  if (!mobileScrolled && matchMedia('(max-width: 760px)').matches) {
    mobileScrolled = true;
    const top = row.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
}));
function setLight(box, el = document.body) {
  for (const k in box) el.style.setProperty(`--${k}`, `${box[k]}px`);
}
function placeSignLight() {
  const r = $('#name').getBoundingClientRect();
  setLight({ x0: r.left, x1: r.right, y0: r.top, y1: r.bottom, fx: r.height * 1.3, fy: r.height * 0.8 });
}
const lightSources = [$('#volume-control'), $('.section-label'), ...document.querySelectorAll('.experience')];
const lightLayers = [];
lightSources.reduce((parent) => {
  const layer = parent.appendChild(document.createElement('div'));
  layer.className = 'light-layer';
  lightLayers.push(layer);
  return layer;
}, $('.room-dark'));
// Each experience line lights up as a thin strip along its text, then grows until the strips merge and cover the screen.
function spreadLight() {
  const dark = $('.room-dark');
  if (reducedMotion.matches) { dark.hidden = true; return; }
  const duration = 2600;
  const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
  // Light comes from the words alone: the heading's divider and each row's red button stay dark.
  const textRect = (el) => {
    const rects = [...el.querySelectorAll(':scope > :not(.selection)'), el].flatMap((node) => [...node.childNodes])
      .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
      .map((n) => { const range = document.createRange(); range.selectNodeContents(n); return range.getBoundingClientRect(); });
    const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top)), bottom = Math.max(...rects.map((r) => r.bottom));
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  };
  const lines = lightSources.map((el) => {
    const r = el.id === 'volume-control' ? el.getBoundingClientRect() : textRect(el);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { cx, cy, hw: r.width / 2, reach: Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) };
  });
  const start = performance.now();
  const frame = (now) => {
    const t = (now - start) / duration;
    if (t >= 1) { dark.hidden = true; return; }
    const e = ease(t);
    lines.forEach(({ cx, cy, hw, reach }, i) => {
      const w = hw + (reach - hw) * e, h = reach * e, fall = reach * 0.8 * e;
      setLight({ cx, cy, rx: w * 1.4 + fall, ry: h * 1.4 + fall }, lightLayers[i]);
    });
    requestAnimationFrame(frame);
  };
  frame(start);
}
placeSignLight();
addEventListener('resize', placeSignLight);
addEventListener('scroll', placeSignLight, { passive: true });
document.fonts?.ready.then(placeSignLight);
updateVolume();
