import { useTranslation } from "react-i18next";
import { TriangleAlert, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";

// Fallback shown by react-router when a route throws during render/loading,
// instead of the framework's raw "Unexpected Application Error!" stack trace.
// A thrown error while offline is usually just a failed network request, not
// a real bug, so it gets a distinct, less alarming message.
const RouteError = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  return (
    <div className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-4 text-center">
      {isOnline ? (
        <>
          <TriangleAlert className="size-9 text-destructive" />
          <p className="font-medium">{t("something_went_wrong")}</p>
          <p className="text-muted-foreground">
            {t("unexpected_error_message")}
          </p>
        </>
      ) : (
        <>
          <WifiOff className="size-9 text-muted-foreground" />
          <p className="font-medium">{t("no_internet_connection")}</p>
          <p className="text-muted-foreground">
            {t("route_error_offline_message")}
          </p>
        </>
      )}
      <Button onClick={() => window.location.reload()}>
        {t("reload_page")}
      </Button>
    </div>
  );
};

export default RouteError;
