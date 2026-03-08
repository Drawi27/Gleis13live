/* ═══════════════════════════════
   CONFIG — Passwort hier ändern
═══════════════════════════════ */
const ADMIN_PASSWORD = 'gleis13';
let IS_ADMIN = false;

/* ═══════════════════════════════
   THEME — Dark / Light
═══════════════════════════════ */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  updateThemeIcons(!isDark);
  try { localStorage.setItem('gleis13-theme', isDark ? 'light' : 'dark'); } catch(e) {}
}
function updateThemeIcons(isDark) {
  document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = isDark ? '☽' : '☀');
  const bnIcon = document.getElementById('bn-theme-icon');
  if (bnIcon) bnIcon.textContent = isDark ? '☽' : '☀';
}
(function initTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('gleis13-theme') || 'light'; } catch(e) {}
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcons(theme === 'dark');
})();

/* ═══════════════════════════════
   STATE
═══════════════════════════════ */
let SETS = [];
let activeFilter = 'all';
let openCard = null;
let editingId = null;
let selectedGenres = [];
let tags = [];
let selectedColor = '#d63c1f';

const COLORS = ['#d63c1f','#f5c800','#1a4a6b','#2a5a2a','#5a1a1a','#4a3a1a','#3a1a5a','#1a5a4a','#333','#888'];
const DEFAULT_GENRES = ['techno','ambient','jazz','drum-bass','experimental','leftfield','house','breaks','electro','noise'];
let ALL_GENRES = [...DEFAULT_GENRES];
const STORAGE_KEY = 'gleis13:sets';
const GENRE_KEY   = 'gleis13:genres';

/* ═══════════════════════════════
   VIEWS
═══════════════════════════════ */
function showView(v) {
  document.getElementById('view-main').classList.add('hidden');
  document.getElementById('view-info').classList.add('hidden');
  document.getElementById('view-artists').classList.add('hidden');
  document.getElementById('view-favs').classList.add('hidden');
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-admin').classList.add('hidden');
  // update bottom nav
  ['mixes','artists','info','favs'].forEach(t => {
    const btn = document.getElementById('bn-' + t);
    if (btn) btn.classList.toggle('active', t === v);
  });
  if (v === 'mixes') {
    document.getElementById('view-main').classList.remove('hidden');
    loadAndRender();
  } else if (v === 'artists') {
    document.getElementById('view-artists').classList.remove('hidden');
    loadSets().then(() => { if (!SETS.length) SETS = DEMO_SETS; renderArtists(); });
  } else if (v === 'info') {
    document.getElementById('view-info').classList.remove('hidden');
    loadSets().then(() => {
      document.getElementById('info-set-count').textContent = SETS.length || '—';
      const genres = new Set();
      SETS.forEach(s => (Array.isArray(s.genres) ? s.genres : [s.genre]).filter(Boolean).forEach(g => genres.add(g)));
      document.getElementById('info-genre-count').textContent = genres.size || '—';
    });
    // load dynamic info text from localStorage
    try {
      const _infoData = JSON.parse(localStorage.getItem('gleis13-info') || 'null');
      if (_infoData) (function(data) {
      const h = document.getElementById('info-dyn-headline');
      const p1 = document.getElementById('info-dyn-p1');
      const p2 = document.getElementById('info-dyn-p2');
      const em = document.getElementById('info-dyn-email');
      const ig = document.getElementById('info-dyn-instagram');
      const sc = document.getElementById('info-dyn-soundcloud');
      if (h && data.headline) h.textContent = data.headline;
      if (p1 && data.paragraph1) p1.textContent = data.paragraph1;
      if (p2 && data.paragraph2) p2.textContent = data.paragraph2;
      if (em && data.email) em.textContent = data.email;
      if (ig && data.instagram) ig.textContent = data.instagram;
      if (sc && data.soundcloud) sc.textContent = data.soundcloud;
      })(_infoData); } catch(e) {}
  } else if (v === 'favs') {
    document.getElementById('view-favs').classList.remove('hidden');
    loadSets().then(() => { if (!SETS.length) SETS = [...DEMO_SETS]; renderFavGrid(); });
  }
}

function showMain() {
  IS_ADMIN = false;
  showView('mixes');
}

/* ═══════════════════════════════
   ARTISTS
═══════════════════════════════ */
let activeArtist = null;

function getArtistData() {
  // Group sets by artist, merge with stored artist metadata
  const stored = JSON.parse(localStorage.getItem('gleis13-artists') || '{}');
  const map = {};
  SETS.forEach(s => {
    const key = s.artist;
    if (!map[key]) map[key] = { name: key, sets: [], ...( stored[key] || {}) };
    map[key].sets.push(s);
  });
  return Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
}

function saveArtistMeta(name, meta) {
  const stored = JSON.parse(localStorage.getItem('gleis13-artists') || '{}');
  stored[name] = { ...( stored[name] || {}), ...meta };
  localStorage.setItem('gleis13-artists', JSON.stringify(stored));
}

function renderArtists() {
  const artists = getArtistData();
  document.getElementById('artists-count').textContent = artists.length;

  // render list
  const list = document.getElementById('artists-list');
  list.innerHTML = artists.map((a, i) => {
    const thumb = a.photo
      ? `<div style="width:40px;height:40px;flex-shrink:0;background:url(${a.photo}) center/cover no-repeat;border:1px solid #ccc"></div>`
      : `<div style="width:40px;height:40px;flex-shrink:0;background:${a.sets[0]?.color||'#222'};display:flex;align-items:center;justify-content:center;font-size:.9rem;color:rgba(255,255,255,.4);font-family:var(--display)">${a.name[0]}</div>`;
    return `<div class="artist-row" id="arow-${i}" onclick="selectArtist(${i})" style="display:flex;align-items:center;gap:.75rem;padding:.65rem 1rem;border-bottom:1px solid #e0ddd6;cursor:pointer;transition:background .1s">
      ${thumb}
      <div style="min-width:0;flex:1">
        <div style="font-family:var(--display);font-size:1rem;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div>
        <div style="font-size:.52rem;letter-spacing:.1em;color:var(--grey);text-transform:uppercase;margin-top:.1rem">${a.sets.length} Set${a.sets.length>1?'s':''}</div>
      </div>
    </div>`;
  }).join('');

  // auto-select first
  if (artists.length) selectArtist(0);
}

