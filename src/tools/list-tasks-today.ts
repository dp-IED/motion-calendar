import { getAllTasks } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

export default async function handler() {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Fetch all tasks (paginated)
    const allTasks = await getAllTasks({});

    // Filter tasks by today's date - check chunks first (actual scheduled time blocks)
    const todayTasks = allTasks.filter((task) => {
      // Check chunks first (actual scheduled time blocks)
      if (task.chunks && task.chunks.length > 0) {
        return task.chunks.some((chunk) => {
          if (!chunk.scheduledStart) return false;
          const chunkDate = chunk.scheduledStart.split("T")[0];
          return chunkDate === today;
        });
      }
      
      // Fall back to scheduledStart if no chunks
      if (task.scheduledStart) {
        const taskDate = task.scheduledStart.split("T")[0];
        return taskDate === today;
      }
      
      // Last resort: use dueDate
      if (task.dueDate) {
        const taskDate = task.dueDate.split("T")[0];
        return taskDate === today;
      }
      
      return false;
    });

    if (todayTasks.length === 0) {
      return {
        message: "No tasks due today.",
        tasks: [],
        count: 0,
      };
    }

    // Format tasks for AI consumption
    const formattedTasks = todayTasks.map((task) => ({
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

    return {
      message: `Found ${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} due today.`,
      tasks: formattedTasks,
      count: todayTasks.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch today's tasks",
    };
  }
}
