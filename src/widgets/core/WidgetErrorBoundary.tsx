import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type WidgetErrorBoundaryProps = {
  children: ReactNode;
};

type WidgetErrorBoundaryState = {
  hasError: boolean;
};

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  private readonly reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center">
        <TriangleAlert className="text-muted-foreground/60 size-6" aria-hidden />
        <p className="text-muted-foreground max-w-[34ch] text-sm text-balance">
          This widget hit an error.
        </p>
        <Button size="sm" variant="ghost" onClick={this.reset}>
          Reload
        </Button>
      </div>
    );
  }
}
