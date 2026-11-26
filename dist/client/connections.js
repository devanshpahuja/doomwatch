(() => {
  const byId = id => document.getElementById(id);
  const titles = [...doomwatchTitles, ...legacyTitles];
  const nodes = new Map(titles.map(title => {
    const [x, y, short] = connectionLayout[title.id];
    return [title.id, {...title, x, y, short}];
  }));
  const typeKeys = Object.keys(connectionTypes);
  const edges = doomwatchConnections.map(([a, b, type, title, note, source], index) => (
    {a, b, type, title, note, source, index}
  ));
  const enabled = new Set(typeKeys);
  const atlas = byId('atlas');
  const world = byId('mapWorld');
  const sizer = byId('mapSizer');
  const canvas = byId('webLines');
  const ctx = canvas.getContext('2d');
  const mapStatus = byId('mapStatus');
  const threadBody = byId('threadBody');
  const clearSelection = byId('clearSelection');
  const spoilerButton = byId('spoilerMode');
  const profileKey = 'doomsday-watch.v2';
  const width = 1600, height = 1085;
  const dpi = Math.min(window.devicePixelRatio || 1, 2);
  let scale = 1;
  let selection = null;
  let spoilers = false;
  let drag = null;
  try { spoilers = JSON.parse(localStorage.getItem(profileKey) || '{}')?.spoilers === true; } catch {}
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  function make(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }

  function makeButton(className, content, action) {
    const button = make('button', className, content);
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
  }

  function normalizeTitle(value) {
    return value.toLowerCase().replaceAll('.', '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
      .replace(/^miss marvel$/, 'ms marvel');
  }

  function drawEdges() {
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const active = edges.filter(edge => enabled.has(edge.type));
    const connected = new Set();
    for (const edge of active) {
      if (edge.a === selection) connected.add(edge.b);
      if (edge.b === selection) connected.add(edge.a);
    }
    const visible = selection
      ? [...active.filter(edge => edge.a !== selection && edge.b !== selection),
        ...active.filter(edge => edge.a === selection || edge.b === selection)]
      : active;
    for (const edge of visible) {
      const a = nodes.get(edge.a);
      const b = nodes.get(edge.b);
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const bend = ((edge.index * 17 % 11) - 5) * Math.min(23, length * .045);
      const cx = (a.x + b.x) / 2 - (dy / length) * bend;
      const cy = (a.y + b.y) / 2 + (dx / length) * bend;
      const focused = edge.a === selection || edge.b === selection;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.strokeStyle = connectionTypes[edge.type].color;
      ctx.globalAlpha = focused ? .96 : selection ? .13 : .58;
      ctx.lineWidth = focused ? 3.4 : 1.9;
      ctx.setLineDash(edge.type === 'multiverse' ? [8, 4] : edge.type === 'lore' ? [2, 5] : []);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    for (const node of nodes.values()) {
      const selected = node.id === selection;
      const neighbor = connected.has(node.id);
      node.button.classList.toggle('is-selected', selected);
      node.button.classList.toggle('is-neighbor', neighbor);
      node.button.classList.toggle('is-muted', Boolean(selection && !selected && !neighbor));
      node.button.setAttribute('aria-pressed', String(selected));
    }
  }

  function renderInspector() {
    spoilerButton.textContent = spoilers ? 'Spoilers: On' : 'Spoilers: Off';
    spoilerButton.setAttribute('aria-pressed', String(spoilers));
    const node = nodes.get(selection);
    clearSelection.hidden = !node;
    byId('threadTitle').textContent = node?.title ?? 'Follow a thread';
    byId('threadMeta').textContent = node ? node.phase + ' · ' + (node.type === 'series' ? 'Series' : 'Film') : '';
    threadBody.replaceChildren();
    if (!node) {
      threadBody.append(make('p', 'thread-lead', titles.length + ' titles · ' + edges.length + ' connections'));
      for (const id of ['endgame', 'wandavision', 'deadpool-wolverine', 'the-marvels']) {
        threadBody.append(makeButton('shortcut', nodes.get(id).title, () => selectTitle(id, true)));
      }
      return;
    }
    const threads = edges.filter(edge => enabled.has(edge.type) && (edge.a === node.id || edge.b === node.id));
    if (!threads.length) {
      threadBody.append(make('p', 'thread-lead','No connections of the selected types.'));
      return;
    }
    threadBody.append(make('p', 'thread-lead', spoilers ? threads.length + ' connected titles' : 'Plot details are hidden by your spoiler preference.'));
    const list = make('ul', 'thread-list');
    for (const edge of threads) {
      const otherId = edge.a === node.id ? edge.b : edge.a;
      const other = nodes.get(otherId);
      const li = make('li');
      const relation = make('span', 'thread-type', connectionTypes[edge.type].label);
      relation.style.setProperty('--line', connectionTypes[edge.type].color);
      li.append(relation, makeButton('thread-link', other.title, () => selectTitle(otherId, true)));
      if (spoilers) {
        li.append(make('p', 'thread-note', edge.title + ' · ' + edge.note));
        const source = make('a', 'thread-source', 'Studio source');
        source.href = edge.source || connectionSources[otherId];
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        li.append(source);
      }
      list.append(li);
    }
    threadBody.append(list);
  }

  function centerOn(x, y) {
    atlas.scrollTo({left: x * scale - atlas.clientWidth / 2, top: y * scale - atlas.clientHeight / 2});
  }

  function selectTitle(id, move) {
    selection = id;
    const node = nodes.get(id);
    drawEdges();
    renderInspector();
    mapStatus.textContent = node ? node.title + ' selected.' : 'Selection cleared.';
    if (move && node) centerOn(node.x, node.y);
  }

  function applyScale(next, point) {
    const center = point ?? [(atlas.scrollLeft + atlas.clientWidth / 2) / scale,
      (atlas.scrollTop + atlas.clientHeight / 2) / scale];
    scale = Math.max(.22, Math.min(1.7, next));
    world.style.transform = 'scale(' + scale + ')';
    sizer.style.width = Math.ceil(width * scale) + 'px';
    sizer.style.height = Math.ceil(height * scale) + 'px';
    centerOn(...center);
    byId('zoomOut').disabled = scale <= .22;
    byId('zoomIn').disabled = scale >= 1.7;
  }

  for (const node of nodes.values()) {
    const button = makeButton('node', node.short, () => selectTitle(node.id, false));
    button.setAttribute('aria-label', node.title + ', ' + node.phase);
    button.title = node.title;
    button.dataset.phase = node.phase;
    button.style.left = node.x + 'px';
    button.style.top = node.y + 'px';
    node.button = button;
    byId('mapNodes').append(button);
    const option = make('option');
    option.value = node.title;
    byId('titleOptions').append(option);
    byId('titleIndex').append(makeButton('', node.title, () => {
      selectTitle(node.id, true);
      node.button.focus();
    }));
  }

  for (const [key, type] of Object.entries(connectionTypes)) {
    const button = makeButton('filter', type.label, () => {
      if (enabled.has(key)) enabled.delete(key);
      else enabled.add(key);
      button.setAttribute('aria-pressed', String(enabled.has(key)));
      drawEdges();
      renderInspector();
    });
    button.setAttribute('aria-pressed', 'true');
    button.style.setProperty('--line', type.color);
    byId('relationControls').append(button);
  }

  byId('titleSearch').addEventListener('submit', event => {
    event.preventDefault();
    const input = byId('findTitle');
    const query = normalizeTitle(input.value);
    if (!query) return;
    const node = titles.find(title => normalizeTitle(title.title) === query) ??
      titles.find(title => normalizeTitle(title.title).includes(query) || normalizeTitle(nodes.get(title.id).short).includes(query));
    if (!node) {
      input.setCustomValidity('No matching title.');
      input.reportValidity();
      return;
    }
    selectTitle(node.id, true);
  });
  byId('findTitle').addEventListener('input', event => event.target.setCustomValidity(''));
  clearSelection.addEventListener('click', () => selectTitle(null, false));
  byId('zoomIn').addEventListener('click', () => applyScale(scale * 1.2));
  byId('zoomOut').addEventListener('click', () => applyScale(scale / 1.2));
  byId('zoomFit').addEventListener('click', () => applyScale(
    Math.min(atlas.clientWidth / width, atlas.clientHeight / height), [width / 2, height / 2]
  ));
  spoilerButton.addEventListener('click', () => {
    spoilers = !spoilers;
    try {
      const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
      localStorage.setItem(profileKey, JSON.stringify({...profile, spoilers}));
    } catch {}
    renderInspector();
  });
  window.addEventListener('storage', event => {
    if (event.key !== profileKey && event.key !== null) return;
    try {
      const preference = JSON.parse(localStorage.getItem(profileKey) || '{}')?.spoilers === true;
      if (preference === spoilers) return;
      spoilers = preference;
      renderInspector();
    } catch {}
  });
  renderInspector();
  drawEdges();
  applyScale(Math.min(.82, Math.max(.57, atlas.clientWidth / width)), [width / 2, height / 2]);
})();
