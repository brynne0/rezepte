import { Nut } from "lucide-react";
import { cn } from "cn";

const LoadingAcorn = ({ size = 25, className = "", fullPage = true }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-primary",
        fullPage && "mx-auto mt-80 w-full max-w-sm px-4",
        className
      )}
      data-testid="loading-acorn"
    >
      <Nut
        size={size}
        className="animate-bounce [animation-delay:-0.32s]"
        data-testid="lucide-nut"
      />
      <Nut
        size={size}
        className="animate-bounce [animation-delay:-0.16s]"
        data-testid="lucide-nut"
      />
      <Nut size={size} className="animate-bounce" data-testid="lucide-nut" />
    </div>
  );
};

export default LoadingAcorn;