function selectArtist(i) {
  activeArtist = i;
  // highlight row
  document.querySelectorAll('.artist-row').forEach((el, j) => {
    el.style.background = j === i ? 'var(--fg)' : '';
    el.style.color = j === i ? 'var(--bg)' : '';
  });

  const artists = getArtistData();
  const a = artists[i];
  const detail = document.getElementById('artists-detail');

  const genres = [...new Set(a.sets.flatMap(s => Array.isArray(s.genres) ? s.genres : [s.genre]).filter(Boolean))];
  const genreTags = genres.map(g => `<span style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;border:1px solid #ccc;padding:.1rem .4rem">${g}</span>`).join('');

  const setsHTML = a.sets.map(s => `
    <div onclick="showView('mixes')" style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid #e0ddd6;cursor:pointer" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">
      ${s.image ? `<div style="width:60px;height:34px;flex-shrink:0;background:url(${s.image}) center/cover no-repeat;border:1px solid #ccc"></div>` : `<div style="width:60px;height:34px;flex-shrink:0;background:${s.color||'#222'}"></div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--display);font-size:.95rem;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</div>
        <div style="font-size:.52rem;letter-spacing:.1em;color:var(--grey);text-transform:uppercase;margin-top:.1rem">${fmtDate(s.date)} · ${s.duration||''}</div>
      </div>
      <span style="font-size:.6rem;color:var(--grey)">↗</span>
    </div>`).join('');

  const socialHTML = [
    a.instagram ? `<a href="https://instagram.com/${a.instagram.replace('@','')}" target="_blank" style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fg);text-decoration:none;border:1px solid #ccc;padding:.25rem .6rem;transition:all .1s" onmouseover="this.style.background='var(--fg)';this.style.color='var(--bg)'" onmouseout="this.style.background='';this.style.color='var(--fg)'">Instagram ↗</a>` : '',
    a.soundcloud ? `<a href="https://soundcloud.com/${a.soundcloud}" target="_blank" style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fg);text-decoration:none;border:1px solid #ccc;padding:.25rem .6rem;transition:all .1s" onmouseover="this.style.background='var(--fg)';this.style.color='var(--bg)'" onmouseout="this.style.background='';this.style.color='var(--fg)'">Soundcloud ↗</a>` : '',
    a.website ? `<a href="${a.website}" target="_blank" style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fg);text-decoration:none;border:1px solid #ccc;padding:.25rem .6rem;transition:all .1s" onmouseover="this.style.background='var(--fg)';this.style.color='var(--bg)'" onmouseout="this.style.background='';this.style.color='var(--fg)'">Website ↗</a>` : '',
  ].filter(Boolean).join('');

  detail.innerHTML = `
    <!-- hero -->
    <div style="position:relative;${a.photo ? `background:url(${a.photo}) center/cover no-repeat;` : `background:${a.sets[0]?.color||'#1a1a1a'};`}padding-bottom:33%;border-bottom:var(--b)">
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:1.5rem 2rem;display:flex;align-items:flex-end;justify-content:space-between">
        <div>
          <div style="font-family:var(--display);font-size:3rem;letter-spacing:.04em;color:#fff;line-height:1">${a.name}</div>
          <div style="display:flex;gap:.4rem;margin-top:.5rem;flex-wrap:wrap">${genreTags}</div>
        </div>
        ${IS_ADMIN ? `<button onclick="openArtistEdit(${i})" style="background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.3);color:#fff;font-family:var(--mono);font-size:.54rem;letter-spacing:.12em;text-transform:uppercase;padding:.35rem .75rem;cursor:pointer;transition:all .1s" onmouseover="this.style.background='var(--fg)'" onmouseout="this.style.background='rgba(0,0,0,.5)'">Bearbeiten ↗</button>` : ''}
      </div>
    </div>

    <!-- bio + sets + social -->
    <div class="artist-detail-grid" style="display:grid;grid-template-columns:1fr 1fr;border-bottom:var(--b)">
      <!-- bio -->
      <div class="artist-detail-bio" style="padding:1.5rem 2rem;border-right:var(--b)">
        <div style="font-size:.54rem;letter-spacing:.16em;text-transform:uppercase;color:var(--grey);margin-bottom:.75rem">Bio</div>
        <p style="font-size:.72rem;line-height:1.7;color:${a.bio ? 'var(--fg)' : '#aaa'}">${a.bio || 'Noch keine Bio vorhanden. Klicke auf Bearbeiten um eine hinzuzufügen.'}</p>
        ${socialHTML ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.25rem">${socialHTML}</div>` : ''}
      </div>
      <!-- sets -->
      <div style="padding:1.5rem 2rem">
        <div style="font-size:.54rem;letter-spacing:.16em;text-transform:uppercase;color:var(--grey);margin-bottom:.75rem">${a.sets.length} Set${a.sets.length>1?'s':''}</div>
        ${setsHTML}
      </div>
    </div>
  `;
}

/* ── Artist Edit Modal ── */
function openArtistEdit(i) {
  const artists = getArtistData();
  const a = artists[i];

  // create modal
  const modal = document.createElement('div');
  modal.id = 'artist-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)';
  modal.innerHTML = `
    <div style="width:min(520px,94vw);background:var(--bg);border:2px solid var(--fg);box-shadow:10px 10px 0 rgba(0,0,0,.5);max-height:90vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.65rem 1rem;border-bottom:var(--b);background:var(--light)">
        <span style="font-family:var(--display);font-size:1.2rem;letter-spacing:.04em">${a.name}</span>
        <button onclick="closeArtistEdit()" style="background:none;border:none;color:#666;font-size:.85rem;cursor:pointer;font-family:var(--mono)">✕</button>
      </div>
      <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">

        <div class="field">
          <label class="field-label">Foto URL</label>
          <input class="field-input" id="ae-photo" value="${a.photo||''}" placeholder="https://…">
        </div>

        <div class="field">
          <label class="field-label">Bio</label>
          <textarea class="field-input" id="ae-bio" rows="4" style="resize:vertical;font-family:var(--mono);font-size:.72rem;line-height:1.6">${a.bio||''}</textarea>
        </div>

        <div class="field">
          <label class="field-label">Instagram</label>
          <input class="field-input" id="ae-instagram" value="${a.instagram||''}" placeholder="@artistname">
        </div>

        <div class="field">
          <label class="field-label">Soundcloud</label>
          <input class="field-input" id="ae-soundcloud" value="${a.soundcloud||''}" placeholder="soundcloud-username">
        </div>

        <div class="field">
          <label class="field-label">Website</label>
          <input class="field-input" id="ae-website" value="${a.website||''}" placeholder="https://…">
        </div>

        <div class="submit-area" style="margin-top:.5rem">
          <button class="submit-btn" onclick="saveArtistEdit('${a.name}', ${i})">Speichern ↗</button>
          <button class="cancel-btn" onclick="closeArtistEdit()">Abbrechen</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeArtistEdit(); });
}

function saveArtistEdit(name, i) {
  saveArtistMeta(name, {
    photo:      document.getElementById('ae-photo').value.trim(),
    bio:        document.getElementById('ae-bio').value.trim(),
    instagram:  document.getElementById('ae-instagram').value.trim(),
    soundcloud: document.getElementById('ae-soundcloud').value.trim(),
    website:    document.getElementById('ae-website').value.trim(),
  });
  closeArtistEdit();
  selectArtist(i);
  renderArtists();
}

function closeArtistEdit() {
  const m = document.getElementById('artist-modal');
  if (m) m.remove();
}

/* ═══════════════════════════════
   ADMIN — ARTISTS TAB
═══════════════════════════════ */
let adminEditingArtist = null;
let adminArtistImageData = '';

function renderAdminArtists() {
  loadSets().then(() => {
    if (!SETS.length) SETS = [...DEMO_SETS];
    const artists = getArtistData();
    document.getElementById('admin-artist-count').textContent = artists.length + (artists.length === 1 ? ' Artist' : ' Artists');

    if (!artists.length) {
      document.getElementById('admin-artist-list').innerHTML = '<div class="admin-empty">Keine Artists vorhanden</div>';
      return;
    }

    document.getElementById('admin-artist-list').innerHTML = artists.map((a, i) => {
      const thumb = a.photo
        ? `<div style="width:44px;height:44px;flex-shrink:0;background:url(${a.photo}) center/cover no-repeat;border:var(--b)"></div>`
        : `<div style="width:44px;height:44px;flex-shrink:0;background:${a.sets[0]?.color||'#222'};display:flex;align-items:center;justify-content:center;font-size:1rem;color:rgba(255,255,255,.4);font-family:var(--display);border:var(--b)">${a.name[0]}</div>`;
      const hasBio = a.bio ? '✓' : '—';
      const hasPhoto = a.photo ? '✓' : '—';
      return `<div class="set-row" style="cursor:pointer" onclick="adminSelectArtist(${i})">
        ${thumb}
        <div class="set-info" style="margin-left:.35rem">
          <div class="set-title">${a.name}</div>
          <div class="set-sub">
            <span class="set-artist">${a.sets.length} Set${a.sets.length>1?'s':''}</span>
            <span class="stag" style="${a.photo?'border-color:#2a5a2a;color:#2a5a2a':''}">Foto ${hasPhoto}</span>
            <span class="stag" style="${a.bio?'border-color:#2a5a2a;color:#2a5a2a':''}">Bio ${hasBio}</span>
            ${a.instagram ? '<span class="stag" style="border-color:#1a4a6b;color:#1a4a6b">IG</span>' : ''}
            ${a.soundcloud ? '<span class="stag" style="border-color:#f5c800;color:#9a7a00">SC</span>' : ''}
          </div>
        </div>
        <div class="set-actions">
          <button class="act-btn" onclick="event.stopPropagation();adminSelectArtist(${i})">Bearb.</button>
        </div>
      </div>`;
    }).join('');
  });
}

