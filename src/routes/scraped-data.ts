import { Router } from "express";
import { scrapeData } from "../services/scraper";

const router = Router();
router.get("/", async (req, res, next) => {
  const target = typeof req.query.target === "string" ? req.query.target : "https://example.com";
  try {
    const data = await scrapeData(target);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof TypeError || error instanceof URIError) {
      res.status(400).json({ success: false, error: "Invalid target URL", message: error.message });
      return;
    }
    next(error);
  }
});

export default router;
