const https = require("https");

const API_TOKEN = process.env.FOOTBALL_API_TOKEN || "a9eec63f7987406e8693b8aedb50ee7d";
const BASE = "api.football-data.org";

module.exports = async (req, res) => {
  // CORS — allow any origin (your React app)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  // Build the upstream path from query params
  // e.g. /api/football?path=/v4/competitions/PL/matches&status=SCHEDULED
  const { path, ...rest } = req.query;
  if (!path) return res.status(400).json({ error: "Missing path param" });

  const qs = new URLSearchParams(rest).toString();
  const upstreamPath = qs ? `${path}?${qs}` : path;

  const options = {
    hostname: BASE,
    port: 443,
    path: upstreamPath,
    method: "GET",
    headers: { "X-Auth-Token": API_TOKEN },
  };

  const upstream = https.request(options, (upstream) => {
    let body = "";
    upstream.on("data", (chunk) => (body += chunk));
    upstream.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "s-maxage=25, stale-while-revalidate");
      res.status(upstream.statusCode).send(body);
    });
  });

  upstream.on("error", (e) => {
    console.error("Upstream error:", e);
    res.status(502).json({ error: "Upstream request failed", detail: e.message });
  });

  upstream.end();
};