function adminSelectArtist(i) {
  const artists = getArtistData();
  const a = artists[i];
  if (!a) return;
  adminEditingArtist = a.name;
  adminArtistImageData = '';

  document.getElementById('artist-form-title').textContent = a.name + ' bearbeiten';
  const body = document.getElementById('artist-form-body');
  body.innerHTML = `
    <!-- Photo Upload -->
    <div class="field">
      <label class="field-label">Foto / Bild</label>
      <div class="field-hint">Bild hochladen oder URL einfügen</div>
      <div id="aa-photo-preview" style="${a.photo ? '' : 'display:none;'}position:relative;margin-bottom:.4rem">
        <img id="aa-photo-img" style="width:100%;height:140px;object-fit:cover;border:var(--b);display:block" src="${a.photo||''}">
        <button onclick="adminArtistClearPhoto()" style="position:absolute;top:4px;right:4px;background:var(--fg);color:var(--bg);border:none;font-family:var(--mono);font-size:.6rem;padding:.2rem .5rem;cursor:pointer">✕ Entfernen</button>
      </div>
      <div style="display:flex;gap:.4rem">
        <input type="file" id="aa-photo-file" accept="image/*" style="display:none" onchange="adminArtistUploadPhoto(event)">
        <button onclick="document.getElementById('aa-photo-file').click()" style="background:none;border:var(--b);color:var(--fg);padding:.45rem .75rem;font-family:var(--mono);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;flex:1;transition:background .1s" onmouseover="this.style.background='var(--fg)';this.style.color='var(--bg)'" onmouseout="this.style.background='none';this.style.color='var(--fg)'">+ Bild hochladen</button>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-top:.4rem">
        <span style="font-size:.5rem;letter-spacing:.12em;text-transform:uppercase;color:var(--grey)">Oder URL:</span>
        <input type="text" id="aa-photo-url" value="${a.photo||''}" placeholder="https://…" style="flex:1">
      </div>
    </div>

    <!-- Bio -->
    <div class="field">
      <label class="field-label">Bio / Beschreibung</label>
      <div class="field-hint">Über den Artist erzählen</div>
      <textarea id="aa-bio" rows="5" style="width:100%;background:var(--bg);border:var(--b);color:var(--fg);padding:.5rem .7rem;font-family:var(--mono);font-size:.7rem;letter-spacing:.04em;outline:none;transition:box-shadow .1s;resize:vertical;line-height:1.6" onfocus="this.style.boxShadow='3px 3px 0 var(--fg)'" onblur="this.style.boxShadow='none'">${a.bio||''}</textarea>
    </div>

    <!-- Social Links -->
    <div style="border-top:var(--b);padding-top:.9rem;margin-top:.2rem">
      <label class="field-label" style="margin-bottom:.6rem;display:block">Social & Links</label>
      <div style="display:flex;flex-direction:column;gap:.7rem">
        <div class="field">
          <label class="field-label" style="font-size:.5rem">Instagram</label>
          <input type="text" id="aa-instagram" value="${a.instagram||''}" placeholder="@artistname">
        </div>
        <div class="field">
          <label class="field-label" style="font-size:.5rem">Soundcloud</label>
          <input type="text" id="aa-soundcloud" value="${a.soundcloud||''}" placeholder="soundcloud-username">
        </div>
        <div class="field">
          <label class="field-label" style="font-size:.5rem">Website</label>
          <input type="text" id="aa-website" value="${a.website||''}" placeholder="https://…">
        </div>
      </div>
    </div>

    <!-- Submit -->
    <div class="submit-area">
      <button class="submit-btn" onclick="adminSaveArtist(${i})">Änderungen speichern ↗</button>
      <div class="status-msg" id="aa-status"></div>
    </div>
  `;

  // highlight row
  document.querySelectorAll('#admin-artist-list .set-row').forEach((row, idx) => {
    row.style.background = idx === i ? 'var(--light)' : '';
    row.style.borderLeft = idx === i ? '3px solid var(--fg)' : '';
  });
}

function adminArtistUploadPhoto(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    adminArtistImageData = ev.target.result;
    document.getElementById('aa-photo-img').src = adminArtistImageData;
    document.getElementById('aa-photo-preview').style.display = 'block';
    document.getElementById('aa-photo-url').value = '';
  };
  reader.readAsDataURL(file);
}

function adminArtistClearPhoto() {
  adminArtistImageData = '';
  document.getElementById('aa-photo-preview').style.display = 'none';
  document.getElementById('aa-photo-img').src = '';
  document.getElementById('aa-photo-url').value = '';
  document.getElementById('aa-photo-file').value = '';
}

function adminSaveArtist(i) {
  const photoUrl = document.getElementById('aa-photo-url').value.trim();
  const photo = adminArtistImageData || photoUrl;
  const bio = document.getElementById('aa-bio').value.trim();
  const instagram = document.getElementById('aa-instagram').value.trim();
  const soundcloud = document.getElementById('aa-soundcloud').value.trim();
  const website = document.getElementById('aa-website').value.trim();

  saveArtistMeta(adminEditingArtist, { photo, bio, instagram, soundcloud, website });

  const msg = document.getElementById('aa-status');
  msg.textContent = '✓ Gespeichert'; msg.className = 'status-msg ok';
  setTimeout(() => { msg.textContent = ''; msg.className = 'status-msg'; }, 3000);
  toast('✓ Artist aktualisiert');

  // refresh list
  renderAdminArtists();
  // re-select the same artist to show updated preview
  setTimeout(() => adminSelectArtist(i), 100);
}

function showLogin() {
  // Redirect to user login modal
  userAction();
}

/* ── ADMIN TABS ── */
function adminShowTab(tab) {
  const tabs = ['sets', 'artists', 'info'];
  tabs.forEach(t => {
    const panel = document.getElementById('admin-tab-' + t + '-panel');
    const btn = document.getElementById('admin-tab-' + t);
    if (panel) panel.style.display = (t === tab) ? (t === 'sets' ? '' : 'block') : 'none';
    if (btn) {
      btn.style.background = (t === tab) ? 'var(--fg)' : 'none';
      btn.style.color = (t === tab) ? 'var(--bg)' : '#888';
    }
  });
  if (tab === 'info') loadInfoText();
  if (tab === 'artists') renderAdminArtists();
}

async function loadInfoText() {
  try {
    const data = JSON.parse(localStorage.getItem('gleis13-info') || 'null');
    if (!data) return;
    document.getElementById('info-ticker').value = data.ticker || '';
    document.getElementById('info-headline').value = data.headline || '';
    document.getElementById('info-p1').value = data.paragraph1 || '';
    document.getElementById('info-p2').value = data.paragraph2 || '';
    document.getElementById('info-email').value = data.email || '';
    document.getElementById('info-instagram').value = data.instagram || '';
    document.getElementById('info-soundcloud').value = data.soundcloud || '';
  } catch(e) {}
}

async function saveInfoText() {
  const msg = document.getElementById('info-status-msg');
  try {
    localStorage.setItem('gleis13-info', JSON.stringify({
      ticker: document.getElementById('info-ticker').value,
      headline: document.getElementById('info-headline').value,
      paragraph1: document.getElementById('info-p1').value,
      paragraph2: document.getElementById('info-p2').value,
      email: document.getElementById('info-email').value,
      instagram: document.getElementById('info-instagram').value,
      soundcloud: document.getElementById('info-soundcloud').value,
    }));
    // Update tickers live
    applyCustomTicker();
    msg.textContent = '✓ Gespeichert';
    setTimeout(() => msg.textContent = '', 2500);
  } catch(e) { msg.textContent = 'Fehler'; }
}

function showAdmin() {
  document.getElementById('view-main').classList.add('hidden');
  document.getElementById('view-info').classList.add('hidden');
  document.getElementById('view-artists').classList.add('hidden');
  document.getElementById('view-favs').classList.add('hidden');
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-admin').classList.remove('hidden');
  loadAdminData();
}

/* ═══════════════════════════════
   STORAGE — Netlify Functions API
   GET  /api/sets        → list all sets
   POST /api/sets/save   → save/update a set { ...setObj }
   POST /api/sets/delete → delete a set { id }
   GET  /api/genres      → list custom genres
═══════════════════════════════ */
async function loadSets() {
  try {
    const raw = localStorage.getItem('gleis13-sets');
    if (raw) { SETS = JSON.parse(raw); if (SETS.length) return; }
  } catch(e) {}
  if (!SETS.length) SETS = [...DEMO_SETS];
}

async function loadGenres() {
  try {
    const raw = localStorage.getItem('gleis13-genres');
    if (raw) {
      const list = JSON.parse(raw);
      list.forEach(g => { if (!ALL_GENRES.includes(g)) ALL_GENRES.push(g); });
    }
  } catch(e) {}
}

async function saveSets(setObj) {
  try {
    // upsert into SETS array
    const idx = SETS.findIndex(s => s.id === setObj.id);
    if (idx >= 0) SETS[idx] = setObj; else SETS.unshift(setObj);
    localStorage.setItem('gleis13-sets', JSON.stringify(SETS));
    await saveGenres();
    return true;
  } catch(e) { console.error(e); return false; }
}

async function deleteSetFromApi(id) {
  try {
    SETS = SETS.filter(s => s.id !== id);
    localStorage.setItem('gleis13-sets', JSON.stringify(SETS));
    return true;
  } catch(e) { return false; }
}

async function saveGenres() {
  try {
    const customGenres = ALL_GENRES.filter(g => !DEFAULT_GENRES.includes(g));
    localStorage.setItem('gleis13-genres', JSON.stringify(customGenres));
  } catch(e) {}
}

/* ═══════════════════════════════
   MAIN SITE
═══════════════════════════════ */
async function loadAndRender() {
  await loadSets();
  buildTicker();
  buildFilters();
  renderGrid(activeFilter);
}

function buildTicker() {
  if (!SETS.length) return;
  const items = SETS.map(s =>
    `<span>${s.artist}</span><span class="tick-dot">—</span><span>${s.title}</span><span class="tick-dot">·</span>`
  ).join('');
  document.getElementById('ticker-inner').innerHTML = items + items;
}

function buildFilters() {
  const genres = new Set();
  SETS.forEach(s => (Array.isArray(s.genres) ? s.genres : (s.genre ? [s.genre] : [])).forEach(g => genres.add(g)));
  const bar = document.getElementById('filter-bar');
  bar.querySelectorAll('.ftag:not([data-filter="all"])').forEach(b => b.remove());
  genres.forEach(g => {
    const b = document.createElement('button');
    b.className = 'ftag'; b.dataset.filter = g; b.textContent = g;
    b.addEventListener('click', () => setFilter(g));
    bar.appendChild(b);
  });
  document.querySelector('.ftag[data-filter="all"]').addEventListener('click', () => setFilter('all'));
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.ftag').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  if (openCard !== null) {
    const pi = document.getElementById('iframe-' + openCard);
    if (pi) pi.src = '';
    openCard = null;
  }
  renderGrid(f);
}

