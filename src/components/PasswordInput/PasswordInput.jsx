import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const PasswordInput = ({
  id,
  value,
  onChange,
  placeholder = "Password",
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative-center">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input--password ${className}`}
        {...props}
        data-testid="password-input"
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="btn btn-icon btn-icon-right"
        aria-label={showPassword ? t("hide_password") : t("show_password")}
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
};

export default PasswordInput;
