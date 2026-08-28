function leerPayload(req) {
  if (typeof req.body?.payload === "string") {
    return JSON.parse(req.body.payload);
  }

  return req.body || {};
}

module.exports = {
  leerPayload,
};