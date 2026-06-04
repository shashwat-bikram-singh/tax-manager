// import { useState, useEffect, useRef, useCallback } from "react";
// import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
// import type { InfiniteData } from '@tanstack/react-query';
// import axiosInstance from "@/config/axios";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { useTranslation } from "react-i18next";

// // ── Types ─────────────────────────────────────────────────────
// interface Notification {
//   id: number;
//   subject: string;
//   body: string;
//   officeId: number;
//   office: string | null;
//   senderId: number;
//   sender: string | null;
//   isRead: boolean;
// }

// interface NotificationResponse {
//   data: Notification[];
//   success: boolean;
//   message: string | null;
//   errors: string | null;
// }

// const PAGE_SIZE = 10;
// const BASE = import.meta.env.VITE_API_BASE_URL;

// // ── Fetcher ───────────────────────────────────────────────────────
// const fetchNotifications = async (
//   pageNumber: number,
//   onlyUnread: boolean
// ): Promise<NotificationResponse> => {
//   const res = await axiosInstance.get<NotificationResponse>(
//     `${BASE}/api/notification?pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}&onlyUnread=${onlyUnread}`
//   );
//   return res.data;
// };

// // ── Component ─────────────────────────────────────────────────────
// export default function NotificationPanel() {
//   const { t } = useTranslation();
//   const [open, setOpen] = useState(false);
//   const [onlyUnread, setOnlyUnread] = useState(false);

//   const panelRef = useRef<HTMLDivElement>(null);
//   const listRef = useRef<HTMLDivElement>(null);
//   const queryClient = useQueryClient();

//   // ── Mark as read mutation ────────────────────────────────────────────────────
//   const        markAsReadMutation = useMutation({
//     mutationFn: async (ids: number[]) => {
//       // Corrected API Endpoint
// console.log("Marking as read, IDs:", ids);
//       const response = await axiosInstance.post(`${BASE}/api/mark-as-read`, { ids });
//       console.log("Marking as read, I iugaaaaaaaaaiugsiusgaDs:", response);

//       return response.data;
//     },
//     onMutate: async (ids: number[]) => {
//       console.log("Marking as read, I iugaiugsiusgaDs:", ids);
//       // Cancel outgoing refetches to avoid overwriting our optimistic update
//       await queryClient.cancelQueries({ queryKey: ["notifications-list"] });
//       await queryClient.cancelQueries({ queryKey: ["notifications-unread-count"] });

//       // Snapshot previous values
//       const previousAll = queryClient.getQueryData<InfiniteData<NotificationResponse>>(["notifications-list", false]);
//       const previousUnread = queryClient.getQueryData<InfiniteData<NotificationResponse>>(["notifications-list", true]);
//       const previousCount = queryClient.getQueryData<NotificationResponse>(["notifications-unread-count"]);

//       // Optimistically update "All" list (mark items as read)
//       queryClient.setQueryData<InfiniteData<NotificationResponse> | undefined>(["notifications-list", false], (old) => {
//         if (!old) return old;
//         return {
//           ...old,
//           pages: old.pages.map((page) => ({
//             ...page,
//             data: page.data.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
//           })),
//         };
//       });

//       // Optimistically update "Unread Only" list (filter out items)
//       queryClient.setQueryData<InfiniteData<NotificationResponse> | undefined>(["notifications-list", true], (old) => {
//         if (!old) return old;
//         return {
//           ...old,
//           pages: old.pages.map((page) => ({
//             ...page,
//             data: page.data.filter((n) => !ids.includes(n.id)),
//           })),
//         };
//       });

//       // Optimistically update Badge Count
//       queryClient.setQueryData<NotificationResponse | undefined>(["notifications-unread-count"], (old) => {
//         if (!old) return old;
//         return {
//           ...old,
//           data: old.data?.filter((n) => !ids.includes(n.id)) || [],
//         };
//       });

//       return { previousAll, previousUnread, previousCount };
//     },
//     onError: (err, ids, context) => {
//       // If the mutation fails, use the context returned from onMutate to roll back
//       if (context?.previousAll) {
//         queryClient.setQueryData(["notifications-list", false], context.previousAll);
//       }
//       if (context?.previousUnread) {
//         queryClient.setQueryData(["notifications-list", true], context.previousUnread);
//       }
//       if (context?.previousCount) {
//         queryClient.setQueryData(["notifications-unread-count"], context.previousCount);
//       }
//       toast.error(t("notification.failedToUpdateStatus"));
//     },
//     onSettled: () => {
//       // Always refetch after error or success to ensure server state
//       queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
//       queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
//     },
//   });

