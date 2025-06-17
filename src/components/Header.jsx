import { useState } from "react";
import {
  Search,
  ShoppingBasket,
  ChevronDown,
  Plus,
  Squirrel,
} from "lucide-react";
import "./header.css";

const Header = ({ categories, selectedCategory, setSelectedCategory }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            {/* Title */}
            <div className="header-logo">
              <Squirrel size={60} color="var(--dark_brown)" />
              <h1 className="header-title">Rezepte</h1>
            </div>

            <nav className="header-nav">
              {/* Dropdown menu */}
              <div className="dropdown">
                {showDropdown && (
                  <div
                    className="dropdown-overlay"
                    onClick={() => setShowDropdown(false)}
                  />
                )}
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="dropdown-toggle"
                >
                  {selectedCategory}
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
                            setSelectedCategory(category);
                            setShowDropdown(false);
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Grocery List */}
              <button className="icon-btn">
                <ShoppingBasket size={28} />
              </button>
              {/* Plus Recipe */}
              <button className="icon-btn">
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
