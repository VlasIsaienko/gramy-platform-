"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";

interface RatingRow {
  player_id: string;
  rating_singles: number;
  rating_doubles: number;
}

export default function RatingPage() {
  const t = useTranslations("rating");
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"singles" | "doubles">("singles");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const [ratingsRes, playersRes] = await Promise.all([
        supabase.from("ratings").select("player_id, rating_singles, rating_doubles"),
        supabase.from("players").select("id, full_name"),
      ]);
      if (ratingsRes.error) setError(t("loadError", { message: ratingsRes.error.message }));
      else setRatings(ratingsRes.data || []);
      if (!playersRes.error) {
        setPlayerNames(Object.fromEntries((playersRes.data || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])));
      }
      setLoading(false);
    })();
  }, []);

  const sorted = [...ratings].sort((a, b) =>
    activeTab === "singles" ? b.rating_singles - a.rating_singles : b.rating_doubles - a.rating_doubles
  );

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-court mb-6">{t("title")}</h1>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">{t("loading")}</div>
      ) : ratings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
          {t("stubMessage")}
          <p className="text-xs mt-4 text-slateGray/70">
            {t.rich("stubNote", { code: (chunks) => <code>{chunks}</code> })}
          </p>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("singles")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "singles" ? "bg-court text-white" : "bg-white text-slateGray hover:text-court"}`}
            >
              {t("tabs.singles")}
            </button>
            <button
              onClick={() => setActiveTab("doubles")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "doubles" ? "bg-court text-white" : "bg-white text-slateGray hover:text-court"}`}
            >
              {t("tabs.doubles")}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {sorted.map((row, i) => (
              <div
                key={row.player_id}
                className={`flex items-center justify-between px-5 py-3.5 ${i !== sorted.length - 1 ? "border-b border-black/5" : ""}`}
              >
                <span className="text-ink">
                  <span className="text-slateGray mr-2">{i + 1}.</span>
                  {playerNames[row.player_id] || t("unknownPlayer")}
                </span>
                <span className="text-slateGray font-medium">
                  {activeTab === "singles" ? row.rating_singles : row.rating_doubles}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