function renderGrid(filter) {
  const sets = filter === 'all' ? SETS : SETS.filter(s => {
    const g = Array.isArray(s.genres) ? s.genres : (s.genre ? [s.genre] : []);
    return g.includes(filter);
  });
  document.getElementById('count').textContent = sets.length;

  if (!sets.length) {
    document.getElementById('grid').innerHTML = '<div class="empty">Keine Sets vorhanden</div>';
    return;
  }

  document.getElementById('grid').innerHTML = sets.map(s => {
    const idx = SETS.indexOf(s);
    const isOpen = openCard === idx;
    const genres = (Array.isArray(s.genres) ? s.genres : [s.genre]).filter(Boolean);
    const gTags = genres.map(g => `<span class="tag">${g}</span>`).join('');
    const eTags = (s.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const slug = (s.soundcloud_url || '').replace(/^https?:\/\//, '');
    const platform = getPlatform(s.soundcloud_url);
    const platformBadge = platform === 'youtube'
      ? '<span style="color:#d63c1f;margin-right:.3rem;font-size:.5rem">▶ YT</span>'
      : '<span style="color:#f5c800;margin-right:.3rem;font-size:.5rem">☁ SC</span>';

    const cardImage = s.image || (platform === 'youtube' ? 'https://img.youtube.com/vi/' + getYoutubeId(s.soundcloud_url) + '/hqdefault.jpg' : '');

    return `<div class="card${isOpen ? ' open' : ''}" id="card-${idx}">
      <div class="chrome">
        <div class="dots">
          <div class="dot${isOpen ? ' filled' : ''}"></div>
          <div class="dot"></div>
        </div>
        <div class="chrome-url">${platformBadge}${slug}</div>
        <div class="chrome-date">${fmtDate(s.date)}</div>
      </div>
      ${cardImage ? `<div style="position:relative;padding-bottom:56.25%;background:url(${cardImage}) center/cover no-repeat;border-bottom:var(--b)">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:.4rem .75rem;display:flex;gap:.3rem;flex-wrap:wrap;background:linear-gradient(transparent,rgba(0,0,0,0.55))">
          ${gTags.replace(/class="tag"/g, 'style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.4);color:rgba(255,255,255,0.9);padding:.08rem .35rem;background:rgba(0,0,0,0.3)"')}
          ${eTags.replace(/class="tag"/g, 'style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.7);padding:.08rem .35rem;background:rgba(0,0,0,0.3)"')}
        </div>
      </div>` : ''}
      <div class="card-body" onclick="toggleCard(${idx})">
        <div class="stripe" style="background:${s.color || '#333'}"></div>
        <div class="card-content">
          ${!cardImage ? `<div class="tags">${gTags}${eTags}</div>` : ''}
          <div class="title">${s.title}</div>
          <div class="artist">${s.artist}</div>
          <div class="waveform">
            <div class="wb"></div><div class="wb"></div><div class="wb"></div>
            <div class="wb"></div><div class="wb"></div>
          </div>
        </div>
        <div class="card-side">
          <button class="play-btn" onclick="event.stopPropagation();toggleCard(${idx})">${isOpen ? '■' : '▶'}</button>
          ${CURRENT_USER ? `<button class="fav-btn${isFav(s.id) ? ' liked' : ''}" onclick="event.stopPropagation();toggleFav('${s.id}')">${isFav(s.id) ? '♥' : '♡'}</button>` : ''}
          <div class="dur">${s.duration || ''}</div>
        </div>
      </div>
      <div class="card-action">
        <button class="play-link" onclick="toggleCard(${idx})">${isOpen ? 'Schließen ↑' : 'Abspielen ↗'}</button>
        <button class="share-link" onclick="event.stopPropagation();shareSet(${idx},this)">
          <span class="share-copied" id="copied-${idx}">✓ Kopiert</span>
          Teilen ↗
        </button>
      </div>
      <div class="card-player">
        ${platform === 'youtube' ? `
          <div id="yt-container-${idx}" style="position:relative;padding-bottom:56.25%;background:#000 center/cover no-repeat;border-bottom:1px solid #222;cursor:pointer;background-image:url(https://img.youtube.com/vi/${getYoutubeId(s.soundcloud_url)}/hqdefault.jpg)" onclick="ytPlay(${idx})">
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);transition:background .15s" onmouseover="this.style.background='rgba(0,0,0,0.15)'" onmouseout="this.style.background='rgba(0,0,0,0.35)'">
              <div style="width:64px;height:44px;background:#d63c1f;border-radius:8px;display:flex;align-items:center;justify-content:center">
                <div style="width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent white;margin-left:3px"></div>
              </div>
            </div>
          </div>
          <div class="mini-player" id="mini-${idx}">
            <div style="width:32px;height:32px;border:1.5px solid #d63c1f;color:#d63c1f;display:flex;align-items:center;justify-content:center;font-size:.5rem;flex-shrink:0;letter-spacing:.06em">YT</div>
            <div class="mini-info">
              <div class="mini-title">${s.artist} — ${s.title}</div>
              <div style="display:flex;gap:.5rem;margin-top:.25rem">
                <a href="${s.soundcloud_url}" target="_blank" style="font-size:.48rem;color:#d63c1f;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Auf YouTube öffnen ↗</a>
              </div>
            </div>
          </div>
        ` : `
          <iframe id="iframe-${idx}" scrolling="no" frameborder="no" allow="autoplay" src=""></iframe>
          <div class="mini-player" id="mini-${idx}">
            <button class="mini-play" id="playbtn-${idx}" onclick="togglePlay(${idx})">▶</button>
            <div class="mini-info">
              <div class="mini-title">${s.artist} — ${s.title}</div>
              <div class="mini-progress" onclick="seekTo(event,${idx})"><div class="mini-bar" id="bar-${idx}"></div></div>
            </div>
            <div class="mini-time" id="time-${idx}">—</div>
          </div>
        `}
      </div>
    </div>`;
  }).join('');
}

/* ── SC Widget API ── */
const SC_WIDGETS = {};
let scTimer = null;

// Load SC API script once
(function() {
  const s = document.createElement('script');
  s.src = 'https://w.soundcloud.com/player/api.js';
  document.head.appendChild(s);
})();

function waitForSC(cb, tries = 0) {
  if (window.SC && window.SC.Widget) { cb(); return; }
  if (tries > 30) return;
  setTimeout(() => waitForSC(cb, tries + 1), 200);
}

function initWidget(idx, iframe) {
  waitForSC(() => {
    try {
      const widget = SC.Widget(iframe);
      SC_WIDGETS[idx] = widget;

      widget.bind(SC.Widget.Events.PLAY, () => {
        const btn = document.getElementById('playbtn-' + idx);
        if (btn) { btn.textContent = '■'; btn.classList.add('playing'); }
        spShow(idx);
        spUpdatePlay(true);
        startTimer(idx, widget);
      });
      widget.bind(SC.Widget.Events.PAUSE, () => {
        const btn = document.getElementById('playbtn-' + idx);
        if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
        spUpdatePlay(false);
        clearInterval(scTimer);
      });
      widget.bind(SC.Widget.Events.FINISH, () => {
        const btn = document.getElementById('playbtn-' + idx);
        if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
        const bar = document.getElementById('bar-' + idx);
        if (bar) bar.style.width = '100%';
        spUpdatePlay(false);
        spUpdateProgress(100, 0, 0);
        clearInterval(scTimer);
      });
    } catch(e) { console.warn('SC widget init failed:', e); }
  });
}

function toggleCard(idx) {
  if (openCard !== null && openCard !== idx) {
    const w = SC_WIDGETS[openCard];
    if (w) { try { w.pause(); } catch(e){} }
    // Also stop YouTube if playing
    const ytFrame = document.getElementById('yt-iframe-' + openCard);
    if (ytFrame) ytFrame.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    clearInterval(scTimer);
  }
  const wasOpen = openCard === idx;
  openCard = wasOpen ? null : idx;
  renderGrid(activeFilter);
  if (!wasOpen) {
    setTimeout(() => {
      const card = document.getElementById('card-' + idx);
      const s = SETS[idx];
      const platform = getPlatform(s.soundcloud_url);

      if (platform === 'youtube') {
        // YouTube uses click-to-play thumbnail, just show the sticky player
        spShow(idx);
      } else {
        const iframe = document.getElementById('iframe-' + idx);
        if (!iframe) return;
        iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(s.soundcloud_url)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
        iframe.addEventListener('load', () => initWidget(idx, iframe), { once: true });
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

function startTimer(idx, widget) {
  clearInterval(scTimer);
  scTimer = setInterval(() => {
    try {
      widget.getPosition(pos => {
        widget.getDuration(dur => {
          if (!dur) return;
          const pct = parseFloat((pos / dur * 100).toFixed(2));
          const bar = document.getElementById('bar-' + idx);
          const time = document.getElementById('time-' + idx);
          if (bar) { bar.style.transition = 'none'; bar.style.width = pct + '%'; }
          if (time) time.textContent = fmtMs(pos) + ' / ' + fmtMs(dur);
          // also update sticky player
          if (spIdx === idx) spUpdateProgress(pct, pos, dur);
        });
      });
    } catch(e) {}
  }, 500);
}

function togglePlay(idx) {
  const w = SC_WIDGETS[idx];
  if (!w) return;
  try { w.toggle(); } catch(e) {}
}

function seekTo(e, idx) {
  const w = SC_WIDGETS[idx];
  if (!w) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  w.getDuration(dur => { try { w.seekTo(pct * dur); } catch(err){} });
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return h + ':' + String(m % 60).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  return m + ':' + String(s % 60).padStart(2,'0');
}

/* ── STICKY PLAYER ── */
let spIdx = null;

function spShow(idx) {
  const s = SETS[idx];
  if (!s) return;
  spIdx = idx;
  const sp = document.getElementById('sticky-player');
  document.getElementById('sp-title').textContent = s.title;
  document.getElementById('sp-artist').textContent = s.artist;
  document.getElementById('sp-stripe').style.background = s.color || '#333';
  const thumb = document.getElementById('sp-thumb');
  thumb.style.backgroundImage = s.image ? `url(${s.image})` : 'none';
  thumb.style.background = s.image ? `url(${s.image}) center/cover no-repeat` : (s.color || '#111');
  sp.style.display = 'flex';
  requestAnimationFrame(() => { sp.style.transform = 'translateY(0)'; });

}

function spHide() {
  const sp = document.getElementById('sticky-player');
  sp.style.transform = 'translateY(100%)';
  setTimeout(() => { sp.style.display = 'none'; }, 260);

  spIdx = null;
}

function spClose() {
  // also close the open card
  if (openCard !== null) {
    const w = SC_WIDGETS[openCard];
    if (w) { try { w.pause(); } catch(e){} }
    // Stop YouTube
    const ytFrame = document.getElementById('yt-iframe-' + openCard);
    if (ytFrame) { ytFrame.src = ''; }
    clearInterval(scTimer);
    openCard = null;
    renderGrid(activeFilter);
  }
  spHide();
}

function spTogglePlay() {
  if (spIdx === null) return;
  const w = SC_WIDGETS[spIdx];
  if (w) { try { w.toggle(); } catch(e){} }
}

function spSeek(e) {
  if (spIdx === null) return;
  const w = SC_WIDGETS[spIdx];
  if (!w) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  w.getDuration(dur => { try { w.seekTo(pct * dur); } catch(err){} });
}

function spExpand() {
  if (spIdx === null) return;
  const s = SETS[spIdx];
  const platform = getPlatform(s.soundcloud_url);
  const exp = document.getElementById('sp-expanded');
  document.getElementById('sp-exp-title').textContent = s.title;
  document.getElementById('sp-exp-artist').textContent = s.artist;
  document.getElementById('sp-exp-stripe').style.background = s.color || '#333';
  const cover = document.getElementById('sp-exp-cover');

  if (platform === 'youtube') {
    const ytId = getYoutubeId(s.soundcloud_url);
    cover.style.paddingBottom = '56.25%';
    cover.style.position = 'relative';
    cover.style.backgroundImage = 'url(https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg)';
    cover.style.backgroundSize = 'cover';
    cover.style.backgroundPosition = 'center';
    cover.style.cursor = 'pointer';
    cover.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:72px;height:50px;background:#d63c1f;border-radius:10px;display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-style:solid;border-width:12px 0 12px 20px;border-color:transparent transparent transparent white;margin-left:4px"></div></div></div><div id="sp-exp-stripe" style="position:absolute;bottom:0;left:0;right:0;height:4px;background:' + (s.color||'#333') + '"></div>';
    cover.onclick = function() {
      cover.onclick = null;
      cover.style.cursor = 'default';
      cover.innerHTML = '<iframe style="position:absolute;inset:0;width:100%;height:100%;border:none" src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0&modestbranding=1" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen></iframe>';
    };
    document.getElementById('sp-exp-playbtn').style.display = 'none';
  } else {
    cover.innerHTML = `<div id="sp-exp-stripe" style="position:absolute;bottom:0;left:0;right:0;height:4px;background:${s.color||'#333'}"></div>`;
    cover.style.backgroundImage = s.image ? `url(${s.image})` : 'none';
    cover.style.background = s.image ? `url(${s.image}) center/cover no-repeat` : (s.color || '#111');
    cover.style.paddingBottom = '56.25%';
    document.getElementById('sp-exp-playbtn').style.display = '';
    // sync progress
    const bar = document.getElementById('sp-bar');
    if (bar) document.getElementById('sp-exp-bar').style.width = bar.style.width;
    const time = document.getElementById('sp-time');
    if (time) document.getElementById('sp-exp-time').textContent = time.textContent;
    const playbtn = document.getElementById('sp-playbtn');
    if (playbtn) document.getElementById('sp-exp-playbtn').textContent = playbtn.textContent;
  }
  exp.style.display = 'flex';
  requestAnimationFrame(() => exp.style.opacity = '1');
}

function spCollapse() {
  document.getElementById('sp-expanded').style.display = 'none';
}

function spSeekExp(e) {
  if (spIdx === null) return;
  const w = SC_WIDGETS[spIdx];
  if (!w) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  w.getDuration(dur => { try { w.seekTo(pct * dur); } catch(err){} });
}

function spUpdatePlay(isPlaying) {
  const sym = isPlaying ? '■' : '▶';
  const btn = document.getElementById('sp-playbtn');
  const expBtn = document.getElementById('sp-exp-playbtn');
  if (btn) btn.textContent = sym;
  if (expBtn) expBtn.textContent = sym;
}

function spUpdateProgress(pct, pos, dur) {
  const bar = document.getElementById('sp-bar');
  const time = document.getElementById('sp-time');
  const expBar = document.getElementById('sp-exp-bar');
  const expTime = document.getElementById('sp-exp-time');
  const t = fmtMs(pos) + ' / ' + fmtMs(dur);
  if (bar) bar.style.width = pct + '%';
  if (time) time.textContent = t;
  if (expBar) expBar.style.width = pct + '%';
  if (expTime) expTime.textContent = t;
}

/* ═══════════════════════════════
   ADMIN
═══════════════════════════════ */
async function loadAdminData() {
  await loadSets();
  await loadGenres();
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
  buildColorPicker();
  setupTagsInput();
  setupGenreAdd();
  renderAdminList();
  renderGenreChips();
}

function renderAdminList() {
  document.getElementById('admin-count').textContent = SETS.length + (SETS.length === 1 ? ' Set' : ' Sets');
  if (!SETS.length) {
    document.getElementById('admin-list').innerHTML = '<div class="admin-empty">Noch keine Sets</div>';
    return;
  }
  const sorted = [...SETS].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  document.getElementById('admin-list').innerHTML = sorted.map(s => {
    const genres = (Array.isArray(s.genres) ? s.genres : [s.genre]).filter(Boolean);
    const gTags = genres.map(g => `<span class="stag">${g}</span>`).join('');
    const eTags = (s.tags || []).map(t => `<span class="stag">${t}</span>`).join('');
    return `<div class="set-row">
      <div class="set-stripe" style="background:${s.color || '#333'}"></div>
      <div class="set-info">
        <div class="set-title">${s.title}</div>
        <div class="set-sub">
          <span class="set-artist">${s.artist}</span>${gTags}${eTags}
          ${s.duration ? `<span class="stag">${s.duration}</span>` : ''}
        </div>
      </div>
      <div class="set-date">${fmtDate(s.date)}</div>
      <div class="set-actions">
        <button class="act-btn" onclick="startEdit('${s.id}')">Bearb.</button>
        <button class="act-btn del" onclick="deleteSet('${s.id}')">Löschen</button>
      </div>
    </div>`;
  }).join('');
}

/* genre */
function renderGenreChips() {
  document.getElementById('genre-chips').innerHTML = ALL_GENRES.map(g =>
    `<button class="genre-chip${selectedGenres.includes(g) ? ' selected' : ''}" onclick="toggleGenre('${g}')">${g}</button>`
  ).join('');
}
function toggleGenre(g) {
  selectedGenres = selectedGenres.includes(g) ? selectedGenres.filter(x => x !== g) : [...selectedGenres, g];
  renderGenreChips();
}
function setupGenreAdd() {
  const inp = document.getElementById('new-genre-input');
  const doAdd = () => {
    const v = inp.value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!v) return;
    if (!ALL_GENRES.includes(v)) ALL_GENRES.push(v);
    if (!selectedGenres.includes(v)) selectedGenres.push(v);
    saveGenres(); renderGenreChips(); inp.value = '';
  };
  document.getElementById('add-genre-btn').addEventListener('click', doAdd);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
}

/* tags */
function setupTagsInput() {
  const inp = document.getElementById('tags-input');
  inp.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
      e.preventDefault(); addTag(inp.value.trim().replace(/,$/, '')); inp.value = '';
    }
    if (e.key === 'Backspace' && !inp.value && tags.length) removeTag(tags[tags.length - 1]);
  });
  document.getElementById('tags-wrap').addEventListener('click', () => inp.focus());
}
function addTag(v) { if (!v || tags.includes(v)) return; tags.push(v); renderTags(); }
function removeTag(v) { tags = tags.filter(t => t !== v); renderTags(); }
function renderTags() {
  const w = document.getElementById('tags-wrap');
  const inp = document.getElementById('tags-input');
  w.querySelectorAll('.tag-chip').forEach(c => c.remove());
  tags.forEach(t => {
    const c = document.createElement('div'); c.className = 'tag-chip';
    c.innerHTML = `${t}<button onclick="removeTag('${t}')">×</button>`;
    w.insertBefore(c, inp);
  });
}

/* color */
function buildColorPicker() {
  document.getElementById('color-row').innerHTML = COLORS.map(c =>
    `<div class="color-swatch${c === selectedColor ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectColor('${c}')"></div>`
  ).join('');
}
function selectColor(c) {
  selectedColor = c;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === c));
}

