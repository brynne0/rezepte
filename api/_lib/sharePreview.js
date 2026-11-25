// Share-link preview helpers (_lib isn't deployed as a function)
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_TITLE = "Rezepte";
export const FALLBACK_IMAGE_PATH = encodeURI("/eichhörnchen/og-image.png");

// Reject non-tokens before calling Supabase
export const isValidToken = (token) =>
  typeof token === "string" && /^[a-z0-9]{8,64}$/i.test(token);

export const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const getOrigin = (req) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
};

// Same choice as getMainImage in the app
export const getMainImagePath = (recipe) => {
  const images = recipe?.images || [];
  return (images.find((img) => img.is_main) || images[0])?.path || null;
};

// Squirrel card if photos are hidden, else a versioned photo URL
export const getPreviewImageUrl = (origin, token, recipe) => {
  const imagePath = getMainImagePath(recipe);
  if (!imagePath) return `${origin}${FALLBACK_IMAGE_PATH}`;
  const version = createHash("sha1")
    .update(imagePath)
    .digest("hex")
    .slice(0, 8);
  return `${origin}/api/share-image/${token}?v=${version}`;
};

// Adds title and Open Graph tags to index.html
export const buildPreviewHtml = (html, { title, imageUrl, pageUrl }) => {
  const safeTitle = escapeHtml(title);
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
};

export const createSupabase = () =>
  createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

// Null if the link is unknown or turned off
export const fetchSharedRecipe = async (supabase, token) => {
  if (!isValidToken(token)) return null;
  const { data, error } = await supabase.rpc("get_shared_recipe", {
    p_token: token,
  });
  if (error) throw error;
  return data || null;
};
