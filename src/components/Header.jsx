import { useState } from "react";
import {
  Search,
  ShoppingBasket,
  ChevronDown,
  Plus,
  Squirrel,
} from "lucide-react";
import "./header.css";

const Header = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const categories = [
    "Alle Rezepte",
    "Backen",
    "Nachtisch",
    "Abendessen",
    "Mittagessen",
    "Snacks",
  ];

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="header-logo">
              <Squirrel size={60} color="var(--dark_brown)" />
              <h1 className="header-title">Rezepte</h1>
            </div>

            <nav className="header-nav">
              {/* Drop down */}
              <div className="dropdown">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="dropdown-toggle"
                >
                  Alle Rezepte
                  <ChevronDown size={"1rem"} className="dropdown-icon" />
                </button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-list">
                      {categories.map((category) => (
                        <button
                          key={category}
                          className="dropdown-item"
                          onClick={() => {
                            setShowDropdown(false);
                            console.log("Selected:", category);
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Cart */}
              <button className="icon-btn">
                <ShoppingBasket size={28} />
              </button>
              <button className="icon-btn">
                <Plus size={28} />
              </button>
              {/* Search */}
              <button className="icon-btn">
                <Search size={28} />
              </button>
            </nav>
          </div>
        </div>
      </header>
      {showDropdown && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};

export default Header;
