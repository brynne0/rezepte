import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import RecipeList from "./components/RecipeList/RecipeList";
import Recipe from "./components/recipe/Recipe";
import { useRecipes } from "./hooks/useRecipes";
import AddRecipePage from "./pages/AddRecipe/AddRecipePage";
import CategoryFilter from "./components/CategoryFilter/CategoryFilter";

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
  const { recipes, loading } = useRecipes();

  if (loading) {
    // TODO - add a loading animation only if a certain amount of time has passed
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Header setSelectedCategory={setSelectedCategory} />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CategoryFilter
                categories={defaultCategories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
              <RecipeList
                selectedCategory={selectedCategory}
                recipes={recipes}
              />
            </>
          }
        />
        <Route path="/:slug" element={<Recipe />} />
        <Route
          path="/add-recipe"
          element={<AddRecipePage categories={defaultCategories} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
