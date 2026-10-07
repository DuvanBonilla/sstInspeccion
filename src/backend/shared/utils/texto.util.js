function normalizarTexto(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}

module.exports = {
  normalizarTexto,
};