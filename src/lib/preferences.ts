import { LocalStorage } from "@raycast/api";
import { clearCache } from "./cache";

const API_KEY_STORAGE_KEY = "motion-api-key";

export async function getApiKey(): Promise<string | null> {
  const apiKey = await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY);
  return apiKey || null;
}

export async function setApiKey(key: string): Promise<void> {
  const oldKey = await getApiKey();
  await LocalStorage.setItem(API_KEY_STORAGE_KEY, key);
  
  // Clear cache if API key changed
  if (oldKey !== key) {
    clearCache();
  }
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.length > 0;
}

export async function clearApiKey(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
  // Clear cache when API key is removed
  clearCache();
}