/* reset / edit */
/* image handling */
let currentImageData = '';
function handleImageUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    currentImageData = ev.target.result;
    document.getElementById('img-preview-img').src = currentImageData;
    document.getElementById('img-preview').style.display = 'block';
    document.getElementById('f-image-url').value = '';
  };
  reader.readAsDataURL(file);
}
function handleImageUrl(url) {
  url = url.trim();
  if (!url) return;
  currentImageData = url;
  document.getElementById('img-preview-img').src = url;
  document.getElementById('img-preview').style.display = 'block';
  document.getElementById('f-image').value = '';
}
function clearImage() {
  currentImageData = '';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('img-preview-img').src = '';
  document.getElementById('f-image').value = '';
  document.getElementById('f-image-url').value = '';
}

function resetForm() {
  ['f-url', 'f-title', 'f-artist', 'f-duration'].forEach(id => document.getElementById(id).value = '');
  clearImage();
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
  selectedGenres = []; renderGenreChips();
  tags = []; renderTags();
  editingId = null;
  selectedColor = '#d63c1f'; buildColorPicker();
  document.getElementById('form-title').textContent = 'Neues Set hinzufügen';
  document.getElementById('submit-btn').textContent = 'Set speichern ↗';
  document.getElementById('cancel-btn').style.display = 'none';
  document.getElementById('f-image-url').value = '';
  document.getElementById('status-msg').textContent = '';
}

