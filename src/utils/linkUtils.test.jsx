import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { extractFirstUrl, linkifyText } from "./linkUtils";

describe("linkUtils", () => {
  describe("extractFirstUrl", () => {
    it("returns null for empty or plain text", () => {
      expect(extractFirstUrl("")).toBe(null);
      expect(extractFirstUrl(null)).toBe(null);
      expect(extractFirstUrl("Grandma's cookbook")).toBe(null);
    });

    it("finds a URL that is the whole string", () => {
      expect(extractFirstUrl("https://example.com/recipe")).toBe(
        "https://example.com/recipe"
      );
    });

    it("finds a URL embedded within a sentence", () => {
      expect(extractFirstUrl("Adapted from https://example.com/recipe")).toBe(
        "https://example.com/recipe"
      );
    });

    it("normalizes www. URLs to include a protocol", () => {
      expect(extractFirstUrl("www.example.com")).toBe(
        "https://www.example.com"
      );
    });

    it("strips trailing punctuation that isn't part of the URL", () => {
      expect(extractFirstUrl("See www.example.com.")).toBe(
        "https://www.example.com"
      );
      expect(extractFirstUrl("(www.example.com)")).toBe(
        "https://www.example.com"
      );
    });
  });

  describe("linkifyText", () => {
    it("returns null for empty text", () => {
      expect(linkifyText("")).toBe(null);
    });

    it("renders plain text unchanged", () => {
      const { container } = render(<>{linkifyText("Grandma's cookbook")}</>);
      expect(container.textContent).toBe("Grandma's cookbook");
      expect(container.querySelector("a")).toBe(null);
    });

    it("renders an embedded URL as a link with a normalized href", () => {
      const { container } = render(
        <>{linkifyText("Adapted from www.example.com, enjoy!")}</>
      );
      const link = container.querySelector("a");
      expect(link).not.toBe(null);
      expect(link.getAttribute("href")).toBe("https://www.example.com");
      expect(container.textContent).toBe(
        "Adapted from www.example.com, enjoy!"
      );
    });
  });
});
