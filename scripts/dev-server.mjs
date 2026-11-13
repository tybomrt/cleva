#!/usr/bin/env node
// Serveur local pour tester les pages d'énigme AVEC les fonctions /api/dossier et /api/photo
// (browser-sync ne sert que des fichiers statiques). Zéro dépendance en plus.
//
//   npm run dev:dossiers   → http://localhost:4176/m/yPIJmt0brVePOdo8/
//
// Lit DATABASE_URL et DOSSIER_SALT dans .env (même base que la production).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dossierHandler, photoHandler } from '../api/_lib/live.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 4176;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/api/dossier') return dossierHandler(req, res);
  if (path === '/api/photo') return photoHandler(req, res);

  // Fichiers statiques, jamais de fichier caché (.env…) ni de sortie de la racine.
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || file.split(sep).some((p) => p.startsWith('.') && p.length > 1)) {
    res.statusCode = 404; return res.end('404');
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch (e) {
    file += '.html'; // cleanUrls, comme sur Vercel
  }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch (e) {
    res.statusCode = 404; res.end('404');
  }
}).listen(PORT, () => console.log('Pages d’énigme + /api sur http://localhost:' + PORT + '/m/yPIJmt0brVePOdo8/'));
