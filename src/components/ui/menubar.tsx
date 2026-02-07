import * as React from "react";
import {
  CheckboxItem as MenubarPrimitiveCheckboxItem,
  Content as MenubarPrimitiveContent,
  Group as MenubarPrimitiveGroup,
  Item as MenubarPrimitiveItem,
  ItemIndicator as MenubarPrimitiveItemIndicator,
  Label as MenubarPrimitiveLabel,
  Menu as MenubarPrimitiveMenu,
  Portal as MenubarPrimitivePortal,
  RadioGroup as MenubarPrimitiveRadioGroup,
  RadioItem as MenubarPrimitiveRadioItem,
  Root as MenubarPrimitiveRoot,
  Separator as MenubarPrimitiveSeparator,
  Sub as MenubarPrimitiveSub,
  SubContent as MenubarPrimitiveSubContent,
  SubTrigger as MenubarPrimitiveSubTrigger,
  Trigger as MenubarPrimitiveTrigger,
} from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const MenubarMenu = MenubarPrimitiveMenu;

const MenubarGroup = MenubarPrimitiveGroup;

const MenubarPortal = MenubarPrimitivePortal;

const MenubarSub = MenubarPrimitiveSub;

const MenubarRadioGroup = MenubarPrimitiveRadioGroup;

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveRoot>
>(({ className, ...props }, ref) => (
  <MenubarPrimitiveRoot
    ref={ref}
    className={cn("flex h-10 items-center space-x-1 rounded-md border bg-background p-1", className)}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitiveRoot.displayName;

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveTrigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitiveTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
));
MenubarTrigger.displayName = MenubarPrimitiveTrigger.displayName;

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveSubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveSubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitiveSubTrigger
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
  </MenubarPrimitiveSubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitiveSubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveSubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveSubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitiveSubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitiveSubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveContent>
>(({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => (
  <MenubarPrimitivePortal>
    <MenubarPrimitiveContent
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </MenubarPrimitivePortal>
));
MenubarContent.displayName = MenubarPrimitiveContent.displayName;

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveItem> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitiveItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitiveItem.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveCheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitiveCheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitiveItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitiveItemIndicator>
    </span>
    {children}
  </MenubarPrimitiveCheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitiveCheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveRadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveRadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitiveRadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitiveItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenubarPrimitiveItemIndicator>
    </span>
    {children}
  </MenubarPrimitiveRadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitiveRadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveLabel>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitiveLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitiveLabel.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitiveSeparator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitiveSeparator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitiveSeparator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
MenubarSeparator.displayName = MenubarPrimitiveSeparator.displayName;

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
MenubarShortcut.displayname = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
