import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import type { Environment } from "../../types/environment";
import { emptyRequestDraft } from "../../types/history";
import { RequestBuilder } from "./RequestBuilder";

function RequestBuilderHarness({
  onSend,
  pathParams = [],
  environmentVariables = {},
  environments = [],
  activeEnvironmentId = null,
  onActiveEnvironmentChange,
  initialDraft,
}: {
  onSend: (payload: ReturnType<typeof emptyRequestDraft>) => void;
  pathParams?: string[];
  environmentVariables?: Record<string, string>;
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  onActiveEnvironmentChange?: (id: string | null) => void;
  initialDraft?: ReturnType<typeof emptyRequestDraft>;
}) {
  const [draft, setDraft] = useState(initialDraft ?? emptyRequestDraft());
  const [activeEnvId, setActiveEnvId] = useState(activeEnvironmentId);

  return (
    <I18nextProvider i18n={i18n}>
      <RequestBuilder
        draft={draft}
        pathParams={pathParams}
        environmentVariables={environmentVariables}
        environments={environments}
        activeEnvironmentId={activeEnvId}
        onActiveEnvironmentChange={
          onActiveEnvironmentChange ?? ((id) => setActiveEnvId(id))
        }
        onDraftChange={setDraft}
        onSend={onSend}
        loading={false}
      />
    </I18nextProvider>
  );
}

describe("RequestBuilder", () => {
  it("renders method, url, and send controls", () => {
    render(<RequestBuilderHarness onSend={vi.fn()} />);
    expect(screen.getByLabelText(/method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("submits the current draft", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<RequestBuilderHarness onSend={onSend} />);

    await user.selectOptions(screen.getByLabelText(/method/i), "POST");
    await user.type(screen.getByLabelText(/url/i), "https://api.example.com/items");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://api.example.com/items",
      }),
    );
  });

  it("replaces path variables before sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <RequestBuilderHarness
        onSend={onSend}
        pathParams={["username"]}
        initialDraft={{
          method: "GET",
          url: "http://example.com/api/v1/users/{username}",
          headers: "",
          body: "",
        }}
      />,
    );

    expect(screen.getByText("Path variables")).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText(/enter value/i),
      "jviebrock",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://example.com/api/v1/users/jviebrock",
      }),
    );
  });

  it("shows environment selector when multiple environments exist", () => {
    const environments: Environment[] = [
      { id: "env-prod", name: "PROD", variables: "{}", project_id: "p1" },
      { id: "env-std", name: "Standard", variables: "{}", project_id: "p1" },
    ];

    render(
      <RequestBuilderHarness
        onSend={vi.fn()}
        environments={environments}
        activeEnvironmentId="env-prod"
      />,
    );

    expect(screen.getByLabelText(/active environment/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PROD" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Standard" })).toBeInTheDocument();
  });

  it("hides environment selector with at most one environment", () => {
    render(
      <RequestBuilderHarness
        onSend={vi.fn()}
        environments={[
          { id: "env-prod", name: "PROD", variables: "{}", project_id: "p1" },
        ]}
        activeEnvironmentId="env-prod"
      />,
    );

    expect(screen.queryByLabelText(/active environment/i)).not.toBeInTheDocument();
  });

  it("toggles between template and resolved URL preview", async () => {
    const user = userEvent.setup();
    render(
      <RequestBuilderHarness
        onSend={vi.fn()}
        environmentVariables={{ base_url: "https://www.test.de" }}
        initialDraft={{
          method: "POST",
          url: "https://www.test.de/connections/test",
          headers: "",
          body: "",
        }}
      />,
    );

    const urlInput = screen.getByLabelText(/url/i) as HTMLInputElement;
    expect(urlInput.value).toBe("{{base_url}}/connections/test");

    await user.click(
      screen.getByRole("button", { name: /resolved url/i }),
    );

    expect((screen.getByLabelText(/url/i) as HTMLInputElement).value).toBe(
      "https://www.test.de/connections/test",
    );
  });
});
