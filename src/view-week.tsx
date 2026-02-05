import { List, ActionPanel, Action, Icon, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllTasks } from "./lib/motion-api";
import { hasApiKey } from "./lib/preferences";
import type { Task } from "./types/motion";

export default function ViewWeek() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (hasKey) {
      loadWeekTasks();
    }
  }, [hasKey]);

  async function checkApiKey() {
    const keyExists = await hasApiKey();
    setHasKey(keyExists);
    if (!keyExists) {
      setIsLoading(false);
    }
  }

  function getThisWeekDateRange(): { start: string; end: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

  async function loadWeekTasks(useCache: boolean = true) {
    try {
      setIsLoading(true);
      const dateRange = getThisWeekDateRange();
      const allTasks = await getAllTasks({}, useCache);
      
      // Filter tasks by this week's date range - check chunks first (actual scheduled time blocks)
      const weekTasks = allTasks.filter((task) => {
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

      setTasks(weekTasks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openTaskInMotion(taskId: string) {
    open(`https://app.usemotion.com/web/calendar?taskId=${taskId}`);
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "ASAP":
        return "#FF0000";
      case "HIGH":
        return "#FF6B00";
      case "MEDIUM":
        return "#FFA500";
      case "LOW":
        return "#008000";
      default:
        return "#666666";
    }
  }

  function formatDuration(duration: string | number): string {
    if (typeof duration === "string") {
      if (duration === "NONE" || duration === "REMINDER") {
        return duration;
      }
      const num = parseInt(duration, 10);
      return isNaN(num) ? duration : `${num} min`;
    }
    return `${duration} min`;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  if (hasKey === false) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="API Key Required"
          description="Please configure your Motion API key in preferences."
          actions={
            <ActionPanel>
              <Action.Open
                title="Open Preferences"
                target="raycast://extensions/colleserre/motion-calendar/preferences"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search this week's tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Tasks This Week"
          description="You have no tasks scheduled for this week."
        />
      ) : (
        tasks.map((task) => {
          // Get the scheduled date from chunks, scheduledStart, or dueDate
          const scheduledDate = task.chunks?.[0]?.scheduledStart || task.scheduledStart || task.dueDate;
          
          return (
            <List.Item
              key={task.id}
              title={task.name}
              subtitle={task.project?.name || task.workspace.name}
              accessories={[
                {
                  text: task.status.name,
                  icon: task.completed ? Icon.CheckCircle : Icon.Circle,
                },
                {
                  text: task.priority,
                  icon: { source: Icon.Circle, tintColor: getPriorityColor(task.priority) },
                },
                ...(scheduledDate
                  ? [
                      {
                        text: formatDate(scheduledDate),
                      },
                    ]
                  : []),
                ...(task.duration
                  ? [
                      {
                        text: formatDuration(task.duration),
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Motion"
                    icon={Icon.Globe}
                    onAction={() => openTaskInMotion(task.id)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadWeekTasks(false)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