function startEdit(id) {
  const s = SETS.find(x => x.id === id); if (!s) return;
  editingId = id;
  document.getElementById('f-url').value      = s.soundcloud_url || '';
  if (s.image) {
    currentImageData = s.image;
    document.getElementById('img-preview-img').src = s.image;
    document.getElementById('img-preview').style.display = 'block';
    // If image is a URL (not base64), show it in the URL field
    if (s.image && !s.image.startsWith('data:')) {
      document.getElementById('f-image-url').value = s.image;
    } else {
      document.getElementById('f-image-url').value = '';
    }
  } else { clearImage(); }
  document.getElementById('f-title').value    = s.title || '';
  document.getElementById('f-artist').value   = s.artist || '';
  document.getElementById('f-duration').value = s.duration || '';
  document.getElementById('f-date').value     = s.date || '';
  selectedGenres = Array.isArray(s.genres) ? [...s.genres] : (s.genre ? [s.genre] : []);
  renderGenreChips();
  tags = [...(s.tags || [])]; renderTags();
  selectColor(s.color || '#d63c1f');
  document.getElementById('form-title').textContent = 'Set bearbeiten';
  document.getElementById('submit-btn').textContent = 'Änderungen speichern ↗';
  document.getElementById('cancel-btn').style.display = 'block';
  document.querySelector('.admin-form-panel').scrollIntoView({ behavior: 'smooth' });
}
document.getElementById('cancel-btn').addEventListener('click', resetForm);

/* submit */
document.getElementById('submit-btn').addEventListener('click', async () => {
  const url      = document.getElementById('f-url').value.trim();
  const title    = document.getElementById('f-title').value.trim();
  const artist   = document.getElementById('f-artist').value.trim();
  const duration = document.getElementById('f-duration').value.trim();
  const date     = document.getElementById('f-date').value;
  if (!url || !title || !artist) { setStatus('URL, Titel und Artist sind Pflicht', 'err'); return; }
  if (!url.includes('soundcloud.com') && !url.includes('youtube.com') && !url.includes('youtu.be')) { setStatus('Bitte eine SoundCloud oder YouTube URL', 'err'); return; }
  if (!selectedGenres.length) { setStatus('Bitte mindestens ein Genre', 'err'); return; }
  showLoading(true);
  const set = {
    id: editingId || Date.now().toString(),
    soundcloud_url: url, title, artist,
    genres: [...selectedGenres], genre: selectedGenres[0],
    duration, date, tags: [...tags], color: selectedColor,
    image: currentImageData || (editingId ? (SETS.find(s=>s.id===editingId)||{}).image||'' : ''),
  };
  if (editingId) { const i = SETS.findIndex(s => s.id === editingId); if (i !== -1) SETS[i] = set; }
  else SETS.unshift(set);
  const ok = await saveSets(set);
  showLoading(false);
  if (ok) { toast(editingId ? '✓ Aktualisiert' : '✓ Gespeichert'); resetForm(); renderAdminList(); }
  else setStatus('Fehler beim Speichern', 'err');
});

async function deleteSet(id) {
  if (!confirm('Set wirklich löschen?')) return;
  showLoading(true);
  const ok = await deleteSetFromApi(id);
  if (ok) {
    SETS = SETS.filter(s => s.id !== id);
    toast('Set gelöscht');
  } else {
    toast('Fehler beim Löschen', 'err');
  }
  showLoading(false);
  renderAdminList();
}

/* helpers */
function setStatus(m, t) {
  const el = document.getElementById('status-msg');
  el.textContent = m; el.className = 'status-msg ' + (t || '');
  setTimeout(() => { el.textContent = ''; el.className = 'status-msg'; }, 4000);
}
function toast(m, t) {
  const el = document.getElementById('toast');
  el.textContent = m; el.className = 'toast ' + (t || '') + ' show';
  setTimeout(() => { el.className = 'toast ' + (t || ''); }, 3000);
}
function showLoading(v) { document.getElementById('loading').classList.toggle('show', v); }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ═══════════════════════════════
   USER SYSTEM
═══════════════════════════════ */
let CURRENT_USER = null;

let _usersCache = null;
function getUsers() {
  if (_usersCache) return _usersCache;
  try {
    const raw = localStorage.getItem('gleis13-users');
    if (raw) { _usersCache = JSON.parse(raw); return _usersCache; }
  } catch(e) {}
  _usersCache = {};
  return _usersCache;
}
function saveUsers(users) {
  _usersCache = users;
  try { localStorage.setItem('gleis13-users', JSON.stringify(users)); } catch(e) {}
}
function getUserFavs() {
  if (!CURRENT_USER) return [];
  const users = getUsers();
  return users[CURRENT_USER]?.favs || [];
}
function setUserFavs(favs) {
  if (!CURRENT_USER) return;
  const users = getUsers();
  if (!users[CURRENT_USER]) return;
  users[CURRENT_USER].favs = favs;
  saveUsers(users);
}

function userAction() {
  if (CURRENT_USER) {
    showUserMenu();
  } else {
    showUserLogin();
  }
}

function showUserLogin() {
  document.getElementById('user-menu-modal').style.display = 'none';
  const modal = document.getElementById('user-modal');
  modal.style.display = 'flex';
  document.getElementById('u-login-name').value = '';
  document.getElementById('u-login-pw').value = '';
  document.getElementById('u-reg-name').value = '';
  document.getElementById('u-reg-pw').value = '';
  document.getElementById('user-msg').textContent = '';
  document.getElementById('user-modal-title').textContent = 'Anmelden';
  userTabSwitch('login');
  setTimeout(() => document.getElementById('u-login-name').focus(), 100);
}

// Enter key support for login fields
document.getElementById('u-login-name').addEventListener('keydown', e => { if (e.key === 'Enter') doUserLogin(); });
document.getElementById('u-login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') doUserLogin(); });
document.getElementById('u-reg-name').addEventListener('keydown', e => { if (e.key === 'Enter') doUserRegister(); });
document.getElementById('u-reg-pw').addEventListener('keydown', e => { if (e.key === 'Enter') doUserRegister(); });
// Close on backdrop click
document.getElementById('user-modal').addEventListener('click', e => { if (e.target.id === 'user-modal') closeUserModal(); });
document.getElementById('user-menu-modal').addEventListener('click', e => { if (e.target.id === 'user-menu-modal') closeUserModal(); });

