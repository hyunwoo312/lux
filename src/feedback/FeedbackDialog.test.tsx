// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackDialog } from "@/feedback/FeedbackDialog";
import { useFeedbackStore } from "@/feedback/useFeedbackStore";

function open() {
  render(<FeedbackDialog open onOpenChange={() => {}} />);
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText(/your message/i), { target: { value } });
}

const VALID = "This is a long enough message to send";

beforeEach(() => {
  vi.clearAllMocks();
  useFeedbackStore.setState({
    draft: { category: "bug", message: "", contact: "", includeDiagnostics: false },
    lastSentAt: 0,
    lastSentHash: "",
  });
});

describe("FeedbackDialog", () => {
  it("keeps send unavailable until there is something worth sending", () => {
    open();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    type(VALID);
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("explains the minimum instead of silently disabling the button", () => {
    open();
    expect(screen.getByText(/a sentence or two is plenty/i)).toBeInTheDocument();
  });

  it("offers the categories as one radio group, not three toggles", () => {
    open();
    const group = screen.getByRole("radiogroup", { name: /what kind of feedback/i });

    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /something's broken/i })).toBeChecked();
  });

  it("moves between categories with the arrow keys", () => {
    open();
    const bug = screen.getByRole("radio", { name: /something's broken/i });

    fireEvent.keyDown(bug, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /i have an idea/i })).toBeChecked();
    expect(useFeedbackStore.getState().draft.category).toBe("idea");
  });

  it("wraps around at the end of the group", () => {
    open();
    fireEvent.keyDown(screen.getByRole("radio", { name: /something's broken/i }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("radio", { name: /something else/i })).toBeChecked();
  });

  it("blocks sending on a malformed email, since a typo costs the reply", () => {
    open();
    type(VALID);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });

    expect(screen.getByText(/doesn't look like an email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("accepts a well-formed address, and an empty one", () => {
    open();
    type(VALID);
    const email = screen.getByLabelText(/email/i);

    fireEvent.change(email, { target: { value: "me@example.com" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();

    fireEvent.change(email, { target: { value: "" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("keeps the diagnostics payload hidden until asked for", () => {
    open();
    expect(screen.queryByText(/"widgets"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /what would be sent/i }));
    expect(screen.getByText(/"widgets"/)).toBeInTheDocument();
  });

  it("leaves diagnostics off by default", () => {
    open();
    expect(screen.getByRole("switch", { name: /include diagnostics/i })).not.toBeChecked();
  });
});
