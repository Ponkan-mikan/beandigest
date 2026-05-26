// ---- Google Maps API Key ----
// Replace with your key from https://console.cloud.google.com/
const GOOGLE_MAPS_API_KEY = 'AIzaSyCoU-4X0peQ92QflVHktx49uDlbov2Taiw';

// ---- State ----
let allEntries = [];
let organizations = {};
let map = null;
let markers = [];
let mapInitialized = false;

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  fetch('data/roasters.json')
    .then(r => r.json())
    .then(data => init(data))
    .catch(() => {
      document.getElementById('results-count').textContent =
        'Error loading data. Run a local server (see README).';
    });
});

function init(data) {
  allEntries = data.entries;
  organizations = Object.fromEntries(data.organizations.map(o => [o.id, o]));

  buildOrgYearFilter(data.organizations);
  buildCountryFilter();
  renderCards();
  bindEvents();
  initBackground();
}

// ---- Background Animation ----
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 全店舗名を「·」区切りで連結してキャラクター配列に
  const chars = allEntries.map(e => e.name).join(' · ').split('');

  // 4×4 Bayer ordered dither（Alpha Digest と同一）
  const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  function dither(x, y) { return (BAYER[y & 3][x & 3] / 16) - 0.5; }

  // 1/f ピンクノイズ（Alpha Digest と同一）
  function pinkNoise() {
    const b = [0,0,0,0,0,0,0];
    return { next() {
      const w = (Math.random() - 0.5) * 2;
      b[0]=0.99886*b[0]+w*0.0555; b[1]=0.99332*b[1]+w*0.0751;
      b[2]=0.96900*b[2]+w*0.1539; b[3]=0.86650*b[3]+w*0.3105;
      b[4]=0.55000*b[4]+w*0.5330; b[5]=-0.7616*b[5]-w*0.0169;
      const v = b[0]+b[1]+b[2]+b[3]+b[4]+b[5]+b[6]+w*0.5362;
      b[6] = w * 0.1159;
      return v * 0.11;
    }};
  }

  const G     = 13;
  const noise = pinkNoise();
  let W = 0, H = 0, phase = 0, last = performance.now();

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last  = ts;
    phase += (Math.PI * 2 / 10) * dt;

    const fv       = noise.next();
    const ampScale = 1 + fv * 0.18;
    const intOff   = fv * 0.045;

    ctx.clearRect(0, 0, W, H);
    ctx.font         = "bold 9px Georgia,'Times New Roman',serif";
    ctx.textBaseline = 'top';

    const cols = Math.ceil(W / G);
    const rows = Math.ceil(H / G);
    const cy   = rows * 0.58;
    const base = rows / 4;
    const amp  = base * ampScale;
    const freq = 0.036;
    const sp2  = phase * 0.86;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const w1   = Math.sin(x * freq + phase) * amp;
        const w2   = Math.cos(x * freq * 0.5 - sp2) * (base * 0.42 * ampScale);
        const dist = Math.abs(y - (cy + w1 + w2));
        let   int  = Math.max(0, 1 - dist / 12);
        int += Math.sin((x * 0.31 + y * 0.17) + phase * 0.35) * 0.035 + intOff;

        if (int + dither(x, y) > 0.5) {
          ctx.fillStyle = 'rgba(74,44,42,0.09)';
          ctx.fillText(chars[(x + y * 7) % chars.length], x * G, y * G);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- Filters ----
function buildOrgYearFilter(orgs) {
  const sel = document.getElementById('org-year-filter');

  orgs.forEach(org => {
    const years = [...new Set(
      allEntries.flatMap(e => e.awards)
        .filter(a => a.org === org.id)
        .map(a => a.year)
    )].sort((a, b) => b - a);

    if (years.length === 0) return;

    const group = document.createElement('optgroup');
    group.label = org.name;

    years.forEach(year => {
      const opt = document.createElement('option');
      opt.value = `${org.id}|${year}`;
      opt.textContent = `${org.shortName} – ${year}`;
      group.appendChild(opt);
    });

    sel.appendChild(group);
  });
}

function buildCountryFilter() {
  const sel = document.getElementById('country-filter');
  const menu = document.getElementById('country-select-menu');
  const countries = [...new Set(allEntries.map(e => e.country))].sort();

  // Empty default option for the hidden select
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  sel.appendChild(defaultOpt);

  const allItem = document.createElement('div');
  allItem.className = 'custom-option selected';
  allItem.dataset.value = '';
  allItem.textContent = 'All Countries';
  menu.appendChild(allItem);

  countries.forEach(country => {
    const cc = allEntries.find(e => e.country === country)?.cc || '';

    const opt = document.createElement('option');
    opt.value = country;
    opt.textContent = country;
    sel.appendChild(opt);

    const item = document.createElement('div');
    item.className = 'custom-option';
    item.dataset.value = country;
    item.innerHTML = `${countryFlagImg(cc)}<span>${escapeHTML(country)}</span>`;
    menu.appendChild(item);
  });
}

function getFilteredEntries() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const orgYear = document.getElementById('org-year-filter').value;
  const country = document.getElementById('country-filter').value;

  return allEntries.filter(entry => {
    if (search && !entry.name.toLowerCase().includes(search)) return false;

    if (orgYear) {
      const [orgId, yearStr] = orgYear.split('|');
      const year = parseInt(yearStr, 10);
      if (!entry.awards.some(a => a.org === orgId && a.year === year)) return false;
    }

    if (country && entry.country !== country) return false;

    return true;
  });
}