function userTabSwitch(tab) {
  document.getElementById('ut-login').classList.toggle('active', tab === 'login');
  document.getElementById('ut-register').classList.toggle('active', tab === 'register');
  document.getElementById('user-form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('user-form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('user-msg').textContent = '';
}

function doUserLogin() {
  const name = document.getElementById('u-login-name').value.trim();
  const pw = document.getElementById('u-login-pw').value;
  const msg = document.getElementById('user-msg');
  if (!name || !pw) { msg.textContent = 'Bitte ausfüllen'; msg.className = 'status-msg err'; return; }

  // Hardcoded admin fallback — always works
  if (name === 'admin' && pw === 'gleis13') {
    CURRENT_USER = 'admin';
    IS_ADMIN = true;
    try { localStorage.setItem('gleis13-current-user', 'admin'); } catch(e) {}
    closeUserModal();
    updateUserUI();
    toast('✓ Willkommen, admin');
    if (!document.getElementById('view-main').classList.contains('hidden')) renderGrid(activeFilter);
    return;
  }

  const users = getUsers();
  if (!users[name]) { msg.textContent = 'User nicht gefunden'; msg.className = 'status-msg err'; return; }
  if (users[name].pw !== pw) { msg.textContent = 'Falsches Passwort'; msg.className = 'status-msg err'; return; }
  CURRENT_USER = name;
  IS_ADMIN = !!users[name].admin;
  try { localStorage.setItem('gleis13-current-user', name); } catch(e) {}
  closeUserModal();
  updateUserUI();
  toast('✓ Willkommen, ' + name);
  if (!document.getElementById('view-main').classList.contains('hidden')) renderGrid(activeFilter);
}

function doUserRegister() {
  const name = document.getElementById('u-reg-name').value.trim();
  const pw = document.getElementById('u-reg-pw').value;
  const msg = document.getElementById('user-msg');
  if (!name || !pw) { msg.textContent = 'Bitte ausfüllen'; msg.className = 'status-msg err'; return; }
  if (name.length < 2) { msg.textContent = 'Min. 2 Zeichen für Username'; msg.className = 'status-msg err'; return; }
  if (pw.length < 4) { msg.textContent = 'Min. 4 Zeichen für Passwort'; msg.className = 'status-msg err'; return; }
  const users = getUsers();
  if (users[name]) { msg.textContent = 'Username vergeben'; msg.className = 'status-msg err'; return; }
  users[name] = { pw: pw, favs: [] };
  saveUsers(users);
  CURRENT_USER = name;
  try { localStorage.setItem('gleis13-current-user', name); } catch(e) {}
  closeUserModal();
  updateUserUI();
  toast('✓ Account erstellt!');
  if (!document.getElementById('view-main').classList.contains('hidden')) renderGrid(activeFilter);
}

function showUserMenu() {
  document.getElementById('user-modal').style.display = 'none';
  const modal = document.getElementById('user-menu-modal');
  const favCount = getUserFavs().length;
  const adminBadge = IS_ADMIN ? ' <span style="font-family:var(--mono);font-size:.5rem;letter-spacing:.12em;background:#f5c800;color:var(--fg);padding:.1rem .35rem;margin-left:.4rem;vertical-align:middle">ADMIN</span>' : '';
  document.getElementById('um-title').innerHTML = CURRENT_USER + adminBadge;
  const adminBtn = IS_ADMIN ? '<button onclick="closeUserModal();showAdmin()" style="background:none;border:var(--b);color:var(--fg);padding:.6rem;font-family:var(--mono);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;width:100%">⚙ Admin-Bereich</button>' : '';
  document.getElementById('um-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;padding-bottom:.75rem;border-bottom:1px solid #ddd">
      <div style="width:44px;height:44px;background:${IS_ADMIN ? '#f5c800' : 'var(--fg)'};color:${IS_ADMIN ? 'var(--fg)' : 'var(--bg)'};display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:1.4rem">${CURRENT_USER[0].toUpperCase()}</div>
      <div>
        <div style="font-family:var(--display);font-size:1.1rem;letter-spacing:.04em">${CURRENT_USER}</div>
        <div style="font-size:.54rem;letter-spacing:.12em;text-transform:uppercase;color:var(--grey)">${favCount} Favorit${favCount !== 1 ? 'en' : ''}${IS_ADMIN ? ' · Admin' : ''}</div>
      </div>
    </div>
    ${adminBtn}
    <button onclick="closeUserModal();showView('favs')" style="background:none;border:var(--b);color:var(--fg);padding:.6rem;font-family:var(--mono);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;width:100%">♥ Meine Favoriten</button>
    <button onclick="doUserLogout()" style="background:none;border:1px solid #ccc;color:var(--grey);padding:.6rem;font-family:var(--mono);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;width:100%">Ausloggen</button>`;
  modal.style.display = 'flex';
}

function doUserLogout() {
  CURRENT_USER = null;
  IS_ADMIN = false;
  try { localStorage.removeItem('gleis13-current-user'); } catch(e) {}
  closeUserModal();
  updateUserUI();
  toast('Ausgeloggt');
  if (!document.getElementById('view-main').classList.contains('hidden')) renderGrid(activeFilter);
}

function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
  document.getElementById('user-menu-modal').style.display = 'none';
}

function updateUserUI() {
  const label = CURRENT_USER || 'Login';
  document.getElementById('nav-user-label-main').textContent = label;
  document.querySelectorAll('.nav-user-label').forEach(el => el.textContent = label);
  const bnLabel = document.getElementById('bn-user-label');
  if (bnLabel) bnLabel.textContent = CURRENT_USER || 'Login';
  // Update dot color
  document.querySelectorAll('.nav-user .user-dot').forEach(d => {
    d.style.background = CURRENT_USER ? '#2a5a2a' : '#f5c800';
  });
}

function toggleFav(id) {
  if (!CURRENT_USER) { showUserLogin(); return; }
  let favs = getUserFavs();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  setUserFavs(favs);
  renderGrid(activeFilter);
  // Also update fav view if open
  if (!document.getElementById('view-favs').classList.contains('hidden')) renderFavGrid();
}

function isFav(id) {
  return getUserFavs().includes(id);
}

function renderFavGrid() {
  const favs = getUserFavs();
  const favSets = SETS.filter(s => favs.includes(s.id));
  document.getElementById('fav-count').textContent = favSets.length;
  if (!CURRENT_USER) {
    document.getElementById('fav-grid').innerHTML = '<div class="empty">Bitte einloggen um Favoriten zu sehen</div>';
    return;
  }
  if (!favSets.length) {
    document.getElementById('fav-grid').innerHTML = '<div class="empty">Noch keine Favoriten — klicke ♥ bei einem Set</div>';
    return;
  }
  // Reuse renderGrid logic but for fav sets only
  document.getElementById('fav-grid').innerHTML = favSets.map(s => {
    const idx = SETS.indexOf(s);
    const genres = (Array.isArray(s.genres) ? s.genres : [s.genre]).filter(Boolean);
    const gTags = genres.map(g => `<span class="tag">${g}</span>`).join('');
    const eTags = (s.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const slug = (s.soundcloud_url || '').replace(/^https?:\/\//, '');
    return `<div class="card" id="fav-card-${idx}">
      <div class="chrome">
        <div class="dots"><div class="dot"></div><div class="dot"></div></div>
        <div class="chrome-url">${slug}</div>
        <div class="chrome-date">${fmtDate(s.date)}</div>
      </div>
      ${s.image ? `<div style="position:relative;padding-bottom:56.25%;background:url(${s.image}) center/cover no-repeat;border-bottom:var(--b)">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:.4rem .75rem;display:flex;gap:.3rem;flex-wrap:wrap;background:linear-gradient(transparent,rgba(0,0,0,0.55))">
          ${gTags.replace(/class="tag"/g, 'style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.4);color:rgba(255,255,255,0.9);padding:.08rem .35rem;background:rgba(0,0,0,0.3)"')}
        </div>
      </div>` : ''}
      <div class="card-body" onclick="showView('mixes')">
        <div class="stripe" style="background:${s.color || '#333'}"></div>
        <div class="card-content">
          ${!s.image ? `<div class="tags">${gTags}${eTags}</div>` : ''}
          <div class="title">${s.title}</div>
          <div class="artist">${s.artist}</div>
        </div>
        <div class="card-side">
          <button class="fav-btn liked" onclick="event.stopPropagation();toggleFav('${s.id}')">♥</button>
          <div class="dur">${s.duration || ''}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════
   PLATFORM DETECTION
═══════════════════════════════ */
function getPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'unknown';
}
function getYoutubeId(url) {
  if (!url) return '';
  let match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([^?&]+)/);
  if (match) return match[1];
  match = url.match(/embed\/([^?&]+)/);
  if (match) return match[1];
  return '';
}
function ytPlay(idx) {
  const s = SETS[idx];
  const ytId = getYoutubeId(s.soundcloud_url);
  if (!ytId) return;
  const container = document.getElementById('yt-container-' + idx);
  if (!container) return;

  // Try iframe embed first, with fallback to opening YouTube directly
  try {
    container.onclick = null;
    container.style.cursor = 'default';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none';
    iframe.allow = 'autoplay;encrypted-media;picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0&modestbranding=1';
    // If iframe fails to load, open YouTube directly
    iframe.onerror = function() { window.open(s.soundcloud_url, '_blank'); };
    container.innerHTML = '';
    container.appendChild(iframe);
    spShow(idx);
    spUpdatePlay(true);
  } catch(e) {
    // Fallback: open YouTube in new tab
    window.open(s.soundcloud_url, '_blank');
  }
}

/* ═══════════════════════════════
   SHARE
═══════════════════════════════ */
function shareSet(idx, btn) {
  const s = SETS[idx];
  if (!s) return;
  const url = s.soundcloud_url || '';
  const text = s.artist + ' — ' + s.title;

  // Try native share API on mobile
  if (navigator.share) {
    navigator.share({ title: text, url: url }).catch(() => {});
    return;
  }

  // Fallback: copy to clipboard
  const copyText = url || text;
  copyToClipboard(copyText, 'copied-' + idx);
}

function shareExpanded() {
  if (spIdx === null) return;
  const s = SETS[spIdx];
  if (!s) return;
  const url = s.soundcloud_url || '';
  const text = s.artist + ' — ' + s.title;

  if (navigator.share) {
    navigator.share({ title: text, url: url }).catch(() => {});
    return;
  }
  copyToClipboard(url || text, 'copied-exp');
}

function copyToClipboard(text, tipId) {
  navigator.clipboard.writeText(text).then(() => {
    showCopiedTip(tipId);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showCopiedTip(tipId);
  });
}

function showCopiedTip(id) {
  const tip = document.getElementById(id);
  if (!tip) return;
  tip.style.opacity = '1'; tip.style.transform = 'translateY(0)';
  setTimeout(() => { tip.style.opacity = '0'; tip.style.transform = 'translateY(4px)'; }, 1500);
}

/* ═══════════════════════════════
   CUSTOM TICKER
═══════════════════════════════ */
function applyCustomTicker() {
  try {
    const data = JSON.parse(localStorage.getItem('gleis13-info') || 'null');
    if (!data || !data.ticker || !data.ticker.trim()) return;
    const items = data.ticker.split(',').map(s => s.trim()).filter(Boolean);
    if (!items.length) return;
    const html = items.map(t => `<span>${t}</span><span class="tick-dot">·</span>`).join('');
    // Apply to all tickers (except the one built by buildTicker for mixes)
    const allTickers = document.querySelectorAll('.ticker-inner');
    allTickers.forEach(el => {
      // Don't override the main ticker if sets are loaded (buildTicker handles that)
      if (el.id === 'ticker-inner' && SETS.length) return;
      el.innerHTML = html + html;
    });
  } catch(e) {}
}

/* ═══════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════ */
document.addEventListener('keydown', e => {
  // Don't trigger shortcuts when typing in inputs
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch(e.code) {
    case 'Space':
      e.preventDefault();
      // Play/Pause current track
      if (spIdx !== null) {
        spTogglePlay();
      } else if (openCard !== null) {
        togglePlay(openCard);
      }
      break;

    case 'Escape':
      // Close expanded player or modal
      const exp = document.getElementById('sp-expanded');
      if (exp && exp.style.display === 'flex') { spCollapse(); break; }
      const modal = document.getElementById('artist-modal');
      if (modal) { closeArtistEdit(); break; }
      // Close sticky player
      if (spIdx !== null) { spClose(); break; }
      break;

    case 'ArrowRight':
      // Seek forward 10s
      if (spIdx !== null) {
        const w = SC_WIDGETS[spIdx];
        if (w) w.getPosition(p => { w.getDuration(d => { try { w.seekTo(Math.min(d, p + 10000)); } catch(err){} }); });
      }
      break;

    case 'ArrowLeft':
      // Seek back 10s
      if (spIdx !== null) {
        const w = SC_WIDGETS[spIdx];
        if (w) w.getPosition(p => { try { w.seekTo(Math.max(0, p - 10000)); } catch(err){} });
      }
      break;

    case 'ArrowUp':
      // Previous set
      if (openCard !== null && openCard > 0) {
        e.preventDefault();
        toggleCard(openCard - 1);
      }
      break;

    case 'ArrowDown':
      // Next set
      if (openCard !== null && openCard < SETS.length - 1) {
        e.preventDefault();
        toggleCard(openCard + 1);
      }
      break;

    case 'KeyD':
      // Toggle dark mode
      toggleTheme();
      break;

    case 'KeyF':
      // Expand player
      if (spIdx !== null) {
        const exp2 = document.getElementById('sp-expanded');
        if (exp2 && exp2.style.display === 'flex') spCollapse();
        else spExpand();
      }
      break;
  }
});

/* ═══════════════════════════════
   BOOT
═══════════════════════════════ */
const DEMO_SETS = [
  { id:'demo-1', soundcloud_url:'https://soundcloud.com/ostgutton-official/berghain-08-fiedel', title:'Berghain 08', artist:'Fiedel', genres:['techno'], genre:'techno', duration:'1:17:00', date:'2024-02-10', tags:['berghain', 'essen'], color:'#f5c800', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhMWEyZSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjVjODAwIi8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPkZMT0FUSU5HIFBPSU5UUzwvdGV4dD4KPC9zdmc+' },
  { id:'demo-2', soundcloud_url:'https://soundcloud.com/ostgutton-official/berghain-07-function', title:'Berghain 07', artist:'Function', genres:['techno'], genre:'techno', duration:'1:09:00', date:'2023-11-05', tags:['berghain', 'essen'], color:'#1a4a6b', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGExYSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWE0YTZiIi8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPlNIRUQ8L3RleHQ+Cjwvc3ZnPg==' },
  { id:'demo-3', soundcloud_url:'https://soundcloud.com/jary_mane/dark-underground-techno-set-essen-berghain', title:'Dark Underground Set', artist:'JARYMANE', genres:['techno'], genre:'techno', duration:'1:30:00', date:'2023-08-20', tags:['club', 'live'], color:'#d63c1f', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhMGEwYSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZDYzYzFmIi8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPk9CSkVLVDwvdGV4dD4KPC9zdmc+' },
  { id:'demo-4', soundcloud_url:'https://soundcloud.com/stefanmedici/virtual-berghain-5', title:'Virtual Berghain #5', artist:'Stefan Medici', genres:['techno', 'breaks'], genre:'techno', duration:'1:45:00', date:'2023-06-18', tags:['live', 'club'], color:'#2a5a2a', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMWEwYSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMmE1YTJhIi8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPkpPRSBBUk1PTi1KT05FUzwvdGV4dD4KPC9zdmc+' },
  { id:'demo-5', soundcloud_url:'https://soundcloud.com/todd429/post-berghain-mix', title:'Post-Berghain Mix', artist:'Todd Furey', genres:['techno', 'ambient'], genre:'techno', duration:'1:00:00', date:'2023-04-01', tags:['afterhours'], color:'#3a1a5a', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhMGExYSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojM2ExYTVhIi8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPkFSQ0E8L3RleHQ+Cjwvc3ZnPg==' },
  { id:'demo-6', soundcloud_url:'https://soundcloud.com/u-ton/berghain-mix', title:'Berghain Mix', artist:'UTON', genres:['techno', 'electro'], genre:'techno', duration:'1:20:00', date:'2022-12-15', tags:['essen', 'vinyl'], color:'#333', image:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj4KICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGEwYSIvPgogICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNDQ0Ii8+CiAgPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPkRKIFNUSU5HUkFZIDMxMzwvdGV4dD4KPC9zdmc+Cg==' },
  { id:'demo-7', soundcloud_url:'https://www.youtube.com/watch?v=DWfY9GRe7SI', title:'Boiler Room Berlin', artist:'Ben Klock', genres:['techno'], genre:'techno', duration:'1:30:00', date:'2024-05-10', tags:['boiler-room', 'live'], color:'#d63c1f', image:'' },
];

if (!SETS.length) SETS = DEMO_SETS;

/* splash → main */
function dismissSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('out');
  setTimeout(() => splash.remove(), 600);
}
// Restore user session + auto-create admin account
(function initUsers() {
  const users = getUsers();
  if (!users['admin']) {
    users['admin'] = { pw: 'gleis13', favs: [], admin: true };
    saveUsers(users);
  }
  try { CURRENT_USER = localStorage.getItem('gleis13-current-user') || null; } catch(e) { CURRENT_USER = null; }
  if (CURRENT_USER && users[CURRENT_USER]) {
    IS_ADMIN = !!users[CURRENT_USER].admin;
  } else {
    CURRENT_USER = null;
  }
})();
updateUserUI();
setTimeout(() => {
  loadAndRender();
  applyCustomTicker();
  setTimeout(dismissSplash, 800);
}, 1200);