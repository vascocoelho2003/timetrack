function parseDocsUrl(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: true, url: null };

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false };
    }
    if (url.hostname !== 'localhost' && !url.hostname.includes('.')) {
      return { ok: false };
    }
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false };
  }
}

module.exports = { parseDocsUrl };
