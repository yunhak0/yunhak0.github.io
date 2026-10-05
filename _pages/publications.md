---
layout: editorial
permalink: /publications/
title: Research Archive
description: Publications by Yunhak Oh on machine learning, cellular biology, and therapeutic discovery.
editorial_tab: publications
years: [2026, 2025, 2023, 2022, 2016, 2014]
---
<header class="page-heading">
  <h1><span class="title-highlight">Research Archive</span></h1>
  <p>Machine learning for biology and human health. <a href="https://scholar.google.com/citations?user={{ site.scholar_userid }}">Google Scholar ↗</a></p>
</header>
<section data-publication-archive aria-label="Publications archive">
  {% include editorial-publication-tools.html years=page.years %}
  {% for year in page.years %}{% bibliography -f papers -q @*[year={{ year }}] -T editorial-bib %}{% endfor %}
  <p class="empty-results" data-empty-results hidden>No publications match. Try another search or year.</p>
</section>
<script src="{{ '/assets/js/editorial.js' | asset_version | relative_url }}" defer></script>
