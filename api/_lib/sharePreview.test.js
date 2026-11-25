import { describe, it, expect, vi } from "vitest";
import {
  buildPreviewHtml,
  escapeHtml,
  fetchSharedRecipe,
  getOrigin,
  isValidToken,
} from "./sharePreview.js";

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <title>Rezepte</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("buildPreviewHtml", () => {
  const preview = {
    title: "Pumpkin soup",
    pageUrl: "https://example.com/shared/abc123def456/pumpkin-soup",
  };

  it("replaces the title and adds Open Graph tags", () => {
    const html = buildPreviewHtml(INDEX_HTML, preview);
    expect(html).toContain("<title>Pumpkin soup</title>");
    expect(html).not.toContain("<title>Rezepte</title>");
    expect(html).toContain(
      '<meta property="og:title" content="Pumpkin soup" />'
    );
    expect(html).toContain(`content="${preview.pageUrl}"`);
  });

  it("leaves out the image so Messages uses the small app icon", () => {
    const html = buildPreviewHtml(INDEX_HTML, preview);
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("twitter:card");
  });

  it("puts the tags inside the head and keeps the app root", () => {
    const html = buildPreviewHtml(INDEX_HTML, preview);
    expect(html.indexOf("og:title")).toBeLessThan(html.indexOf("</head>"));
    expect(html).toContain('<div id="root"></div>');
  });

  it("does not add a description", () => {
    expect(buildPreviewHtml(INDEX_HTML, preview)).not.toContain(
      "og:description"
    );
  });

  it("escapes recipe titles", () => {
    const html = buildPreviewHtml(INDEX_HTML, {
      ...preview,
      title: `Mac & "cheese" </title><script>`,
    });
    expect(html).toContain(
      "<title>Mac &amp; &quot;cheese&quot; &lt;/title&gt;&lt;script&gt;</title>"
    );
    expect(html).not.toContain("<script>");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;"
    );
  });
});

describe("isValidToken", () => {
  it("accepts share tokens and rejects junk", () => {
    expect(isValidToken("a1b2c3d4e5f6a7b8c9d0")).toBe(true);
    expect(isValidToken("../etc")).toBe(false);
    expect(isValidToken("")).toBe(false);
    expect(isValidToken(undefined)).toBe(false);
    expect(isValidToken(["a1b2c3d4e5f6"])).toBe(false);
  });
});

describe("fetchSharedRecipe", () => {
  it("skips the lookup for invalid tokens", async () => {
    const supabase = { rpc: vi.fn() };
    expect(await fetchSharedRecipe(supabase, "bad token!")).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns the recipe or null", async () => {
    const supabase = {
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: { title: "Soup" }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }),
    };
    expect(await fetchSharedRecipe(supabase, "a1b2c3d4e5f6")).toEqual({
      title: "Soup",
    });
    expect(await fetchSharedRecipe(supabase, "a1b2c3d4e5f6")).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith("get_shared_recipe", {
      p_token: "a1b2c3d4e5f6",
    });
  });

  it("throws on database errors", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("boom") }),
    };
    await expect(fetchSharedRecipe(supabase, "a1b2c3d4e5f6")).rejects.toThrow(
      "boom"
    );
  });
});

describe("getOrigin", () => {
  it("uses forwarded headers", () => {
    expect(
      getOrigin({
        headers: {
          "x-forwarded-host": "www.acorn-rezepte.com",
          "x-forwarded-proto": "https",
        },
      })
    ).toBe("https://www.acorn-rezepte.com");
  });
});
