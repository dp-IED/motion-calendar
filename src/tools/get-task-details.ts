import { getTask } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

interface GetTaskDetailsParams {
  taskId: string;
}

export default async function handler(params: GetTaskDetailsParams) {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    if (!params.taskId || params.taskId.trim().length === 0) {
      return {
        error: "Task ID is required. Provide a Motion task ID (format: tk_...).",
      };
    }

    // Validate task ID format
    if (!params.taskId.startsWith("tk_")) {
      return {
        error: "Invalid task ID format. Task IDs should start with 'tk_' (e.g., tk_abc123).",
      };
    }

    // Fetch task details
    const task = await getTask(params.taskId.trim());

    // Format task for AI consumption
    return {
      message: `Task details for "${task.name}"`,
      task: {
        id: task.id,
        name: task.name,
        description: task.description,
        priority: task.priority,
        status: task.status.name,
        completed: task.completed,
        dueDate: task.dueDate,
        duration: task.duration,
        project: task.project
          ? {
              id: task.project.id,
              name: task.project.name,
            }
          : null,
        workspace: {
          id: task.workspace.id,
          name: task.workspace.name,
        },
        assignees: task.assignees.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
        })),
        labels: task.labels.map((l) => l.name),
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd,
        schedulingIssue: task.schedulingIssue,
        createdTime: task.createdTime,
        updatedTime: task.updatedTime,
      },
      url: `https://app.usemotion.com/web/calendar?taskId=${task.id}`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return {
        error: `Task with ID "${params.taskId}" not found. Please verify the task ID is correct.`,
      };
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch task details",
    };
  }
}
