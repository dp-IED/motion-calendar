import { getAllTasks } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

interface SearchTasksParams {
  query: string;
}

export default async function handler(params: SearchTasksParams) {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    if (!params.query || params.query.trim().length === 0) {
      return {
        error: "Search query is required. Provide a task name to search for.",
      };
    }

    // Search tasks by name (fetch all pages)
    const allTasks = await getAllTasks({ name: params.query.trim() });

    if (allTasks.length === 0) {
      return {
        message: `No tasks found matching "${params.query}".`,
        tasks: [],
        count: 0,
      };
    }

    // Format tasks for AI consumption
    const formattedTasks = allTasks.map((task) => ({
      id: task.id,
      name: task.name,
      priority: task.priority,
      status: task.status.name,
      completed: task.completed,
      project: task.project?.name || null,
      workspace: task.workspace.name,
      duration: task.duration,
      dueDate: task.dueDate,
      scheduledStart: task.scheduledStart,
      scheduledEnd: task.scheduledEnd,
      chunks: task.chunks?.map((chunk) => ({
        id: chunk.id,
        duration: chunk.duration,
        scheduledStart: chunk.scheduledStart,
        scheduledEnd: chunk.scheduledEnd,
        completedTime: chunk.completedTime,
        isFixed: chunk.isFixed,
      })) || [],
      description: task.description ? task.description.substring(0, 200) : null,
    }));

    return {
      message: `Found ${allTasks.length} task${allTasks.length === 1 ? "" : "s"} matching "${params.query}".`,
      tasks: formattedTasks,
      count: allTasks.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to search tasks",
    };
  }
}
