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
function updateVolume() {
  const percent = Math.round(volume * 100);
  $('#volume-label').textContent = percent ? `${percent}%` : 'OFF';
  $('#volume-range').value = percent;
  $('#volume-range').style.setProperty('--fill', `${percent}%`);
  $('#volume').dataset.level = volume === 0 ? 'off' : volume < 0.5 ? 'low' : 'high';
  $('#volume').setAttribute('aria-label', volume ? 'Mute' : 'Unmute');
  if (clip) clip.volume = volume;
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
function surge(delay) {
  clearTimeout(surgeTimer);
  surgeTimer = setTimeout(() => {
    const work = $('.work');
    work.classList.remove('surge'); void work.offsetWidth; work.classList.add('surge');
  }, delay);
}
$('#power').addEventListener('click', () => {
  clickSound(powered ? 1 : 0.5);
  surge(powered ? 0 : 700);
  if (!powered) { powered = true; document.body.classList.add('powered'); $('#power').setAttribute('aria-label', 'Return to portrait'); selectChannel('home', true); }
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
function placeSignLight() {
  const r = $('#name').getBoundingClientRect();
  const s = document.body.style;
  s.setProperty('--x0', `${r.left - r.height * 0.4}px`);
  s.setProperty('--x1', `${r.right + r.height * 0.4}px`);
  s.setProperty('--y0', `${r.top - r.height * 0.4}px`);
  s.setProperty('--y1', `${r.bottom + r.height * 0.4}px`);
  s.setProperty('--fx', `${r.height * 4}px`);
  s.setProperty('--fy', `${r.height * 2.4}px`);
}
placeSignLight();
addEventListener('resize', placeSignLight);
addEventListener('scroll', placeSignLight, { passive: true });
document.fonts?.ready.then(placeSignLight);
updateVolume();
