// Share preview image: main photo or squirrel card
import sharp from "sharp";
import {
  FALLBACK_IMAGE_PATH,
  createSupabase,
  fetchSharedRecipe,
  getMainImagePath,
  getOrigin,
} from "./_lib/sharePreview.js";

const sendFallback = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, `${getOrigin(req)}${FALLBACK_IMAGE_PATH}`);
};

export default async function handler(req, res) {
  try {
    const supabase = createSupabase();
    // RPC only returns images if photos are link-visible
    const recipe = await fetchSharedRecipe(supabase, req.query.token);
    const imagePath = getMainImagePath(recipe);
    if (!imagePath) return sendFallback(req, res);

    const { data, error } = await supabase.storage
      .from("recipe-images")
      .download(imagePath);
    if (error || !data) return sendFallback(req, res);

    // Smaller files load more reliably in chat apps
    const image = await sharp(Buffer.from(await data.arrayBuffer()))
      .rotate()
      .resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    // No caching so hiding photos applies immediately
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(image);
  } catch (error) {
    console.error("Share preview image failed:", error);
    sendFallback(req, res);
  }
}
