"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize to `false` on the server to keep SSR deterministic.
  // The value is updated on the client in useEffect.
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsMobile(false)
      return
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Use both addEventListener/removeEventListener if supported, otherwise fallback
    try {
      mql.addEventListener("change", onChange)
    } catch (e) {
      // Safari/older browsers
      // @ts-ignore
      mql.addListener(onChange)
    }

    // Set initial value on client
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    return () => {
      try {
        mql.removeEventListener("change", onChange)
      } catch (e) {
        // @ts-ignore
        mql.removeListener?.(onChange)
      }
    }
  }, [])

  return isMobile
}
