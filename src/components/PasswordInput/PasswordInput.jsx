import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Eye, EyeOff } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Password field with a lock icon and a show/hide toggle
const PasswordInput = (props) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? t("hide_password") : t("show_password");

  return (
    <InputGroup>
      <InputGroupAddon>
        <Lock />
      </InputGroupAddon>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                type="button"
                onClick={() => setVisible((prev) => !prev)}
                aria-label={toggleLabel}
              >
                {visible ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            }
          />
          <TooltipContent>{toggleLabel}</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
};

export default PasswordInput;
