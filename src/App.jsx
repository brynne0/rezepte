import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import RecipeList from "./components/RecipeList/RecipeList";
import Recipe from "./components/recipe/Recipe";
import { useRecipes } from "./hooks/useRecipes";

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
    return <div>Loading...</div>;
  }

  return (
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
            <RecipeList selectedCategory={selectedCategory} recipes={recipes} />
          }
        />
        <Route path="/:slug" element={<Recipe />} />
      </Routes>
    </Router>
  );
}

export default App;
