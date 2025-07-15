import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import RecipeList from "./components/RecipeList/RecipeList";
import Recipe from "./components/Recipe/Recipe";
import { useRecipes } from "./hooks/useRecipes";
import AddRecipePage from "./pages/AddRecipe/AddRecipe";
import CategoryFilter from "./components/CategoryFilter/CategoryFilter";
import { Squirrel } from "lucide-react";
import EditRecipePage from "./pages/AddRecipe/EditRecipe";

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
  const [searchTerm, setSearchTerm] = useState("");

  // Show loading screen
  if (loading) {
    return (
      <div className={"loading-animation"}>
        <Squirrel />
      </div>
    );
  }

  return (
    <Router>
      <Header
        setSelectedCategory={setSelectedCategory}
        setSearchTerm={setSearchTerm}
      />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CategoryFilter
                categories={defaultCategories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                setSearchTerm={setSearchTerm}
              />
              <RecipeList
                selectedCategory={selectedCategory}
                recipes={recipes}
                searchTerm={searchTerm}
              />
            </>
          }
        />
        <Route path="/:slug" element={<Recipe />} />
        <Route
          path="/add-recipe"
          element={<AddRecipePage categories={defaultCategories} />}
        />
        <Route
          path="/edit-recipe/:slug"
          element={<EditRecipePage categories={defaultCategories} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
