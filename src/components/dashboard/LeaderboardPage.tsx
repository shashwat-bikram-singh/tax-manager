import { useFetchAll } from "@/hooks/useFetchAll";
import type { LeaderboardData } from "@/type/dashboard";
import { Link } from "react-router-dom";

export default function LeaderboardPage() {
  const { items: leaderboardResponse, isLoadingItems, error } = useFetchAll<LeaderboardData>("/api/leaderboard", ["leaderboard"]);

  function getLeaderboardData(res: any): LeaderboardData[] | null {
    if (!res) return null;
    if (res.data) {
      const data = res.data;
      return Array.isArray(data) ? data : [data];
    }
    return null;
  }

  const ld = getLeaderboardData(leaderboardResponse);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Top Performing Offices</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-widest">Full Leaderboard Ranking</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-8 sm:p-10 relative">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-yellow-100/50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto space-y-4">
          {isLoadingItems ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
               <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" />
               <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading ranks...</p>
             </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
              <p className="text-red-600 font-semibold">Failed to load leaderboard data.</p>
            </div>
          ) : !ld || ld.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 text-sm gap-4">
              <span className="material-symbols-outlined text-6xl opacity-30">leaderboard</span>
              <p className="text-lg font-medium">No leaderboard data available</p>
            </div>
          ) : (
            ld.map((item: LeaderboardData) => {
              const isTop3 = item.rankPosition <= 3;
              return (
                <div
                  key={item.officeId}
                  className="flex items-center gap-4 sm:gap-6 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 rounded-2xl p-4 sm:p-5"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm ${
                      item.rankPosition === 1
                        ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border border-yellow-400"
                        : item.rankPosition === 2
                        ? "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-800 border border-gray-300"
                        : item.rankPosition === 3
                        ? "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50 border border-amber-600"
                        : "bg-white text-gray-400 font-bold border border-gray-200"
                    }`}
                  >
                    #{item.rankPosition}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-base sm:text-lg truncate leading-snug ${isTop3 ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                      {item.officeName}
                    </p>
                    <div className="flex items-center gap-2 mt-1 overflow-hidden">
                      <span className="material-symbols-outlined text-gray-400 text-[14px]">corporate_fare</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest truncate">
                        ID: {item.officeId}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <p className={`font-black text-xl sm:text-2xl leading-none ${isTop3 ? "text-yellow-600" : "text-gray-800"}`}>
                      {item.totalProperties.toLocaleString()}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">
                      Properties
                    </p>
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
