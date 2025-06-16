import { useState } from "react";
import "./App.css";
import Header from "./components/header";
import RecipeList from "./components/RecipeList";

const categories = [
  "Alle Rezepte",
  "Backen",
  "Nachtisch",
  "Abendessen",
  "Mittagessen",
  "Snacks",
];

function App() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  return (
    <>
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <RecipeList selectedCategory={selectedCategory} />
    </>
  );
}

export default App;
