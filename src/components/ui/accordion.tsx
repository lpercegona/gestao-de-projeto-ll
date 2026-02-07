import * as React from "react";
import {
  Content as AccordionPrimitiveContent,
  Header as AccordionPrimitiveHeader,
  Item as AccordionPrimitiveItem,
  Root as AccordionPrimitiveRoot,
  Trigger as AccordionPrimitiveTrigger,
} from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitiveRoot;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitiveItem>
>(({ className, ...props }, ref) => (
  <AccordionPrimitiveItem ref={ref} className={cn("border-b", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitiveTrigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitiveTrigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitiveHeader className="flex">
    <AccordionPrimitiveTrigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitiveTrigger>
  </AccordionPrimitiveHeader>
));
AccordionTrigger.displayName = AccordionPrimitiveTrigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitiveContent>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitiveContent
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitiveContent>
));

AccordionContent.displayName = AccordionPrimitiveContent.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
