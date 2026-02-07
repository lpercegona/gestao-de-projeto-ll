import * as React from "react";
import {
  CheckboxItem as ContextMenuPrimitiveCheckboxItem,
  Content as ContextMenuPrimitiveContent,
  Group as ContextMenuPrimitiveGroup,
  Item as ContextMenuPrimitiveItem,
  ItemIndicator as ContextMenuPrimitiveItemIndicator,
  Label as ContextMenuPrimitiveLabel,
  Portal as ContextMenuPrimitivePortal,
  RadioGroup as ContextMenuPrimitiveRadioGroup,
  RadioItem as ContextMenuPrimitiveRadioItem,
  Root as ContextMenuPrimitiveRoot,
  Separator as ContextMenuPrimitiveSeparator,
  Sub as ContextMenuPrimitiveSub,
  SubContent as ContextMenuPrimitiveSubContent,
  SubTrigger as ContextMenuPrimitiveSubTrigger,
  Trigger as ContextMenuPrimitiveTrigger,
} from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitiveRoot;

const ContextMenuTrigger = ContextMenuPrimitiveTrigger;

const ContextMenuGroup = ContextMenuPrimitiveGroup;

const ContextMenuPortal = ContextMenuPrimitivePortal;

const ContextMenuSub = ContextMenuPrimitiveSub;

const ContextMenuRadioGroup = ContextMenuPrimitiveRadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveSubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveSubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitiveSubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitiveSubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitiveSubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveSubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveSubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitiveSubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitiveSubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitivePortal>
    <ContextMenuPrimitiveContent
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitivePortal>
));
ContextMenuContent.displayName = ContextMenuPrimitiveContent.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveItem> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitiveItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitiveItem.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveCheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitiveCheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitiveItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitiveItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitiveCheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitiveCheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveRadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveRadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitiveRadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitiveItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </ContextMenuPrimitiveItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitiveRadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitiveRadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveLabel>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitiveLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitiveLabel.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitiveSeparator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveSeparator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitiveSeparator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
ContextMenuSeparator.displayName = ContextMenuPrimitiveSeparator.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
