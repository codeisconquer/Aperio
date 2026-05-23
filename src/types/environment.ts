export interface Environment {
  id: string;
  name: string;
  variables: string;
}

export interface SaveEnvironmentPayload {
  id?: string;
  name: string;
  variables: string;
}
