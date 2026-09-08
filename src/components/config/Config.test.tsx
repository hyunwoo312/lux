// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";
import {
  ConfigMultiToggle,
  ConfigRow,
  ConfigSegmented,
  ConfigDisclosure,
  ConfigSubRow,
} from "@/components/config/Config";

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

describe("ConfigMultiToggle", () => {
  it("refuses to deselect the last chosen option, rather than ignoring the click", () => {
    const onChange = vi.fn();
    render(
      <ConfigMultiToggle
        label="Sources"
        values={["light"]}
        options={OPTIONS}
        minSelected={1}
        onChange={onChange}
      />,
    );

    const last = screen.getByRole("button", { name: "Light" });
    expect(last).toBeDisabled();
    fireEvent.click(last);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dark" })).toBeEnabled();
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

  it("keeps every option at its own width on one line, truncating rather than stretching", () => {
    renderLine();
    const group = screen.getByRole("radiogroup", { name: "Filter" });
    expect(group).toHaveClass("flex-nowrap");
    expect(group).not.toHaveClass("w-full");
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass("min-w-0");
    expect(screen.getByRole("radio", { name: "All" })).not.toHaveClass("flex-1");
    expect(screen.getByText("Issues")).toHaveClass("truncate");
    expect(screen.getByText("Pull requests")).toHaveClass("truncate");
  });

  it("still wraps by default, so every other widget is untouched", () => {
    render(<ConfigSegmented label="Filter" value="all" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toHaveClass("flex-wrap");
  });
});

describe("ConfigDisclosure", () => {
  it("keeps its contents out of the way until asked", () => {
    render(
      <ConfigDisclosure title="Captions">
        <p>Inner detail</p>
      </ConfigDisclosure>,
    );

    expect(screen.queryByText("Inner detail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /captions/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reveals and hides its contents on click", () => {
    render(
      <ConfigDisclosure title="Captions">
        <p>Inner detail</p>
      </ConfigDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /captions/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Inner detail")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText("Inner detail")).not.toBeInTheDocument();
  });

  it("can start open when the contents matter more than the space", () => {
    render(
      <ConfigDisclosure title="Captions" defaultOpen>
        <p>Inner detail</p>
      </ConfigDisclosure>,
    );

    expect(screen.getByText("Inner detail")).toBeInTheDocument();
  });
});

describe("ConfigSubRow", () => {
  it("puts a disabled row out of keyboard reach and leaves an enabled one interactive", () => {
    render(
      <>
        <ConfigSubRow
          title="Interval"
          disabled
          control={<Switch aria-label="Rotate on a timer" onCheckedChange={vi.fn()} />}
        />
        <ConfigSubRow
          title="Captions"
          control={<Switch aria-label="Show captions" onCheckedChange={vi.fn()} />}
        />
      </>,
    );

    expect(screen.getByText("Interval").closest("[inert]")).not.toBeNull();
    expect(screen.getByText("Captions").closest("[inert]")).toBeNull();
  });
});

describe("ConfigRow", () => {
  it("names a bare control after the row's title, and leaves a labelled one alone", () => {
    render(
      <>
        <ConfigRow title="Grid lines" control={<Switch />} />
        <ConfigRow title="Reset all settings" control={<button type="button">Reset</button>} />
      </>,
    );
    expect(screen.getByRole("switch", { name: "Grid lines" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });
});
