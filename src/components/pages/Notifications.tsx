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
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { cn } from "@/lib/utils";

interface Notification {
  notification_id: number;
  type: "out_of_stock" | "order_completed" | "stock_movement" | "sales_forecast" | "new_user" | "system_update";
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const count = notifications.filter((n) => !n.is_read).length;
    window.dispatchEvent(new CustomEvent("invensight_notifications_updated", { detail: { unreadCount: count } }));
  }, [notifications]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedNotifications = filtered.slice(startIndex, startIndex + itemsPerPage);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "out_of_stock":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          border: "border-red-500/20 dark:border-red-500/30",
        };
      case "order_completed":
        return {
          icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
          border: "border-emerald-500/20 dark:border-emerald-500/30",
        };
      case "stock_movement":
        return {
          icon: <Package className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
          border: "border-border/50",
        };
      case "sales_forecast":
        return {
          icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
          border: "border-amber-500/20 dark:border-amber-500/30",
        };
      case "new_user":
        return {
          icon: <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
          border: "border-border/50",
        };
      case "system_update":
        return {
          icon: <Bell className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
          border: "border-border/50",
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-muted-foreground" />,
          border: "border-border/50",
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wider font-semibold">
              You have <span className="font-mono text-foreground font-bold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0 || notifications.length === 0}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors py-2 px-4 shadow-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-2" />
              Mark All as Read
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAll} 
              disabled={notifications.length === 0}
              className="text-xs font-bold uppercase tracking-widest text-red-650 hover:bg-red-500/5 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300 border border-border/50 rounded-lg transition-colors py-2 px-4 shadow-xs"
            >
              <Trash className="w-3.5 h-3.5 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Notifications</span>
          </div>
          <div className="flex bg-muted/20 p-1 rounded-lg border border-border/50 shadow-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                filter === "all"
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              All <span className="font-mono">({notifications.length})</span>
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                filter === "unread"
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              Unread <span className="font-mono">({unreadCount})</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-3 mt-2">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground/60 font-mono text-xs uppercase tracking-widest">
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-dashed border-border/80 flex flex-col items-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">All caught up!</h3>
              <p className="text-xs text-muted-foreground/75 mt-1">You don't have any notifications right now.</p>
            </div>
          ) : (
            paginatedNotifications.map((notification) => {
              const styles = getTypeStyles(notification.type);
              return (
                <div 
                  key={notification.notification_id} 
                  className={cn(
                    "bg-card rounded-lg transition-all duration-200 border flex items-start justify-between p-4 group",
                    notification.is_read 
                      ? "border-border/30 opacity-60 hover:opacity-90" 
                      : cn("border-border/70 shadow-xs", styles.border)
                  )}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "p-2.5 rounded-lg flex-shrink-0 bg-muted/45 border border-border/40 text-muted-foreground flex items-center justify-center",
                      notification.is_read && "opacity-50"
                    )}>
                      {styles.icon}
                    </div>
                    
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link 
                           to={notification.link || "#"} 
                           className={cn(
                             "font-bold text-xs uppercase tracking-wide transition-colors",
                             notification.is_read 
                               ? "text-muted-foreground hover:text-foreground" 
                               : "text-foreground hover:text-zinc-600 dark:hover:text-zinc-400"
                           )}
                        >
                          {notification.title}
                        </Link>
                        {!notification.is_read && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-950 dark:text-zinc-50 font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50" />
                            Unread
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs leading-relaxed mt-0.5",
                        notification.is_read ? "text-muted-foreground/80" : "text-muted-foreground"
                      )}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50 font-mono mt-2 uppercase tracking-wide">
                        <span>{formatTime(notification.created_at)}</span>
                        <span>•</span>
                        <span>ID: {notification.notification_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-4 self-center md:self-start">
                    {!notification.is_read && (
                      <button 
                        onClick={() => markAsRead(notification.notification_id)}
                        className="p-1.5 text-zinc-600 hover:bg-muted dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-md transition-colors border border-border/40 cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.notification_id)}
                      className="p-1.5 text-red-650 hover:bg-red-500/5 dark:text-red-400 rounded-md transition-colors border border-border/40 cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="bg-card rounded-lg border border-border/55 overflow-hidden mt-4 shadow-xs">
            <OrdersStyleTablePagination
              itemCount={filtered.length}
              currentPage={activePage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}
