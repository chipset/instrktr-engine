const host     = 'mainframe.example.com';
const port     = 8080;
const useHttps = true;
let   retries  = 0;

retries = 3;

const protocol = useHttps ? 'https' : 'http';
console.log(`Endpoint: ${protocol}://${host}:${port} (retries: ${retries})`);
