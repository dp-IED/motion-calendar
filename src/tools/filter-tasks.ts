import { getAllTasks } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

interface FilterTasksParams {
  priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  dateRange?: "today" | "thisWeek" | "nextWeek" | "thisMonth" | "nextMonth";
  status?: string;
  workspaceId?: string;
  projectId?: string;
  label?: string;
  name?: string;
}

function getDateRange(dateRange: string): { start: string; end: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (dateRange) {
    case "today": {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return {
        start: today.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "thisWeek": {
      const start = new Date(today);
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "nextWeek": {
      const start = new Date(today);
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      start.setDate(diff + 7); // Next week
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "nextMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      end.setHours(23, 59, 59, 999);
      
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    default:
      return null;
  }
}

export default async function handler(params: FilterTasksParams) {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    // Build query parameters
    const queryParams: any = {};

    if (params.name) {
      queryParams.name = params.name;
    }

    if (params.priority) {
      queryParams.priority = params.priority;
    }

    if (params.workspaceId) {
      queryParams.workspaceId = params.workspaceId;
    }

    if (params.projectId) {
      queryParams.projectId = params.projectId;
    }

    if (params.label) {
      queryParams.label = params.label;
    }

    if (params.status) {
      queryParams.status = [params.status];
    }

    // Fetch all tasks (paginated)
    const allTasks = await getAllTasks(queryParams);

    // Filter by date range if specified
    let filteredTasks = allTasks;

    if (params.dateRange) {
      const dateRange = getDateRange(params.dateRange);
      if (dateRange) {
        filteredTasks = filteredTasks.filter((task) => {
          // Check chunks first (actual scheduled time blocks)
          if (task.chunks && task.chunks.length > 0) {
            // Check if any chunk falls within the date range
            return task.chunks.some((chunk) => {
              if (!chunk.scheduledStart) return false;
              const chunkDate = chunk.scheduledStart.split("T")[0];
              return chunkDate >= dateRange.start && chunkDate <= dateRange.end;
            });
          }
          
          // Fall back to scheduledStart if no chunks
          if (task.scheduledStart) {
            const taskDate = task.scheduledStart.split("T")[0];
            return taskDate >= dateRange.start && taskDate <= dateRange.end;
          }
          
          // Last resort: use dueDate
          if (task.dueDate) {
            const taskDate = task.dueDate.split("T")[0];
            return taskDate >= dateRange.start && taskDate <= dateRange.end;
          }
          
          return false;
        });
      }
    }

    // Filter by priority if specified (in case API doesn't support it directly)
    if (params.priority) {
      filteredTasks = filteredTasks.filter((task) => task.priority === params.priority);
    }

    if (filteredTasks.length === 0) {
      const filters = [];
      if (params.priority) filters.push(`priority: ${params.priority}`);
      if (params.dateRange) filters.push(`date: ${params.dateRange}`);
      if (params.status) filters.push(`status: ${params.status}`);
      
      return {
        message: `No tasks found${filters.length > 0 ? ` with filters: ${filters.join(", ")}` : ""}.`,
        tasks: [],
        count: 0,
      };
    }

    // Format tasks for AI consumption
    const formattedTasks = filteredTasks.map((task) => ({
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

    const filters = [];
    if (params.priority) filters.push(`priority: ${params.priority}`);
    if (params.dateRange) filters.push(`date: ${params.dateRange}`);
    if (params.status) filters.push(`status: ${params.status}`);

    return {
      message: `Found ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"}${filters.length > 0 ? ` with filters: ${filters.join(", ")}` : ""}.`,
      tasks: formattedTasks,
      count: filteredTasks.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to filter tasks",
    };
  }
}
