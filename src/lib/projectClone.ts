import type { Environment } from "../types/environment";
import type { SwaggerProject } from "../types/swagger";

export function cloneSwaggerProject(
  project: SwaggerProject,
  titleSuffix: string,
): SwaggerProject {
  return {
    ...project,
    id: crypto.randomUUID(),
    title: `${project.title} ${titleSuffix}`.trim(),
    endpoints: project.endpoints.map((endpoint) => ({ ...endpoint })),
  };
}

export function cloneEnvironmentName(name: string, suffix: string): string {
  return `${name} ${suffix}`.trim();
}

export function environmentCopyPayload(
  source: Environment,
  projectId: string,
  nameSuffix: string,
) {
  return {
    name: cloneEnvironmentName(source.name, nameSuffix),
    variables: source.variables,
    project_id: projectId,
  };
}
