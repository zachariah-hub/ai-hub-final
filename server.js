import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Required boilerplate to define __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve the static files from the Vite build directory (dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing (SPA): redirect all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Google Cloud Run requires listening on the environment variable PORT and binding to 0.0.0.0
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Production server (ESM) listening on port ${port}`);
});