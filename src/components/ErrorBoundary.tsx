import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.error?.message.includes("useNavigate")) {
          // If it's the specific router context error, provide a clear message
          return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
              <div className="rounded-2xl bg-white p-8 shadow-xl max-w-md">
                <div className="mb-4 text-red-500">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Router Context Error</h2>
                <p className="text-gray-600 mb-6 font-sans">
                  The application is experiencing a navigation context error. This is usually caused by a library mismatch. 
                  <br /><br />
                  <span className="text-xs text-gray-400 font-mono">{this.state.error?.message}</span>
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  Reload Application
                </button>
              </div>
            </div>
          );
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
          <div className="rounded-2xl bg-white p-10 shadow-2xl max-w-lg border border-gray-100">
             <div className="mb-6 w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle />
             </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Something went wrong</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              An unexpected error occurred. We've logged the incident and our team is looking into it.
            </p>
            <div className="flex gap-3">
                <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-100"
                >
                Reload Page
                </button>
                <button
                onClick={() => window.location.href = '/'}
                className="flex-1 rounded-xl bg-gray-100 px-6 py-4 font-bold text-gray-700 transition-all hover:bg-gray-200 hover:scale-[1.02]"
                >
                Back to Home
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AlertCircle() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    )
}
