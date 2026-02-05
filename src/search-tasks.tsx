import { List, ActionPanel, Action, Icon, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { getAllTasks } from "./lib/motion-api";
import { hasApiKey } from "./lib/preferences";
import type { Task } from "./types/motion";

export default function SearchTasks() {
  const [searchText, setSearchText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual debounce implementation
  const debouncedSearch = (text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (text.length > 0) {
        searchTasks(text);
      } else {
        setTasks([]);
      }
    }, 500);
  };

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (hasKey) {
      debouncedSearch(searchText);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, hasKey]);

  async function checkApiKey() {
    const keyExists = await hasApiKey();
    setHasKey(keyExists);
  }

  async function searchTasks(query: string, useCache: boolean = true) {
    try {
      setIsLoading(true);
      const allTasks = await getAllTasks({ name: query }, useCache);
      setTasks(allTasks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to search tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setTasks([]);
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
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks by name..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Tasks"
          description="Type a task name to search..."
        />
      ) : tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Tasks Found"
          description={`No tasks found matching "${searchText}"`}
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
              ...(task.dueDate
                ? [
                    {
                      text: new Date(task.dueDate).toLocaleDateString(),
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
                  title="Clear Search"
                  icon={Icon.XMarkCircle}
                  onAction={() => setSearchText("")}
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
