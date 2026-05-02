function ok(res, data, extra = undefined) {
  const payload = { ok: true, data };
  return res.json(extra ? { ...payload, ...extra } : payload);
}

function fail(res, status, code, message, details = undefined) {
  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = { ok, fail };

