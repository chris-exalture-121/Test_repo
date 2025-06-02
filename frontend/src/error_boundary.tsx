import { Alert, Box } from "@canva/app-ui-kit";
import React from "react";

// Define a type for the props in case you want to extend functionality later
type ErrorBoundaryProps = {
  children: React.ReactNode; // Accepts React children
};

// Define a type for the state to manage the error states
type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box paddingTop="2u" paddingEnd="2u">
          <Alert tone="critical" title="Error loading app">
            {this.state.error?.message}
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
