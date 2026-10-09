# Site quality checks

The deployment workflow runs these checks before publishing:

- Internal links, asset references, and HTML fragments across every generated page.
- The historic `/assets/pdf/CV_YunhakOh.pdf` URL exists and matches the current CV.
- Valid JSON-LD, page descriptions, Open Graph URLs, and content-based CSS/JS versions.
- Desktop and mobile WCAG A/AA checks using axe.
- Selected / Full publications, search, paper summaries, and the continuous CV viewer.

Run locally:

```sh
bundle exec jekyll build
npm ci
npx playwright install chromium
npm run check:site
```

Pass another build directory with `node bin/check-site.mjs /path/to/build`.
Set `CHROME_PATH` to an existing Chrome executable to use it instead of a downloaded Playwright browser.

External links are left to manual review; the automated link check resolves files within the generated site.
The quality checker follows the site's selected keys and the PDF reader's page count when content is updated.

The photo uses Jekyll-generated WebP variants. The original JPEG and paper PNG remain source assets.
The shared head uses `_includes/editorial-metadata.html`; `asset_version` in `_plugins/asset_version.rb` derives a stable URL version from each CSS/JS file's content.

`_plugins/cv_alias.rb` copies the PDF selected by `editorial_cv` to the historic CV URL on every build. Update `editorial_cv` when replacing the dated PDF; the historic URL stays current automatically.
