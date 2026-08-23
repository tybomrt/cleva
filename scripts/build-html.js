/* ==========================================================================
   cleva. — assemblage des pages HTML à partir de templates/

   Résout les directives <!--#include "partials/xxx.html" key="value" -->
   dans templates/pages/*.html en remplaçant {{key}} dans le partial par la
   valeur fournie, puis écrit le résultat à la racine du projet (les fichiers
   servis par Vercel / le serveur local, inchangés en dehors de ce build).

   npm run build:html        — build une fois
   node scripts/build-html.js --watch — build + surveille templates/
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const PAGES_DIR = path.join(TEMPLATES_DIR, 'pages');

const INCLUDE_RE = /<!--#include\s+"([^"]+)"((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;

function resolveIncludes(html) {
  return html.replace(INCLUDE_RE, function (match, partialPath, attrsStr) {
    const partial = fs.readFileSync(path.join(TEMPLATES_DIR, partialPath), 'utf8');
    let resolved = partial;
    ATTR_RE.lastIndex = 0;
    let attrMatch;
    while ((attrMatch = ATTR_RE.exec(attrsStr))) {
      const key = attrMatch[1];
      const value = attrMatch[2];
      resolved = resolved.split('{{' + key + '}}').join(value);
    }
    return resolved;
  });
}

function buildPage(file) {
  const src = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
  const out = resolveIncludes(src);
  fs.writeFileSync(path.join(ROOT, file), out, 'utf8');
  console.log('built ' + file);
}

function buildAll() {
  const files = fs.readdirSync(PAGES_DIR).filter(function (f) {
    return f.endsWith('.html');
  });
  files.forEach(buildPage);
}

if (process.argv.includes('--watch')) {
  buildAll();
  console.log('watching templates/ for changes...');
  fs.watch(TEMPLATES_DIR, { recursive: true }, function () {
    try {
      buildAll();
    } catch (err) {
      console.error(err.message);
    }
  });
} else {
  buildAll();
}
