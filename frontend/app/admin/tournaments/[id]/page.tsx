"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { generateSchedule, type TournamentFormat } from "@/lib/bracket";

interface Tournament {
  id: string;
  name: string;
  date: string;
  max_players: number;
  format: TournamentFormat;
}

interface Category {
  id: string;
  name: string;
  match_category: "singles" | "doubles" | "mixed";
}

interface Player {
  id: string;
  full_name: string;
}

interface Registration {
  id: string;
  category_id: string;
  player_id: string;
}

interface Team {
  id: string;
  category_id: string;
  player_id_1: string;
  player_id_2: string | null;
}

interface Match {
  id: string;
  category_id: string;
  round: number;
  group_number: number | null;
  team_a_id: string;
  team_b_id: string;
  status: string;
}

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  olympic: "Olympic",
  round_robin: "Round Robin",
  groups: "Groups",
  mexicano: "Mexicano",
  americano: "Americano",
};

const MATCH_CATEGORIES = [
  { value: "singles", label: "Одиночный" },
  { value: "doubles", label: "Парный" },
  { value: "mixed", label: "Микст" },
];

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournamentId = params.id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newMatchCategory, setNewMatchCategory] = useState<"singles" | "doubles" | "mixed">("singles");
  const [savingCategory, setSavingCategory] = useState(false);

  const [searchByCategory, setSearchByCategory] = useState<Record<string, string>>({});
  const [generatingCategoryId, setGeneratingCategoryId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const [tournamentRes, categoriesRes, registrationsRes, playersRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from("tournaments").select("id, name, date, max_players, format").eq("id", tournamentId).single(),
      supabase.from("categories").select("id, name, match_category").eq("tournament_id", tournamentId).order("name"),
      supabase.from("registrations").select("id, category_id, player_id").eq("tournament_id", tournamentId),
      supabase.from("players").select("id, full_name").order("full_name"),
      supabase.from("teams").select("id, category_id, player_id_1, player_id_2").eq("tournament_id", tournamentId),
      supabase.from("matches").select("id, category_id, round, group_number, team_a_id, team_b_id, status").eq("tournament_id", tournamentId).order("round"),
    ]);

    if (tournamentRes.error) setError("Не удалось загрузить турнир: " + tournamentRes.error.message);
    else setTournament(tournamentRes.data);

    if (categoriesRes.error) setError("Не удалось загрузить категории: " + categoriesRes.error.message);
    else setCategories(categoriesRes.data || []);

    if (registrationsRes.error) setError("Не удалось загрузить регистрации: " + registrationsRes.error.message);
    else setRegistrations(registrationsRes.data || []);

    if (playersRes.error) setError("Не удалось загрузить игроков: " + playersRes.error.message);
    else setPlayers(playersRes.data || []);

    if (teamsRes.error) setError("Не удалось загрузить команды: " + teamsRes.error.message);
    else setTeams(teamsRes.data || []);

    if (matchesRes.error) setError("Не удалось загрузить сетку: " + matchesRes.error.message);
    else setMatches(matchesRes.data || []);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [tournamentId]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    setError(null);
    const { error } = await supabase.from("categories").insert([{
      tournament_id: tournamentId, name: newCategoryName.trim(), match_category: newMatchCategory,
    }]);
    if (error) setError("Не удалось добавить категорию: " + error.message);
    else {
      setNewCategoryName("");
      setNewMatchCategory("singles");
      await loadAll();
    }
    setSavingCategory(false);
  }

  async function handleAddPlayer(categoryId: string, playerId: string) {
    setError(null);
    const { error } = await supabase.from("registrations").insert([{
      tournament_id: tournamentId, category_id: categoryId, player_id: playerId,
    }]);
    if (error) setError("Не удалось зарегистрировать игрока: " + error.message);
    else await loadAll();
  }

  async function handleRemovePlayer(registrationId: string) {
    setError(null);
    const { error } = await supabase.from("registrations").delete().eq("id", registrationId);
    if (error) setError("Не удалось убрать игрока: " + error.message);
    else setRegistrations((prev) => prev.filter((r) => r.id !== registrationId));
  }

  async function handleDeleteBracket(category: Category) {
    if (!window.confirm("Удалить сетку категории? Все матчи этой категории будут удалены.")) return;
    setError(null);
    const { error } = await supabase.from("matches").delete().eq("category_id", category.id);
    if (error) setError("Не удалось удалить сетку: " + error.message);
    else await loadAll();
  }

  function teamLabel(teamId: string): string {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return "—";
    const p1 = players.find((p) => p.id === team.player_id_1)?.full_name || "—";
    if (!team.player_id_2) return p1;
    const p2 = players.find((p) => p.id === team.player_id_2)?.full_name || "—";
    return `${p1} / ${p2}`;
  }

  async function handleGenerateBracket(category: Category) {
    if (!tournament) return;
    const categoryPlayerIds = registrations.filter((r) => r.category_id === category.id).map((r) => r.player_id);
    if (categoryPlayerIds.length < 2) return;

    setError(null);
    setGeneratingCategoryId(category.id);

    // Одна команда-«одиночка» на игрока (player_id_2 = null) — для парных
    // категорий это временно, пока нет отдельного UI формирования пар.
    const teamIdByPlayer = new Map(
      teams.filter((t) => t.category_id === category.id && !t.player_id_2).map((t) => [t.player_id_1, t.id])
    );
    const missingPlayerIds = categoryPlayerIds.filter((pid) => !teamIdByPlayer.has(pid));

    if (missingPlayerIds.length > 0) {
      const { data, error } = await supabase
        .from("teams")
        .insert(missingPlayerIds.map((pid) => ({
          tournament_id: tournamentId, category_id: category.id, player_id_1: pid, player_id_2: null,
        })))
        .select("id, player_id_1");
      if (error) {
        setError("Не удалось создать команды: " + error.message);
        setGeneratingCategoryId(null);
        return;
      }
      (data || []).forEach((t) => teamIdByPlayer.set(t.player_id_1, t.id));
    }

    let pools;
    try {
      pools = generateSchedule(tournament.format, categoryPlayerIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сгенерировать сетку.");
      setGeneratingCategoryId(null);
      return;
    }

    const matchRows = pools.flatMap((pool) =>
      pool.rounds.flatMap((pairs, idx) =>
        pairs.map(([a, b]) => ({
          tournament_id: tournamentId,
          category_id: category.id,
          round: idx + 1,
          group_number: pool.groupNumber,
          team_a_id: teamIdByPlayer.get(a)!,
          team_b_id: teamIdByPlayer.get(b)!,
          status: "pending",
        }))
      )
    );

    const { error } = await supabase.from("matches").insert(matchRows);
    if (error) setError("Не удалось сохранить сетку: " + error.message);
    else await loadAll();

    setGeneratingCategoryId(null);
  }

  if (loading) {
    return <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">Загрузка...</div>;
  }

  if (!tournament) {
    return <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error || "Турнир не найден."}</div>;
  }

  return (
    <div>
      <Link href="/admin/tournaments" className="text-sm text-slateGray hover:text-court transition">← Все турниры</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-court">{tournament.name}</h1>
          <p className="text-slateGray text-sm mt-1">{tournament.date} · до {tournament.max_players} участников</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <form onSubmit={handleAddCategory} className="bg-white rounded-xl p-6 shadow-sm mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-sm text-slateGray mb-1 block">Новая категория</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Например: Мужской одиночный"
            className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court"
          />
        </div>
        <div>
          <label className="text-sm text-slateGray mb-1 block">Тип</label>
          <select
            value={newMatchCategory}
            onChange={(e) => setNewMatchCategory(e.target.value as "singles" | "doubles" | "mixed")}
            className="border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court bg-white"
          >
            {MATCH_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={savingCategory || !newCategoryName.trim()}
          className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition disabled:opacity-50"
        >
          {savingCategory ? "Сохраняю..." : "+ Добавить категорию"}
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
          У турнира пока нет категорий. Добавь первую выше.
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryRegistrations = registrations.filter((r) => r.category_id === category.id);
            const registeredPlayerIds = new Set(categoryRegistrations.map((r) => r.player_id));
            const isFull = categoryRegistrations.length >= tournament.max_players;
            const search = (searchByCategory[category.id] || "").trim().toLowerCase();
            const searchResults = search
              ? players.filter((p) => !registeredPlayerIds.has(p.id) && p.full_name.toLowerCase().includes(search)).slice(0, 8)
              : [];

            const categoryMatches = matches.filter((m) => m.category_id === category.id);
            const groupsMap = new Map<number | null, Match[]>();
            categoryMatches.forEach((m) => {
              if (!groupsMap.has(m.group_number)) groupsMap.set(m.group_number, []);
              groupsMap.get(m.group_number)!.push(m);
            });
            const matchesByGroup = Array.from(groupsMap.entries()).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
            const isLocked = categoryMatches.length > 0;

            return (
              <div key={category.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-ink text-lg">{category.name}</h2>
                    <p className="text-xs text-slateGray">{MATCH_CATEGORIES.find((c) => c.value === category.match_category)?.label}</p>
                  </div>
                  <span className={"text-sm font-medium " + (isFull ? "text-shuttle" : "text-slateGray")}>
                    {categoryRegistrations.length} / {tournament.max_players}
                  </span>
                </div>

                {categoryRegistrations.length === 0 ? (
                  <p className="text-sm text-slateGray mb-4">Пока никто не зарегистрирован.</p>
                ) : (
                  <div className="border border-black/5 rounded-lg overflow-hidden mb-4">
                    {categoryRegistrations.map((r, i) => {
                      const player = players.find((p) => p.id === r.player_id);
                      return (
                        <div key={r.id} className={"flex items-center justify-between px-4 py-2.5 " + (i !== categoryRegistrations.length - 1 ? "border-b border-black/5" : "")}>
                          <span className="text-ink text-sm">{player?.full_name || "Неизвестный игрок"}</span>
                          {!isLocked && (
                            <button onClick={() => handleRemovePlayer(r.id)} className="text-xs text-slateGray hover:text-shuttle transition">Убрать</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isLocked ? (
                  <p className="text-xs text-slateGray">Состав закрыт — сетка сгенерирована. Удалите сетку, чтобы изменить состав.</p>
                ) : isFull ? (
                  <p className="text-xs text-shuttle">Достигнут лимит участников турнира.</p>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={searchByCategory[category.id] || ""}
                      onChange={(e) => setSearchByCategory((prev) => ({ ...prev, [category.id]: e.target.value }))}
                      placeholder="Поиск игрока по имени..."
                      className="w-full border border-black/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-court"
                    />
                    {searchResults.length > 0 && (
                      <div className="border border-black/5 rounded-lg mt-2 overflow-hidden">
                        {searchResults.map((p, i) => (
                          <div key={p.id} className={"flex items-center justify-between px-4 py-2 " + (i !== searchResults.length - 1 ? "border-b border-black/5" : "")}>
                            <span className="text-ink text-sm">{p.full_name}</span>
                            <button
                              onClick={() => { handleAddPlayer(category.id, p.id); setSearchByCategory((prev) => ({ ...prev, [category.id]: "" })); }}
                              className="text-xs text-shuttle hover:text-shuttle/70 transition font-medium"
                            >
                              + Добавить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-black/5">
                  {isLocked ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-ink">Сетка ({FORMAT_LABELS[tournament.format]})</h3>
                        <button onClick={() => handleDeleteBracket(category)} className="text-xs text-shuttle hover:text-shuttle/70 transition">Удалить сетку</button>
                      </div>
                      <div className="space-y-5">
                        {matchesByGroup.map(([groupNumber, groupMatches]) => {
                          const roundsMap = new Map<number, Match[]>();
                          groupMatches.forEach((m) => {
                            if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
                            roundsMap.get(m.round)!.push(m);
                          });
                          const roundsForGroup = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);

                          return (
                            <div key={groupNumber ?? "single"}>
                              {groupNumber !== null && (
                                <p className="text-sm font-semibold text-court mb-2">Группа {groupNumber}</p>
                              )}
                              <div className="space-y-4">
                                {roundsForGroup.map(([round, roundMatches]) => (
                                  <div key={round}>
                                    <p className="text-xs font-medium text-slateGray mb-1.5">Раунд {round}</p>
                                    <div className="space-y-1.5">
                                      {roundMatches.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between text-sm bg-courtLine/60 rounded-lg px-3 py-2">
                                          <span className="text-ink">{teamLabel(m.team_a_id)}</span>
                                          <span className="text-slateGray text-xs">vs</span>
                                          <span className="text-ink">{teamLabel(m.team_b_id)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : categoryRegistrations.length >= 2 ? (
                    <button
                      onClick={() => handleGenerateBracket(category)}
                      disabled={generatingCategoryId === category.id}
                      className="px-5 py-2.5 rounded-xl bg-court text-white font-semibold hover:bg-court/90 transition disabled:opacity-50"
                    >
                      {generatingCategoryId === category.id ? "Генерирую..." : "Сгенерировать сетку"}
                    </button>
                  ) : (
                    <p className="text-xs text-slateGray">Нужно минимум 2 зарегистрированных игрока, чтобы сгенерировать сетку.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