//   // ── Unread badge count — polls every 10 s ─────────────────────────
//   const { data: unreadData } = useQuery<NotificationResponse>({
//     queryKey: ["notifications-unread-count"],
//     queryFn: () => fetchNotifications(1, true),
//     refetchInterval: 10_000,
//     refetchIntervalInBackground: true,
//   });
//   const totalUnread = unreadData?.data?.length ?? 0;

//   // ── Infinite query for panel list ────────────────────────────────────
//   const {
//     data,
//     fetchNextPage,
//     hasNextPage,
//     isFetchingNextPage,
//     isLoading,
//   } = useInfiniteQuery<NotificationResponse>({
//     queryKey: ["notifications-list", onlyUnread],
//     queryFn: ({ pageParam = 1 }) =>
//       fetchNotifications(pageParam as number, onlyUnread),
//     getNextPageParam: (lastPage, allPages) => {
//       if ((lastPage.data?.length ?? 0) < PAGE_SIZE) return undefined;
//       return allPages.length + 1;
//     },
//     initialPageParam: 1,
//     enabled: open,
//   });

//   const notifications: Notification[] = data?.pages.flatMap((p) => p.data ?? []) ?? [];

//   // ── Scroll-to-bottom → load next page ──────────────────────────────
//   const handleScroll = useCallback(() => {
//     const el = listRef.current;
//     if (!el) return;
//     const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
//     if (nearBottom && hasNextPage && !isFetchingNextPage) {
//       fetchNextPage();
//     }
//   }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

//   useEffect(() => {
//     const el = listRef.current;
//     if (!el) return;
//     el.addEventListener("scroll", handleScroll);
//     return () => el.removeEventListener("scroll", handleScroll);
//   }, [handleScroll, open]);

//   // ── Close on outside click ───────────────────────────────────────────────
//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
//         setOpen(false);
//       }
//     };
//     if (open) document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, [open]);

//   // ── Toggle filter — resets infinite query ─────────────────────────────
//   const toggleFilter = () => {
//     setOnlyUnread((v) => !v);
//     if (listRef.current) listRef.current.scrollTop = 0;
//   };

//   // ── Mark all as read ──────────────────────────────────────────────────────
//   const markAllAsRead = async () => {
//     // 1. Fetch all unread IDs from the server
//     let allUnreadIds: number[] = [];
//     let page = 1;
//     let hasMore = true;

//     try {
//       while (hasMore) {
//         const res = await fetchNotifications(page, true);
//         // console.log(`Fetched page ${page} of unread notifications:`, res);
//         if (res.data && res.data.length > 0) {
//           allUnreadIds = [...allUnreadIds, ...res.data.map((n) => n.id)];
//           // If returned data is less than page size, we are on the last page
//           if (res.data.length < PAGE_SIZE) {
//             hasMore = false;
//           } else {
//             page++;
//           }
//         } else {
//           hasMore = false;
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching all unread notifications:", error);
//       toast.error(t("notification.failedToMarkAllRead"));
//       return;
//     }

//     if (allUnreadIds.length === 0) return;

//     // 2. Trigger mutation with all IDs (Optimistic update happens inside onMutate)
//     try {
//       console.log("Marking all as read, IDs:", allUnreadIds);
//       await markAsReadMutation.mutateAsync(allUnreadIds);
//       toast.success(t("notification.allMarkedRead"));
//     } catch (error) {
//       console.error("Error marking all as read:", error);
//       // Error toast is handled by onError in mutation
//     }
//   };

//   // ── Mark single as read ──────────────────────────────────────────────────
//   const markAsRead = async (id: number) => {
//     try {
//       await markAsReadMutation.mutateAsync([id]);
//     } catch (error) {
//       console.error("Error marking notification as read:", error);
//       // Error toast is handled by onError in mutation
//     }
//   };

//   // ── Render ────────────────────────────────────────────────────────
//   return (
//     <div className="relative" ref={panelRef}>
//       {/* Bell button */}
//       <button
//         id="notification-bell"
//         onClick={() => setOpen((v) => !v)}
//         className="relative p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors cursor-pointer"
//         aria-label={t("notification.title")}
//       >
//         <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
//           notifications
//         </span>
//         {totalUnread > 0 && (
//           <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-surface leading-none">
//             {totalUnread > 99 ? "99+" : totalUnread}
//           </span>
//         )}
//       </button>

//       {/* Dropdown panel */}
//       {open && (
//         <div className="absolute right-0 top-12 z-50 w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
//           {/* ── Header ── */}
//           <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
//             <div className="flex items-center gap-2">
//               <span className="material-symbols-outlined text-primary text-lg">notifications</span>
//               <h3 className="font-bold text-slate-800 text-sm tracking-tight">{t("notification.title")}</h3>
//               {totalUnread > 0 && (
//                 <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
//                   {totalUnread} new
//                 </span>
//               )}
//             </div>

