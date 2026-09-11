import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// Fallback shown by react-router when a route throws during render/loading,
// instead of the framework's raw "Unexpected Application Error!" stack trace.
const RouteError = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-4 text-center">
      <TriangleAlert className="size-9 text-destructive" />
      <p className="font-medium">{t("something_went_wrong")}</p>
      <p className="text-muted-foreground">{t("unexpected_error_message")}</p>
      <Button onClick={() => window.location.reload()}>
        {t("reload_page")}
      </Button>
    </div>
  );
};

export default RouteError;
