import { getApiKey } from "./preferences";
import {
  workspacesCache,
  projectsCache,
  tasksCache,
  taskCache,
} from "./cache";
import type {
  Task,
  Workspace,
  Project,
  CreateTaskRequest,
  CreateTaskResponse,
  ListTasksResponse,
} from "../types/motion";

const API_BASE_URL = "https://api.usemotion.com/v1";

async function getHeaders(): Promise<HeadersInit> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not found. Please configure it in preferences.");
  }
  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await getHeaders();
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Motion API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

export interface GetTasksParams {
  name?: string;
  workspaceId?: string;
  assigneeId?: string;
  status?: string[];
  projectId?: string;
  label?: string;
  includeAllStatuses?: boolean;
  cursor?: string;
}

export async function getTasks(params?: GetTasksParams, useCache: boolean = true): Promise<ListTasksResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.name) {
    queryParams.append("name", params.name);
  }
  if (params?.workspaceId) {
    queryParams.append("workspaceId", params.workspaceId);
  }
  if (params?.assigneeId) {
    queryParams.append("assigneeId", params.assigneeId);
  }
  if (params?.status) {
    params.status.forEach((s) => queryParams.append("status", s));
  }
  if (params?.projectId) {
    queryParams.append("projectId", params.projectId);
  }
  if (params?.label) {
    queryParams.append("label", params.label);
  }
  if (params?.includeAllStatuses) {
    queryParams.append("includeAllStatuses", "true");
  }
  if (params?.cursor) {
    queryParams.append("cursor", params.cursor);
  }

  const queryString = queryParams.toString();
  const cacheKey = queryString || "all";
  
  // Check cache first (skip cache for cursor-based pagination)
  if (useCache && !params?.cursor) {
    const cached = tasksCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const endpoint = `/tasks${queryString ? `?${queryString}` : ""}`;
  const response = await fetchAPI<ListTasksResponse>(endpoint);

  // Cache the response (don't cache paginated results)
  if (useCache && !params?.cursor) {
    tasksCache.set(cacheKey, response);
  }

  return response;
}

/**
 * Fetches all tasks by paginating through all pages
 * This ensures we get the complete list of tasks, not just the first page
 */
export async function getAllTasks(params?: Omit<GetTasksParams, "cursor">, useCache: boolean = true): Promise<Task[]> {
  const allTasks: Task[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await getTasks({ ...params, cursor }, useCache && cursor === undefined);
    allTasks.push(...response.tasks);
    
    cursor = response.meta?.nextCursor;
    hasMore = !!cursor;
  }

  return allTasks;
}

export async function getTask(id: string, useCache: boolean = true): Promise<Task> {
  // Check cache first
  if (useCache) {
    const cached = taskCache.get(id);
    if (cached) {
      return cached;
    }
  }

  const task = await fetchAPI<Task>(`/tasks/${id}`);
  
  // Cache the response
  if (useCache) {
    taskCache.set(id, task);
  }

  return task;
}

export async function createTask(data: CreateTaskRequest): Promise<CreateTaskResponse> {
  const response = await fetchAPI<any>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });

  // The API returns a Task object directly, not a CreateTaskResponse wrapper
  // Convert it to CreateTaskResponse format
  const createResponse: CreateTaskResponse = {
    status: response.id ? "SUCCESS" : "FAILURE",
    id: response.id || null,
  };

  // Invalidate task caches when a new task is created
  if (createResponse.status === "SUCCESS") {
    // Clear all task caches since we've added a new task
    tasksCache.clearAll();
    // If we have a project, clear its cache too
    if (data.projectId) {
      projectsCache.clear(data.workspaceId);
    }
  }

  return createResponse;
}

export async function getWorkspaces(useCache: boolean = true): Promise<{ workspaces: Workspace[] }> {
  // Check cache first
  if (useCache) {
    const cached = workspacesCache.get();
    if (cached) {
      return cached;
    }
  }

  const response = await fetchAPI<{ workspaces: Workspace[] }>("/workspaces");
  
  // Cache the response
  if (useCache) {
    workspacesCache.set(response);
  }

  return response;
}

export async function getProjects(workspaceId: string, useCache: boolean = true): Promise<{ projects: Project[] }> {
  // Check cache first
  if (useCache) {
    const cached = projectsCache.get(workspaceId);
    if (cached) {
      return cached;
    }
  }

  const response = await fetchAPI<{ projects: Project[] }>(`/projects?workspaceId=${workspaceId}`);
  
  // Cache the response
  if (useCache) {
    projectsCache.set(workspaceId, response);
  }

  return response;
}
