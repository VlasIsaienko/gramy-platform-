"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Tournament {
  id: string;
  name: string;
  date: string;
  format: string;
  category: string;
  status: string;
}

const FORMATS = [
  { value: "olympic", label: "Olympic / Single Elimination" },
  { value: "round_robin", label: "Round Robin / Круговая" },
  { value: "groups", label: "Groups / Групповая" },
  { value: "mexicano", label: "Mexicano" },
  { value: "americano", label: "Americano" },
];

const CATEGORIES = [
  { value: "singles", label: "Одиночный" },
  { value: "doubles", label: "Парный" },
  { value: "mixed", label: "Микст" },
];

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

  async function loadTournaments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, date, format, category, status")
      .order("date", { ascending: false });
    if (error) setError("Не удалось загрузить турниры: " + error.message);
    else setTournaments(data || []);
    setLoading(false);
  }

  useEffect(() => { loadTournaments(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) return;
    if (date < today) { setError("Дата турнира не может быть в прошлом. Выберите сегодняшнюю дату или более позднюю."); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("tournaments").insert([{
      name: name.trim(), date, format, category, status: "draft", max_players: 72,
    }]);
    if (error) setError("Не удалось создать турнир: " + error.message);
    else { setName(""); setDate(""); setFormat("olympic"); setCategory("singles"); setShowForm(false); await loadTournaments(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Удалить этот турнир?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) setError("Не удалось удалить: " + error.message);
    else setTournaments((prev) => prev.filter((t) => t.id !== id));
  }

  const statusLabel: Record<string, string> = { draft: "Черновик", active: "Активный", finished: "Завершён" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-court">Турниры</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition">
          {showForm ? "Отмена" : "+ Создать турнир"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 shadow-sm mb-6 space-y-4">
          <h2 className="font-semibold text-ink text-lg">Новый турнир</h2>
          <div>
            <label className="text-sm text-slateGray mb-1 block">Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Открытый чемпионат клуба" className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court" />
          </div>
          <div>
            <label className="text-sm text-slateGray mb-1 block">Дата</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slateGray mb-1 block">Формат</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court bg-white">
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slateGray mb-1 block">Категория</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court bg-white">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving || !name.trim() || !date} className="px-6 py-2.5 rounded-xl bg-court text-white font-semibold hover:bg-court/90 transition disabled:opacity-50">
            {saving ? "Сохраняю..." : "Создать турнир"}
          </button>
        </form>
      )}
      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">Загрузка...</div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">Нет турниров. Создай первый выше.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {tournaments.map((t, i) => (
            <div key={t.id} className={"flex items-center justify-between px-5 py-4 " + (i !== tournaments.length - 1 ? "border-b border-black/5" : "")}>
              <div>
                <p className="text-ink font-medium">{t.name}</p>
                <p className="text-xs text-slateGray mt-0.5">{t.date} · {FORMATS.find((f) => f.value === t.format)?.label} · {CATEGORIES.find((c) => c.value === t.category)?.label}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={"text-xs px-2 py-1 rounded-full " + (t.status === "active" ? "bg-green-100 text-green-700" : t.status === "finished" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700")}>
                  {statusLabel[t.status] || t.status}
                </span>
                <Link href={`/admin/tournaments/${t.id}`} className="text-sm text-court hover:text-shuttle transition font-medium">
                  Открыть →
                </Link>
                <button onClick={() => handleDelete(t.id)} className="text-sm text-slateGray hover:text-shuttle transition">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

