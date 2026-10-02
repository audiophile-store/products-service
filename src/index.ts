import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/version", (_req, res) => {
  res.json({ version: process.env.APP_VERSION || "0.1.0" });
});

app.listen(PORT, () => {
  console.log(`products service listening on port ${PORT}`);
});
