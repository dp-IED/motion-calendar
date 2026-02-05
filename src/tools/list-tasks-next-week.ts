import { getAllTasks } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";
import { nextWeekTasksCache } from "../lib/cache";

function getNextWeekDateRange(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
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

export default async function handler() {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    // Get next week's date range
    const dateRange = getNextWeekDateRange();
    const cacheKey = `${dateRange.start}_${dateRange.end}`;

    // Check cache first
    const cached = nextWeekTasksCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all tasks (paginated)
    const allTasks = await getAllTasks({});

    // Filter tasks by next week's date range - check chunks first (actual scheduled time blocks)
    const nextWeekTasks = allTasks.filter((task) => {
      // Check chunks first (actual scheduled time blocks)
      if (task.chunks && task.chunks.length > 0) {
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

    if (nextWeekTasks.length === 0) {
      return {
        message: "No tasks scheduled for next week.",
        tasks: [],
        count: 0,
      };
    }

    // Format tasks for AI consumption
    const formattedTasks = nextWeekTasks.map((task) => ({
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
      message: `Found ${nextWeekTasks.length} task${nextWeekTasks.length === 1 ? "" : "s"} scheduled for next week.`,
      tasks: formattedTasks,
      count: nextWeekTasks.length,
    };

    // Cache the result
    nextWeekTasksCache.set(cacheKey, result);

    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch next week's tasks",
    };
  }
}
