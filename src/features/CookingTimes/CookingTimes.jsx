import { useState } from "react";
import FilterStrip from "../../components/FilterStrip/FilterStrip";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Timer, ArrowLeftRight } from "lucide-react";
import CookingTimeRow from "./components/CookingTimeRow";
import EditCookingTimes from "./components/EditCookingTimes";
import ConversionsTab from "./components/ConversionsTab";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCookingTimesData } from "./hooks/useCookingTimesData";
import { useEditCookingTimes } from "./hooks/useEditCookingTimes";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";
import BackLink from "../../components/BackLink/BackLink";

const CookingTimes = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  // Tab lives in the URL so refresh keeps it
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "conversions" ? "conversions" : "cooking-times";
  const setActiveTab = (tab) =>
    setSearchParams(
      (prev) => {
        prev.set("tab", tab);
        return prev;
      },
      { replace: true }
    );
  const [showExitEditModeModal, setShowExitEditModeModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    loading,
    selectedSection,
    setSelectedSection,
    formData,
    setFormData,
    originalData,
    filteredData,
    hasAnyItems,
    generateTempId,
    loadData,
  } = useCookingTimesData({ isEditMode, i18n });

  const {
    editingSectionId,
    setEditingSectionId,
    hasUnsavedChanges,
    isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    unsavedChangesMessage,
    addCookingTime,
    addSection,
    removeSection,
    handleCookingTimeChange,
    handleSectionChange,
    removeCookingTime,
    saveAllChanges,
    handleCookingTimeFieldEnter,
    handleDragEnd,
    isSaving,
  } = useEditCookingTimes({
    isEditMode,
    formData,
    setFormData,
    originalData,
    generateTempId,
    loadData,
    t,
  });

  const enterEditMode = () => {
    setIsEditMode(true);
    setSelectedSection("all");
  };

  const handleBackNavigation = () => {
    if (activeTab === "conversions") {
      setActiveTab("cooking-times");
    } else if (isEditMode) {
      // Check for unsaved changes before exiting edit mode
      if (hasUnsavedChanges()) {
        setShowExitEditModeModal(true);
      } else {
        setIsEditMode(false);
      }
    } else {
      navigate(-1);
    }
  };

  const handleConfirmExitEditMode = () => {
    setShowExitEditModeModal(false);
    setIsEditMode(false);
    // Reset to original data
    setFormData(originalData);
  };

  const handleCancelExitEditMode = () => {
    setShowExitEditModeModal(false);
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges()) {
      setShowExitEditModeModal(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleSaveEdit = async () => {
    await saveAllChanges();
    setIsEditMode(false);
  };

  return (
    <>
      <BackLink className="mx-auto max-w-3xl" onClick={handleBackNavigation} />
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="flex flex-col items-stretch gap-4">
          {isEditMode ? (
            <div className="flex w-full items-center justify-center">
              <h1 className="text-lg font-semibold">
                {t("edit_cooking_times")}
              </h1>
            </div>
          ) : (
            <div className="grid w-full grid-cols-[1fr_minmax(0,24rem)_1fr] items-center gap-2">
              <span aria-hidden="true" />
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="cooking-times" className="flex-1">
                    <Timer />
                    {t("cooking_times_tab")}
                  </TabsTrigger>
                  <TabsTrigger value="conversions" className="flex-1">
                    <ArrowLeftRight />
                    {t("conversions_tab")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === "cooking-times" &&
                hasAnyItems &&
                (isOnline ? (
                  <Button
                    variant="printed"
                    className="-mr-2.5 justify-self-end"
                    onClick={enterEditMode}
                    aria-label={t("edit_cooking_times")}
                    data-testid="edit-cooking-times-btn"
                  >
                    {t("recipe_action_edit")}
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="printed"
                          className="-mr-2.5 justify-self-end"
                          disabled
                          aria-label={t("edit_cooking_times")}
                          data-testid="edit-cooking-times-btn"
                        >
                          {t("recipe_action_edit")}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {t("action_requires_internet")}
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
          )}

          {/* Section Filter Chips - Only for cooking times tab */}
          {activeTab === "cooking-times" && !isEditMode && hasAnyItems && (
            <FilterStrip
              className="pb-1"
              items={[
                { value: "all", label: t("all", "All") },
                ...formData.cookingTimeSections.map((section) => ({
                  key: section.id,
                  value: section.subheading,
                  label: section.subheading,
                })),
              ]}
              selected={selectedSection}
              onSelect={setSelectedSection}
            />
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {activeTab === "conversions" ? (
            <ConversionsTab />
          ) : loading ? (
            <>
              {[3, 2].map((rows, index) => (
                <Card key={index} size="sm" className="gap-0 bg-muted/20 pb-0">
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 py-2"
                      >
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-14" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : !hasAnyItems && !isEditMode ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Timer />
                </EmptyMedia>
                <EmptyTitle>
                  {t("no_cooking_times_title", "No cooking times yet")}
                </EmptyTitle>
                <EmptyDescription>
                  {t("add_first_cooking_time", "Add your first cooking time")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    setIsEditMode(true);
                    addCookingTime("ungrouped");
                    setSelectedSection("all");
                  }}
                >
                  <Plus size={16} />
                  {t("add_cooking_time")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : filteredData.ungroupedCookingTimes.length === 0 &&
            filteredData.cookingTimeSections.length === 0 &&
            selectedSection !== "all" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("no_items_in_category", "No items in this category.")}
            </p>
          ) : isEditMode ? (
            <EditCookingTimes
              formData={formData}
              editingSectionId={editingSectionId}
              setEditingSectionId={setEditingSectionId}
              handleDragEnd={handleDragEnd}
              addSection={addSection}
              addCookingTime={addCookingTime}
              removeSection={removeSection}
              handleSectionChange={handleSectionChange}
              handleCookingTimeChange={handleCookingTimeChange}
              handleCookingTimeFieldEnter={handleCookingTimeFieldEnter}
              removeCookingTime={removeCookingTime}
              handleCancelEdit={handleCancelEdit}
              handleSaveEdit={handleSaveEdit}
              isSaving={isSaving}
              isOnline={isOnline}
              showExitEditModeModal={showExitEditModeModal}
              handleConfirmExitEditMode={handleConfirmExitEditMode}
              handleCancelExitEditMode={handleCancelExitEditMode}
            />
          ) : (
            <>
              {/* Ungrouped Cooking Times */}
              {filteredData.ungroupedCookingTimes.length > 0 && (
                <Card size="sm" className="bg-muted/20 py-0">
                  <CardContent className="flex flex-col divide-y divide-border">
                    {filteredData.ungroupedCookingTimes.map((item, index) => (
                      <CookingTimeRow
                        key={item.tempId || item.id}
                        item={item}
                        index={index}
                        sectionId="ungrouped"
                        isEditMode={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Cooking Time Sections: panels matching the Conversions tab */}
              {filteredData.cookingTimeSections.map((section) => (
                <Card
                  key={section.id}
                  size="sm"
                  className="gap-0 bg-muted/20 pb-0"
                >
                  <CardHeader>
                    <h2 className="font-receipt text-xs font-normal tracking-widest text-muted-foreground uppercase [word-break:break-word]">
                      {section.subheading}
                    </h2>
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {section.cookingTimes.map((item, itemIndex) => (
                      <CookingTimeRow
                        key={item.tempId || item.id}
                        item={item}
                        index={itemIndex}
                        sectionId={section.id}
                        isEditMode={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </CardContent>

        {/* Unsaved Changes Modal - for page navigation */}
        <AlertDialog
          open={isUnsavedChangesModalOpen}
          onOpenChange={(open) => {
            if (!open) cancelNavigation();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{unsavedChangesMessage}</AlertDialogTitle>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={confirmNavigation}
              >
                {t("leave_page")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </>
  );
};

export default CookingTimes;
