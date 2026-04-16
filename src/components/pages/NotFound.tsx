import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-2">Page Not Found</p>
        <p className="text-sm text-muted-foreground mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}