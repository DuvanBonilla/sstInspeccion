/*
  fechaEvidencia.js — Resuelve la fecha de una foto de evidencia.

  Qué hace:
  - Intenta leer la fecha real de la foto desde metadatos EXIF (DateTimeOriginal/DateTime).
  - Si la foto no trae EXIF, usa como respaldo el lastModified enviado por el navegador.

  Cómo interactúa:
  - Usado por inspeccion.controller.js al guardar la inspección (fecha queda
    almacenada junto a la evidencia en Neon) y por pdfInspeccion.controller.js
    al generar el PDF en el momento del envío original.
*/
const exifr = require("exifr");

// Extrae fecha/hora de la foto desde metadatos EXIF. Devuelve string "YYYY-MM-DD HH:MM" o null.
async function extraerFechaExif(buffer) {
  if (!buffer?.length) return null;
  try {
    const data = await exifr.parse(buffer, ["DateTimeOriginal", "DateTime"]);
    const raw = data?.DateTimeOriginal || data?.DateTime;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d)) return null;
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return null;
  }
}

// Formatea un timestamp (ms) como "YYYY-MM-DD HH:MM".
function formatearFechaMs(ms) {
  const d = new Date(Number(ms));
  if (isNaN(d)) return null;
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Resuelve la fecha de una evidencia: EXIF primero, lastModified del navegador como respaldo.
async function resolverFechaEvidencia(file, lastModMs) {
  const fechaExif = await extraerFechaExif(file?.buffer);
  if (fechaExif) return fechaExif;
  if (lastModMs) return formatearFechaMs(lastModMs);
  return null;
}

module.exports = { extraerFechaExif, formatearFechaMs, resolverFechaEvidencia };
