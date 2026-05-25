import { applyPathParams } from "./pathParams";
import {
  applyEnvironmentToDraft,
  substituteVariables,
  urlToTemplateForm,
} from "./substituteVariables";
import type { RequestDraft } from "../types/history";

/** Resolves path params and environment placeholders for export / copy. */
export function resolveExportDraft(
  draft: RequestDraft,
  pathParamValues: Record<string, string>,
  environmentVariables: Record<string, string>,
): RequestDraft {
  const templateUrl = urlToTemplateForm(draft.url, environmentVariables);
  const withPath = {
    ...draft,
    url: applyPathParams(templateUrl, pathParamValues),
  };
  return applyEnvironmentToDraft(withPath, environmentVariables);
}

/** Resolves {{env}} and {path} placeholders in a URL for preview. */
export function resolveRequestUrl(
  url: string,
  pathParamValues: Record<string, string>,
  environmentVariables: Record<string, string>,
): string {
  const templateUrl = urlToTemplateForm(url, environmentVariables);
  const withEnv = substituteVariables(templateUrl, environmentVariables);
  return applyPathParams(withEnv, pathParamValues);
}

/** Base URL segment for template-mode display (with {{base_url}} when applicable). */
export function templateRequestUrl(
  url: string,
  environmentVariables: Record<string, string>,
): string {
  return urlToTemplateForm(url, environmentVariables);
}
