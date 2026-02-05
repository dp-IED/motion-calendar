import { getAllTasks } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";
import { tomorrowTasksCache } from "../lib/cache";

export default async function handler() {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Check cache first
    const cached = tomorrowTasksCache.get(tomorrowStr);
    if (cached) {
      return cached;
    }

    // Fetch all tasks (paginated)
    const allTasks = await getAllTasks({});

    // Filter tasks by tomorrow's date - check chunks first (actual scheduled time blocks)
    const tomorrowTasks = allTasks.filter((task) => {
      // Check chunks first (actual scheduled time blocks)
      if (task.chunks && task.chunks.length > 0) {
        return task.chunks.some((chunk) => {
          if (!chunk.scheduledStart) return false;
          const chunkDate = chunk.scheduledStart.split("T")[0];
          return chunkDate === tomorrowStr;
        });
      }
      
      // Fall back to scheduledStart if no chunks
      if (task.scheduledStart) {
        const taskDate = task.scheduledStart.split("T")[0];
        return taskDate === tomorrowStr;
      }
      
      // Last resort: use dueDate
      if (task.dueDate) {
        const taskDate = task.dueDate.split("T")[0];
        return taskDate === tomorrowStr;
      }
      
      return false;
    });

    if (tomorrowTasks.length === 0) {
      return {
        message: "No tasks scheduled for tomorrow.",
        tasks: [],
        count: 0,
      };
    }

    // Format tasks for AI consumption
    const formattedTasks = tomorrowTasks.map((task) => ({
      id: task.id,
      name: task.name,
      priority: task.priority,
      status: task.status.name,
      completed: task.completed,
      project: task.project?.name || null,
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

    const result = {
      message: `Found ${tomorrowTasks.length} task${tomorrowTasks.length === 1 ? "" : "s"} scheduled for tomorrow.`,
      tasks: formattedTasks,
      count: tomorrowTasks.length,
    };

    // Cache the result
    tomorrowTasksCache.set(tomorrowStr, result);

    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch tomorrow's tasks",
    };
  }
}
