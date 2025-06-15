import React, { useState } from "react";
import { Search, ShoppingBasket, ChevronDown } from "lucide-react";
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
            <h1 className="header-logo">Rezepte</h1>

            <nav className="header-nav">
              {/* Drop down */}
              <div className="dropdown">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="dropdown-toggle"
                >
                  Alle Rezepte
                  <ChevronDown size={16} className="dropdown-icon" />
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
                <ShoppingBasket size={20} />
              </button>
              {/* Search */}
              <button className="icon-btn">
                <Search size={20} />
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
