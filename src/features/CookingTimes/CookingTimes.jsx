import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Timer, ArrowLeftRight, ArrowLeft, Pencil } from "lucide-react";
import CookingTimeRow from "./components/CookingTimeRow";
import EditCookingTimes from "./components/EditCookingTimes";
import { getUserPreferredLanguage } from "../../services/userService";
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
import { toast } from "@/components/ui/toast";
import { useCookingTimesData } from "./hooks/useCookingTimesData";
import { useEditCookingTimes } from "./hooks/useEditCookingTimes";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";

const CookingTimes = ({
  isEditMode: externalIsEditMode,
  setIsEditMode: externalSetIsEditMode,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState("cooking-times");
  const [showExitEditModeModal, setShowExitEditModeModal] = useState(false);

  // Use external edit mode state from App.jsx (for disabling language switching)
  // or internal state if not provided (for standalone usage)
  const [internalIsEditMode, setInternalIsEditMode] = useState(false);
  const isEditMode =
    externalIsEditMode !== undefined ? externalIsEditMode : internalIsEditMode;
  const setIsEditMode = externalSetIsEditMode || setInternalIsEditMode;

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
    originalUserLanguage,
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

  const enterEditMode = async () => {
    // Switch to preferred language first, then enter edit mode
    const preferredLanguage = await getUserPreferredLanguage();
    if (i18n.language !== preferredLanguage) {
      originalUserLanguage.current = i18n.language;
      await i18n.changeLanguage(preferredLanguage);
      // Wait for data to reload in new language before entering edit mode
      await new Promise((resolve) => setTimeout(resolve, 100));
      toast.add({
        title: t("switched_to_preferred_language_for_editing"),
        type: "info",
      });
    }
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
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-col items-stretch gap-4">
        <div className="relative flex w-full items-center justify-center">
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute left-0"
            onClick={handleBackNavigation}
            aria-label={t("go_back", "Go Back")}
          >
            <ArrowLeft />
          </Button>

          {isEditMode ? (
            <h1 className="text-lg font-semibold">{t("cooking_times_tab")}</h1>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="cooking-times">
                  <Timer />
                  {t("cooking_times_tab")}
                </TabsTrigger>
                <TabsTrigger value="conversions">
                  <ArrowLeftRight />
                  {t("conversions_tab")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === "cooking-times" && !isEditMode && hasAnyItems && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-0"
                    onClick={enterEditMode}
                    disabled={!isOnline}
                    aria-label={t("edit_mode", "Edit Mode")}
                  >
                    <Pencil size={16} />
                  </Button>
                }
              />
              <TooltipContent>
                {isOnline
                  ? t("edit_mode", "Edit Mode")
                  : t("action_requires_internet")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Section Filter Chips - Only for cooking times tab */}
        {activeTab === "cooking-times" && !isEditMode && hasAnyItems && (
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <Button
              variant="text"
              aria-pressed={selectedSection === "all"}
              onClick={() => setSelectedSection("all")}
            >
              <span className="font-forta uppercase">{t("all", "All")}</span>
            </Button>
            {formData.cookingTimeSections.map((section) => (
              <Button
                key={section.id}
                variant="text"
                aria-pressed={selectedSection === section.subheading}
                onClick={() => setSelectedSection(section.subheading)}
              >
                <span className="font-forta uppercase">
                  {section.subheading}
                </span>
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-primary/50 bg-muted/20 p-3"
              >
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : activeTab === "conversions" ? (
          <ConversionsTab />
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
                onClick={async () => {
                  setIsEditMode(true);
                  const preferredLanguage = await getUserPreferredLanguage();
                  if (i18n.language !== preferredLanguage) {
                    originalUserLanguage.current = i18n.language;
                    await i18n.changeLanguage(preferredLanguage);
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    toast.add({
                      title: t("switched_to_preferred_language_for_editing"),
                      type: "info",
                    });
                  }
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredData.ungroupedCookingTimes.map((item, index) => (
                  <CookingTimeRow
                    key={item.tempId || item.id}
                    item={item}
                    index={index}
                    sectionId="ungrouped"
                    isEditMode={false}
                  />
                ))}
              </div>
            )}

            {/* Cooking Time Sections */}
            {filteredData.cookingTimeSections.map((section) => (
              <div key={section.id}>
                {selectedSection === "all" && (
                  <h2 className="mb-2 flex items-center gap-3 font-medium [word-break:break-word] after:h-px after:flex-1 after:bg-border after:content-['']">
                    {section.subheading}
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {section.cookingTimes.map((item, itemIndex) => (
                    <CookingTimeRow
                      key={item.tempId || item.id}
                      item={item}
                      index={itemIndex}
                      sectionId={section.id}
                      isEditMode={false}
                    />
                  ))}
                </div>
              </div>
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
  );
};

export default CookingTimes;
