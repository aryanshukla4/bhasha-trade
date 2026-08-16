export function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function missingFields(body, fields) {
  return fields.filter((key) => body[key] === undefined || body[key] === null || body[key] === '');
}

export function forbidden(res) {
  return res.status(403).json({ error: 'Not permitted' });
}
