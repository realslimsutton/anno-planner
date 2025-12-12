import type { Assets, Manifest, Translations } from "@/types/game-data";
import localforage from "localforage";

import {
  ASSETS_KEY,
  ASSETS_VERSION_KEY,
  TRANSLATIONS_VERSION_PREFIX,
} from "./constants";

const assetsStore = localforage.createInstance({
  name: "anno-planner",
  storeName: "assets",
});

const translationsStore = localforage.createInstance({
  name: "anno-planner",
  storeName: "translations",
});

const metaStore = localforage.createInstance({
  name: "anno-planner",
  storeName: "meta",
});

export async function fetchManifest(): Promise<Manifest> {
  const response = await fetch("/data/manifest.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.statusText}`);
  }
  return (await response.json()) as Manifest;
}

export async function getAssets(manifest: Manifest): Promise<Assets> {
  const cachedVersion = await metaStore.getItem<string>(ASSETS_VERSION_KEY);

  if (cachedVersion === manifest.version) {
    const cachedAssets = await assetsStore.getItem<Assets>(ASSETS_KEY);
    if (cachedAssets) {
      return cachedAssets;
    }
  }

  const response = await fetch(`/${manifest.assets}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch assets: ${response.statusText}`);
  }
  const assets = (await response.json()) as Assets;

  await assetsStore.setItem(ASSETS_KEY, assets);
  await metaStore.setItem(ASSETS_VERSION_KEY, manifest.version);

  return assets;
}

export async function getTranslations(
  manifest: Manifest,
  locale: string,
): Promise<Translations> {
  // Validate locale exists in manifest
  const availableLocales = Object.keys(manifest.translations);
  if (!availableLocales.includes(locale)) {
    locale = "en";
  }

  const versionKey = `${TRANSLATIONS_VERSION_PREFIX}${locale}`;
  const cachedVersion = await metaStore.getItem<string>(versionKey);

  if (cachedVersion === manifest.version) {
    const cachedTranslations =
      await translationsStore.getItem<Translations>(locale);
    if (cachedTranslations) {
      return cachedTranslations;
    }
  }

  const translationUrl = `/data/translations/${locale}.json`;

  const response = await fetch(translationUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch translations: ${response.statusText}`);
  }
  const translations = (await response.json()) as Translations;

  await translationsStore.setItem(locale, translations);
  await metaStore.setItem(versionKey, manifest.version);

  return translations;
}

export async function clearGameDataCache(): Promise<void> {
  await Promise.all([
    assetsStore.clear(),
    translationsStore.clear(),
    metaStore.clear(),
  ]);
}
