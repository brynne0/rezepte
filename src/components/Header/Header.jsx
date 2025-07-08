import { useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import "./header.css";

const Header = ({ setSelectedCategory }) => {
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Squirrel className="header-logo" />

          {/* Title */}
          <h1
            onClick={() => {
              navigate("/");
              setSelectedCategory("Alle Rezepte");
              window.location.reload();
            }}
            style={{ cursor: "pointer" }}
            className="header-title"
          >
            Rezepte
          </h1>

          <nav className="header-nav">
            {/* Grocery List */}
            <button className="icon-btn">
              <ShoppingBasket size={28} />
            </button>
            {/* Plus Recipe */}
            <button
              onClick={() => navigate("/add-recipe")}
              className="icon-btn"
            >
              <Plus size={28} />
            </button>
            {/* Search Recipe */}
            <button className="icon-btn">
              <Search size={28} />
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Header;
