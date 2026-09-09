import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RecipeAutofill = ({ onAutofill, onCancel, categories = [] }) => {
  const { t } = useTranslation();
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const MAX_CHARS = 15000;

  // Detect if input is a URL
  const isUrl = (text) => {
    try {
      new URL(text.trim());
      return true;
    } catch {
      return (
        text.trim().startsWith("http://") ||
        text.trim().startsWith("https://") ||
        text.trim().startsWith("www.")
      );
    }
  };

  // Check if character limit is exceeded (live validation)
  const isOverLimit = !isUrl(pastedText) && pastedText.length > MAX_CHARS;

  const parseRecipeWithAI = async () => {
    if (!pastedText.trim()) {
      setParseError(t("paste_text_required"));
      return;
    }

    // Check character limit for pasted text (not URLs)
    const trimmedText = pastedText.trim();
    const isUrlInput = isUrl(trimmedText);
    if (!isUrlInput && trimmedText.length > MAX_CHARS) {
      setParseError(
        t("paste_text_too_long", { max: MAX_CHARS.toLocaleString() })
      );
      return;
    }

    setIsParsing(true);
    setParseError("");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const trimmedText = pastedText.trim();
      const isUrlInput = isUrl(trimmedText);

      // Extract category values (excluding "all_recipes")
      const availableCategories = categories
        .filter((cat) => cat.value !== "all_recipes")
        .map((cat) => cat.value);

      const response = await fetch(`${supabaseUrl}/functions/v1/parse-recipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          pastedText: isUrlInput ? null : trimmedText,
          recipeUrl: isUrlInput ? trimmedText : null,
          availableCategories: availableCategories,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error("RATE_LIMIT");
        } else if (response.status >= 500) {
          throw new Error("SERVER_ERROR");
        } else {
          throw new Error(data.error || "PARSE_FAILED");
        }
      }

      const parsed = data.recipe;

      // Pass the parsed recipe to the parent component
      onAutofill(parsed);

      // Clear and hide paste area
      setPastedText("");
      setParseError("");
    } catch (error) {
      console.error("Error parsing recipe:", error);

      // Map error types to translation keys
      if (error.message === "RATE_LIMIT") {
        setParseError(t("parse_error_rate_limit"));
      } else if (error.message === "SERVER_ERROR") {
        setParseError(t("parse_error_server"));
      } else if (error.message?.includes("blocking automated access")) {
        setParseError(t("parse_error_blocked"));
      } else if (error.message?.includes("fetch")) {
        setParseError(t("parse_error_network"));
      } else {
        setParseError(t("parse_error"));
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleCancel = () => {
    setPastedText("");
    setParseError("");
    onCancel?.();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-input bg-muted/20 p-6">
      <h3>{t("autofill_recipe")}</h3>
      <Textarea
        value={pastedText}
        onChange={(e) => {
          setPastedText(e.target.value);
          if (parseError) setParseError("");
        }}
        onKeyDown={(e) => {
          // Allow Enter key in this textarea
          if (e.key === "Enter") {
            e.stopPropagation();
          }
        }}
        aria-invalid={!!parseError || isOverLimit}
        placeholder={t("paste_recipe_placeholder")}
      />
      {isOverLimit && !parseError && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("paste_text_too_long", { max: MAX_CHARS.toLocaleString() })}
          </AlertDescription>
        </Alert>
      )}
      {parseError && (
        <Alert variant="destructive">
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
      {!isUrl(pastedText) && pastedText.length > 10000 && (
        <span
          className={
            pastedText.length > MAX_CHARS
              ? "self-end text-xs font-medium text-destructive"
              : "self-end text-xs text-muted-foreground"
          }
        >
          {pastedText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      )}
      <p className="text-xs text-muted-foreground">{t("autofill_warning")}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={parseRecipeWithAI}
          disabled={isParsing}
        >
          {isParsing ? t("autofilling") : t("autofill")}
        </Button>
      </div>
    </div>
  );
};

export default RecipeAutofill;
