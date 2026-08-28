// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { FeedbackDialog } from "@/feedback/FeedbackDialog";
import { submitFeedback } from "@/feedback/lib/submit";
import type { SubmitResult } from "@/feedback/types";
import { messageHash, useFeedbackStore } from "@/feedback/useFeedbackStore";

function open() {
  render(<FeedbackDialog open onOpenChange={() => {}} />);
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText(/details/i), { target: { value } });
}

function sendButton() {
  return screen.getByRole("button", { name: "Send Feedback" });
}

vi.mock("@/feedback/lib/submit", () => ({ submitFeedback: vi.fn() }));

const VALID = "This is a long enough message to send";

beforeEach(() => {
  vi.clearAllMocks();
  useFeedbackStore.setState({
    draft: { category: "bug", message: "", includeDiagnostics: true },
    lastSentAt: 0,
    lastSentHash: "",
  });
});

describe("FeedbackDialog", () => {
  it("replaces the form with a progress bar while the request is in flight", async () => {
    let resolve!: (result: SubmitResult) => void;
    vi.mocked(submitFeedback).mockReturnValue(
      new Promise<SubmitResult>((settle) => {
        resolve = settle;
      }),
    );
    open();
    type(VALID);

    fireEvent.click(sendButton());

    expect(
      await screen.findByRole("progressbar", { name: /sending feedback/i }),
    ).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByLabelText(/details/i));
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    resolve({ ok: true, id: "ref-live" });
    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy reference ref-live/i })).toBeInTheDocument();
  });

  it("hands the bar back to the form with the error when the send fails", async () => {
    vi.mocked(submitFeedback).mockResolvedValue({
      ok: false,
      retryable: true,
      message: "Couldn’t reach us just now.",
    });
    open();
    type(VALID);

    fireEvent.click(sendButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t reach us/i);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByLabelText(/details/i)).toHaveValue(VALID);
    expect(useFeedbackStore.getState().draft.message).toBe(VALID);
    expect(sendButton()).not.toHaveAttribute("aria-disabled");
  });

  it("keeps send unavailable until there is something worth sending", () => {
    open();
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");

    type(VALID);
    expect(sendButton()).not.toHaveAttribute("aria-disabled");
  });

  it("waits for the first keystroke before nagging about length", () => {
    open();
    expect(screen.queryByText(/a sentence or two is plenty/i)).not.toBeInTheDocument();

    type("short");
    expect(screen.getByText(/a sentence or two is plenty/i)).toBeInTheDocument();
  });

  it("offers the categories as one radio group, not three toggles", () => {
    open();
    const group = screen.getByRole("radiogroup", { name: /context/i });

    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /bug report/i })).toBeChecked();
  });

  it("records the category the user picks", () => {
    open();

    fireEvent.click(screen.getByRole("radio", { name: /feature request/i }));

    expect(useFeedbackStore.getState().draft.category).toBe("idea");
  });

  it("sends only the category, message and diagnostics — never a contact address", async () => {
    vi.mocked(submitFeedback).mockResolvedValue({ ok: true, id: "ref-2" });
    open();
    type(VALID);

    fireEvent.click(sendButton());

    await screen.findByRole("button", { name: "Done" });
    const payload = vi.mocked(submitFeedback).mock.calls[0]?.[0];
    expect(payload).toBeDefined();
    expect(Object.keys(payload ?? {}).sort()).toEqual(["category", "diagnostics", "message"]);
  });

  it("omits diagnostics entirely when the switch is off", async () => {
    vi.mocked(submitFeedback).mockResolvedValue({ ok: true, id: "ref-3" });
    open();
    type(VALID);
    fireEvent.click(screen.getByRole("switch", { name: /include diagnostics/i }));

    fireEvent.click(sendButton());

    await screen.findByRole("button", { name: "Done" });
    expect(vi.mocked(submitFeedback).mock.calls[0]?.[0]).not.toHaveProperty("diagnostics");
  });

  it("keeps the diagnostics payload hidden until asked for", () => {
    open();
    expect(screen.queryByText("Lux version")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /what would be sent/i }));
    expect(screen.getByText("Lux version")).toBeInTheDocument();
  });

  it("shows a single close control, not one stacked on another", () => {
    open();
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1);
  });

  it("counts down on the button instead of failing the press during the cooldown", () => {
    useFeedbackStore.setState({ lastSentAt: Date.now() - 20_000 });
    open();
    type(VALID);

    const send = screen.getByRole("button", { name: /wait \d+s/i });
    expect(send).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refuses a repeat of the message it just sent, without calling it an error", () => {
    useFeedbackStore.setState({
      lastSentAt: Date.now() - 90_000,
      lastSentHash: messageHash(VALID),
    });
    open();
    type(VALID);

    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/already sent this one/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so when it restores a draft, and can throw it away", () => {
    useFeedbackStore.setState({
      draft: { category: "bug", message: VALID, includeDiagnostics: true },
    });
    open();
    expect(screen.getByText(/picked up where you left off/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start over/i }));

    expect(useFeedbackStore.getState().draft.message).toBe("");
  });
});
