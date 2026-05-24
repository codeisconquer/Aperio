import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import { emptyRequestDraft } from "../../types/history";
import { RequestBuilder } from "./RequestBuilder";

function RequestBuilderHarness({
  onSend,
  pathParams = [],
  initialDraft,
}: {
  onSend: (payload: ReturnType<typeof emptyRequestDraft>) => void;
  pathParams?: string[];
  initialDraft?: ReturnType<typeof emptyRequestDraft>;
}) {
  const [draft, setDraft] = useState(initialDraft ?? emptyRequestDraft());

  return (
    <I18nextProvider i18n={i18n}>
      <RequestBuilder
        draft={draft}
        pathParams={pathParams}
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
});
