import * as React from "react";
import {
  Content as TabsContentPrimitive,
  List as TabsListPrimitive,
  Root as Tabs,
  Trigger as TabsTriggerPrimitive,
} from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsListPrimitive>,
  React.ComponentPropsWithoutRef<typeof TabsListPrimitive>
>(({ className, ...props }, ref) => (
  <TabsListPrimitive
    ref={ref}
    className={cn(
      "inline-flex h-8 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsListPrimitive.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTriggerPrimitive>,
  React.ComponentPropsWithoutRef<typeof TabsTriggerPrimitive>
>(({ className, ...props }, ref) => (
  <TabsTriggerPrimitive
    ref={ref}
    className={cn(
      "flex h-6 items-center gap-1.5 px-2.5 text-xs font-medium rounded-full border border-muted",
      "whitespace-nowrap transition-colors ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border data-[state=active]:border-slate-200",
      "data-[state=active]:shadow-none data-[state=active]:bg-background data-[state=active]:text-accent-foreground",
      className,
    )}
    {...props}
  />
));

TabsTrigger.displayName = TabsTriggerPrimitive.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsContentPrimitive>,
  React.ComponentPropsWithoutRef<typeof TabsContentPrimitive>
>(({ className, ...props }, ref) => (
  <TabsContentPrimitive
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsContentPrimitive.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
