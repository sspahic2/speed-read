import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
const subscribers = new Set<() => void>()
let mediaQueryList: MediaQueryList | null = null
let unsubscribeMediaQuery: (() => void) | null = null

function getSnapshot() {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback())
}

function ensureMediaQuerySubscription() {
  if (typeof window === "undefined" || unsubscribeMediaQuery) return
  mediaQueryList = window.matchMedia(MOBILE_QUERY)

  const handleChange = () => {
    notifySubscribers()
  }

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", handleChange)
    unsubscribeMediaQuery = () => {
      mediaQueryList?.removeEventListener("change", handleChange)
      unsubscribeMediaQuery = null
      mediaQueryList = null
    }
    return
  }

  mediaQueryList.addListener(handleChange)
  unsubscribeMediaQuery = () => {
    mediaQueryList?.removeListener(handleChange)
    unsubscribeMediaQuery = null
    mediaQueryList = null
  }
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  ensureMediaQuerySubscription()
  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0 && unsubscribeMediaQuery) {
      unsubscribeMediaQuery()
    }
  }
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
