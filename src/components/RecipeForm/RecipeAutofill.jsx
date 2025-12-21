import { useState } from "react";
import { useTranslation } from "react-i18next";
import AutoResizeTextArea from "../AutoResizeTextArea/AutoResizeTextArea";

const RecipeAutofill = ({ onAutofill, categories = [] }) => {
  const { t } = useTranslation();
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");

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

  const parseRecipeWithAI = async () => {
    if (!pastedText.trim()) {
      setParseError(t("paste_text_required"));
      return;
    }

    setIsParsing(true);
    setParseError("");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const trimmedText = pastedText.trim();
      const isUrlInput = isUrl(trimmedText);

      // Extract category values (excluding "all")
      const availableCategories = categories
        .filter((cat) => cat.value !== "all")
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
        throw new Error(data.error || "Failed to parse recipe");
      }

      const parsed = data.recipe;

      // Pass the parsed recipe to the parent component
      onAutofill(parsed);

      // Clear and hide paste area
      setPastedText("");
      setParseError("");
    } catch (error) {
      console.error("Error parsing recipe:", error);
      setParseError(t("parse_error"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleCancel = () => {
    setPastedText("");
    setParseError("");
  };

  return (
    <div className="paste-recipe-container">
      <h3 className="form-header">{t("autofill_recipe")}</h3>
      <AutoResizeTextArea
        className={`input input--full-width input--textarea input--edit ${parseError ? "input--error" : ""}`}
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
        placeholder={t("paste_recipe_placeholder")}
      />
      {parseError && <span className="error-message-small">{parseError}</span>}
      <div className="action-buttons-end">
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-action btn-secondary"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={parseRecipeWithAI}
          className="btn btn-action btn-primary"
          disabled={isParsing}
        >
          {isParsing ? t("autofilling") : t("autofill")}
        </button>
      </div>
    </div>
  );
};

export default RecipeAutofill;
