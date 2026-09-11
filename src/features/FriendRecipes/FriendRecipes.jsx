import { useState, useEffect, useMemo, useContext } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppStateContext } from "../../contexts/AppStateContext";
import { useFriendRecipes } from "./hooks/useFriendRecipes";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { useMainScrollRef } from "../../hooks/ui/useMainScrollRef";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import RecipeList from "../../components/RecipeList/RecipeList";
import Pagination from "../../components/Pagination/Pagination";
import RecipeFilters from "../../components/RecipeFilters/RecipeFilters";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const PAGE_SIZE = 36;

const FriendRecipes = () => {
  const { username } = useParams();
  const { t } = useTranslation();
  const { setFriendBar } = useContext(AppStateContext);

  const {
    friend,
    recipes: allRecipes,
    friendCategories,
    loading,
    notFriends,
    error: fetchError,
  } = useFriendRecipes(username);
  const error = notFriends ? "not_friends" : fetchError;

  const mainScrollRef = useMainScrollRef();
  useScrollRestoration(mainScrollRef, !loading);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "all_recipes";
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("title_asc");
  const [showImages, setShowImages] = useState(true);

  // Reset local filter/paging state when switching to a different friend
  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, [username]);

  // Show the "viewing a friend" back bar in Header while this page is open
  useEffect(() => {
    setFriendBar({ name: friend?.first_name || null, loading });
    return () => setFriendBar(null);
  }, [friend, loading, setFriendBar]);

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

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "last_viewed_at_asc" || sortBy === "last_viewed_at_desc") {
        const aTime = a.last_viewed_at ? new Date(a.last_viewed_at) : 0;
        const bTime = b.last_viewed_at ? new Date(b.last_viewed_at) : 0;
        return sortBy === "last_viewed_at_asc" ? aTime - bTime : bTime - aTime;
      }
      return (a.title || "").localeCompare(b.title || "");
    });

    const start = (currentPage - 1) * PAGE_SIZE;
    return {
      recipes: sorted.slice(start, start + PAGE_SIZE),
      totalPages: Math.ceil(sorted.length / PAGE_SIZE),
    };
  }, [allRecipes, searchTerm, selectedCategory, sortBy, currentPage]);

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
      <Empty className="mt-20">
        <EmptyHeader>
          <EmptyTitle>{t("friends_not_friends", { username })}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (error) {
    return (
      <Empty className="mt-20">
        <EmptyHeader>
          <EmptyTitle>{error}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <RecipeFilters
        categories={friendCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        searchTerm={searchTerm}
        setSearchTerm={handleSearchChange}
        resetCategoryOnSearch={false}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showImages={showImages}
        setShowImages={setShowImages}
        onPageReset={() => setCurrentPage(1)}
        showImageToggle={!!friend?.friends_can_view_images}
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
            showImages={!!friend?.friends_can_view_images && showImages}
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
