import supabase from "../lib/supabase";

// Generate a random share token
const generateShareToken = () => {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 16);
};

// Create or update a share link for a recipe
export const createShareLink = async (recipeId) => {
  try {
    // Check if user owns this recipe
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify recipe ownership
    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("id, user_id, title, slug, share_token")
      .eq("id", recipeId)
      .single();

    if (fetchError) {
      throw new Error(`Recipe not found: ${fetchError.message}`);
    }

    if (recipe.user_id !== user.id) {
      throw new Error("You can only share your own recipes");
    }

    // If recipe already has a share token, return existing one
    if (recipe.share_token) {
      const shareUrl = `${window.location.origin}/shared/${recipe.share_token}/${recipe.slug}`;
      return {
        shareToken: recipe.share_token,
        shareUrl,
        isExisting: true,
      };
    }

    // Generate new share token
    let shareToken;
    let tokenExists = true;

    // Ensure token is unique
    while (tokenExists) {
      shareToken = generateShareToken();
      const { data: existingRecipe } = await supabase
        .from("recipes")
        .select("id")
        .eq("share_token", shareToken)
        .single();

      tokenExists = !!existingRecipe;
    }

    // Update recipe with share token
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        share_token: shareToken,
        is_public: true,
        shared_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (updateError) {
      throw new Error(`Failed to create share link: ${updateError.message}`);
    }

    const shareUrl = `${window.location.origin}/shared/${shareToken}/${recipe.slug}`;

    return {
      shareToken,
      shareUrl,
      isExisting: false,
    };
  } catch (error) {
    console.error("Error creating share link:", error);
    throw error;
  }
};

// Remove sharing from a recipe
export const stopSharing = async (recipeId) => {
  try {
    // Check if user owns this recipe
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify recipe ownership
    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("id, user_id")
      .eq("id", recipeId)
      .single();

    if (fetchError) {
      throw new Error(`Recipe not found: ${fetchError.message}`);
    }

    if (recipe.user_id !== user.id) {
      throw new Error("You can only modify sharing for your own recipes");
    }

    // Remove sharing
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        share_token: null,
        is_public: false,
        shared_at: null,
      })
      .eq("id", recipeId);

    if (updateError) {
      throw new Error(`Failed to remove sharing: ${updateError.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error removing sharing:", error);
    throw error;
  }
};

// Fetch a publicly shared recipe by token (no authentication required)
export const fetchSharedRecipe = async (shareToken) => {
  try {
    if (!shareToken) {
      throw new Error("Share token is required");
    }

    // Find recipe by share token
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(
        `*, 
         recipe_ingredients(id, quantity, unit, ingredients(id, singular_name, plural_name, translated_names), notes, subheading, order_index, is_plural, name_overrides),
         recipe_categories(categoriy_id, categories(name, translated_category))`
      )
      .eq("share_token", shareToken)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Share link not found or has been disabled");
      }
      throw new Error(`Failed to fetch shared recipe: ${error.message}`);
    }

    // Transform the data using the same logic as fetchRecipe
    const ingredientsList =
      recipe.recipe_ingredients
        ?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((item) => {
          return {
            id: item.ingredients.id,
            recipe_ingredient_id: item.id,
            singular_name: item.ingredients.singular_name,
            plural_name: item.ingredients.plural_name,
            translated_names: item.ingredients.translated_names,
            name_overrides: item.name_overrides,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            subheading: item.subheading,
            order_index: item.order_index,
            is_plural: item.is_plural,
          };
        }) || [];

    // Separate ungrouped ingredients from grouped ones
    const ungroupedIngredients = [];
    const groupedIngredients = [];

    ingredientsList.forEach((ingredient) => {
      if (!ingredient.subheading || ingredient.subheading.trim() === "") {
        ungroupedIngredients.push(ingredient);
      } else {
        groupedIngredients.push(ingredient);
      }
    });

    // Group the grouped ingredients by subheading
    const sectionsMap = new Map();
    let sectionOrder = 0;

    groupedIngredients.forEach((ingredient) => {
      const subheading = ingredient.subheading;

      if (!sectionsMap.has(subheading)) {
        sectionsMap.set(subheading, {
          id: `section-${sectionOrder++}`,
          subheading: subheading,
          ingredients: [],
        });
      }

      sectionsMap.get(subheading).ingredients.push(ingredient);
    });

    // Extract categories from the many-to-many relationship
    const categories =
      recipe.recipe_categories
        ?.map((rc) => rc.categories?.name)
        .filter(Boolean) || [];

    const transformedData = {
      ...recipe,
      categories: categories,
      ungroupedIngredients: ungroupedIngredients,
      ingredientSections: Array.from(sectionsMap.values()),
      ingredients: ingredientsList,
      isShared: true, // Mark as shared recipe
    };

    // Remove the nested data
    delete transformedData.recipe_ingredients;
    delete transformedData.recipe_categories;

    return transformedData;
  } catch (error) {
    console.error("Error fetching shared recipe:", error);
    throw error;
  }
};

// Check if a recipe is currently shared
export const isRecipeShared = async (recipeId) => {
  try {
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("share_token, is_public")
      .eq("id", recipeId)
      .single();

    if (error) {
      return false;
    }

    return recipe.is_public && recipe.share_token;
  } catch (error) {
    console.error("Error checking if recipe is shared:", error);
    return false;
  }
};
