"use client";

import { useEffect } from "react";

/**
 * Accurate viewport height for mobile browsers.
 * visualViewport.height excludes browser chrome (address bar, nav bar)
 * which 100dvh / innerHeight may include on Samsung Internet & others.
 * Sets --app-height CSS custom property on <html>.
 */
export function useViewportHeight() {
  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
    };
    update();
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      if (vv) vv.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
}
