export interface Environment {
  id: string;
  name: string;
  variables: string;
  project_id: string | null;
}

export interface SaveEnvironmentPayload {
  id?: string;
  name: string;
  variables: string;
  project_id: string;
}
