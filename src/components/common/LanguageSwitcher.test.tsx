import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

function renderSwitcher() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>,
  );
}

describe("LanguageSwitcher", () => {
  it("renders language options", () => {
    renderSwitcher();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("switches to German", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.selectOptions(screen.getByRole("combobox"), "de");
    expect(i18n.language.startsWith("de")).toBe(true);
    await user.selectOptions(screen.getByRole("combobox"), "en");
  });
});
