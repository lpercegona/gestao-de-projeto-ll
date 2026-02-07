import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  [
    "inline-flex items-center justify-center",
    "h-6 px-2.5",
    "text-xs font-medium",
    "rounded-full",

    // Cor base (ícone + texto)
    "text-muted-foreground",

    // Acessibilidade
    "ring-offset-background transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",

    // Estado ativo
    "data-[state=on]:bg-background",
    "data-[state=on]:shadow-none",
    "data-[state=on]:text-muted-foreground",

    // Hover
    "hover:bg-border",
    "hover:text-muted-foreground",
  ].join(" "),
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({ className, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants(), className)} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };
