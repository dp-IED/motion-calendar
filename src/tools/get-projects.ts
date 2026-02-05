import { getProjects } from "../lib/motion-api";
import { hasApiKey } from "../lib/preferences";

interface GetProjectsParams {
  workspaceId: string;
}

export default async function handler(params: GetProjectsParams) {
  try {
    // Check if API key exists
    if (!(await hasApiKey())) {
      return {
        error: "API key not configured. Please set your Motion API key in preferences.",
      };
    }

    if (!params.workspaceId || params.workspaceId.trim().length === 0) {
      return {
        error: "workspaceId is required. Use get-workspaces tool first to get available workspace IDs.",
      };
    }

    const response = await getProjects(params.workspaceId.trim());

    if (response.projects.length === 0) {
      return {
        message: `No projects found in workspace ${params.workspaceId}.`,
        projects: [],
        count: 0,
        workspaceId: params.workspaceId,
      };
    }

    // Format projects for AI consumption
    const formattedProjects = response.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description || null,
      workspaceId: project.workspaceId,
    }));

    return {
      message: `Found ${response.projects.length} project${response.projects.length === 1 ? "" : "s"} in workspace ${params.workspaceId}.`,
      projects: formattedProjects,
      count: response.projects.length,
      workspaceId: params.workspaceId,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch projects",
    };
  }
}
