import * as React from "react";
import {
  Range as SliderPrimitiveRange,
  Root as SliderPrimitiveRoot,
  Thumb as SliderPrimitiveThumb,
  Track as SliderPrimitiveTrack,
} from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitiveRoot>
>(({ className, ...props }, ref) => (
  <SliderPrimitiveRoot
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitiveTrack className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitiveRange className="absolute h-full bg-primary" />
    </SliderPrimitiveTrack>
    <SliderPrimitiveThumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitiveRoot>
));
Slider.displayName = SliderPrimitiveRoot.displayName;

export { Slider };
