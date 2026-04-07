import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowBigLeft, Search } from "lucide-react";
import {
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "../../services/friendsService";
import { getTranslatedRecipeTitle } from "../../services/translationService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { useCategories } from "../../hooks/data/useCategories";
import RecipeList from "../../components/RecipeList/RecipeList";
import Pagination from "../../components/Pagination/Pagination";
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter";

const PAGE_SIZE = 36;

const FriendRecipes = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [friend, setFriend] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all_recipes");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { categories } = useCategories();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const user = await getUserByUsername(username);
        const areFriends = await checkFriendship(user.id);
        if (!areFriends) {
          setError("not_friends");
          return;
        }
        const [profile, recipes] = await Promise.all([
          getFriendProfile(user.id),
          fetchFriendRecipes(user.id),
        ]);
        setFriend(profile || user);

        // Translate titles — same pattern as home page
        const currentLanguage = i18n.language.split("-")[0];
        const translated = await Promise.all(
          recipes.map((r) => getTranslatedRecipeTitle(r, currentLanguage))
        );
        setAllRecipes(translated);
      } catch (err) {
        setError(err.message || t("recipe_not_found"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, i18n.language, t]); // re-fetch when language changes

  const { recipes, filteredCount, totalPages } = useMemo(() => {
    const searched = searchTerm
      ? allRecipes.filter((r) =>
          r.title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allRecipes;

    const filtered =
      searchTerm || selectedCategory === "all_recipes"
        ? searched
        : searched.filter((r) => r.categories?.includes(selectedCategory));

    const start = (currentPage - 1) * PAGE_SIZE;
    return {
      recipes: filtered.slice(start, start + PAGE_SIZE),
      filteredCount: filtered.length,
      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    };
  }, [allRecipes, searchTerm, selectedCategory, currentPage]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingAcorn />;
  }

  if (error === "not_friends") {
    return (
      <>
        <div className="page-header">
          <button
            className="btn-unstyled back-arrow"
            onClick={() => navigate("/")}
            aria-label={t("go_back")}
          >
            <ArrowBigLeft size={28} />
          </button>
        </div>
        <div className="page-centered">
          <p>{t("friends_not_friends", { username })}</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="page-header">
          <button
            className="btn-unstyled back-arrow"
            onClick={() => navigate("/")}
            aria-label={t("go_back")}
          >
            <ArrowBigLeft size={28} />
          </button>
        </div>
        <div className="page-centered">
          <p>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header mt-1">
        <button
          className="btn-unstyled back-arrow"
          onClick={() => navigate(-1)}
          aria-label={t("go_back")}
        >
          <ArrowBigLeft size={28} />
        </button>
        <h1 className="forta">
          {t("friends_recipes_title", { name: friend?.first_name })}
        </h1>
      </div>

      <div className="search-bar-wrapper">
        <form className="search-bar" onSubmit={(e) => e.preventDefault()}>
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input input--secondary search-input-with-icon"
              placeholder={t("search")}
            />
            <button
              className="btn btn-icon btn-icon-neutral btn-search"
              type="submit"
              aria-label={t("search")}
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        setSearchTerm={handleSearchChange}
      />

      {allRecipes.length === 0 ? (
        <div className="page-centered high">
          <div className="card welcome-card">
            <p>{t("friends_no_recipes")}</p>
          </div>
        </div>
      ) : (
        <>
          <RecipeList
            recipes={recipes}
            totalRecipeCount={filteredCount}
            searchTerm={searchTerm}
            isPaginated={true}
            loading={loading}
            showImages={false}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo(0, 0);
            }}
          />
        </>
      )}
    </>
  );
};

export default FriendRecipes;
