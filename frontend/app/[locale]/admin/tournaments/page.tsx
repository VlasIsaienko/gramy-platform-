"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Tournament {
  id: string;
  name: string;
  date: string;
  format: string;
  category: string;
  status: string;
}

const FORMAT_VALUES = ["olympic", "round_robin", "groups", "mexicano", "americano"] as const;
const CATEGORY_VALUES = ["singles", "doubles", "mixed"] as const;

function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = getTodayLocal();

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [format, setFormat] = useState("olympic");
  const [category, setCategory] = useState("singles");
  const t = useTranslations("tournaments");
  const tCommon = useTranslations("common");

  async function loadTournaments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, date, format, category, status")
      .order("date", { ascending: false });
    if (error) setError(t("loadError", { message: error.message }));
    else setTournaments(data || []);
    setLoading(false);
  }

  useEffect(() => { loadTournaments(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) return;
    if (date < today) { setError(t("pastDateError")); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("tournaments").insert([{
      name: name.trim(), date, format, category, status: "draft", max_players: 72,
    }]);
    if (error) setError(t("createError", { message: error.message }));
    else { setName(""); setDate(""); setFormat("olympic"); setCategory("singles"); setShowForm(false); await loadTournaments(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) setError(t("deleteError", { message: error.message }));
    else setTournaments((prev) => prev.filter((tour) => tour.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-court">{t("title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition">
          {showForm ? tCommon("actions.cancel") : t("createButton")}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 shadow-sm mb-6 space-y-4">
          <h2 className="font-semibold text-ink text-lg">{t("newTournament")}</h2>
          <div>
            <label className="text-sm text-slateGray mb-1 block">{t("name")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court" />
          </div>
          <div>
            <label className="text-sm text-slateGray mb-1 block">{t("date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slateGray mb-1 block">{t("format")}</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court bg-white">
                {FORMAT_VALUES.map((f) => <option key={f} value={f}>{t(`formatOptions.${f}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slateGray mb-1 block">{t("category")}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court bg-white">
                {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{tCommon(`matchCategories.${c}`)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving || !name.trim() || !date} className="px-6 py-2.5 rounded-xl bg-court text-white font-semibold hover:bg-court/90 transition disabled:opacity-50">
            {saving ? tCommon("actions.saving") : t("createSubmit")}
          </button>
        </form>
      )}
      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">{tCommon("actions.loading")}</div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">{t("empty")}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {tournaments.map((tour, i) => (
            <div key={tour.id} className={"flex items-center justify-between px-5 py-4 " + (i !== tournaments.length - 1 ? "border-b border-black/5" : "")}>
              <div>
                <p className="text-ink font-medium">{tour.name}</p>
                <p className="text-xs text-slateGray mt-0.5">
                  {tour.date} · {t(`formatOptions.${tour.format}`)} · {tCommon(`matchCategories.${tour.category}`)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={"text-xs px-2 py-1 rounded-full " + (tour.status === "active" ? "bg-green-100 text-green-700" : tour.status === "finished" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700")}>
                  {t(`status.${tour.status}`)}
                </span>
                <Link href={`/admin/tournaments/${tour.id}`} className="text-sm text-court hover:text-shuttle transition font-medium">
                  {t("open")}
                </Link>
                <button onClick={() => handleDelete(tour.id)} className="text-sm text-slateGray hover:text-shuttle transition">{tCommon("actions.delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
