const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/proxy', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const url = req.query.url;
  if (!url || !url.startsWith('https://cards.scryfall.io/')) {
    res.status(400).send('Invalid or missing url');
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).send('Failed to fetch image');
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.buffer();
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
}); 