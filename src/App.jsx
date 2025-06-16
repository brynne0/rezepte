import "./App.css";
import Recipe from "./components/Recipe";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Header from "./components/header";
import RecipeList from "./components/RecipeList";

const categories = [
  "Alle Rezepte",
  "Backen",
  "Nachtisch",
  "Brunch",
  "Abendessen",
  "Snacks",
  "GrundRezepte",
];

function App() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  return (
    <>
      <Router>
        <Header
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <Routes>
          <Route
            path="/"
            element={<RecipeList selectedCategory={selectedCategory} />}
          ></Route>
          <Route path="/:id" element={<Recipe />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
