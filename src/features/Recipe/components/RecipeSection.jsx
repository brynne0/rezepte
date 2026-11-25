import { cn } from "cn";

// A block on the recipe receipt, separated from the one above by a dashed rule
function RecipeSection({ className, rule = true, ...props }) {
  return (
    <div
      data-slot="recipe-section"
      className={cn(
        rule && "border-t border-dashed border-muted-foreground/40 pt-4",
        className
      )}
      {...props}
    />
  );
}

function RecipeSectionLabel({ className, children, ...props }) {
  return (
    <h2
      data-slot="recipe-section-label"
      className={cn(
        "font-receipt text-xs font-normal tracking-widest text-muted-foreground uppercase",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export { RecipeSection, RecipeSectionLabel };
