const reader = document.querySelector('#cv-document');
const pages = document.querySelector('#pdf-pages');
const status = document.querySelector('#pdf-status');
const controls = Object.fromEntries(['prev', 'next', 'zoom-out', 'zoom-in', 'fit'].map(name => [name, document.querySelector(`#pdf-${name}`)]));
let documentPdf;
let pageNumber = 1;
let zoom = 1;
let generation = 0;
let resizeTimer;
let rendering = false;

try {
  const { getDocument, GlobalWorkerOptions, TextLayer } = await import('../lib/pdfjs/pdf.mjs');
  GlobalWorkerOptions.workerSrc = new URL('../lib/pdfjs/pdf.worker.mjs', import.meta.url).href;
  documentPdf = await getDocument({ url: reader.dataset.pdfUrl, isEvalSupported: false }).promise;

  const updateControls = () => {
    controls.prev.disabled = rendering || pageNumber === 1;
    controls.next.disabled = rendering || pageNumber === documentPdf.numPages;
    controls['zoom-out'].disabled = zoom <= 0.6;
    controls['zoom-in'].disabled = zoom >= 2;
    controls.fit.disabled = false;
    document.querySelector('#pdf-page-number').textContent = `${pageNumber} / ${documentPdf.numPages}`;
    document.querySelector('#pdf-zoom-label').textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
  };

  const syncCurrentPage = () => {
    if (rendering) return;
    const sheets = [...pages.querySelectorAll('.pdf-page')];
    if (!sheets.length) return;
    const readingPosition = pages.scrollTop + Math.min(80, pages.clientHeight / 4);
    const current = sheets.filter(sheet => sheet.offsetTop <= readingPosition).at(-1) || sheets[0];
    pageNumber = Number(current.dataset.page);
    if (pages.scrollTop + pages.clientHeight >= pages.scrollHeight - 2) pageNumber = documentPdf.numPages;
    updateControls();
  };

  async function renderDocument() {
    const revision = ++generation;
    const preservedPage = pageNumber;
    const oldSheet = pages.querySelector(`[data-page="${preservedPage}"]`);
    const fraction = oldSheet ? Math.max(0, (pages.scrollTop - oldSheet.offsetTop) / oldSheet.offsetHeight) : 0;
    rendering = true;
    pages.setAttribute('aria-busy', 'true');
    updateControls();
    try {
      const fragment = document.createDocumentFragment();
      const availableWidth = Math.max(150, pages.clientWidth - 32);
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      for (let number = 1; number <= documentPdf.numPages; number++) {
        const page = await documentPdf.getPage(number);
        if (revision !== generation) return;
        const original = page.getViewport({ scale: 1 });
        const scale = availableWidth / original.width * zoom;
        const viewport = page.getViewport({ scale });
        const sheet = document.createElement('div');
        sheet.className = 'pdf-page';
        sheet.dataset.page = number;
        sheet.style.width = `${viewport.width}px`;
        sheet.style.height = `${viewport.height}px`;
        sheet.style.setProperty('--total-scale-factor', scale);
        sheet.setAttribute('role', 'group');
        sheet.setAttribute('aria-label', `Page ${number}`);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        sheet.append(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport,
          transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0] }).promise;
        if (revision !== generation) return;
        const text = document.createElement('div');
        text.className = 'textLayer';
        sheet.append(text);
        await new TextLayer({ textContentSource: await page.getTextContent(), container: text, viewport }).render();
        for (const annotation of await page.getAnnotations()) {
          if (annotation.subtype !== 'Link' || !annotation.url || !/^(https?:|mailto:)/i.test(annotation.url)) continue;
          const rect = viewport.convertToViewportRectangle(annotation.rect);
          const link = document.createElement('a');
          link.href = annotation.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'pdf-link';
          link.setAttribute('aria-label', `Open ${annotation.url}`);
          Object.assign(link.style, { left: `${Math.min(rect[0], rect[2])}px`, top: `${Math.min(rect[1], rect[3])}px`, width: `${Math.abs(rect[2] - rect[0])}px`, height: `${Math.abs(rect[3] - rect[1])}px` });
          sheet.append(link);
        }
        fragment.append(sheet);
      }
      if (revision !== generation) return;
      pages.replaceChildren(fragment);
      status.hidden = true;
      const restoredSheet = pages.querySelector(`[data-page="${preservedPage}"]`);
      pages.scrollTop = restoredSheet.offsetTop - 16 + fraction * restoredSheet.offsetHeight;
    } catch (error) {
      if (revision !== generation) return;
      status.hidden = false;
      status.textContent = 'The PDF preview could not be displayed. Please use Download above.';
      console.error('CV rendering failed:', error);
    } finally {
      if (revision === generation) {
        rendering = false;
        pages.setAttribute('aria-busy', 'false');
        syncCurrentPage();
      }
    }
  }

  function scrollToPage(number) {
    const sheet = pages.querySelector(`[data-page="${number}"]`);
    if (sheet) { pages.scrollTop = sheet.offsetTop - 16; syncCurrentPage(); }
  }
  pages.addEventListener('scroll', syncCurrentPage, { passive: true });
  controls.prev.addEventListener('click', () => scrollToPage(pageNumber - 1));
  controls.next.addEventListener('click', () => scrollToPage(pageNumber + 1));
  controls['zoom-out'].addEventListener('click', () => { zoom = Math.max(0.6, Math.round((zoom - 0.2) * 10) / 10); renderDocument(); });
  controls['zoom-in'].addEventListener('click', () => { zoom = Math.min(2, Math.round((zoom + 0.2) * 10) / 10); renderDocument(); });
  controls.fit.addEventListener('click', () => { zoom = 1; renderDocument(); });
  let previousWidth = pages.clientWidth;
  new ResizeObserver(() => {
    if (pages.clientWidth === previousWidth) return;
    previousWidth = pages.clientWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderDocument, 150);
  }).observe(pages);
  await renderDocument();
} catch (error) {
  status.textContent = 'The PDF preview could not load. Please use Download above.';
  console.error('CV loading failed:', error);
}
