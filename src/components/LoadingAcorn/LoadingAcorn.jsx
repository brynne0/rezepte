import { Nut } from "lucide-react";
import "./LoadingAcorn.css";
import { cn } from "@/lib/utils";

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
        className="acorn-icon acorn-1"
        data-testid="lucide-nut"
      />
      <Nut
        size={size}
        className="acorn-icon acorn-2"
        data-testid="lucide-nut"
      />
      <Nut
        size={size}
        className="acorn-icon acorn-3"
        data-testid="lucide-nut"
      />
    </div>
  );
};

export default LoadingAcorn;
