import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const BackLink = ({ label, onClick, fallback = "/", className }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick =
    onClick ??
    (() => {
      if (location.key !== "default") navigate(-1);
      else navigate(fallback);
    });

  return (
    <div className={cn("w-full", className)}>
      <Button variant="printed" className="-ml-2.5" onClick={handleClick}>
        <ArrowLeft />
        {label ?? t("back")}
      </Button>
    </div>
  );
};

export default BackLink;
