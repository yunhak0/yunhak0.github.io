document.querySelectorAll('[data-authors-block]').forEach(block => {
  const authors = block.querySelector('.paper-authors');
  const button = block.querySelector('[data-authors-toggle]');
  const currentName = block.querySelector('.authors-current-name');
  const ownAuthor = authors.querySelector('strong');
  if (ownAuthor) currentName.textContent = ownAuthor.textContent;

  const updateAuthors = () => {
    if (!block.getBoundingClientRect().width) return;
    const lineHeight = parseFloat(getComputedStyle(authors).lineHeight);
    const overflowing = authors.scrollHeight > lineHeight * 2 + 1;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    authors.classList.toggle('is-collapsed', overflowing && !expanded);
    button.hidden = !overflowing;
    // Keep the highlighted author visible if the two-line preview cuts off their name.
    const ownBottom = ownAuthor?.getBoundingClientRect().bottom;
    currentName.hidden = !ownAuthor || expanded || !overflowing || ownBottom <= authors.getBoundingClientRect().top + lineHeight * 2 + 1;
  };

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less −' : 'All authors +';
    updateAuthors();
  });
  new ResizeObserver(updateAuthors).observe(block);
  block.addEventListener('publication-layout', updateAuthors);
  document.fonts.ready.then(updateAuthors);
  updateAuthors();
});

document.querySelectorAll('[data-paper-toggle]').forEach(button => {
  const summary = document.getElementById(button.getAttribute('aria-controls'));
  const heading = button.closest('.paper-heading');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const preview = document.createElement('div');
  preview.className = 'paper-preview';
  preview.id = `${summary.id}-preview`;
  preview.setAttribute('role', 'tooltip');
  preview.innerHTML = summary.innerHTML;
  preview.hidden = true;
  heading.append(preview);
  button.setAttribute('aria-describedby', preview.id);
  button.addEventListener('pointerenter', event => {
    if (!hover.matches || event.pointerType !== 'mouse') return;
    preview.hidden = button.getAttribute('aria-expanded') === 'true';
  });
  heading.addEventListener('pointerleave', () => {
    preview.hidden = true;
  });
  button.addEventListener('click', () => {
    preview.hidden = true;
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    summary.hidden = !expanded;
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.paper-preview').forEach(preview => { preview.hidden = true; });
  }
});

const archive = document.querySelector('[data-publication-archive]');
if (archive) {
  const items = [...archive.querySelectorAll('.bibliography > li')];
  const progressive = archive.hasAttribute('data-expanding-publications');
  const selectedKeys = (archive.dataset.selectedKeys || '').split(',');
  const paperKey = item => item.querySelector('.paper').id;
  const paperYear = item => item.querySelector('.paper-year').textContent.trim();
  const chronologicalItems = [...items].sort((a, b) => Number(paperYear(b)) - Number(paperYear(a)));
  const selectedItems = selectedKeys.map(key => items.find(item => paperKey(item) === key)).filter(Boolean);
  const tools = archive.querySelector('[data-archive-tools]');
  const title = archive.querySelector('[data-publications-title]');
  const expandButton = archive.querySelector('[data-expand-publications]');
  const collapseButton = archive.querySelector('[data-collapse-publications]');
  const fullArchiveButton = archive.querySelector('[data-full-archive-link]');
  const end = archive.querySelector('[data-publications-end]');
  const list = archive.querySelector('.bibliography');
  const anchorKey = decodeURIComponent(window.location.hash.slice(1));
  let expanded = !progressive || anchorKey === archive.id || items.some(item => paperKey(item) === anchorKey);
  if (progressive) {
    const years = [...new Set(items.map(paperYear))].sort((a, b) => Number(b) - Number(a));
    const filters = archive.querySelector('.year-filters');
    years.forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.year = value;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = value;
      filters.append(button);
    });
  }
  const buttons = [...archive.querySelectorAll('[data-year]')];
  const input = archive.querySelector('input[type="search"]');
  const count = archive.querySelector('[data-result-count]');
  const empty = archive.querySelector('[data-empty-results]');
  let year = 'all';
  function filter() {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const item of items) {
      const matchesSelection = expanded || selectedKeys.includes(paperKey(item));
      const matchesYear = year === 'all' || paperYear(item) === year;
      const searchableText = [...item.querySelectorAll('.paper-meta, h3, .paper-authors')].map(element => element.textContent).join(' ').toLocaleLowerCase();
      item.hidden = !matchesSelection || !matchesYear || !searchableText.includes(query);
      if (!item.hidden) visible++;
    }
    count.textContent = `${visible} publication${visible === 1 ? '' : 's'}`;
    empty.hidden = visible !== 0;
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    year = button.dataset.year;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter();
  }));
  input.addEventListener('input', filter);
  function updateMode() {
    tools.hidden = !expanded;
    count.hidden = !expanded;
    if (progressive) {
      title.textContent = expanded ? 'Full publications' : 'Selected publications';
      selectedItems.forEach(item => { item.querySelector('.paper').classList.toggle('is-selected', expanded); });
      expandButton.hidden = false;
      expandButton.setAttribute('aria-expanded', String(expanded));
      expandButton.setAttribute('aria-label', expanded ? 'Show selected publications' : 'Show all publications');
      expandButton.querySelector('span').textContent = expanded ? 'Selected only' : 'Scroll down for all publications';
      collapseButton.hidden = !expanded;
      fullArchiveButton.hidden = expanded;
      fullArchiveButton.setAttribute('aria-expanded', String(expanded));
      expandButton.querySelector('.publication-reveal-arrow').textContent = expanded ? '↑' : '↓';
      end.hidden = false;
      const order = expanded ? chronologicalItems : [...selectedItems, ...chronologicalItems.filter(item => !selectedItems.includes(item))];
      order.forEach(item => list.append(item));
    }
    filter();
  }
  updateMode();
  if (progressive) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const footer = document.querySelector('.site-footer');
    // Hover previews can extend the document; the footer marks the actual page end.
    const atPageEnd = () => footer ? footer.getBoundingClientRect().bottom <= window.innerHeight + 3 : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3;
    let transitioning = false;
    let selectedScrollTarget = archive.getBoundingClientRect().top + window.scrollY;
    function changeMode(nextExpanded) {
      if (expanded === nextExpanded || transitioning) return;
      archive.querySelectorAll('.paper-preview').forEach(preview => { preview.hidden = true; });
      transitioning = true;
      const startHeight = archive.getBoundingClientRect().height;
      const startScroll = window.scrollY;
      if (nextExpanded) selectedScrollTarget = archive.getBoundingClientRect().top + window.scrollY;
      const oldPositions = new Map(items.filter(item => !item.hidden).map(item => [item, item.getBoundingClientRect().top]));
      const previousAnchoring = document.documentElement.style.overflowAnchor;
      document.documentElement.style.overflowAnchor = 'none';
      archive.classList.add('is-revealing');
      expanded = nextExpanded;
      year = 'all';
      input.value = '';
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === 'all')));
      updateMode();
      archive.querySelectorAll('[data-authors-block]').forEach(block => block.dispatchEvent(new Event('publication-layout')));
      const endHeight = archive.getBoundingClientRect().height;
      archive.style.height = `${startHeight}px`;
      window.scrollTo({ top: nextExpanded ? startScroll : Math.min(startScroll, selectedScrollTarget), behavior: 'instant' });
      const finish = () => {
        archive.style.height = '';
        archive.classList.remove('is-revealing');
        document.documentElement.style.overflowAnchor = previousAnchoring;
        transitioning = false;
      };
      if (reducedMotion.matches || !archive.animate) {
        finish();
        return;
      }
      const duration = 850;
      const easing = 'cubic-bezier(.22, 1, .36, 1)';
      archive.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], { duration, easing, fill: 'forwards' }).finished.then(() => {
        finish();
        archive.getAnimations().forEach(animation => animation.cancel());
      }, finish);
      title.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, easing });
      chronologicalItems.forEach((item, index) => {
        if (item.hidden) return;
        if (oldPositions.has(item)) {
          const distance = oldPositions.get(item) - item.getBoundingClientRect().top;
          item.animate([{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }], { duration, easing });
        } else {
          item.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: Math.min(index * 35, 250), easing, fill: 'backwards' });
        }
      });
      if (expanded) [tools, count].forEach(element => element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 120, fill: 'backwards' }));
    }
    // Reaching the footer leaves the selected list intact. Only a new downward
    // gesture at the page boundary (or the explicit button) opens the archive.
    let wheelDistance = 0;
    let lastWheel = 0;
    let wheelArmed = false;
    function onWheel(event) {
      const now = performance.now();
      const newGesture = now - lastWheel > 250;
      lastWheel = now;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, .news-scroll')) return;
      if (expanded || transitioning || event.ctrlKey || event.deltaY <= 0 || !atPageEnd()) {
        wheelDistance = 0;
        wheelArmed = false;
        return;
      }
      if (newGesture) {
        wheelDistance = 0;
        wheelArmed = true;
      }
      if (!wheelArmed) return;
      const distance = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      wheelDistance += distance;
      if (wheelDistance >= 80) {
        event.preventDefault();
        changeMode(true);
      }
    }
    let touchStart = null;
    function onTouchStart(event) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, .news-scroll')) {
        touchStart = null;
        return;
      }
      touchStart = !transitioning && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, canExpand: !expanded && atPageEnd() } : null;
    }
    function onTouchMove(event) {
      if (!touchStart || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (Math.abs(touchStart.x - touch.clientX) >= 40) return;
      if (touchStart.canExpand && touchStart.y - touch.clientY >= 55) {
        event.preventDefault();
        changeMode(true);
        touchStart = null;
      }
    }
    expandButton.addEventListener('click', () => changeMode(!expanded));
    fullArchiveButton.addEventListener('click', () => changeMode(true));
    collapseButton.addEventListener('click', () => changeMode(false));
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
  }
}

