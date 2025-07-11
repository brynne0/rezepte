import { useEffect, useState } from "react";
import supabase from "../supabaseClient";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRecipes = async () => {
      try {
        const { data, error } = await supabase.from("recipes").select("*");
        if (error) {
          console.error("Error fetching recipes:", error);
          setRecipes([]);
        } else {
          setRecipes(data || []);
        }
      } catch (err) {
        console.log("Error: ", err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    getRecipes();
  }, []);

  return { recipes, loading };
};
