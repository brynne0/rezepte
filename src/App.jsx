import "./App.css";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Header from "./components/header";
import RecipeList from "./components/RecipeList";
import Recipe from "./components/Recipe";

// Database
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const defaultCategories = [
  "Alle Rezepte",
  "Backen",
  "Nachtisch",
  "Brunch",
  "Abendessen",
  "Snacks",
  "Grundrezepte",
];

function App() {
  const [selectedCategory, setSelectedCategory] = useState("Alle Rezepte");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipes();
  }, []);

  // Get recipes
  async function getRecipes() {
    try {
      const { data, error } = await supabase.from("rezepte").select("*");
      if (error) {
        console.error("Error fetching recipes:", error);
      } else {
        setRecipes(data || []);
      }
    } catch (err) {
      console.log("Error: ", err);
    } finally {
      setLoading(false);
    }
  }

  // Get unique categories
  // const uniqueCategories = [
  //   ...new Set(recipes.map((recipe) => recipe.category)),
  // ];
  // const categories = ["Alle Rezepte", ...uniqueCategories];

  // TODO - add a loading screen/animation
  if (loading) {
    return <div>Loading recipes...</div>;
  }

  return (
    <>
      <Router>
        <Header
          categories={defaultCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <Routes>
          <Route
            path="/"
            element={
              <RecipeList
                selectedCategory={selectedCategory}
                recipes={recipes}
              />
            }
          ></Route>
          <Route path="/:id" element={<Recipe />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
