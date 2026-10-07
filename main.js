// Content lives here so real images and contact details can be added independently.
const content = {
  home: { number: '00', title: 'Ajayveer Sandhu', caption: 'Computational Mathematics · University of Waterloo', image: 'images/ottawa.jpg', placeholder: 'Your portrait here', type: 'portrait' },
  fincapes: { number: '01', title: 'Fincapes', caption: 'Building Models to Find Problems and Implement Solutions for Geothermal Energy', image: 'images/fincapes.jpg', link: 'https://fincapesproject.com/', placeholder: 'Geothermal research · image to come', type: 'project' },
  statcan: { number: '02', title: 'Statistics Canada', caption: 'Engineering the Data Pipelines Analysts Rely On to Inform Canadians Nationwide', image: 'images/statcan.jpg', link: 'https://www.statcan.gc.ca/', placeholder: 'T4 data pipelines · image to come', type: 'project' },
  uwaterloo: { number: '03', title: 'University of Waterloo', caption: 'Studying the Art of Modeling, Programming, Statistics, Forecasting and Research', image: 'images/uwaterloo.jpg', link: 'https://uwaterloo.ca/computational-mathematics/', placeholder: 'Campus · image to come', type: 'project' },
  zocratic: { number: '04', title: 'ZocraticMMA', caption: 'A UFC Analytics Platform Connecting Fans Nationwide for a Smarter View of the Sport', image: 'images/zocratic.jpg', link: 'https://www.zocraticmma.com/', placeholder: 'Fighter comparison · image to come', type: 'project' },
};
// Each red button press tunes through one of these "other channels" before landing on its own.
const clips = ['12-51', 'jim-where-did-you-go', 'leon-ko', 'prince-solo', 'shiiit', 'spiderman-2-train', 'trex-roar', 'uncharted-plane', 'winner-takes-it-all'].map(name => `clips/${name}.mp4`);
// The screen crops each clip's sides; these shift a clip's framing so its subject stays in view.
const clipFraming = { 'clips/trex-roar.mp4': '100% 50%' };
// A clip can't air again until this many other clips have aired; must stay below clips.length.
const CLIP_COOLDOWN = 5;
const recentClips = [];
let nextClip;
function preloadClip() {
  const choices = clips.filter(src => !recentClips.includes(src));
  const src = choices[Math.floor(Math.random() * choices.length)];
  recentClips.push(src);
  if (recentClips.length > CLIP_COOLDOWN) recentClips.shift();
  nextClip = document.createElement('video');
  nextClip.src = src; nextClip.preload = 'auto'; nextClip.playsInline = true; nextClip.className = 'return-clip';
  nextClip.style.objectPosition = clipFraming[src] || '';
  nextClip.load();
}
preloadClip();
let powered = false;
let current = 'home';
let transitioning = false;
let timer;
let clip;
let audio;
let volume = 0.5;
let volumeBeforeMute = 0.5;
const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function clickSound(level = 1) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (powered && audio.state === 'suspended') audio.resume().catch(() => {});
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
    if (powered && audio.state === 'suspended') audio.resume().catch(() => {});
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
// The loops are scheduled on load, but the site stays silent until the TV is powered on.
try {
  audio.suspend().catch(() => {});
  audio.addEventListener('statechange', () => { if (!powered && audio.state === 'running') audio.suspend().catch(() => {}); });
} catch { /* No audio support. */ }
async function startLoop(loop) {
  try {
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
  $('#volume').setAttribute('aria-label', matchMedia('(max-width: 760px)').matches ? `Volume ${percent ? `${percent}%` : 'off'}` : volume ? 'Mute' : 'Unmute');
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
  if (matchMedia('(max-width: 760px)').matches) volume = (Math.round(volume * 4) + 1) % 5 / 4;
  else if (volume) { volumeBeforeMute = volume; volume = 0; }
  else { volume = volumeBeforeMute || 0.5; }
  updateVolume(); clickSound();
});
$('#volume-range').addEventListener('input', event => {
  volume = Number(event.target.value) / 100;
    updateVolume();
});
$('#volume-range').addEventListener('change', () => clickSound());
// Controls still show hover while the TV is flipping channels, but nothing can be pressed.
function lockControls(locked) {
  document.body.classList.toggle('tuning', locked);
}
// Space repeats the last button pressed, wherever focus is.
let lastPressed = null;
document.addEventListener('click', event => {
  const button = event.target.closest?.('button');
  if (button) lastPressed = button;
});
for (const type of ['keydown', 'keyup']) {
  document.addEventListener(type, event => {
    if (event.code !== 'Space' || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const focused = document.activeElement?.closest?.('button');
    const target = focused || lastPressed;
    if (!target) return;
    event.preventDefault();
    if (type === 'keydown' && !event.repeat) target.click();
  }, true);
}
for (const type of ['click', 'pointerdown', 'keydown']) {
  document.addEventListener(type, event => {
    if (!document.body.classList.contains('tuning') || !event.target.closest?.('button, a, input') || event.target.closest('#volume-control')) return;
    if (type === 'keydown' && event.key === 'Tab') return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
}
function cancelTransition() {
  clearTimeout(timer);
  if (clip) { clip.pause(); clip.remove(); clip = null; }
  $('#static').classList.remove('active');
  transitioning = false;
  lockControls(false);
}
function showChannel(key) {
  cancelTransition();
  $('#off-screen').hidden = true;
  const item = content[key];
  const channel = $('#channel');
  channel.replaceChildren();
  const visual = document.createElement(item.link ? 'a' : 'div'); visual.className = `channel-visual ${item.type}`; visual.dataset.channel = key;
  if (item.link) {
    visual.href = item.link; visual.target = '_blank'; visual.rel = 'noopener'; visual.setAttribute('aria-label', `Visit ${item.title}`);
    const arrow = document.createElement('span'); arrow.className = 'channel-link-arrow'; arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M4.5 11.5l7-7M5.5 4.5h6v6"/></svg>';
    visual.append(arrow);
  }
  if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = item.title; visual.append(img); }
  else { const mark = document.createElement('span'); mark.className = 'placeholder-mark'; mark.textContent = key === 'home' ? 'AS' : item.number; const label = document.createElement('span'); label.className = 'placeholder-label'; label.textContent = item.placeholder; visual.append(mark, label); }
  const caption = document.createElement('p'); caption.className = 'channel-caption'; caption.textContent = item.caption;
  if (key !== 'home') { const label = document.createElement('div'); label.className = 'channel-id'; label.textContent = (item.label || item.title).toUpperCase(); channel.append(label); }
  channel.append(visual, caption); channel.hidden = false;
  document.body.classList.add('on');
  $('#experience-list').inert = false;
}
function selectChannel(key, { first = false, withClip = false } = {}) {
  const interrupted = transitioning;
  cancelTransition(); current = key;
  document.querySelectorAll('.experience').forEach(row => row.setAttribute('aria-pressed', String(row.dataset.channel === key)));
  if (interrupted || reducedMotion.matches) { showChannel(key); return; }
  transitioning = true;
  lockControls(true);
  $('#off-screen').hidden = true;
  $('#static').classList.add('active');
  timer = setTimeout(() => {
    if (!withClip) { showChannel(key); return; }
    $('#static').classList.remove('active');
    clip = nextClip; clip.volume = volume;
    preloadClip();
    $('#glass').append(clip);
    const finish = () => { if (!clip) return; clip.pause(); clip.remove(); clip = null; $('#static').classList.add('active'); clearTimeout(timer); timer = setTimeout(() => showChannel(key), 240); };
    clip.onended = finish; clip.onerror = finish; clip.play().catch(finish);
    // Safety net in case a clip stalls; every clip is under 3 seconds.
    timer = setTimeout(finish, 4000);
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
  if (!powered) { powered = true; audio?.resume().catch(() => {}); loops.forEach(startLoop); document.body.classList.add('powered'); $('#experience-list').inert = false; spreadLight(); $('#power').setAttribute('aria-label', 'Return to portrait'); selectChannel('home', { first: true, withClip: true }); revealExperience(); }
  else selectChannel('home', { withClip: true });
});
// On phones the list sits below the TV; bring as much of it into view as possible without pushing the TV off the top.
function revealExperience() {
  if (!matchMedia('(max-width: 760px)').matches) return;
  const tvTop = $('#television').getBoundingClientRect().top + window.scrollY - 16;
  const listEnd = $('.work').getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 24;
  const top = Math.max(window.scrollY, Math.min(tvTop, listEnd));
  window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
function revealTelevision() {
  if (!matchMedia('(max-width: 760px)').matches) return;
  const name = $('.name-row').getBoundingClientRect();
  if (name.top >= 0 && $('#television').getBoundingClientRect().bottom <= window.innerHeight) return;
  window.scrollTo({ top: name.top + window.scrollY - 16, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelectorAll('.experience').forEach(row => row.addEventListener('click', () => {
  if (!powered) return;
  redButtonSound(); selectChannel(row.dataset.channel); revealTelevision();
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
const nameTag = $('#name-tag');
const tagLines = [...nameTag.children].map(line => [...line.querySelectorAll('[data-text]')]);
const glyphs = [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ⏃⏚☊⎅⟒⎎☌⊑⟟⟊☍⌰⋔⋏⍜⌿⍀⌇⏁⎍⎐⍙⌖⊬⋉ΔΘΞΨΩЖЯѦѪ'];
const glyphColors = ['#4f9dff', '#4f9dff', '#57cbe5', '#57cbe5', '#57cbe5', '#9eeeff', '#9eeeff', '#eaffff', '#ff5a4e', '#ff9a3c', '#a77bff'];
const pick = list => list[Math.floor(Math.random() * list.length)];
let decodeTimer = 0;
function renderNameTag(revealed) {
  let done = true;
  for (const segments of tagLines) {
    let remaining = revealed;
    for (const el of segments) {
      const text = el.dataset.text;
      const shown = Math.max(0, Math.min(text.length, remaining));
      remaining -= text.length;
      if (shown < text.length) done = false;
      let html = text.slice(0, shown);
      for (let i = shown; i < text.length; i++) html += `<span class="glitch" style="color:${pick(glyphColors)}">${pick(glyphs)}</span>`;
      el.innerHTML = html;
      const dot = el.nextElementSibling?.classList.contains('live-dot') && el.nextElementSibling;
      if (dot) dot.style.visibility = shown < text.length ? 'hidden' : '';
    }
  }
  return done;
}
function decodeNameTag() {
  clearInterval(decodeTimer);
  const start = performance.now();
  renderNameTag(0);
  decodeTimer = setInterval(() => { if (renderNameTag(Math.floor((performance.now() - start) / 120))) clearInterval(decodeTimer); }, 50);
}
$('#name').addEventListener('pointermove', event => {
  if (!powered || event.pointerType !== 'mouse') return;
  const x = Math.min(event.clientX + 18, innerWidth - nameTag.offsetWidth - 8);
  const y = Math.min(event.clientY + 22, innerHeight - nameTag.offsetHeight - 8);
  nameTag.style.transform = `translate(${x}px, ${y}px)`;
  if (!nameTag.classList.contains('visible')) decodeNameTag();
  nameTag.classList.add('visible');
});
$('#name').addEventListener('pointerleave', () => { clearInterval(decodeTimer); nameTag.classList.remove('visible'); });
placeSignLight();
addEventListener('resize', placeSignLight);
addEventListener('scroll', placeSignLight, { passive: true });
document.fonts?.ready.then(placeSignLight);
updateVolume();
// The tab icon flashes on the power button's rhythm for as long as the page is open.
// Browsers won't animate a favicon, so the lit and dim frames are swapped by hand.
let faviconLit = false;
if (!reducedMotion.matches) setInterval(() => {
  faviconLit = !faviconLit;
  $('#favicon').href = faviconLit ? '/favicon-lit.svg' : '/favicon-dim.svg';
}, 550);
