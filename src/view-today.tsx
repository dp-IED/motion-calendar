import { List, ActionPanel, Action, Icon, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllTasks } from "./lib/motion-api";
import { hasApiKey } from "./lib/preferences";
import type { Task } from "./types/motion";

export default function ViewToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (hasKey) {
      loadTodayTasks();
    }
  }, [hasKey]);

  async function checkApiKey() {
    const keyExists = await hasApiKey();
    setHasKey(keyExists);
    if (!keyExists) {
      setIsLoading(false);
    }
  }

  async function loadTodayTasks(useCache: boolean = true) {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const allTasks = await getAllTasks({}, useCache);
      
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

      setTasks(todayTasks);
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
    <List isLoading={isLoading} searchBarPlaceholder="Search today's tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Tasks Today"
          description="You have no tasks due today."
        />
      ) : (
        tasks.map((task) => (
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
                  onAction={() => loadTodayTasks(false)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
