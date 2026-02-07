import * as React from "react";
import {
  Corner as ScrollAreaPrimitiveCorner,
  Root as ScrollAreaPrimitiveRoot,
  ScrollAreaScrollbar as ScrollAreaPrimitiveScrollAreaScrollbar,
  ScrollAreaThumb as ScrollAreaPrimitiveScrollAreaThumb,
  Viewport as ScrollAreaPrimitiveViewport,
} from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitiveRoot>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitiveRoot ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitiveViewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitiveViewport>
    <ScrollBar />
    <ScrollAreaPrimitiveCorner />
  </ScrollAreaPrimitiveRoot>
));
ScrollArea.displayName = ScrollAreaPrimitiveRoot.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitiveScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitiveScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitiveScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitiveScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitiveScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitiveScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
