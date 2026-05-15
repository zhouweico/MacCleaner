import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-macos-content-light">
            <div className="text-center">
              <p className="text-lg font-medium text-macos-text-primary">渲染出错</p>
              <p className="mt-2 text-xs text-macos-text-tertiary">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-macos-accent px-4 py-2 text-sm text-white hover:bg-macos-accent-hover"
              >
                重新加载
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
