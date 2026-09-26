import { createContext, useContext, useEffect, useState } from "react";
import { getDemoMode, setDemoModeStorage } from "../api/client";

const DemoModeContext = createContext({ demo: false, setDemo: () => {}, toggle: () => {} });

export function DemoModeProvider({ children }) {
  const [demo, setDemo] = useState(getDemoMode());

  useEffect(() => {
    setDemoModeStorage(demo);
  }, [demo]);

  return (
    <DemoModeContext.Provider value={{ demo, setDemo, toggle: () => setDemo((d) => !d) }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
