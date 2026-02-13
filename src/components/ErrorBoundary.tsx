import { Component, type ErrorInfo, type ReactNode } from "react";
import { error as logError } from "@tauri-apps/plugin-log";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(
      `Uncaught render error: ${error.message}\n${info.componentStack ?? ""}`,
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex h-screen items-center justify-center bg-white p-8 dark:bg-gray-900">
        <div className="max-w-lg text-center">
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred. You can reload the app to try again.
          </p>
          {isDev && this.state.error && (
            <pre className="mb-6 max-h-48 overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-red-800 dark:bg-red-900/20 dark:text-red-300">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
