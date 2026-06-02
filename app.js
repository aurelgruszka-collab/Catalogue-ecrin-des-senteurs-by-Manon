const cats = window.CATALOGUES || [];
const idx = window.SEARCH_INDEX || [];

let cat = 0;
let page = 1;

const $ = s => document.querySelector(s);

const drawer = $('#drawer');
const shade = $('#shade');
const img = $('#pageImage');
const loader = $('#loader');

function openDrawer() {
  if (drawer) drawer.classList.add('open');
  if (shade) shade.classList.add('open');
}

function closeDrawer() {
  if (drawer) drawer.classList.remove('open');
  if (shade) shade.classList.remove('open');
}

if ($('#menuBtn')) $('#menuBtn').onclick = openDrawer;
if ($('#tocBtn')) $('#tocBtn').onclick = openDrawer;
if ($('#tocBottomBtn')) $('#tocBottomBtn').onclick = openDrawer;
if ($('#closeDrawer')) $('#closeDrawer').onclick = closeDrawer;
if (shade) shade.onclick = closeDrawer;

function renderList() {
  const list = $('#catalogueList');
  const homeToc = $('#homeToc');
  const sel = $('#catalogueSelect');

  if (list) list.innerHTML = '';
  if (homeToc) homeToc.innerHTML = '';
  if (sel) sel.innerHTML = '';

  cats.forEach((c, i) => {
    const label = `${c.pageCount} page${c.pageCount > 1 ? 's' : ''}`;
    const html = `<strong>${c.title}</strong><span>${label}</span><div class="fileName">${c.fileName || ''}</div>`;

    if (list) {
      const b = document.createElement('button');
      b.className = 'catItem';
      b.innerHTML = html;
      b.onclick = () => {
        showReader(i, 1);
        closeDrawer();
      };
      list.appendChild(b);
    }

    if (homeToc) {
      const h = document.createElement('button');
      h.className = 'tocCard';
      h.innerHTML = html;
      h.onclick = () => showReader(i, 1);
      homeToc.appendChild(h);
    }

    if (sel) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${c.title} - ${c.fileName || ''}`;
      sel.appendChild(o);
    }
  });

  if (sel) {
    sel.onchange = e => showReader(Number(e.target.value), 1);
  }
}

function currentSrc() {
  return cats[cat].pages[page - 1];
}

function preload(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = res;
    im.onerror = rej;
    im.src = src;
  });
}

async function updatePage(anim = false) {
  if (!cats.length) return;

  const c = cats[cat];
  page = Math.max(1, Math.min(page, c.pageCount));

  if ($('#catalogueSelect')) $('#catalogueSelect').value = cat;
  if ($('#pageLabel')) $('#pageLabel').textContent = `${page} / ${c.pageCount}`;
  if ($('#readerTitle')) $('#readerTitle').textContent = `${c.title} - ${c.fileName || ''}`;

  history.replaceState(null, '', `#${c.slug}/page-${page}`);

  if (loader) loader.classList.remove('hidden');
  if (anim && img) img.classList.add('turning');

  const src = currentSrc();

  try {
    await preload(src);

    if (img) img.src = src;
    if ($('#zoomImage')) $('#zoomImage').src = src;

    if (page < c.pageCount) {
      preload(c.pages[page]).catch(() => {});
    }
  } catch (e) {
    alert('Cette page image n’a pas pu être chargée.');
  } finally {
    setTimeout(() => {
      if (img) img.classList.remove('turning');
      if (loader) loader.classList.add('hidden');
    }, 120);
  }
}

function showReader(c = 0, p = 1) {
  cat = c;
  page = p;

  if ($('#home')) $('#home').classList.remove('active');
  if ($('#reader')) $('#reader').classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updatePage();
}

if ($('#startBtn')) {
  $('#startBtn').onclick = () => showReader(0, 1);
}

if ($('#prevBtn')) {
  $('#prevBtn').onclick = () => {
    if (page > 1) {
      page--;
      updatePage(true);
    } else if (cat > 0) {
      cat--;
      page = cats[cat].pageCount;
      updatePage(true);
    }
  };
}

if ($('#nextBtn')) {
  $('#nextBtn').onclick = () => {
    if (page < cats[cat].pageCount) {
      page++;
      updatePage(true);
    } else if (cat < cats.length - 1) {
      cat++;
      page = 1;
      updatePage(true);
    }
  };
}

let sx = 0;

if ($('#book')) {
  $('#book').addEventListener(
    'touchstart',
    e => sx = e.touches[0].clientX,
    { passive: true }
  );

  $('#book').addEventListener(
    'touchend',
    e => {
      const dx = e.changedTouches[0].clientX - sx;

      if (Math.abs(dx) > 45) {
        dx < 0 ? $('#nextBtn').click() : $('#prevBtn').click();
      }
    },
    { passive: true }
  );
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && $('#nextBtn')) $('#nextBtn').click();
  if (e.key === 'ArrowLeft' && $('#prevBtn')) $('#prevBtn').click();

  if (e.key === 'Escape') {
    closeDrawer();
    if ($('#zoomModal')) $('#zoomModal').classList.remove('open');
  }
});

if ($('#zoomBtn')) {
  $('#zoomBtn').onclick = () => {
    if ($('#zoomImage')) $('#zoomImage').src = currentSrc();
    if ($('#zoomModal')) $('#zoomModal').classList.add('open');
  };
}

if ($('#closeZoom')) {
  $('#closeZoom').onclick = () => {
    if ($('#zoomModal')) $('#zoomModal').classList.remove('open');
  };
}

if ($('#search')) {
  $('#search').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    const out = $('#searchResults');

    if (!out) return;

    out.innerHTML = '';

    if (q.length < 2) return;

    const words = q.split(/\s+/).filter(Boolean);
    const hits = idx
      .filter(x => words.every(w => x.text.includes(w)))
      .slice(0, 30);

    if (!hits.length) {
      out.innerHTML = '<div class="result">Aucun résultat trouvé.</div>';
      return;
    }

    hits.forEach(h => {
      const r = document.createElement('button');
      r.className = 'result';

      r.innerHTML = `
        <strong>${cats[h.catalogue].title}</strong><br>
        Page ${h.page}<br>
        <small>${h.text.slice(0, 140)}...</small>
      `;

      r.onclick = () => {
        showReader(h.catalogue, h.page);
        closeDrawer();
      };

      out.appendChild(r);
    });
  };
}

renderList();

const hash = decodeURIComponent(location.hash.replace('#', ''));

if (hash) {
  const m = hash.match(/(.+)\/page-(\d+)/);

  if (m) {
    const ci = cats.findIndex(c => c.slug === m[1]);

    if (ci >= 0) {
      showReader(ci, Number(m[2]));
    }
  }
}
