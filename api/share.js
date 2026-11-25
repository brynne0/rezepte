// Share page with Open Graph tags for link previews
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_TITLE,
  FALLBACK_IMAGE_PATH,
  buildPreviewHtml,
  createSupabase,
  fetchSharedRecipe,
  getOrigin,
  getPreviewImageUrl,
} from "./_lib/sharePreview.js";

let cachedIndexHtml = null;

// Built index.html from disk, else fetched
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

  // Generic tags for dead links so nothing leaks
  const preview = recipe
    ? {
        title: recipe.title,
        imageUrl: getPreviewImageUrl(origin, token, recipe),
        pageUrl: `${origin}/shared/${token}${recipe.slug ? `/${recipe.slug}` : ""}`,
      }
    : {
        title: DEFAULT_TITLE,
        imageUrl: `${origin}${FALLBACK_IMAGE_PATH}`,
        pageUrl: origin,
      };

  // No caching so visibility changes apply immediately
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(buildPreviewHtml(html, preview));
}
