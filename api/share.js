// Serves /shared/:token/:slug with Open Graph tags so chat apps show a preview
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_TITLE,
  FALLBACK_IMAGE_PATH,
  buildPreviewHtml,
  createSupabase,
  fetchSharedRecipe,
  getOrigin,
} from "./_lib/sharePreview.js";

let cachedIndexHtml = null;

// Reads the built index.html, falling back to fetching it from this deployment
const loadIndexHtml = async (origin) => {
  if (cachedIndexHtml) return cachedIndexHtml;
  try {
    cachedIndexHtml = await readFile(
      path.join(process.cwd(), "dist", "index.html"),
      "utf8"
    );
  } catch {
    const response = await fetch(`${origin}/index.html`);
    if (!response.ok) throw new Error(`index.html: ${response.status}`);
    cachedIndexHtml = await response.text();
  }
  return cachedIndexHtml;
};

export default async function handler(req, res) {
  const origin = getOrigin(req);
  const token = req.query.token;

  let recipe = null;
  try {
    recipe = await fetchSharedRecipe(createSupabase(), token);
  } catch (error) {
    console.error("Share preview lookup failed:", error);
  }

  let html;
  try {
    html = await loadIndexHtml(origin);
  } catch (error) {
    console.error("Share preview could not load index.html:", error);
    res.status(502).send("Something went wrong. Please refresh the page.");
    return;
  }

  // Unknown or revoked links get generic tags so nothing about the recipe leaks
  const preview = {
    imageUrl: `${origin}${FALLBACK_IMAGE_PATH}`,
    ...(recipe
      ? {
          title: recipe.title,
          pageUrl: `${origin}/shared/${token}${recipe.slug ? `/${recipe.slug}` : ""}`,
        }
      : { title: DEFAULT_TITLE, pageUrl: origin }),
  };

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=60, stale-while-revalidate=60"
  );
  res.status(200).send(buildPreviewHtml(html, preview));
}
