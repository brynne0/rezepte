import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

// Scrolls sideways on mobile, wraps on desktop
const FilterStrip = ({
  items,
  selected,
  onSelect,
  labelAs = "span",
  className,
  ...props
}) => {
  const Label = labelAs;
  const ref = useRef(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;

    const update = () => {
      const remaining =
        strip.scrollWidth - strip.clientWidth - strip.scrollLeft;
      setShowFade(remaining > 1);
    };

    update();
    strip.addEventListener("scroll", update, { passive: true });

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(strip);
      Array.from(strip.children).forEach((child) => observer.observe(child));
    }

    return () => {
      strip.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const strip = ref.current;
    const active = strip?.querySelector('[aria-pressed="true"]');
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo?.({
      left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [selected]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex gap-x-1 overflow-x-auto pt-1 scrollbar-none md:flex-wrap md:justify-center md:gap-x-4 md:gap-y-2 md:overflow-visible md:pt-0 [&::-webkit-scrollbar]:hidden",
        showFade &&
          "mask-[linear-gradient(to_right,black_calc(100%-48px),transparent)] md:mask-none",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Button
          key={item.key ?? item.value}
          className="shrink-0"
          variant="text"
          aria-pressed={item.value === selected}
          onClick={() => onSelect(item.value)}
        >
          <Label className="font-receipt text-sm font-semibold tracking-wider uppercase">
            {item.label}
          </Label>
        </Button>
      ))}
    </div>
  );
};

export default FilterStrip;
