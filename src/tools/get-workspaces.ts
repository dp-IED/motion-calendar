import { getWorkspaces } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

export default async function handler() {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    const response = await getWorkspaces();

    if (response.workspaces.length === 0) {
      return {
        message: "No workspaces found.",
        workspaces: [],
        count: 0,
      };
    }

    // Format workspaces for AI consumption
    const formattedWorkspaces = response.workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
    }));

    return {
      message: `Found ${response.workspaces.length} workspace${response.workspaces.length === 1 ? "" : "s"}.`,
      workspaces: formattedWorkspaces,
      count: response.workspaces.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch workspaces",
    };
  }
}
