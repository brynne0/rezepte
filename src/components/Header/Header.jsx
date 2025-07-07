import { useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import "./header.css";

const Header = ({ setSelectedCategory }) => {
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            {/* Title */}
            <div
              onClick={() => {
                navigate("/");
                setSelectedCategory("Alle Rezepte");
              }}
              style={{ cursor: "pointer" }}
              className="header-logo"
            >
              <Squirrel size={50} color="var(--dark_brown)" />
              <h1 className="header-title">Rezepte</h1>
            </div>

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
        </div>
      </header>
    </>
  );
};

export default Header;
