import { Nut } from "lucide-react";
import "./LoadingAcorn.css";

const LoadingAcorn = ({ size = 25, className = "" }) => {
  return (
    <div className={`loading-acorn ${className}`} data-testid="loading-acorn">
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
