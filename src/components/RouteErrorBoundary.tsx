import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();
  let errorMessage = "An unexpected error occurred.";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText || errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-6 text-center font-sans dark:bg-gray-950">
      <div className="rounded-3xl bg-card bg-background p-10 shadow-2xl max-w-lg border border-border dark:border-gray-800">
        <div className="mb-6 w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-100 dark:shadow-none">
          <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-3xl font-black text-foreground text-foreground mb-2 tracking-tight">
          Application Error
        </h1>
        <p className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">
          Status Code: {errorStatus}
        </p>
        
        <div className="bg-muted/50 bg-card/50 rounded-xl p-4 mb-8 text-left border border-border border-border">
          <p className="text-xs font-mono text-muted-foreground/70 uppercase mb-1">Error Details</p>
          <p className="text-muted-foreground dark:text-gray-300 font-medium break-words">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-white transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-100 dark:shadow-none"
          >
            <RefreshCcw className="w-5 h-5" />
            Reload Page
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted bg-card px-6 py-4 font-bold text-muted-foreground dark:text-gray-300 transition-all hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-[1.02]"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground/70 font-medium">
        InvenSight v1.0 · Secured Session
      </p>
    </div>
  );
}
