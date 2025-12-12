import type {
  Assets,
  Buff,
  BuffEffect,
  Building,
  Manifest,
  Region,
  Translations,
} from "@/types/game-data";
import type { ReactNode } from "react";
import {
  Activity,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearGameDataCache,
  fetchManifest,
  getAssets,
  getTranslations,
} from "@/lib/game-data";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

type GameDataContextType = {
  manifest: Manifest | null;
  assets: Assets | null;
  translations: Translations | null;
  buildingsMap: Record<number, Building>;
  regionsMap: Record<number, Region>;
  buffsMap: Record<number, Buff>;
  buffEffectsMap: Record<number, BuffEffect>;
  getBuildingName: (id: number) => string;
  getRegionName: (id: number) => string;
  getBuffName: (id: number) => string;
  getBuffEffectName: (id: number) => string;
  clearCacheAndRefetch: () => Promise<void>;
};

const GameDataContext = createContext<GameDataContextType | undefined>(
  undefined,
);

export function GameDataProvider({ children }: { children: ReactNode }) {
  const locale = getLocale();

  const queryClient = useQueryClient();

  const manifestQuery = useQuery({
    queryKey: ["manifest"],
    queryFn: fetchManifest,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
  });

  const assetsQuery = useQuery({
    queryKey: ["assets", manifestQuery.data?.version, manifestQuery.data!],
    queryFn: () => getAssets(manifestQuery.data!),
    enabled: !!manifestQuery.data,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const translationsQuery = useQuery({
    queryKey: [
      "translations",
      locale,
      manifestQuery.data?.version,
      manifestQuery.data!,
    ],
    queryFn: () => getTranslations(manifestQuery.data!, locale),
    enabled: !!manifestQuery.data,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const buildingsMap = useMemo(() => {
    if (!assetsQuery.data?.buildings) return {};
    return Object.fromEntries(assetsQuery.data.buildings.map((b) => [b.id, b]));
  }, [assetsQuery.data]);

  const regionsMap = useMemo(() => {
    if (!assetsQuery.data?.regions) return {};
    return Object.fromEntries(assetsQuery.data.regions.map((r) => [r.id, r]));
  }, [assetsQuery.data]);

  const buffsMap = useMemo(() => {
    if (!assetsQuery.data?.buffs) return {};
    return Object.fromEntries(assetsQuery.data.buffs.map((b) => [b.id, b]));
  }, [assetsQuery.data]);

  const buffEffectsMap = useMemo(() => {
    if (!assetsQuery.data?.buffEffects) return {};
    return Object.fromEntries(
      assetsQuery.data.buffEffects.map((e) => [e.id, e]),
    );
  }, [assetsQuery.data]);

  const getBuildingName = useCallback(
    (id: number): string => {
      if (!translationsQuery.data) return `Building ${id}`;
      return translationsQuery.data[String(id)] ?? `Building ${id}`;
    },
    [translationsQuery.data],
  );

  const getRegionName = useCallback(
    (id: number): string => {
      if (!translationsQuery.data) return `Region ${id}`;
      return translationsQuery.data[String(id)] ?? `Region ${id}`;
    },
    [translationsQuery.data],
  );

  const getBuffName = useCallback(
    (id: number): string => {
      if (!translationsQuery.data) return `Buff ${id}`;
      return translationsQuery.data[String(id)] ?? `Buff ${id}`;
    },
    [translationsQuery.data],
  );

  const getBuffEffectName = useCallback(
    (id: number): string => {
      if (!translationsQuery.data) return `Effect ${id}`;
      return translationsQuery.data[String(id)] ?? `Effect ${id}`;
    },
    [translationsQuery.data],
  );

  const clearCacheAndRefetch = useCallback(async () => {
    await clearGameDataCache();
    await queryClient.invalidateQueries({ queryKey: ["manifest"] });
    await queryClient.invalidateQueries({ queryKey: ["assets"] });
    await queryClient.invalidateQueries({ queryKey: ["translations"] });
  }, [queryClient]);

  const isLoading =
    manifestQuery.isLoading ||
    assetsQuery.isLoading ||
    translationsQuery.isLoading;
  const isError =
    manifestQuery.isError || assetsQuery.isError || translationsQuery.isError;

  return (
    <GameDataContext.Provider
      value={{
        manifest: manifestQuery.data ?? null,
        assets: assetsQuery.data ?? null,
        translations: translationsQuery.data ?? null,
        buildingsMap,
        regionsMap,
        buffsMap,
        buffEffectsMap,
        getBuildingName,
        getRegionName,
        getBuffName,
        getBuffEffectName,
        clearCacheAndRefetch,
      }}
    >
      <Activity mode={isLoading ? "visible" : "hidden"}>
        <LoadingScreen />
      </Activity>

      <Activity mode={isError ? "visible" : "hidden"}>
        <ErrorScreen />
      </Activity>

      <Activity mode={!isLoading && !isError ? "visible" : "hidden"}>
        {children}
      </Activity>
    </GameDataContext.Provider>
  );
}

export function useGameData() {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error("useGameData must be used within a GameDataProvider");
  }
  return context;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <div className="mb-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-2xl">
          <img
            src="/images/anno-planner-logo.webp"
            alt="Anno Planner"
            width={80}
            height={80}
          />
        </div>
      </div>

      <div className="text-center">
        <h1 className="mb-3 font-serif text-xl font-semibold text-neutral-100">
          Anno Planner
        </h1>
        <p className="mb-6 text-muted-foreground">
          {m.game_data_loading_screen_description()}
        </p>

        <div className="h-1 w-48 overflow-hidden rounded-full bg-neutral-800">
          <div className="animate-loading-bar h-full rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

export function ErrorScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-950">
      <div className="max-w-md px-4 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-800/50 bg-red-900/30">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="mb-3 text-xl font-semibold text-neutral-100">
          {m.game_data_error_screen_title()}
        </h1>
        <p className="mb-4 text-neutral-400">
          {m.game_data_error_screen_description()}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-neutral-800 px-6 py-2 text-neutral-100 transition-colors hover:bg-neutral-700"
        >
          {m.game_data_error_screen_retry_button()}
        </button>
      </div>
    </div>
  );
}