// ---- Render Cards ----
function renderCards() {
  const filtered = getFilteredEntries();
  const grid = document.getElementById('shop-grid');
  const noResults = document.getElementById('no-results');
  const count = document.getElementById('results-count');

  count.textContent = `${filtered.length} shop${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';
  grid.innerHTML = filtered.map(entry => cardHTML(entry)).join('');

  if (mapInitialized) updateMapMarkers(filtered);
}

function cardHTML(entry) {
  const flagImg = countryFlagImg(entry.cc);

  const badges = entry.awards.map(award => {
    const org = organizations[award.org];
    if (!org) return '';
    const shortCat = award.category ? award.category.split(' – ')[0] : '';
    const displayLabel = award.rank
      ? `${org.shortName} ${award.year} #${award.rank}`
      : `${org.shortName} ${award.year}${shortCat ? ' · ' + shortCat : ''}`;
    const fullLabel = award.rank
      ? displayLabel
      : `${org.shortName} ${award.year}${award.category ? ' · ' + award.category : ''}`;
    const titleAttr = ` title="${escapeHTML(fullLabel)}"`;
    const categoryUrl = (() => {
      if (!org.categoryUrlMap || !award.category) return null;
      const prefix = Object.keys(org.categoryUrlMap).find(k => award.category.startsWith(k));
      return prefix ? org.categoryUrlMap[prefix] : null;
    })();
    const badgeUrl = award.url
      || (org.urlTemplate ? org.urlTemplate.replace('{id}', entry.id) : null)
      || categoryUrl
      || org.url;
    const href = badgeUrl ? ` href="${badgeUrl}" target="_blank" rel="noopener"` : '';
    return `<a class="award-badge"${href}${titleAttr} style="background:${org.color}">${displayLabel}</a>`;
  }).join('');

  const locationParts = [entry.city, entry.country].filter(Boolean);
  const location = locationParts.join(', ');

  const mapsUrl = entry.mapsUrl
    || ((entry.lat && entry.lng)
      ? `https://www.google.com/maps?q=${entry.lat},${entry.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.name + ' ' + location)}`);

  const websiteLink = entry.url
    ? `<a href="${entry.url}" class="card-link" target="_blank" rel="noopener">Website &#8599;</a>`
    : '';

  return `
    <div class="shop-card">
      <div class="card-info">
        <h2 class="card-name"><a class="card-name-link" href="${mapsUrl}" target="_blank" rel="noopener">${escapeHTML(entry.name)}</a></h2>
        <span class="card-location">${escapeHTML(location)}</span>
      </div>
      <div class="card-flag-col">${flagImg}</div>
      <div class="card-footer">
        <div class="card-awards">${badges}</div>
        ${websiteLink}
      </div>
    </div>
  `;
}

