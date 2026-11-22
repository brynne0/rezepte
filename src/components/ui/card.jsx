import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) bg-card py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[size=lg]:[--card-spacing:--spacing(8)]",
  {
    variants: {
      variant: {
        default:
          "overflow-hidden rounded-xl border border-primary *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        // Torn-off receipt stub: no border or radius, scalloped tear on the
        // top and bottom edges drawn in the card colour. Large receipts keep
        // their roomy padding but a tighter gap between header and content.
        receipt: [
          "relative rounded-none [--card-spacing:--spacing(3.5)] data-[size=lg]:gap-4",
          "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-[7px] before:content-['']",
          "before:bg-[radial-gradient(circle_at_6px_7px,var(--card)_6px,transparent_6.5px)] before:bg-size-[12px_7px] before:bg-repeat-x",
          "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-[7px] after:content-['']",
          "after:bg-[radial-gradient(circle_at_6px_0,var(--card)_6px,transparent_6.5px)] after:bg-size-[12px_7px] after:bg-repeat-x",
        ],
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Card({ className, size = "default", variant = "default", ...props }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
