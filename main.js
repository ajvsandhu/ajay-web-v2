// Content lives here so real images and contact details can be added independently.
const content = {
  home: { number: '00', title: 'Ajayveer Sandhu', caption: 'Computational Mathematics · University of Waterloo', image: null, placeholder: 'Your portrait here', type: 'portrait' },
  fincapes: { number: '01', title: 'Fincapes', caption: 'I built models researchers use to study geothermal energy in Indonesia.', image: null, placeholder: 'Geothermal research · image to come', type: 'project' },
  statcan: { number: '02', title: 'Statistics Canada', caption: '', image: null, placeholder: 'T4 data pipelines · image to come', type: 'project' },
  zocratic: { number: '03', title: 'ZocraticMMA', caption: 'I built a UFC analytics platform that 50+ people use to compare fighters.', image: null, placeholder: 'Fighter comparison · image to come', type: 'project' },
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
try { const saved = Number(localStorage.getItem('ajay-volume')); if (localStorage.getItem('ajay-volume') !== null && [0, 0.5, 1].includes(saved)) volume = saved; } catch {}
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
function updateVolume() {
  const label = volume === 0 ? 'off' : volume === 0.5 ? 'half' : 'full';
  $('#volume-label').textContent = volume ? `${volume * 100}%` : 'OFF';
  $('#volume').dataset.level = label;
  $('#volume').setAttribute('aria-label', `Volume: ${label}. Set to ${volume === 0.5 ? 'full' : volume === 1 ? 'off' : 'half'}`);
  if (clip) clip.volume = volume;
}
$('#volume').addEventListener('click', () => {
  volume = volume === 0.5 ? 1 : volume === 1 ? 0 : 0.5;
  try { localStorage.setItem('ajay-volume', String(volume)); } catch {}
  updateVolume(); clickSound();
});
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
  $('#broadcast-status').textContent = key === 'home' ? '' : `CH ${item.number} · ${item.title.toUpperCase()}`;
  $('#power-hint').textContent = key === 'home' ? '' : 'Press red to come back home.';
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
$('#power').addEventListener('click', () => {
  clickSound(powered ? 1 : 0.5);
  if (!powered) { powered = true; $('#power').setAttribute('aria-label', 'Return to portrait'); selectChannel('home', true); }
  else if (current !== 'home') selectChannel('home');
});
document.querySelectorAll('.experience').forEach(row => row.addEventListener('click', () => {
  if (!powered) return;
  clickSound(); selectChannel(row.dataset.channel);
  if (!mobileScrolled && matchMedia('(max-width: 760px)').matches) {
    mobileScrolled = true;
    const top = row.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
}));
updateVolume();
