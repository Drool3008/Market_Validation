"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Global mute state, shared by the hero and every hover preview (Netflix-style:
// one speaker toggle controls all trailers). Starts muted because browsers block
// autoplay-with-sound until the user interacts.
const MuteCtx = createContext<{ muted: boolean; toggle: () => void }>({
  muted: true,
  toggle: () => {},
});

export function MuteProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true);
  return (
    <MuteCtx.Provider value={{ muted, toggle: () => setMuted((m) => !m) }}>
      {children}
    </MuteCtx.Provider>
  );
}

export const useMute = () => useContext(MuteCtx);
