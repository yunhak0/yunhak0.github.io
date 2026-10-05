import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = resolve(process.argv[2] || '_site');
const siteOrigin = 'https://yunhak0.github.io';
const failures = [];
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}
async function routeFile(pathname) {
  let path = resolve(root, '.' + decodeURIComponent(pathname));
  if (path !== root && !path.startsWith(root + sep)) throw new Error('Path outside build');
  if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
  return path;
}

// Check local links throughout the generated site, without depending on external services.
const htmlFiles = (await files(root)).filter(path => extname(path) === '.html');
for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8');
  const pagePath = '/' + relative(root, path).split(sep).join('/');
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs)) {
    try { JSON.parse(match[1]); }
    catch (error) { failures.push(`${pagePath}: invalid structured data (${error.message})`); }
  }
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>').replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...markup.matchAll(/<[a-z][^>]*>/gi)].map(match => match[0]).join('\n');
  const attributes = [...tags.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gs)].map(match => match[2]);
  for (const match of tags.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gs)) {
    attributes.push(...match[2].split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
  }
  for (const value of attributes) {
    if (!value || value.startsWith('data:')) continue;
    let url;
    try {
      url = new URL(value.replaceAll('&amp;', '&'), siteOrigin + pagePath);
    } catch {
      failures.push(`${pagePath}: invalid URL ${value}`);
      continue;
    }
    if (url.origin !== siteOrigin) continue;
    try {
      const target = await routeFile(url.pathname);
      await stat(target);
      if (url.hash && url.hash !== '#' && extname(target) === '.html') {
        const fragment = decodeURIComponent(url.hash.slice(1));
        const destination = target === path ? html : await readFile(target, 'utf8');
        const anchors = [...destination.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gs)].map(match => match[2]);
        if (!anchors.includes(fragment)) throw new Error('Missing fragment ' + fragment);
      }
    } catch (error) {
      failures.push(`${pagePath}: ${value} (${error.message})`);
    }
  }
}
console.log(`Checked internal links and resources in ${htmlFiles.length} HTML pages`);

const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp', '.png':'image/png', '.pdf':'application/pdf', '.ttf':'font/ttf' };
const server = createServer(async (request, response) => {
  try {
    const path = await routeFile(new URL(request.url, 'http://localhost').pathname);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless:true });
  for (const width of [1280,390]) {
    const context = await browser.newContext({ viewport:{ width,height:900 }, reducedMotion:'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(`${width}px JavaScript: ${error.message}`));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`);
    });
    const audit = async label => {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      for (const violation of result.violations) failures.push(`${width}px ${label}: ${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) failures.push(`${width}px ${label}: horizontal overflow`);
      console.log(`${width}px ${label}: ${result.violations.length} accessibility violations`);
    };
    for (const route of ['/', '/publications/', '/cv/', '/news/']) {
      await page.goto(origin + route);
      await page.evaluate(() => document.fonts.ready);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      if (!description || description.includes('whitespace theme')) failures.push(route + ': missing current description');
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      if (ogUrl !== siteOrigin + route) failures.push(route + ': wrong Open Graph URL');
      for (const selector of ['link[rel="stylesheet"]','script[src*="assets/js/"]']) {
        for (const asset of await page.locator(selector).evaluateAll(nodes => nodes.map(node => node.getAttribute('href') || node.getAttribute('src')))) {
          const url = new URL(asset, origin);
          const expected = createHash('sha256').update(await readFile(await routeFile(url.pathname))).digest('hex').slice(0,12);
          if (url.searchParams.get('v') !== expected) failures.push(route + ': incorrect asset version: ' + asset);
        }
      }
      if (route === '/') {
        const person = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
        if (person['@type'] !== 'Person' || person.name !== 'Yunhak Oh') failures.push('Incorrect Person metadata');
        await page.locator('.portrait img').evaluate(image => image.decode());
        if (!await page.locator('.portrait img').evaluate(image => image.currentSrc.includes('.webp'))) failures.push('Portrait not using WebP');
        const selectedCount = await page.locator('[data-selected-keys]').evaluate(element => element.dataset.selectedKeys.split(',').length);
        const totalCount = await page.locator('.paper').count();
        if (await page.locator('.paper:visible').count() !== selectedCount) failures.push('Wrong Selected list');
        await audit('About / Selected');
        await page.getByRole('button',{ name:'Full archive ↓', exact:true }).click();
        if (await page.locator('.paper:visible').count() !== totalCount) failures.push('Wrong Full list');
        await audit('About / Full');
        await page.getByRole('searchbox',{name:'Search publications'}).fill('scTrilemma');
        await page.locator('#oh2026sctrilemma-toggle').click();
        if (!await page.locator('#oh2026sctrilemma-summary').isVisible()) failures.push('Paper summary toggle failed');
        await audit('About / open paper');
      } else {
        if (route === '/cv/') await page.waitForFunction(() => {
          const count = Number(document.querySelector('#pdf-page-number').textContent.split('/')[1]);
          return count > 0 && document.querySelectorAll('.pdf-page canvas').length === count && document.querySelector('#pdf-status').hidden;
        }, {}, {timeout:30000});
        await audit(route);
      }
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else {
  console.log('Site quality checks passed');
}
