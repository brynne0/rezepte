import { Nut } from "lucide-react";
import "./LoadingAcorn.css";

const LoadingAcorn = ({ size = 20, className = "" }) => {
  return (
    <div className={`loading-acorn ${className}`}>
      <Nut size={size} className="acorn-icon acorn-1" />
      <Nut size={size} className="acorn-icon acorn-2" />
      <Nut size={size} className="acorn-icon acorn-3" />
    </div>
  );
};

export default LoadingAcorn;
