"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import * as React from "react";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/25 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogBackdrop />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "dialog-surface fixed top-1/2 left-1/2 z-50 flex w-full max-w-120 -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl p-6 text-white shadow-2xl transition-all duration-200 outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg font-semibold", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex gap-3", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
};
