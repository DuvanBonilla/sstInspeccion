const exifr = require("exifr");

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

function formatearFechaMs(ms) {
  const d = new Date(Number(ms));
  if (isNaN(d)) return null;
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function resolverFechaEvidencia(file, lastModMs) {
  const fechaExif = await extraerFechaExif(file?.buffer);
  if (fechaExif) return fechaExif;
  if (lastModMs) return formatearFechaMs(lastModMs);
  return null;
}

module.exports = { extraerFechaExif, formatearFechaMs, resolverFechaEvidencia };