// ---- Events ----
function bindEvents() {
  // Brand click → reset to list view
  document.querySelector('.brand-name').addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelector('[data-view="list"]').classList.add('active');
    document.getElementById('list-view').classList.add('active');
    document.getElementById('clear-btn').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('search-input').addEventListener('input', renderCards);
  document.getElementById('org-year-filter').addEventListener('change', renderCards);

  // Custom country dropdown
  const countryBtn  = document.getElementById('country-select-btn');
  const countryMenu = document.getElementById('country-select-menu');

  countryBtn.addEventListener('click', () => {
    const open = countryMenu.classList.toggle('open');
    countryBtn.classList.toggle('open', open);
  });

  countryMenu.addEventListener('click', e => {
    const opt = e.target.closest('.custom-option');
    if (!opt) return;
    const value = opt.dataset.value;
    document.getElementById('country-filter').value = value;
    const display = countryBtn.querySelector('.custom-select-value');
    display.innerHTML = value === '' ? 'All Countries' : opt.innerHTML;
    countryMenu.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    countryMenu.classList.remove('open');
    countryBtn.classList.remove('open');
    renderCards();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#country-select')) {
      countryMenu.classList.remove('open');
      countryBtn.classList.remove('open');
    }
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('org-year-filter').value = '';
    document.getElementById('country-filter').value = '';
    countryBtn.querySelector('.custom-select-value').textContent = 'All Countries';
    countryMenu.querySelectorAll('.custom-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === '');
    });
    renderCards();
  });

  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;
      document.getElementById(`${view}-view`).classList.add('active');

      if (view === 'map' && !mapInitialized) {
        loadGoogleMaps();
      }
    });
  });
}

// ---- Google Maps ----
function loadGoogleMaps() {
  if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
    document.getElementById('map-placeholder').style.display = 'flex';
    document.getElementById('map').style.display = 'none';
    return;
  }

  document.getElementById('map-placeholder').style.display = 'none';
  document.getElementById('map').style.display = 'block';

  if (window.google?.maps) {
    initMap();
    return;
  }

  window._initMapCallback = initMap;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=_initMapCallback`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function initMap() {
  mapInitialized = true;

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 2,
    center: { lat: 20, lng: 10 },
    mapTypeId: 'roadmap',
    styles: [
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e8dcc8' }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ede4d4' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#c8b08a' }] }
    ]
  });

  updateMapMarkers(getFilteredEntries());
}

function updateMapMarkers(filtered) {
  markers.forEach(m => m.setMap(null));
  markers = [];

  filtered.forEach(entry => {
    if (!entry.lat || !entry.lng) return;

    const org = organizations[entry.awards[0]?.org];
    const color = org?.color || '#C8860A';

    const marker = new google.maps.Marker({
      position: { lat: entry.lat, lng: entry.lng },
      map,
      title: entry.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: color,
        fillOpacity: 0.92,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    });

    const infoWindow = new google.maps.InfoWindow({ content: cardHTML(entry), maxWidth: 300 });

    marker.addListener('click', () => {
      markers.forEach(m => m._iw?.close());
      infoWindow.open(map, marker);
    });

    marker._iw = infoWindow;
    markers.push(marker);
  });
}

function buildInfoWindowHTML(entry) {
  const flag = countryFlag(entry.cc);
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const badges = entry.awards.map(a => {
    const org = organizations[a.org];
    if (!org) return '';
    const label = a.rank ? `${org.shortName} ${a.year} #${a.rank}` : `${org.shortName} ${a.year}`;
    return `<span class="info-badge" style="background:${org.color}">${label}</span>`;
  }).join('');

  return `
    <div class="gm-info-window">
      <strong>${flag} ${escapeHTML(entry.name)}</strong>
      <div class="info-location">${escapeHTML(location)}</div>
      <div class="info-awards">${badges}</div>
      ${entry.url ? `<a href="${entry.url}" target="_blank" rel="noopener">Website &#8599;</a>` : ''}
    </div>
  `;
}

// ---- Utilities ----
function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

function countryFlagImg(cc) {
  if (!cc || cc.length !== 2) return '<span class="card-flag-fallback">🌍</span>';
  const code = cc.toLowerCase();
  return `<img class="card-flag-img" src="https://flagcdn.com/w40/${code}.png" width="28" alt="${cc}">`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
