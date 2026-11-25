import { useTranslation } from "react-i18next";
import {
  Lock,
  Users,
  Link as LinkIcon,
  ChevronDown,
  CheckIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

const VISIBILITY_ICONS = {
  private: Lock,
  friends: Users,
  link: LinkIcon,
};

const OPTIONS = ["private", "friends", "link"];

// Owner's share panel: who can see the recipe, plus the link once it's shareable.
// Styled like the dropdown menus (check on the right, no radio circles).
const SharePanel = ({
  visibility,
  shareUrl,
  disabled,
  canNativeShare,
  onVisibilityChange,
  onShareLink,
}) => {
  const { t } = useTranslation();
  const TriggerIcon = VISIBILITY_ICONS[visibility] ?? Users;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="printed"
            data-testid="visibility-btn"
            aria-label={t("recipe_visibility_label")}
            disabled={disabled}
          >
            <TriggerIcon />
            {t(`recipe_status_${visibility}`)}
            <ChevronDown />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-max min-w-64 gap-0 p-1">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          {t("recipe_visibility_label")}
        </div>

        <div role="radiogroup" aria-label={t("recipe_visibility_label")}>
          {OPTIONS.map((option) => {
            const Icon = VISIBILITY_ICONS[option];
            const selected = option === visibility;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onVisibilityChange(option)}
                data-testid={`visibility-${option}`}
                className="relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <Icon />
                <span className="flex flex-col">
                  <span>{t(`recipe_status_${option}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`recipe_visibility_${option}_description`)}
                  </span>
                </span>
                <CheckIcon
                  className={cn(
                    "absolute right-2",
                    selected ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* The link only exists once "Anyone with link" is chosen */}
        {visibility === "link" && shareUrl && (
          <div className="mt-1 flex items-center gap-1.5 border-t px-1.5 pt-2 pb-1">
            <Input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              aria-label={t("share_link_label")}
              data-testid="share-link-input"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              onClick={onShareLink}
              disabled={disabled}
              data-testid="share-link-btn"
            >
              {canNativeShare ? t("share") : t("copy")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SharePanel;
