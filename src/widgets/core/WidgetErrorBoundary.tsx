import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { StateMessage } from "@/components/StateMessage";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type WidgetErrorBoundaryProps = {
  children: ReactNode;
};

type WidgetErrorBoundaryState = {
  hasError: boolean;
  attempt: number;
};

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<WidgetErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Widget crashed", error, info.componentStack);
  }

  private readonly reset = () =>
    this.setState((previous) => ({ hasError: false, attempt: previous.attempt + 1 }));

  render() {
    if (!this.state.hasError) {
      return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    }

    return (
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        message="This widget hit an error."
        action={
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        }
      />
    );
  }
}
