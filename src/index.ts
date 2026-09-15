import express from "express";
import { rssCache } from "./cache";

const app = express();

app.get("/", async (req, res) => {
  const rss = await rssCache.get();
  res.set("Content-Type", "application/rss+xml");
  res.send(rss);
});

app.listen(3000, () => {
  console.log("🚀 Server is running on http://localhost:3000");
});
