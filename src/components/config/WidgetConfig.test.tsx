// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  WidgetConfigDisclosure,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function renderSegmented(onChange: (value: string, origin?: { x: number; y: number }) => void) {
  render(<ConfigSegmented label="Theme" value="light" options={OPTIONS} onChange={onChange} />);
  return screen.getByRole("radio", { name: "Dark" });
}

describe("ConfigSegmented", () => {
  it("reports the chosen option", () => {
    const onChange = vi.fn();
    fireEvent.click(renderSegmented(onChange));
    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("refuses a click on an option marked unavailable, rather than silently ignoring it", () => {
    const onChange = vi.fn();
    render(
      <ConfigSegmented
        label="Theme"
        value="light"
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "mixed", label: "Mixed", disabled: true },
        ]}
        onChange={onChange}
      />,
    );

    const mixed = screen.getByRole("radio", { name: "Mixed" });
    expect(mixed).toBeDisabled();
    fireEvent.click(mixed);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ConfigSegmented fit="line"', () => {
  const OPTIONS = [
    { value: "all", label: "All" },
    { value: "reviews", label: "Pull requests" },
    { value: "issues", label: "Issues" },
    { value: "notifications", label: "Notifications" },
  ];

  function renderLine(value = "reviews") {
    return render(
      <ConfigSegmented
        fit="line"
        label="Filter"
        value={value}
        options={OPTIONS}
        onChange={() => {}}
      />,
    );
  }

  it("gives the chosen option room and lets the others give way on one line", () => {
    renderLine();
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toHaveClass("flex-nowrap");
    expect(screen.getByRole("radio", { name: "Pull requests" })).toHaveClass("shrink-0");
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass("flex-1");
    expect(screen.getByText("Issues")).toHaveClass("truncate");
    expect(screen.getByText("Pull requests")).not.toHaveClass("truncate");
  });

  it("still wraps by default, so every other widget is untouched", () => {
    render(<ConfigSegmented label="Filter" value="all" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toHaveClass("flex-wrap");
  });
});

describe("WidgetConfigDisclosure", () => {
  it("keeps its contents out of the way until asked", () => {
    render(
      <WidgetConfigDisclosure title="Captions">
        <p>Inner detail</p>
      </WidgetConfigDisclosure>,
    );

    expect(screen.queryByText("Inner detail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /captions/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reveals and hides its contents on click", () => {
    render(
      <WidgetConfigDisclosure title="Captions">
        <p>Inner detail</p>
      </WidgetConfigDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /captions/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Inner detail")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText("Inner detail")).not.toBeInTheDocument();
  });

  it("can start open when the contents matter more than the space", () => {
    render(
      <WidgetConfigDisclosure title="Captions" defaultOpen>
        <p>Inner detail</p>
      </WidgetConfigDisclosure>,
    );

    expect(screen.getByText("Inner detail")).toBeInTheDocument();
  });
});

describe("WidgetConfigSubItem", () => {
  it("puts a disabled row out of keyboard reach and leaves an enabled one interactive", () => {
    render(
      <>
        <WidgetConfigSubItem
          title="Interval"
          disabled
          control={<Switch aria-label="Rotate on a timer" onCheckedChange={vi.fn()} />}
        />
        <WidgetConfigSubItem
          title="Captions"
          control={<Switch aria-label="Show captions" onCheckedChange={vi.fn()} />}
        />
      </>,
    );

    expect(screen.getByText("Interval").closest("[inert]")).not.toBeNull();
    expect(screen.getByText("Captions").closest("[inert]")).toBeNull();
  });
});
