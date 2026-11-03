#!/usr/bin/env node
/**
 * build.mjs — regenerates works.html from works.json.
 *
 *     node build.mjs
 *
 * No dependencies, no watcher: run it whenever works.json changes. The page is
 * written once (works.html) and never hand-edited, so a recompile is always safe.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const { items = [] } = JSON.parse(readFileSync(join(ROOT, 'works.json'), 'utf8'));

/*
 * Cache-bust styles.css from its own contents, so editing the CSS is picked up
 * without anyone remembering to bump a ?v= by hand.
 */
const cssVersion = createHash('sha1')
    .update(readFileSync(join(ROOT, 'styles.css')))
    .digest('hex')
    .slice(0, 8);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2025-01-14' -> 'Jan 14, 2025'. Anything else is passed through untouched. */
function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
    if (!m) return String(iso ?? '');
    const [, year, month, day] = m;
    return `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}, ${year}`;
}

/**
 * Normalise an "article" value from works.json to a site-relative path.
 *   "jcolcord.me/writing/foo"          -> "writing/foo"
 *   "https://jcolcord.me/writing/foo"  -> "writing/foo"
 *   "writing/foo"                      -> "writing/foo"
 * Only a first segment that looks like a hostname (contains a dot) is stripped.
 */
const articlePath = (article) => String(article)
    .replace(/^https?:\/\//, '')
    .replace(/^[^/]*\.[^/]*\//, '');

/** Public URL for an article: absolute path, so it resolves the same from any page. */
const articleHref = (article) => '/' + articlePath(article);

/* Same GitHub mark as index.html, so the icon reads identically across pages. */
const ICON_GITHUB = '<svg class="icon-brand" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>';

/* Outlined document, drawn with strokes so it matches the weight of the GitHub mark. */
const ICON_DOC = '<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';

/* Same LinkedIn mark as index.html. */
const ICON_LINKEDIN = '<svg class="icon-brand" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>';

/* Arrow pointing left, back to the home page. */
const ICON_BACK = '<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';

/* Links that aren't part of the JSON payload but belong on every page. */
const GITHUB_URL = 'https://github.com/joshcolcord';
const LINKEDIN_URL = 'https://www.linkedin.com/in/joshcolcord';

function projectCard(item) {
    const title = esc(item.title);
    const href = item.article ? esc(articleHref(item.article)) : '';
    const heading = href
        ? `<a class="work-title" href="${href}">${title}</a>`
        : `<span class="work-title">${title}</span>`;

    const actions = [
        href && `<a href="${href}" aria-label="Read the writeup of ${esc(item.title)}" title="Writeup">${ICON_DOC}</a>`,
        item.github && `<a href="${esc(item.github)}" target="_blank" rel="noopener noreferrer" aria-label="Source for ${esc(item.title)}" title="Source">${ICON_GITHUB}</a>`,
    ].filter(Boolean);

    const actionBar = actions.length
        ? `\n                    <span class="work-actions">\n                        ${actions.join('\n                        ')}\n                    </span>`
        : '';

    /* Icon cluster sits inline at the end of the description, baseline-aligned. */
    return `            <li class="work-item">
                ${heading}
                <div class="work-body">
                    <span class="work-desc">${esc(item.description || '')}</span>${actionBar}
                </div>
            </li>`;
}

function writingRow(item) {
    const title = esc(item.title);
    const heading = item.article
        ? `<a class="write-title" href="${esc(articleHref(item.article))}">${title}</a>`
        : `<span class="write-title">${title}</span>`;

    return `            <li class="write-item">
                ${heading}
                <span class="write-date">${esc(formatDate(item.date))}</span>
            </li>`;
}

const projects = items.filter((item) => item.type === 'project');
const writing = items.filter((item) => item.type === 'writing');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projects &amp; Writing — joshua colcord</title>
    <meta name="description" content="Projects and writing by joshua colcord.">
    <meta name="theme-color" content="#111111">
    <link rel="stylesheet" href="/styles.css?v=${cssVersion}">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
</head>
<body>
    <main id="maincontent" class="page">
        <header class="masthead">
            <h1>Joshua Colcord</h1>
            <div class="masthead-icons">
                <a href="/" aria-label="Back to home" title="Home">${ICON_BACK}</a>
                <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">${ICON_GITHUB}</a>
                <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">${ICON_LINKEDIN}</a>
            </div>
        </header>

        <h2 class="section-head">Projects</h2>
        <ul class="work-list">
${projects.map(projectCard).join('\n')}
        </ul>

        <h2 class="section-head">Writing</h2>
        <ul class="write-list">
${writing.map(writingRow).join('\n')}
        </ul>
    </main>
</body>
</html>
`;

/* Fail loudly rather than shipping a page with dead links in it. */
const problems = [];
for (const item of items) {
    if (!item.title) problems.push(`item with no title: ${JSON.stringify(item)}`);
    if (item.type !== 'project' && item.type !== 'writing') {
        problems.push(`unknown type ${JSON.stringify(item.type)} on ${JSON.stringify(item.title)}`);
    }
    if (item.article && !existsSync(join(ROOT, articlePath(item.article) + '.html'))) {
        problems.push(`article not found: ${item.article} (${item.title})`);
    }
}

writeFileSync(join(ROOT, 'works.html'), html);
console.log(`works.html written — ${projects.length} project(s), ${writing.length} writing item(s), css v${cssVersion}`);

for (const problem of problems) console.warn(`warning: ${problem}`);
process.exitCode = problems.length ? 1 : 0;