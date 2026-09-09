import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { validatePasswordStrength } from "../../utils/validation";
import { cn } from "cn";

const PasswordRequirements = ({ password }) => {
  const { t } = useTranslation();
  const requirements = validatePasswordStrength(password);

  const items = [
    { met: requirements.length, text: t("password_min_length") },
    { met: requirements.lowercase, text: t("password_lowercase") },
    { met: requirements.uppercase, text: t("password_uppercase") },
    { met: requirements.digit, text: t("password_digit") },
    { met: requirements.symbol, text: t("password_symbol") },
  ];

  return (
    <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-2.5">
      {items.map(({ met, text }) => (
        <li
          key={text}
          data-met={met}
          className={cn(
            "flex items-center gap-2 text-sm",
            met ? "text-success" : "text-muted-foreground"
          )}
        >
          {met ? <Check className="size-4" /> : <X className="size-4" />}
          {text}
        </li>
      ))}
    </ul>
  );
};

export default PasswordRequirements;