const news = document.querySelector('[data-home-news]');
if (news) {
  const list = news.querySelector('.news-scroll');
  const more = news.querySelector('.news-more');
  const older = news.querySelector('.news-older');
  const mobile = window.matchMedia('(max-width: 680px)');
  news.classList.add('news-enhanced');
  more.hidden = list.querySelectorAll('.dispatch').length <= 3;

  const updateScrollHint = () => {
    older.hidden = mobile.matches || list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
  };
  const updateMode = () => {
    if (mobile.matches) list.removeAttribute('tabindex');
    else list.setAttribute('tabindex', '0');
    updateScrollHint();
  };
  more.addEventListener('click', () => {
    const expanded = news.classList.toggle('news-expanded');
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? 'Show less news −' : 'Show more news +';
    if (!expanded) news.querySelector('#news-heading').scrollIntoView({ block: 'start' });
  });
  older.addEventListener('click', () => {
    list.focus({ preventScroll: true });
    list.scrollBy({ top: list.clientHeight * 0.75, behavior: 'auto' });
  });
  list.addEventListener('scroll', updateScrollHint, { passive: true });
  list.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', updateScrollHint));
  new ResizeObserver(updateScrollHint).observe(list);
  mobile.addEventListener('change', updateMode);
  document.fonts.ready.then(updateScrollHint);
  updateMode();
}
