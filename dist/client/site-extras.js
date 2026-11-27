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
  const guide = (onConnections ? [
    ['#titleSearch','Find a title','Type a film or series name to jump to it on the map.'],
    ['.atlas','Follow the links','Select a title to highlight its connections. Drag the map or use the zoom controls to get closer.'],
    ['#relationControls','Filter the web','Toggle story, character, multiverse, or shared-lore links to see the relationships that interest you.'],
    ['#spoilerMode','Choose what to reveal','Use the Spoilers switch to show plot details in the connection notes.']
  ] : [
    ['.cardhead','Track your watchlist','Mark a film or series watched as you finish it. Start with Canon, or browse Build-up and Optional titles.'],
    ['.binge-card','Check your binge time','Compare your remaining watch time with the countdown. Canon remaining shows how much time you need for the core list.'],
    ['.topright','Set up your hero','Select your avatar to change heroes. The buttons beside it control music and spoilers.'],
    ['#openQuiz','Try Multiverse Trials','Open the quiz to test what you remember about the films and series.'],
    ['#shareProgress','Share your progress','Use Send a Signal to share a snapshot of your readiness.'],
    ['#openStory','Make a Hero Cover','Create a cover starring your chosen hero that you can save or share.'],
    ['.doom-tabs a[href="/connections"]','Explore Connections','Open the web to see how titles connect through stories, characters, and different universes.'],
    ['#signatureWall .wall-heading','Sign the wall','Leave your display name and hero on the shared wall. Your hero can sign the wall once.'],
    ['.ticket-button','Find tickets','Open the ticket listing from Book Doomsday Tickets.']
  ]).map(([selector,title,description]) => ({target:document.querySelector(selector),title,description}))
    .filter(step => step.target);
  if (!guide.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'help-tour';
  dialog.setAttribute('aria-labelledby','helpTourTitle');
  dialog.setAttribute('aria-describedby','helpTourCopy');
  dialog.innerHTML = '<div class="help-tour-spot" aria-hidden="true"></div><div class="help-tour-panel"><div class="help-tour-head"><span class="help-tour-progress"></span><button type="button" data-close>Close guide</button></div><h2 class="help-tour-title" id="helpTourTitle"></h2><p id="helpTourCopy"></p><div class="help-tour-actions"><button type="button" data-back>Back</button><button type="button" data-next>Next</button></div></div>';
  document.body.append(dialog);
  const spot = dialog.querySelector('.help-tour-spot');
  const title = dialog.querySelector('#helpTourTitle');
  const copy = dialog.querySelector('#helpTourCopy');
  const progress = dialog.querySelector('.help-tour-progress');
  const back = dialog.querySelector('[data-back]');
  const next = dialog.querySelector('[data-next]');
  let step = 0;
  let originalScroll = 0;

  function positionSpot() {
    if (!dialog.open) return;
    const rect = guide[step].target.getBoundingClientRect();
    const left = Math.max(4,rect.left - 6), top = Math.max(4,rect.top - 6);
    const right = Math.min(window.innerWidth - 4,rect.right + 6);
    const bottom = Math.min(window.innerHeight - 4,rect.bottom + 6);
    Object.assign(spot.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
  }

  function showStep() {
    const current = guide[step];
    progress.textContent = (step + 1) + ' of ' + guide.length;
    title.textContent = current.title;
    copy.textContent = current.description;
    back.disabled = step === 0;
    next.textContent = step === guide.length - 1 ? 'Done' : 'Next';
    current.target.scrollIntoView({block:'center',behavior:'instant'});
    positionSpot();
  }

  launch.addEventListener('click',() => {
    originalScroll = window.scrollY;
    step = 0;
    dialog.showModal();
    showStep();
    next.focus({preventScroll:true});
  });
  back.addEventListener('click',() => { if (step > 0) { step--; showStep(); if (back.disabled) next.focus(); } });
  next.addEventListener('click',() => {
    if (step === guide.length - 1) dialog.close();
    else { step++; showStep(); }
  });
  dialog.querySelector('[data-close]').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => {
    window.scrollTo({top:originalScroll,behavior:'instant'});
    launch.focus({preventScroll:true});
  });
  window.addEventListener('scroll',positionSpot,{passive:true});
  window.addEventListener('resize',positionSpot);
})();
