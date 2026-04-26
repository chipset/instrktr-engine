function buildUrl(host, port, useHttps) {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

function formatElement(el) {
  return `${el.elmName} (${el.type})`;
}

module.exports = { buildUrl, formatElement };
