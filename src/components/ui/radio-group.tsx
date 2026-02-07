import * as React from "react";
import {
  Indicator as RadioGroupPrimitiveIndicator,
  Item as RadioGroupPrimitiveItem,
  Root as RadioGroupPrimitiveRoot,
} from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitiveRoot>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitiveRoot className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitiveRoot.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitiveItem>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitiveItem
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitiveIndicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitiveIndicator>
    </RadioGroupPrimitiveItem>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitiveItem.displayName;

export { RadioGroup, RadioGroupItem };
