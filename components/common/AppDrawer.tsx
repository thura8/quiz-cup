"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "cn";
import { ChevronLeft, X } from "lucide-react";
import * as React from "react";

type AppDrawerProps = Omit<React.ComponentProps<typeof Drawer>, "children"> & {
  trigger?: React.ReactElement;
  title?: React.ReactNode;
  description?: React.ReactNode;
  closable?: boolean;
  onBack?: () => void;
  footer?: React.ReactNode;
  footerDirection?: "row" | "stack";
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeButtonClassName?: string;
  backButtonClassName?: string;
};

const AppDrawer = ({
  trigger,
  title,
  description,
  closable = false,
  onBack,
  footer,
  footerDirection = "row",
  children,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  footerClassName,
  closeButtonClassName,
  backButtonClassName,
  ...props
}: AppDrawerProps) => {
  const hasIconRow = title || closable || onBack;

  return (
    <Drawer {...props}>
      {trigger && <DrawerTrigger render={trigger} />}
      <DrawerContent className={className}>
        {(hasIconRow || description) && (
          <DrawerHeader className={headerClassName}>
            {hasIconRow && (
              <div className="relative flex items-center justify-center">
                {onBack && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "absolute left-0 hover:bg-neutral-600",
                      backButtonClassName,
                    )}
                    onClick={onBack}
                  >
                    <ChevronLeft className="size-5 text-white" />
                  </Button>
                )}
                {title && (
                  <DrawerTitle className={cn("text-white", titleClassName)}>
                    {title}
                  </DrawerTitle>
                )}
                {closable && (
                  <DrawerClose
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "absolute right-0 hover:bg-neutral-600",
                          closeButtonClassName,
                        )}
                      />
                    }
                  >
                    <X className="size-5 text-white" />
                  </DrawerClose>
                )}
              </div>
            )}
            {description && (
              <DrawerDescription className={descriptionClassName}>
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
        )}
        {children && (
          <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
        )}
        {footer && (
          <DrawerFooter direction={footerDirection} className={footerClassName}>
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default AppDrawer;
