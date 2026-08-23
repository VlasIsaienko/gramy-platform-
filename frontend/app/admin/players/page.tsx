"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Player {
  id: string;
  full_name: string;
  rating_singles: number;
  created_at: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPlayers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, rating_singles, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Не удалось загрузить игроков: " + error.message);
    } else {
      setPlayers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("players")
      .insert([{ full_name: newName.trim() }]);

    if (error) {
      setError("Не удалось добавить игрока: " + error.message);
    } else {
      setNewName("");
      await loadPlayers();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Удалить этого игрока?");
    if (!confirmed) return;

    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) {
      setError("Не удалось удалить игрока: " + error.message);
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-court">Игроки</h1>
      </div>

      <form
        onSubmit={handleAddPlayer}
        className="flex gap-3 mb-6 bg-white rounded-xl p-4 shadow-sm"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Имя и фамилия игрока"
          className="flex-1 border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition disabled:opacity-50"
        >
          {saving ? "Сохраняю..." : "+ Добавить"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
          Загрузка списка игроков...
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
          Пока нет ни одного игрока. Добавь первого выше.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {players.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i !== players.length - 1 ? "border-b border-black/5" : ""
              }`}
            >
              <div>
                <p className="text-ink font-medium">{player.full_name}</p>
                <p className="text-xs text-slateGray">
                  Рейтинг: {player.rating_singles}
                </p>
              </div>
              <button
                onClick={() => handleDelete(player.id)}
                className="text-sm text-slateGray hover:text-shuttle transition"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-slateGray/60 mt-6">
        Игроки сохраняются напрямую в базу данных Supabase (таблица{" "}
        <code>players</code>).
      </p>
    </div>
  );
}
