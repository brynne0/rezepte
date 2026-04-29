import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowBigLeft, Search } from "lucide-react";
import {
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "../../services/friendsService";
import { getTranslatedRecipeTitle } from "../../services/translationService";
import { useScrollRestoration } from "../../hooks/ui/useScrollRestoration";
import { getCategoriesForUI } from "../../services/categoriesService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
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
  useScrollRestoration(!loading);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "all_recipes";
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [friendCategories, setFriendCategories] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setSearchTerm("");
      setCurrentPage(1);
      try {
        const user = await getUserByUsername(username);
        const areFriends = await checkFriendship(user.id);
        if (!areFriends) {
          setError("not_friends");
          return;
        }
        const currentLanguage = i18n.language.split("-")[0];
        const [profile, recipes, allCategories] = await Promise.all([
          getFriendProfile(user.id),
          fetchFriendRecipes(user.id),
          getCategoriesForUI(currentLanguage),
        ]);
        setFriend(profile || user);

        const translated = await Promise.all(
          recipes.map((r) => getTranslatedRecipeTitle(r, currentLanguage))
        );
        setAllRecipes(translated);

        const usedNames = new Set(
          translated.flatMap((r) => r.categories ?? [])
        );
        setFriendCategories(
          allCategories.filter(
            (c) => c.value === "all_recipes" || usedNames.has(c.value)
          )
        );
      } catch (err) {
        setError(err.message || t("recipe_not_found"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, i18n.language, t]);

  const { recipes, totalPages } = useMemo(() => {
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
      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    };
  }, [allRecipes, searchTerm, selectedCategory, currentPage]);

  const handleCategoryChange = (category) => {
    setSearchParams(category === "all_recipes" ? {} : { category }, {
      replace: true,
    });
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
        categories={friendCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        setSearchTerm={handleSearchChange}
      />

      {allRecipes.length === 0 ? (
        <div className="page-centered high">
          <p>{t("friends_no_recipes")}</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="page-centered high">
          <p>{t("no_recipes_available")}</p>
        </div>
      ) : (
        <>
          <RecipeList
            recipes={recipes}
            totalRecipeCount={allRecipes.length}
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
              document.getElementById("main-content")?.scrollTo(0, 0);
            }}
          />
        </>
      )}
    </>
  );
};

export default FriendRecipes;
