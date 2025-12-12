import type { ReactNode } from "react";

import { TooltipProvider } from "../ui/tooltip";
import { CreateLayoutProvider } from "./create-layout-provider";
import { GameDataProvider } from "./game-data-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <GameDataProvider>
          <CreateLayoutProvider>{children}</CreateLayoutProvider>
        </GameDataProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
