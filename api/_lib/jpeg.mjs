// Photos des dossiers : JPEG 144 × 144 px, sans métadonnées (ni GPS, ni appareil).
// Utilisé par l'administration (photo recadrée dans le navigateur, revérifiée ici) et par add-wedding.

export const MAX_PHOTO_BYTES = 80 * 1024; // une photo 144 px fait ~10 ko : large marge

// Retire les segments APP1…APP15 et COM d'un JPEG (EXIF, GPS, XMP, ICC…). null si ce n'est pas un JPEG.
export function stripMetadata(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const parts = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xda) { parts.push(buf.subarray(i)); return Buffer.concat(parts); } // début de l'image
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    const keep = !((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe);
    if (keep) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

// Photo envoyée par la page d'administration (base64) → JPEG nettoyé, ou null si refusée.
export function photoFromBase64(b64) {
  if (typeof b64 !== 'string' || b64.length > MAX_PHOTO_BYTES * 1.4) return null;
  const buf = Buffer.from(b64.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
  if (buf.length > MAX_PHOTO_BYTES) return null;
  return stripMetadata(buf);
}
