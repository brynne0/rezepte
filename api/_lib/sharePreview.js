// Shared helpers for share-link previews (the _lib folder is not deployed as a function)
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_TITLE = "Rezepte";

// Share tokens are 20 hex chars; reject anything else before hitting Supabase
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

// Swaps the <title> and adds Open Graph tags to the app's index.html.
// No og:image, so Messages shows the small apple-touch-icon instead of a big image.
export const buildPreviewHtml = (html, { title, pageUrl }) => {
  const safeTitle = escapeHtml(title);
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
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

// Null when the token is unknown or the recipe is no longer link-shared
export const fetchSharedRecipe = async (supabase, token) => {
  if (!isValidToken(token)) return null;
  const { data, error } = await supabase.rpc("get_shared_recipe", {
    p_token: token,
  });
  if (error) throw error;
  return data || null;
};
