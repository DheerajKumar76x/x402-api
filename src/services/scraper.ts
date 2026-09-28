export async function scrapeData(target: string): Promise<Record<string, unknown>> {
  const url = new URL(target);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("target must use HTTP or HTTPS");
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "x402-api/1.0 (+https://github.com/DheerajKumar76x/x402-api)" },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);

  const html = await response.text();
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const title = html.match(/<title\b[^<]*>([^<]*)<\/title>/i)?.[1]?.trim() || "No title found";

  return {
    target: url.toString(),
    scrapedAt: new Date().toISOString(),
    title,
    text: text.slice(0, 1000),
    textLength: text.length,
    source: "real-scraper",
    success: true
  };
}
