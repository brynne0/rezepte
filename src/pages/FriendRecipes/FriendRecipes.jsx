import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search, X } from "lucide-react";
import {
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "../../services/friendsService";
import { getTranslatedRecipeTitle } from "../../services/translationService";
import { useScrollRestoration } from "../../hooks/ui/useScrollRestoration";
import { useMainScrollRef } from "../../hooks/ui/useMainScrollRef";
import { getCategoriesForUI } from "../../services/categoriesService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import RecipeList from "../../components/RecipeList/RecipeList";
import Pagination from "../../components/Pagination/Pagination";
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const PAGE_SIZE = 36;

const FriendRecipes = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [friend, setFriend] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mainScrollRef = useMainScrollRef();
  useScrollRestoration(mainScrollRef, !loading);

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
        <div className="mt-1 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/")}
            aria-label={t("go_back")}
          >
            <ArrowLeft />
          </Button>
        </div>
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyTitle>{t("friends_not_friends", { username })}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="mt-1 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/")}
            aria-label={t("go_back")}
          >
            <ArrowLeft />
          </Button>
        </div>
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyTitle>{error}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  return (
    <>
      <div className="mt-1 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          aria-label={t("go_back")}
        >
          <ArrowLeft />
        </Button>
        <h1 className="font-forta text-2xl md:text-3xl">
          {t("friends_recipes_title", { name: friend?.first_name })}
        </h1>
      </div>

      <div className="flex justify-center px-4 py-4 md:px-6">
        <form
          className="w-full max-w-xl"
          onSubmit={(e) => e.preventDefault()}
        >
          <InputGroup className="h-10">
            <InputGroupAddon align="inline-start" className="text-foreground">
              <Search className="size-5" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-base"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("search")}
            />
            {searchTerm && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => handleSearchChange("")}
                  aria-label={t("clear_search")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </form>
      </div>

      <CategoryFilter
        categories={friendCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        setSearchTerm={handleSearchChange}
      />

      {allRecipes.length === 0 ? (
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyTitle>{t("friends_no_recipes")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : recipes.length === 0 ? (
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyTitle>{t("no_recipes_available")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <RecipeList
            recipes={recipes}
            totalRecipeCount={allRecipes.length}
            searchTerm={searchTerm}
            isPaginated={true}
            loading={loading}
            showImages={!!friend?.friends_can_view_images}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              mainScrollRef?.current?.scrollTo(0, 0);
            }}
          />
        </>
      )}
    </>
  );
};

export default FriendRecipes;
