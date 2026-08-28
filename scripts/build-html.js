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

// Un .svg inclus (ex. le logo, édité directement dans assets/images/) n'est
// pas un partial à variables {{key}} : ses attributs (class, aria-label...)
// sont injectés sur la balise <svg> racine, sa taille intrinsèque (width/
// height) est retirée pour laisser les classes Tailwind piloter la taille,
// et fill="black" devient fill="currentColor" pour hériter la couleur du
// texte environnant. Un seul fichier source, réutilisé partout (header,
// footer, hero) avec une couleur/taille différente à chaque usage.
function resolveSvgInclude(svgPath, attrsStr) {
  let svg = fs.readFileSync(svgPath, 'utf8');
  svg = svg.replace(/\s(width|height)="[^"]*"/g, '');
  svg = svg.replace(/fill="black"/g, 'fill="currentColor"');
  const extraAttrs = attrsStr.trim();
  if (extraAttrs) {
    svg = svg.replace(/^<svg/, '<svg ' + extraAttrs);
  }
  return svg;
}

function resolveIncludes(html) {
  const resolved = html.replace(INCLUDE_RE, function (match, partialPath, attrsStr) {
    const resolvedPath = path.join(TEMPLATES_DIR, partialPath);
    if (resolvedPath.endsWith('.svg')) {
      return resolveSvgInclude(resolvedPath, attrsStr);
    }
    const partial = fs.readFileSync(resolvedPath, 'utf8');
    let out = partial;
    ATTR_RE.lastIndex = 0;
    let attrMatch;
    while ((attrMatch = ATTR_RE.exec(attrsStr))) {
      const key = attrMatch[1];
      const value = attrMatch[2];
      out = out.split('{{' + key + '}}').join(value);
    }
    return out;
  });
  // Une partial peut elle-même contenir un #include (ex. footer.html qui
  // inclut le logo) : on continue tant qu'il en reste à résoudre.
  return resolved.indexOf('<!--#include') !== -1 ? resolveIncludes(resolved) : resolved;
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
