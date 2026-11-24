import { Squirrel } from "lucide-react";
import { cn } from "cn";

// index.html adds html.santa from 24 Nov to 6 Jan (or with ?santa=1)
const isSantaSeason = () =>
  document.documentElement.classList.contains("santa");

const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// Lucide Squirrel, wearing a Santa hat in season
const SquirrelSanta = ({ className }) => {
  if (!isSantaSeason()) return <Squirrel aria-hidden className={className} />;

  return (
    <>
      {/* Light: filled hat */}
      <svg {...svgProps} className={cn(className, "dark:hidden")}>
        <path d="M15.236 22a3 3 0 0 0-2.2-5" />
        <path d="M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-1.354-3" />
        <path d="M18 13h.01" />
        <path d="M14.5 10a7 7 0 0 0-7.5 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10" />
        <path
          fill="#b8402f"
          strokeWidth={1.3}
          d="M20 7.3c0-3.1-1.3-5.2-3.4-5.4-1.7-.1-3 1-3.3 2.6l1.5.6.2 2.2Z"
        />
        <circle fill="#fffaf2" strokeWidth={1.3} cx="13.3" cy="5.1" r="1.3" />
        <path
          fill="#fffaf2"
          strokeWidth={1.3}
          d="M15.5 10.45h4a1.6 1.6 0 0 0 0-3.2h-4a1.6 1.6 0 0 0 0 3.2Z"
        />
      </svg>
      {/* Dark: glow-line hat */}
      <svg {...svgProps} className={cn(className, "hidden dark:block")}>
        <path d="M15.236 22a3 3 0 0 0-2.2-5" />
        <path d="M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2A4 4 0 0 0 20.88 10.23" />
        <path d="M18 13h.01" />
        <path d="M13.91 9.98A7 7 0 0 0 7 17c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10" />
        <g strokeWidth={1.3}>
          <path
            stroke="#e0624c"
            d="M20 6.7C20 4.2 18.7 2.1 16.6 1.9 15 1.8 14.1 2.5 13.8 3.2M15.24 5.3 15.1 6.7"
          />
          <g stroke="#f2e7d2">
            <circle cx="13.3" cy="5.1" r="1.3" />
            <path d="M15.5 10.45h4a1.6 1.6 0 0 0 0-3.2h-4a1.6 1.6 0 0 0 0 3.2Z" />
          </g>
        </g>
      </svg>
    </>
  );
};

export default SquirrelSanta;
