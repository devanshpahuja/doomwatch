(() => {
  const spider = document.querySelector('.footer-spider');
  if (spider) {
    const ctx = spider.getContext('2d');
    const track = spider.parentElement;
    const legs = [[15,14,11,9,7,9,5,4],[14,16,9,13,5,16,2,11],[14,18,9,18,4,23,1,21],[15,20,12,23,8,26,7,31]];
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ff5673';
    for (const flip of [false,true]) {
      ctx.save();
      if (flip) { ctx.translate(spider.width,0); ctx.scale(-1,1); }
      for (const [x,y,a,b,c,d,e,f] of legs) {
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(a,b); ctx.lineTo(c,d); ctx.lineTo(e,f); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#ff4766';
    ctx.beginPath(); ctx.ellipse(18.5,19,4.5,7,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18.5,12,3.8,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff5e6';
    ctx.fillRect(16.5,10,1.3,1.6);
    ctx.fillRect(19.3,10,1.3,1.6);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => track.classList.toggle('is-visible',entry.isIntersecting));
      observer.observe(track);
    } else track.classList.add('is-visible');
  }

  const launch = document.getElementById('openGuide');
  if (!launch) return;
  const onConnections = Boolean(document.getElementById('atlas'));
  const fullGuide = (onConnections ? [
    ['#titleSearch','Find a title','Type a film or series name to jump to it on the map.'],
    ['.atlas','Follow the links','Select a title to highlight its connections. Drag the map or use the zoom controls to get closer.'],
    ['#mapFilters','Filter the web','Toggle story, character, multiverse, or shared-lore links to see the relationships that interest you.'],
    ['#spoilerMode','Choose what to reveal','Use the Spoilers switch to show plot details in the connection notes.'],
    ['#connectionMusic','Control the soundtrack','Use the Music switch in the header to mute or unmute the Spider-Man theme.']
  ] : [
    ['#nextCard','Track your watchlist','Mark a film or series watched as you finish it. Start with Canon, or browse Build-up and Optional titles.'],
    ['.binge-card','Check your binge time','See your remaining Canon time and the daily pace to finish by release.'],
    ['.topright','Set up your hero','Select your avatar to change heroes. The buttons beside it control music and spoilers.'],
    ['#openQuiz','Try Multiverse Trials','Open the quiz to test what you remember about the films and series.'],
    ['#shareProgress','Share your progress','Use Share progress to share a snapshot of your readiness.'],
    ['#openStory','Make a Hero Cover','Create a cover starring your chosen hero that you can save or share.'],
    ['.doom-tabs a[href="/connections"]','Explore Connections','Open the web to see how titles connect through stories, characters, and different universes.'],
    ['#signWall','Sign the wall','Leave your display name and hero on the shared wall. Your hero can sign the wall once.'],
    ['.ticket-button','Find tickets','Open the ticket listing from Book Doomsday Tickets.']
  ]).map(([selector,title,description]) => ({target:document.querySelector(selector),title,description}))
    .filter(step => step.target);
  if (!fullGuide.length) return;
  let guide = fullGuide;
  const activities = document.querySelector('.activities');
  let activitiesWereOpen = false;

  const dialog = document.createElement('dialog');
  dialog.className = 'help-tour';
  dialog.setAttribute('aria-labelledby','helpTourTitle');
  dialog.setAttribute('aria-describedby','helpTourCopy');
  dialog.innerHTML = '<div class="help-tour-spot" aria-hidden="true"></div><div class="help-tour-panel"><div class="help-tour-head"><span class="help-tour-progress"></span><button type="button" data-close>Close guide</button></div><div class="help-tour-content" tabindex="0"><h2 class="help-tour-title" id="helpTourTitle"></h2><p id="helpTourCopy"></p></div><div class="help-tour-actions"><button type="button" data-back>Back</button><button type="button" data-next autofocus>Next</button></div></div>';
  document.body.append(dialog);
  const spot = dialog.querySelector('.help-tour-spot');
  const panel = dialog.querySelector('.help-tour-panel');
  const content = dialog.querySelector('.help-tour-content');
  const title = dialog.querySelector('#helpTourTitle');
  const copy = dialog.querySelector('#helpTourCopy');
  const progress = dialog.querySelector('.help-tour-progress');
  const back = dialog.querySelector('[data-back]');
  const next = dialog.querySelector('[data-next]');
  let step = 0;
  let originalScroll = 0;
  let layoutFrame = 0;

  function visibleViewport() {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? document.documentElement.clientWidth;
    const height = viewport?.height ?? document.documentElement.clientHeight;
    return { left, top, width, height };
  }

  function highlightBounds(viewport) {
    return {
      left: viewport.left + 4,
      right: viewport.left + viewport.width - 4,
      top: viewport.top + 6,
      bottom: panel.getBoundingClientRect().top - 12
    };
  }

  function positionSpot() {
    if (!dialog.open) return;
    const bounds = highlightBounds(visibleViewport());
    const target = guide[step].target.getBoundingClientRect();
    const left = Math.max(bounds.left, target.left - 6);
    const top = Math.max(bounds.top, target.top - 6);
    const width = Math.max(0, Math.min(bounds.right, target.right + 6) - left);
    const height = Math.max(0, Math.min(bounds.bottom, target.bottom + 6) - top);
    spot.toggleAttribute('data-offscreen', !width || !height);
    Object.assign(spot.style, { left: left+'px', top: top+'px', width: width+'px', height: height+'px' });
  }

  function alignStep() {
    if (!dialog.open) return;
    const viewport = visibleViewport();
    const width = Math.min(viewport.width - 24, 440);
    const bottom = Math.max(0, document.documentElement.clientHeight - viewport.top - viewport.height);
    dialog.style.setProperty('--tour-width', width+'px');
    dialog.style.setProperty('--tour-left', viewport.left + (viewport.width - width) / 2+'px');
    dialog.style.setProperty('--tour-bottom', bottom+'px');
    dialog.style.setProperty('--tour-panel-height', viewport.height * 0.55+'px');

    const bounds = highlightBounds(viewport);
    const target = guide[step].target.getBoundingClientRect();
    const space = Math.max(0, bounds.bottom - bounds.top - 12);
    const top = bounds.top + 6 + (space - Math.min(target.height, space)) / 2;
    window.scrollBy({ top: target.top - top, behavior: 'instant' });
    positionSpot();
  }

  function scheduleAlignment() {
    if (!dialog.open || layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      alignStep();
    });
  }

  const resizeObserver = new ResizeObserver(scheduleAlignment);

  function showStep() {
    const current = guide[step];
    if (activities) activities.open = activitiesWereOpen || activities.contains(current.target);
    progress.textContent = (step + 1) + ' of ' + guide.length;
    title.textContent = current.title;
    copy.textContent = current.description;
    back.disabled = step === 0;
    next.textContent = step === guide.length - 1 ? 'Done' : 'Next';
    content.scrollTop = 0;
    resizeObserver.disconnect();
    resizeObserver.observe(panel);
    resizeObserver.observe(current.target);
    alignStep();
  }

  function startGuide(welcome) {
    guide = welcome ? [fullGuide[0], fullGuide[1], fullGuide.find(item => item.title === 'Explore Connections')] : fullGuide;
    activitiesWereOpen = activities?.open || false;
    originalScroll = window.scrollY;
    step = 0;
    dialog.showModal();
    showStep();
    next.focus({preventScroll:true});
  }
  launch.addEventListener('click', () => startGuide(false));
  launch.addEventListener('start-welcome', () => startGuide(true));
  back.addEventListener('click',() => { if (step > 0) { step--; showStep(); if (back.disabled) next.focus(); } });
  next.addEventListener('click',() => {
    if (step === guide.length - 1) dialog.close();
    else { step++; showStep(); }
  });
  dialog.querySelector('[data-close]').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => {
    resizeObserver.disconnect();
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    if (activities) activities.open = activitiesWereOpen;
    if (guide !== fullGuide) {
      const nextCard = document.getElementById('nextCard');
      nextCard.scrollIntoView({block:'center',behavior:'instant'});
      nextCard.focus({preventScroll:true});
      return;
    }
    window.scrollTo({top:originalScroll,behavior:'instant'});
    launch.focus({preventScroll:true});
  });
  window.addEventListener('scroll',positionSpot,{passive:true});
  window.addEventListener('resize',scheduleAlignment);
  window.visualViewport?.addEventListener('resize',scheduleAlignment);
  window.visualViewport?.addEventListener('scroll',scheduleAlignment);
})();
