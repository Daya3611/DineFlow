"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "@studio-freight/lenis";

export default function HomeScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      smooth: true,
      smoothTouch: false,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    } as any);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

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
