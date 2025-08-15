import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { validatePasswordStrength } from "../../utils/validation";
import "./PasswordRequirements.css";

const PasswordRequirements = ({ password }) => {
  const { t } = useTranslation();
  const requirements = validatePasswordStrength(password);

  const RequirementItem = ({ met, text }) => (
    <div className={`password-requirement ${met ? "met" : "unmet"}`}>
      {met ? (
        <Check size={16} className="requirement-icon met" />
      ) : (
        <X size={16} className="requirement-icon unmet" />
      )}
      <span className="requirement-text">{text}</span>
    </div>
  );

  return (
    <div className="password-requirements">
      <RequirementItem
        met={requirements.length}
        text={t("password_min_length")}
      />
      <RequirementItem
        met={requirements.lowercase}
        text={t("password_lowercase")}
      />
      <RequirementItem
        met={requirements.uppercase}
        text={t("password_uppercase")}
      />
      <RequirementItem met={requirements.digit} text={t("password_digit")} />
      <RequirementItem met={requirements.symbol} text={t("password_symbol")} />
    </div>
  );
};

export default PasswordRequirements;
