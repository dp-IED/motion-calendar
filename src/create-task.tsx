import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  open,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createTask, getWorkspaces, getProjects } from "./lib/motion-api";
import { hasApiKey } from "./lib/preferences";
import type { Workspace, Project } from "./types/motion";

export default function CreateTask() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const { pop } = useNavigation();

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (hasKey) {
      loadWorkspaces();
    }
  }, [hasKey]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadProjects(selectedWorkspaceId);
    } else {
      setProjects([]);
    }
  }, [selectedWorkspaceId]);

  async function checkApiKey() {
    const keyExists = await hasApiKey();
    setHasKey(keyExists);
    if (!keyExists) {
      setIsLoading(false);
    }
  }

  async function loadWorkspaces() {
    try {
      setIsLoading(true);
      const response = await getWorkspaces();
      setWorkspaces(response.workspaces);
      if (response.workspaces.length > 0) {
        setSelectedWorkspaceId(response.workspaces[0].id);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load workspaces",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProjects(workspaceId: string) {
    try {
      const response = await getProjects(workspaceId);
      setProjects(response.projects);
    } catch (error) {
      // Projects are optional, so we don't show an error
      setProjects([]);
    }
  }

  async function handleSubmit(values: {
    name: string;
    workspaceId: string;
    dueDate?: string;
    duration?: string;
    priority?: string;
    description?: string;
    projectId?: string;
  }) {
    try {
      setIsLoading(true);
      const taskData: any = {
        name: values.name,
        workspaceId: values.workspaceId,
      };

      if (values.dueDate) {
        // Format date as YYYY-MM-DD
        const date = new Date(values.dueDate);
        taskData.dueDate = date.toISOString().split("T")[0];
      }

      // Set duration - required for autoscheduling
      // Default to 30 minutes if not provided
      if (values.duration) {
        taskData.duration = values.duration;
      } else {
        taskData.duration = 30; // 30 minutes default
      }

      if (values.priority) {
        taskData.priority = values.priority;
      }

      if (values.description) {
        taskData.description = values.description;
      }

      if (values.projectId) {
        taskData.projectId = values.projectId;
      }

      // Always enable autoscheduling
      // If dueDate is provided, use it as startDate, otherwise use today
      const startDate = values.dueDate 
        ? new Date(values.dueDate).toISOString().split("T")[0] + "T00:00:00Z"
        : new Date().toISOString().split("T")[0] + "T00:00:00Z";
      
      taskData.autoScheduled = {
        startDate: startDate,
        deadlineType: values.dueDate ? "HARD" : "SOFT",
        schedule: "Work Hours",
      };

      const response = await createTask(taskData);

      if (response.status === "SUCCESS" && response.id) {
        await showToast({
          style: Toast.Style.Success,
          title: "Task Created",
          message: `Task "${values.name}" created successfully`,
        });
        pop();
        // Optionally open the task in Motion
        if (response.id) {
          open(`https://app.usemotion.com/web/calendar?taskId=${response.id}`);
        }
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (hasKey === false) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.Open
              title="Open Preferences"
              target="raycast://extensions/colleserre/motion-calendar/preferences"
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="API Key Required"
          text="Please configure your Motion API key in preferences."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Create Task"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Task Name"
        placeholder="Enter task name"
        defaultValue=""
      />
      <Form.Dropdown
        id="workspaceId"
        title="Workspace"
        defaultValue={selectedWorkspaceId}
        onChange={setSelectedWorkspaceId}
      >
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item
            key={workspace.id}
            value={workspace.id}
            title={workspace.name}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextField
        id="duration"
        title="Duration (minutes)"
        placeholder="e.g., 30"
        info="Enter duration in minutes, or leave empty"
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="MEDIUM">
        <Form.Dropdown.Item value="ASAP" title="ASAP" />
        <Form.Dropdown.Item value="HIGH" title="High" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="LOW" title="Low" />
      </Form.Dropdown>
      {projects.length > 0 && (
        <Form.Dropdown id="projectId" title="Project (Optional)">
          <Form.Dropdown.Item value="" title="None" />
          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        id="description"
        title="Description (Optional)"
        placeholder="Enter task description"
      />
    </Form>
  );
}
