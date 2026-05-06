import { useState, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/config/axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFetchAll } from "@/hooks/useFetchAll";

// ── Types ─────────────────────────────────────────────────────
interface Notification {
  id: number;
  subject: string;
  body: string;
  officeId: number;
  office: string | null;
  senderId: number;
  sender: string | null;
  isRead: boolean;
}

// ── Component ─────────────────────────────────────────────────────
export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ── Data Fetching ───────────────────────────────────────────────
  // We use useFetchAll to get the notifications.
  // Note: We fetch all notifications and filter them in the UI to support the toggle instantly.
  const { items: notificationData, isLoadingItems } = useFetchAll<Notification>(
    "/api/notification", 
    ["notifications"]
  );

  const allNotifications = notificationData?.data || [];

  // ── Derived State & Filtering ───────────────────────────────────
  // 1. Calculate unread count for the badge (always based on all data)
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  // 2. Filter list based on "Only Unread" toggle
  const filteredNotifications = useMemo(() => {
    if (onlyUnread) {
      return allNotifications.filter((n) => !n.isRead);
    }
    return allNotifications;
  }, [allNotifications, onlyUnread]);

  // ── Actions ─────────────────────────────────────────────────────
  
  // Toggle the filter and reset scroll
  const toggleFilter = () => {
    setOnlyUnread((v) => !v);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  // Mark a single notification as read
  const handleMarkAsRead = async (id: number) => {
    try {
      // API call to mark specific ID as read
      await axiosInstance.put(`/api/notification/read/${id}`); // Adjust endpoint as necessary
      
      // Invalidate the query to trigger a re-fetch via useFetchAll
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    // Extract IDs of unread notifications
    const unreadIds = allNotifications.filter((n) => !n.isRead).map((n) => n.id);

    if (unreadIds.length === 0) return;

    try {
      // API call to mark all specific IDs as read (or a bulk endpoint)
      // Assuming a bulk endpoint exists, or we iterate. Ideally use a bulk endpoint.
      await axiosInstance.put("/api/notification/read-all", { ids: unreadIds }); 

      // Invalidate query to refresh UI
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors cursor-pointer"
        aria-label="Open notifications"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-surface leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          
          {/* ── Header ── */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">notifications</span>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
               {/* Unread toggle */}
               <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => onlyUnread && toggleFilter()}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider",
                    !onlyUnread ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => !onlyUnread && toggleFilter()}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider",
                    onlyUnread ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Unread Only
                </button>
              </div>
              
              {/* Mark All Read Button */}
              {unreadCount > 0 && (
                 <button
                    onClick={handleMarkAllAsRead}
                    className="px-2.5 py-1 rounded-md transition-all uppercase tracking-wider text-[10px] font-bold bg-primary text-white hover:bg-primary/90"
                    title="Mark all as read"
                  >
                    Read All
                  </button>
              )}
            </div>
          </div>

          {/* ── List (scrollable) ── */}
          <div
            ref={listRef}
            className="max-h-[420px] overflow-y-auto divide-y divide-slate-50"
          >
            {/* Empty state */}
            {!isLoadingItems && filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">
                  notifications_off
                </span>
                <p className="text-sm font-semibold text-slate-400">
                  {onlyUnread ? "No unread notifications" : "No notifications yet"}
                </p>
              </div>
            )}

            {/* Loading state (Skeleton) */}
            {isLoadingItems && (
                <div className="p-5 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-9 h-9 bg-slate-200 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification rows */}
            {!isLoadingItems && filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={cn(
                  "px-5 py-4 flex gap-3 transition-colors group",
                  n.isRead
                    ? "hover:bg-slate-50/70 cursor-default"
                    : "bg-blue-50/40 hover:bg-blue-50/80 cursor-pointer"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  n.isRead ? "bg-slate-100" : "bg-primary/10"
                )}>
                  <span
                    className={cn("material-symbols-outlined text-lg", n.isRead ? "text-slate-400" : "text-primary")}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    campaign
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm leading-snug line-clamp-1",
                      n.isRead ? "font-medium text-slate-600" : "font-bold text-slate-800"
                    )}>
                      {n.subject}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {n.body}
                  </p>
                  {n.office && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-full border border-primary/10">
                      {n.office}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>
      )}
    </div>
  );
}