//             <div className="flex items-center gap-2">
//               {/* Unread toggle */}
//               <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-[10px] font-bold">
//                 <button
//                   onClick={() => onlyUnread && toggleFilter()}
//                   className={cn(
//                     "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider",
//                     !onlyUnread ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
//                   )}
//                 >
//                   {t("notification.all")}
//                 </button>
//                 <button
//                   onClick={() => !onlyUnread && toggleFilter()}
//                   className={cn(
//                     "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider",
//                     onlyUnread ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
//                   )}
//                 >
//                   {t("notification.unreadOnly")}
//                 </button>
//               </div>

//               {/* Mark All Read Button */}
//               {totalUnread > 0 && (
//                 <button
//                   onClick={markAllAsRead}
//                   disabled={markAsReadMutation.isPending}
//                   className="px-2.5 py-1 rounded-md transition-all uppercase tracking-wider text-[10px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
//                   title={t("notification.markAllRead")}
//                 >
//                   {markAsReadMutation.isPending ? "..." : t("notification.markAllRead")}
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* ── List (scrollable) ── */}
//           <div ref={listRef} className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
//             {/* Empty state */}
//             {!isLoading && notifications.length === 0 && (
//               <div className="flex flex-col items-center justify-center py-14 text-center px-6">
//                 <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">notifications_off</span>
//                 <p className="text-sm font-semibold text-slate-400">
//                   {onlyUnread ? t("notification.noUnreadNotifications") : t("notification.noNotifications")}
//                 </p>
//               </div>
//             )}


//             {/* Notification rows */}
//             {notifications.map((n) => (
//               <div
//                 key={n.id}
//                 onClick={() => !n.isRead && markAsRead(n.id)}
//                 className={cn(
//                   "px-5 py-4 flex gap-3 transition-colors group",
//                   n.isRead ? "hover:bg-slate-50/70 cursor-default" : "bg-blue-50/40 hover:bg-blue-50/80 cursor-pointer",
//                   markAsReadMutation.isPending && "pointer-events-none opacity-60"
//                 )}
//               >
//                 {/* Icon */}
//                 <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", n.isRead ? "bg-slate-100" : "bg-primary/10")}>
//                   <span className={cn("material-symbols-outlined text-lg", n.isRead ? "text-slate-400" : "text-primary")} style={{ fontVariationSettings: "'FILL' 1" }}>
//                     campaign
//                   </span>
//                 </div>

//                 {/* Text */}
//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-start justify-between gap-2">
//                     <p className={cn("text-sm leading-snug line-clamp-1", n.isRead ? "font-medium text-slate-600" : "font-bold text-slate-800")}>
//                       {n.subject}
//                     </p>
//                     {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />}
//                   </div>
//                   <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{n.body}</p>
//                   {n.office && (
//                     <span className="inline-block mt-1.5 text-[10px] font-semibold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-full border border-primary/10">
//                       {n.office}
//                     </span>
//                   )}
//                 </div>
//               </div>
//             ))}

//             {/* Loading skeletons — initial load */}
//             {isLoading && (
//               <div className="px-5 py-3 space-y-4">
//                 {[1, 2, 3].map((i) => (
//                   <div key={i} className="flex gap-3 animate-pulse">
//                     <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
//                     <div className="flex-1 space-y-2 py-1">
//                       <div className="h-3 bg-slate-100 rounded w-2/3" />
//                       <div className="h-3 bg-slate-100 rounded w-full" />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Loading more (scroll-triggered) */}
//             {isFetchingNextPage && (
//               <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-xs font-semibold">
//                 <div className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
//                 {t("notification.loadingMore")}
//               </div>
//             )}

//             {/* End of list */}
//             {!hasNextPage && notifications.length > 0 && !isFetchingNextPage && (
//               <div className="text-center py-4 text-[11px] text-slate-300 font-medium uppercase tracking-wider">
//                 {t("notification.allCaughtUp")}
//               </div>
//             )}
//           </div>

//           {/* ── Footer ── */}
//           <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
//             <p className="text-[11px] text-slate-400 font-medium">
//               {t("notification.notificationsShown", { count: notifications.length })}
//             </p>
//             {hasNextPage && (
//               <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-[11px] font-bold text-primary hover:underline disabled:opacity-40 flex items-center gap-0.5">
//                 {t("notification.showMore")}
//                 <span className="material-symbols-outlined text-sm">expand_more</span>
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }