import { Squirrel } from "lucide-react";
import { cn } from "cn";

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

// Static markup from public/squirrels.js
const Drawing = ({ markup, className }) => (
  <svg
    {...svgProps}
    className={className}
    dangerouslySetInnerHTML={{ __html: markup }}
  />
);

// Today's squirrel, or plain lucide Squirrel
const SeasonalSquirrel = ({ className }) => {
  const { season, drawings } = window.squirrels ?? {};
  if (!season) return <Squirrel aria-hidden className={className} />;

  const dark = drawings[`${season}-dark`];
  if (!dark) return <Drawing markup={drawings[season]} className={className} />;

  return (
    <>
      <Drawing
        markup={drawings[season]}
        className={cn(className, "dark:hidden")}
      />
      <Drawing markup={dark} className={cn(className, "hidden dark:block")} />
    </>
  );
};

export default SeasonalSquirrel;
