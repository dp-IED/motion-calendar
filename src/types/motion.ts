export interface Task {
  id: string;
  name: string;
  description: string;
  duration: string | number;
  dueDate: string | null;
  deadlineType: string;
  parentRecurringTaskId: string | null;
  completed: boolean;
  completedTime: string | null;
  updatedTime: string;
  startOn: string | null;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    name: string;
    description: string;
    workspaceId: string;
    status: {
      name: string;
      isDefaultStatus: boolean;
      isResolvedStatus: boolean;
    };
    createdTime: string;
    updatedTime: string;
  } | null;
  workspace: {
    id: string;
    name: string;
    teamId: string;
    type: string;
    labels: Array<{ name: string }>;
    statuses: Array<{
      name: string;
      isDefaultStatus: boolean;
      isResolvedStatus: boolean;
    }>;
  };
  status: {
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  };
  priority: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  labels: Array<{ name: string }>;
  assignees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  scheduledStart: string | null;
  createdTime: string;
  scheduledEnd: string | null;
  schedulingIssue: boolean;
  lastInteractedTime: string | null;
  chunks?: Array<{
    id: string;
    duration: number;
    scheduledStart: string;
    scheduledEnd: string;
    completedTime: string | null;
    isFixed: boolean;
  }>;
}

export interface Workspace {
  id: string;
  name: string;
  teamId: string | null;
  type: string;
  labels: Array<{ name: string }>;
  statuses: Array<{
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  }>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  priorityLevel: string;
  dueDate: string | null;
  startDate: string | null;
  completedTime: string | null;
  status: {
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  } | null;
  manager: {
    name: string;
  } | null;
  taskCount: number;
}

export interface CreateTaskRequest {
  name: string;
  workspaceId: string;
  dueDate?: string;
  duration?: string | number;
  status?: string;
  priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  description?: string;
  projectId?: string;
  labels?: string[];
  assigneeId?: string;
  autoScheduled?: {
    startDate?: string;
    deadlineType?: "HARD" | "SOFT" | "NONE";
    schedule?: string;
  } | null;
}

export interface CreateTaskResponse {
  status: "SUCCESS" | "FAILURE";
  id: string | null;
}

export interface ListTasksResponse {
  tasks: Task[];
  meta?: {
    nextCursor?: string;
    pageSize?: number;
  };
}
