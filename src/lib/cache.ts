import { Cache } from "@raycast/api";
import type { ListTasksResponse, Task } from "../types/motion";

const cache = new Cache();

// Cache TTL in milliseconds
const CACHE_TTL = {
  WORKSPACES: 5 * 60 * 1000, // 5 minutes
  PROJECTS: 5 * 60 * 1000, // 5 minutes
  TASKS: 2 * 60 * 1000, // 2 minutes
  TASK: 5 * 60 * 1000, // 5 minutes
  TOMORROW_TASKS: 60 * 60 * 1000, // 1 hour
  NEXT_WEEK_TASKS: 60 * 60 * 1000, // 1 hour
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCacheKey(prefix: string, key: string): string {
  return `motion:${prefix}:${key}`;
}

function isExpired(entry: CacheEntry<any>, ttl: number): boolean {
  return Date.now() - entry.timestamp > ttl;
}

export function getCached<T>(prefix: string, key: string): T | null {
  const cacheKey = getCacheKey(prefix, key);
  const cached = cache.get(cacheKey);
  
  if (!cached) {
    return null;
  }

  try {
    const entry: CacheEntry<T> = JSON.parse(cached);
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(prefix: string, key: string, data: T, ttl: number = CACHE_TTL.TASKS): void {
  const cacheKey = getCacheKey(prefix, key);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  
  cache.set(cacheKey, JSON.stringify(entry));
}

export function getCachedWithTTL<T>(prefix: string, key: string, ttl: number): T | null {
  const cacheKey = getCacheKey(prefix, key);
  const cached = cache.get(cacheKey);
  
  if (!cached) {
    return null;
  }

  try {
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    if (isExpired(entry, ttl)) {
      cache.remove(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

export function removeCached(prefix: string, key: string): void {
  const cacheKey = getCacheKey(prefix, key);
  cache.remove(cacheKey);
}

export function clearCache(prefix?: string): void {
  if (prefix) {
    // Clear all entries with this prefix
    // Note: Cache API doesn't support prefix-based clearing, so we'd need to track keys
    // For now, we'll just clear the entire cache if a prefix is specified
    cache.clear();
  } else {
    cache.clear();
  }
}

// Helper functions for specific cache types
export const workspacesCache = {
  get: () => getCachedWithTTL<{ workspaces: any[] }>("workspaces", "all", CACHE_TTL.WORKSPACES),
  set: (data: { workspaces: any[] }) => setCached("workspaces", "all", data, CACHE_TTL.WORKSPACES),
  clear: () => removeCached("workspaces", "all"),
};

export const projectsCache = {
  get: (workspaceId: string) => getCachedWithTTL<{ projects: any[] }>("projects", workspaceId, CACHE_TTL.PROJECTS),
  set: (workspaceId: string, data: { projects: any[] }) => setCached("projects", workspaceId, data, CACHE_TTL.PROJECTS),
  clear: (workspaceId: string) => removeCached("projects", workspaceId),
};

export const tasksCache = {
  get: (key: string) => getCachedWithTTL<ListTasksResponse>("tasks", key, CACHE_TTL.TASKS),
  set: (key: string, data: ListTasksResponse) => setCached("tasks", key, data, CACHE_TTL.TASKS),
  clear: (key: string) => removeCached("tasks", key),
  clearAll: () => {
    // Clear all task-related caches
    // Since Cache API doesn't support prefix-based clearing, we clear the entire cache
    // This is acceptable since task updates are relatively infrequent
    cache.clear();
  },
};

export const taskCache = {
  get: (taskId: string) => getCachedWithTTL<Task>("task", taskId, CACHE_TTL.TASK),
  set: (taskId: string, data: Task) => setCached("task", taskId, data, CACHE_TTL.TASK),
  clear: (taskId: string) => removeCached("task", taskId),
};

export const tomorrowTasksCache = {
  get: (date: string) => getCachedWithTTL<any>("tomorrow-tasks", date, CACHE_TTL.TOMORROW_TASKS),
  set: (date: string, data: any) => setCached("tomorrow-tasks", date, data, CACHE_TTL.TOMORROW_TASKS),
  clear: (date: string) => removeCached("tomorrow-tasks", date),
  clearAll: () => {
    // Clear all tomorrow task caches
    // Since Cache API doesn't support prefix-based clearing, we clear the entire cache
    cache.clear();
  },
};

export const nextWeekTasksCache = {
  get: (dateRangeKey: string) => getCachedWithTTL<any>("next-week-tasks", dateRangeKey, CACHE_TTL.NEXT_WEEK_TASKS),
  set: (dateRangeKey: string, data: any) => setCached("next-week-tasks", dateRangeKey, data, CACHE_TTL.NEXT_WEEK_TASKS),
  clear: (dateRangeKey: string) => removeCached("next-week-tasks", dateRangeKey),
  clearAll: () => {
    // Clear all next week task caches
    // Since Cache API doesn't support prefix-based clearing, we clear the entire cache
    cache.clear();
  },
};
