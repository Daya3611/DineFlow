"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

interface AppSheetProps {
  /** The element that opens the sheet */
  trigger?: React.ReactElement;
  title: string;
  description?: string;
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Form submit handler – if provided, wraps children in a <form> */
  onSubmit?: (e: React.FormEvent) => Promise<void> | void;
  /** Show spinner & disable save button */
  loading?: boolean;
  /** Label for the primary action button */
  submitLabel?: string;
  children: React.ReactNode;
  /** Extra class for the content panel */
  className?: string;
}

export function AppSheet({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  submitLabel = "Save",
  children,
  className,
}: AppSheetProps) {
  const isMobile = useIsMobile();
  const side = isMobile ? "bottom" : "right";

  const inner = (
    <>
      <SheetHeader className="px-6 pt-6 pb-2">
        <SheetTitle className="text-lg font-bold text-slate-900">{title}</SheetTitle>
        {description && (
          <SheetDescription className="text-sm text-slate-500 mt-0.5">
            {description}
          </SheetDescription>
        )}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {children}
      </div>

      <SheetFooter className="px-6 pb-6 pt-3 border-t border-slate-100 flex flex-row gap-2 justify-end">
        <SheetClose
          render={
            <Button type="button" variant="outline" className="text-slate-600">
              Cancel
            </Button>
          }
        />
        {onSubmit && (
          <Button type="submit" disabled={loading} className="bg-[#0f9d6a] [#0c7f56] min-w-[100px]">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        )}
      </SheetFooter>
    </>
  );

  const contentClass = cn(
    "flex flex-col p-0 gap-0",
    side === "right" && "sm:w-[440px] sm:max-w-[440px]",
    side === "bottom" && "rounded-t-2xl max-h-[92dvh]",
    className
  );

  // Wrap in <form> only when an onSubmit handler is provided
  const content = onSubmit ? (
    <form
      onSubmit={onSubmit}
      className="flex flex-col flex-1 overflow-hidden"
    >
      {inner}
    </form>
  ) : (
    <div className="flex flex-col flex-1 overflow-hidden">{inner}</div>
  );

  if (trigger) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger render={trigger} />
        <SheetContent side={side} className={contentClass} showCloseButton={false}>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Controlled-only (no trigger)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={contentClass} showCloseButton={false}>
        {content}
      </SheetContent>
    </Sheet>
  );
}
