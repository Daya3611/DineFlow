"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "@studio-freight/lenis";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      smooth: true,
      smoothTouch: false,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // cubic easing
    } as any);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Provide lenis instance globally via window for optional manual hookups
    if (typeof window !== "undefined") {
      (window as any).lenis = lenis;
    }

    return () => {
      lenis.destroy();
      if (typeof window !== "undefined") {
        delete (window as any).lenis;
      }
    };
  }, []);

  return <>{children}</>;
}
