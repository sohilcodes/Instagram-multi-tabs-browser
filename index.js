const express = require('express');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve Frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fetch USA Free Proxies
async function fetchProxyList(country = 'US', limit = 10) {
  try {
    const url = `https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&country=${country}&protocol=http`;
    const res = await fetch(url);
    const txt = await res.text();
    const list = txt.split("\n").map(p => p.trim()).filter(Boolean);
    return list.slice(0, limit);
  } catch (err) {
    return [];
  }
}

// API to Get Proxies
app.get('/api/get-proxies', async (req, res) => {
  const country = (req.query.country || "US").toUpperCase();
  const limit = parseInt(req.query.limit || "10");
  const proxies = await fetchProxyList(country, limit);
  res.json({ country, proxies });
});

// Proxy Fetch Endpoint
app.get('/fetch', async (req, res) => {
  const proxy = req.query.proxy;
  const target = req.query.url;

  if (!proxy || !target) {
    return res.status(400).send("Missing proxy or url");
  }

  try {
    new URL(target);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  const agent = new HttpsProxyAgent(`http://${proxy}`);

  try {
    const response = await fetch(target, {
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      }
    });

    const type = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", type);

    const buffer = await response.buffer();
    res.send(buffer);

  } catch (err) {
    res.status(500).send("Proxy fetch failed: " + err.message);
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
