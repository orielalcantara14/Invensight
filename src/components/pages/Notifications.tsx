import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router";
import { 
  Bell, CheckCheck, Trash, Filter, 
  AlertCircle, ShoppingCart, Package, TrendingUp, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { toast } from "sonner";
import { getSession } from "@/auth/session";

interface Notification {
  notification_id: number;
  type: "out_of_stock" | "order_completed" | "stock_movement" | "sales_forecast" | "new_user";
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function Notifications() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>("/api/notifications/");
      setNotifications(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const clearAll = async () => {
    try {
      await api.delete("/api/notifications/clear-all");
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      toast.error("Failed to mark as read");
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(notifications.filter((n) => n.notification_id !== id));
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === "all" ? notifications : notifications.filter((n) => !n.is_read);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "out_of_stock":
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          bg: "bg-red-50",
          border: "border-red-200",
        };
      case "order_completed":
        return {
          icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />,
          bg: "bg-emerald-50",
          border: "border-emerald-200",
        };
      case "stock_movement":
        return {
          icon: <Package className="w-5 h-5 text-primary" />,
          bg: "bg-primary/10",
          border: "border-blue-200",
        };
      case "sales_forecast":
        return {
          icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
          bg: "bg-orange-50",
          border: "border-orange-200",
        };
      case "new_user":
        return {
          icon: <Users className="w-5 h-5 text-indigo-600" />,
          bg: "bg-indigo-50",
          border: "border-indigo-200",
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-muted-foreground" />,
          bg: "bg-muted/50",
          border: "border-border",
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="w-full h-full p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-foreground" strokeWidth={2.5} />
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Notifications</h1>
            </div>
            <p className="text-slate-500 mt-2">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0 || notifications.length === 0}
              className="text-muted-foreground font-medium"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAll} 
              disabled={notifications.length === 0}
              className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 font-medium"
            >
              <Trash className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center text-sm font-medium text-slate-500">
            <Filter className="w-4 h-4 mr-1.5" />
            Filter:
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "all" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "unread" ? "bg-card text-slate-900 shadow-sm outline border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-3 mt-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading notifications...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed border-slate-300 flex flex-col items-center">
              <Bell className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-slate-500">You don't have any notifications right now.</p>
            </div>
          ) : (
            filtered.map((notification) => {
              const styles = getTypeStyles(notification.type);
              return (
                <div 
                  key={notification.notification_id} 
                  className={`bg-card rounded-xl overflow-hidden transition-all duration-200 border ${
                    notification.is_read ? "border-slate-200 opacity-75" : styles.border
                  } shadow-sm hover:shadow-md flex items-center justify-between p-4 group`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${notification.is_read ? 'bg-slate-100 opacity-60' : styles.bg}`}>
                      {styles.icon}
                    </div>
                    
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link 
                           to={notification.link || "#"} 
                           className={`font-semibold text-base transition-colors ${notification.is_read ? 'text-slate-700' : 'text-slate-900 hover:text-primary'}`}
                        >
                          {notification.title}
                        </Link>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${notification.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center text-xs text-slate-400 font-medium">
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button 
                        onClick={() => markAsRead(notification.notification_id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.notification_id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
