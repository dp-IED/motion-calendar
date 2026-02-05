import { createTask, getWorkspaces, getProjects } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

interface CreateTaskParams {
  name: string;
  workspaceId?: string;
  dueDate: string; // Required for autoscheduling
  duration?: string;
  priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  description?: string;
  projectId?: string;
}

export default async function handler(params: CreateTaskParams) {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    if (!params.name || params.name.trim().length === 0) {
      return {
        error: "Task name is required. Provide a name for the task.",
      };
    }

    // Retrieve and validate workspaces first
    const workspacesResponse = await getWorkspaces();
    if (workspacesResponse.workspaces.length === 0) {
      return {
        error: "No workspaces found. Use the get-workspaces tool to see available workspaces.",
      };
    }

    // If workspaceId not provided, use the first workspace
    let workspaceId = params.workspaceId;
    if (!workspaceId) {
      workspaceId = workspacesResponse.workspaces[0].id;
    } else {
      // Validate the provided workspaceId
      const workspaceExists = workspacesResponse.workspaces.some(
        (w) => w.id === workspaceId
      );
      if (!workspaceExists) {
        const availableWorkspaces = workspacesResponse.workspaces
          .map((w) => `- ${w.name} (${w.id})`)
          .join("\n");
        return {
          error: `Invalid workspaceId "${workspaceId}". Available workspaces:\n${availableWorkspaces}\n\nUse the get-workspaces tool to retrieve the correct workspace ID.`,
        };
      }
    }

    // If projectId is provided, validate it
    if (params.projectId) {
      const projectsResponse = await getProjects(workspaceId);
      const projectExists = projectsResponse.projects.some(
        (p) => p.id === params.projectId
      );
      if (!projectExists) {
        const availableProjects = projectsResponse.projects
          .map((p) => `- ${p.name} (${p.id})`)
          .join("\n");
        return {
          error: `Invalid projectId "${params.projectId}" for workspace ${workspaceId}. Available projects:\n${availableProjects || "No projects found"}\n\nUse the get-projects tool with workspaceId "${workspaceId}" to retrieve the correct project ID.`,
        };
      }
    }

    // Build task data
    const taskData: any = {
      name: params.name.trim(),
      workspaceId: workspaceId,
    };

    // Set duration - required for autoscheduling
    // Default to 30 minutes if not provided
    if (params.duration !== undefined && params.duration && params.duration.trim().length > 0) {
      // Convert string to number if it's a valid number, otherwise pass as string
      const durationNum = parseInt(params.duration, 10);
      taskData.duration = isNaN(durationNum) ? params.duration : durationNum;
    } else {
      // Default duration for autoscheduling
      taskData.duration = 30; // 30 minutes default
    }

    // Validate and format dueDate (required for autoscheduling)
    if (!params.dueDate || params.dueDate.trim().length === 0) {
      return {
        error: "dueDate is required when creating a scheduled task. Please provide a date in YYYY-MM-DD format (e.g., 2024-12-25).",
      };
    }

    const date = new Date(params.dueDate);
    if (isNaN(date.getTime())) {
      return {
        error: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-12-25).",
      };
    }
    const dueDate = date.toISOString().split("T")[0];
    taskData.dueDate = dueDate;

    if (params.priority) {
      taskData.priority = params.priority;
    }

    if (params.description) {
      taskData.description = params.description;
    }

    if (params.projectId) {
      taskData.projectId = params.projectId;
    }

    // Always enable autoscheduling
    // Use the dueDate as startDate
    const startDate = dueDate + "T00:00:00Z";

    taskData.autoScheduled = {
      startDate: startDate,
      deadlineType: "HARD", // Since dueDate is required, always use HARD deadline
      schedule: "Work Hours",
    };

    // Create the task
    const response = await createTask(taskData);

    // Check if task was created successfully
    if (response.status === "SUCCESS" && response.id) {
      return {
        message: `Task "${params.name}" created successfully with autoscheduling enabled.`,
        task: {
          id: response.id,
          name: params.name,
          workspaceId: workspaceId,
          dueDate: taskData.dueDate || null,
          priority: taskData.priority || "MEDIUM",
          duration: taskData.duration,
          autoScheduled: true,
        },
        url: `https://app.usemotion.com/web/calendar?taskId=${response.id}`,
      };
    } else {
      // Try to get more details from the response
      const errorMessage = response.status === "FAILURE"
        ? "Failed to create task. The API returned a failure status."
        : "Failed to create task. The API returned an error.";
      return {
        error: errorMessage,
      };
    }
  } catch (error) {
    // The error from fetchAPI includes the full API error message
    return {
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}
