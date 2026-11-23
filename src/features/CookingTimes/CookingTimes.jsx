import { useState } from "react";
import FilterStrip from "../../components/FilterStrip/FilterStrip";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Timer, ArrowLeftRight, Pencil } from "lucide-react";
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
import BackLink from "../../components/BackLink/BackLink";

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
    <>
      <BackLink className="mx-auto max-w-3xl" onClick={handleBackNavigation} />
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="flex flex-col items-stretch gap-4">
          <div className="relative flex w-full items-center justify-center">
            {isEditMode ? (
              <h1 className="text-lg font-semibold">
                {t("cooking_times_tab")}
              </h1>
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
          {loading ? (
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
