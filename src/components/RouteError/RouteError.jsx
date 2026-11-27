import { useTranslation } from "react-i18next";
import { TriangleAlert, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";

// Route crash fallback; offline gets a calmer message
const RouteError = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const Icon = isOnline ? TriangleAlert : WifiOff;

  return (
    <Card className="mx-auto mt-40 w-full max-w-sm items-center gap-4 p-6 text-center text-base">
      <Icon
        className={
          isOnline ? "size-9 text-destructive" : "size-9 text-muted-foreground"
        }
      />
      <p className="font-medium">
        {t(isOnline ? "something_went_wrong" : "no_internet_connection")}
      </p>
      <Button onClick={() => window.location.reload()}>
        {t("reload_page")}
      </Button>
    </Card>
  );
};

export default RouteError;
