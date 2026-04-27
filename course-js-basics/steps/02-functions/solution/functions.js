function buildUrl(host, port = 8080, useHttps = true) {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

const summarise = (items) => `${items.length} items: ${items.join(', ')}`;

console.log(buildUrl('mainframe.example.com'));
console.log(summarise(['HELLOPGM', 'WORLDPGM', 'TESTPGM']));
