import { Component, type ReactNode } from "react";
import { StateMessage } from "@/components/StateMessage";
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
      <StateMessage
        icon={TriangleAlert}
        message="This widget hit an error."
        action={
          <Button variant="ghost" onClick={this.reset}>
            Reload
          </Button>
        }
      />
    );
  }
}
