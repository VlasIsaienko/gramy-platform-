"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  generateSchedule,
  generateRoundRobinRounds,
  checkRoundRobinIntegrity,
  resolveGroupSizes,
  shuffle,
  type TournamentFormat,
  type GroupDistributionMode,
} from "@/lib/bracket";

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
  rating_singles: number;
  rating_doubles: number;
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
  group_number: number | null;
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

  const [distributionMode, setDistributionMode] = useState<Record<string, GroupDistributionMode>>({});
  const [manualBasis, setManualBasis] = useState<Record<string, "count" | "size">>({});
  const [manualValue, setManualValue] = useState<Record<string, string>>({});

  // Регистрация в doubles/mixed: после выбора игрока в основном поиске
  // ждём решения "Ищу напарника" / "Есть напарник" (и, если второе, — выбора партнёра).
  const [pendingRegistration, setPendingRegistration] = useState<Record<string, { playerId: string; playerName: string; awaitingPartner: boolean }>>({});
  const [partnerSearchByCategory, setPartnerSearchByCategory] = useState<Record<string, string>>({});

  // Блок "Ищут напарника": ручной выбор двух игроков для пары.
  const [selectedForPairing, setSelectedForPairing] = useState<Record<string, string[]>>({});
  // Выбор партнёра для непарного "лишнего" через выпадающий список.
  const [oddOneOutTarget, setOddOneOutTarget] = useState<Record<string, string>>({});

  // Редактирование уже сгенерированной сетки: состав групп и пары в матчах.
  const [editingGroupComposition, setEditingGroupComposition] = useState<Record<string, boolean>>({});
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchSelections, setEditMatchSelections] = useState<{ teamA: string; teamB: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const [tournamentRes, categoriesRes, registrationsRes, playersRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from("tournaments").select("id, name, date, max_players, format").eq("id", tournamentId).single(),
      supabase.from("categories").select("id, name, match_category").eq("tournament_id", tournamentId).order("name"),
      supabase.from("registrations").select("id, category_id, player_id").eq("tournament_id", tournamentId),
      supabase.from("players").select("id, full_name, rating_singles, rating_doubles").order("full_name"),
      supabase.from("teams").select("id, category_id, player_id_1, player_id_2, group_number").eq("tournament_id", tournamentId),
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

  async function handleRegisterSolo(categoryId: string, playerId: string) {
    setError(null);
    const { error: regError } = await supabase.from("registrations").insert([{
      tournament_id: tournamentId, category_id: categoryId, player_id: playerId,
    }]);
    if (regError) { setError("Не удалось зарегистрировать игрока: " + regError.message); return; }
    const { error: teamError } = await supabase.from("teams").insert([{
      tournament_id: tournamentId, category_id: categoryId, player_id_1: playerId, player_id_2: null,
    }]);
    if (teamError) { setError("Не удалось создать команду: " + teamError.message); return; }
    setPendingRegistration((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
    await loadAll();
  }

  async function handleRegisterPair(categoryId: string, playerAId: string, playerBId: string) {
    setError(null);
    const { error: regError } = await supabase.from("registrations").insert([
      { tournament_id: tournamentId, category_id: categoryId, player_id: playerAId },
      { tournament_id: tournamentId, category_id: categoryId, player_id: playerBId },
    ]);
    if (regError) { setError("Не удалось зарегистрировать игроков: " + regError.message); return; }
    const { error: teamError } = await supabase.from("teams").insert([{
      tournament_id: tournamentId, category_id: categoryId, player_id_1: playerAId, player_id_2: playerBId,
    }]);
    if (teamError) { setError("Не удалось создать пару: " + teamError.message); return; }
    setPendingRegistration((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
    setPartnerSearchByCategory((prev) => ({ ...prev, [categoryId]: "" }));
    await loadAll();
  }

  async function handleRemovePlayer(registration: Registration) {
    setError(null);
    const category = categories.find((c) => c.id === registration.category_id);

    if (category && category.match_category !== "singles") {
      const team = teams.find(
        (t) => t.category_id === registration.category_id &&
          (t.player_id_1 === registration.player_id || t.player_id_2 === registration.player_id)
      );
      if (team) {
        if (team.player_id_2) {
          const partnerId = team.player_id_1 === registration.player_id ? team.player_id_2 : team.player_id_1;
          const { error: teamError } = await supabase.from("teams").update({ player_id_1: partnerId, player_id_2: null }).eq("id", team.id);
          if (teamError) { setError("Не удалось обновить пару: " + teamError.message); return; }
        } else {
          const { error: teamError } = await supabase.from("teams").delete().eq("id", team.id);
          if (teamError) { setError("Не удалось удалить команду: " + teamError.message); return; }
        }
      }
    }

    const { error } = await supabase.from("registrations").delete().eq("id", registration.id);
    if (error) { setError("Не удалось убрать игрока: " + error.message); return; }
    await loadAll();
  }

  /**
   * Объединяет playerA (гарантированно "ищет напарника") с playerB в одну
   * команду. Если playerB уже был в готовой паре, эта пара расформировывается —
   * оставшийся игрок снова становится "ищет напарника" (используется и для
   * обычного ручного выбора двух pending-игроков, и для назначения "лишнему"
   * партнёра из уже занятой пары).
   */
  async function handleForcePair(categoryId: string, playerAId: string, playerBId: string) {
    const teamA = teams.find((t) => t.category_id === categoryId && t.player_id_1 === playerAId && !t.player_id_2);
    const teamB = teams.find((t) => t.category_id === categoryId && (t.player_id_1 === playerBId || t.player_id_2 === playerBId));
    if (!teamA || !teamB) return;

    setError(null);
    const teamBWasComplete = !!teamB.player_id_2;

    const { error: mergeError } = await supabase.from("teams").update({ player_id_2: playerBId }).eq("id", teamA.id);
    if (mergeError) { setError("Не удалось создать пару: " + mergeError.message); return; }

    if (teamBWasComplete) {
      const remainingPlayerId = teamB.player_id_1 === playerBId ? teamB.player_id_2! : teamB.player_id_1;
      const { error } = await supabase.from("teams").update({ player_id_1: remainingPlayerId, player_id_2: null }).eq("id", teamB.id);
      if (error) { setError("Не удалось обновить освободившегося партнёра: " + error.message); return; }
    } else {
      const { error } = await supabase.from("teams").delete().eq("id", teamB.id);
      if (error) { setError("Не удалось убрать пустую команду: " + error.message); return; }
    }

    setSelectedForPairing((prev) => ({ ...prev, [categoryId]: [] }));
    setOddOneOutTarget((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
    await loadAll();
  }

  async function handleAutoPairAll(categoryId: string) {
    const pending = teams.filter((t) => t.category_id === categoryId && !t.player_id_2);
    const shuffled = shuffle(pending);
    const pairsCount = Math.floor(shuffled.length / 2);

    setError(null);
    for (let i = 0; i < pairsCount; i++) {
      const a = shuffled[2 * i];
      const b = shuffled[2 * i + 1];
      const { error: updateError } = await supabase.from("teams").update({ player_id_2: b.player_id_1 }).eq("id", a.id);
      if (updateError) { setError("Не удалось сформировать пары: " + updateError.message); return; }
      const { error: deleteError } = await supabase.from("teams").delete().eq("id", b.id);
      if (deleteError) { setError("Не удалось сформировать пары: " + deleteError.message); return; }
    }
    await loadAll();
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
    const isDoublesLike = category.match_category !== "singles";
    const categoryTeams = teams.filter((t) => t.category_id === category.id);

    let participantIds: string[];
    // Для doubles/mixed участник генерации — уже готовая пара (команда), а не
    // игрок: к моменту генерации все зарегистрированные должны быть в парах
    // (иначе кнопка заблокирована), поэтому "команду-одиночку" тут создавать
    // не нужно — в отличие от singles.
    const teamIdByParticipant = new Map<string, string>();

    if (isDoublesLike) {
      const completeTeams = categoryTeams.filter((t) => t.player_id_2);
      if (completeTeams.length < 2) return;
      participantIds = completeTeams.map((t) => t.id);
      completeTeams.forEach((t) => teamIdByParticipant.set(t.id, t.id));
    } else {
      const categoryPlayerIds = registrations.filter((r) => r.category_id === category.id).map((r) => r.player_id);
      if (categoryPlayerIds.length < 2) return;
      participantIds = categoryPlayerIds;

      const existingSolo = new Map(categoryTeams.filter((t) => !t.player_id_2).map((t) => [t.player_id_1, t.id]));
      const missingPlayerIds = categoryPlayerIds.filter((pid) => !existingSolo.has(pid));

      if (missingPlayerIds.length > 0) {
        const { data, error } = await supabase
          .from("teams")
          .insert(missingPlayerIds.map((pid) => ({
            tournament_id: tournamentId, category_id: category.id, player_id_1: pid, player_id_2: null,
          })))
          .select("id, player_id_1");
        if (error) { setError("Не удалось создать команды: " + error.message); return; }
        (data || []).forEach((t) => existingSolo.set(t.player_id_1, t.id));
      }
      existingSolo.forEach((teamId, playerId) => teamIdByParticipant.set(playerId, teamId));
    }

    setError(null);
    setGeneratingCategoryId(category.id);

    function ratingOf(participantId: string): number {
      if (!isDoublesLike) return players.find((p) => p.id === participantId)?.rating_singles ?? 0;
      const team = categoryTeams.find((t) => t.id === participantId);
      if (!team) return 0;
      const r1 = players.find((p) => p.id === team.player_id_1)?.rating_doubles ?? 0;
      const r2 = team.player_id_2 ? players.find((p) => p.id === team.player_id_2)?.rating_doubles ?? 0 : 0;
      return team.player_id_2 ? (r1 + r2) / 2 : r1;
    }

    let pools;
    try {
      if (tournament.format === "groups") {
        const mode = distributionMode[category.id] ?? "auto";
        const basis = manualBasis[category.id] ?? "size";
        const parsedValue = parseInt(manualValue[category.id] || "", 10);
        const hasValidValue = Number.isFinite(parsedValue) && parsedValue > 0;

        pools = generateSchedule(tournament.format, participantIds, {
          distributionMode: mode,
          groupCount: mode === "manual" && basis === "count" && hasValidValue ? parsedValue : undefined,
          groupSize: mode === "manual" && basis === "size" && hasValidValue ? parsedValue : undefined,
          getRating: ratingOf,
        });
      } else {
        pools = generateSchedule(tournament.format, participantIds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сгенерировать сетку.");
      setGeneratingCategoryId(null);
      return;
    }

    if (tournament.format === "groups") {
      for (const pool of pools) {
        if (pool.groupNumber === null) continue;
        for (const participantId of pool.participants) {
          const teamId = teamIdByParticipant.get(participantId)!;
          const { error } = await supabase.from("teams").update({ group_number: pool.groupNumber }).eq("id", teamId);
          if (error) { setError("Не удалось сохранить группы: " + error.message); setGeneratingCategoryId(null); return; }
        }
      }
    }

    const matchRows = pools.flatMap((pool) =>
      pool.rounds.flatMap((pairs, idx) =>
        pairs.map(([a, b]) => ({
          tournament_id: tournamentId,
          category_id: category.id,
          round: idx + 1,
          group_number: pool.groupNumber,
          team_a_id: teamIdByParticipant.get(a)!,
          team_b_id: teamIdByParticipant.get(b)!,
          status: "pending",
        }))
      )
    );

    const { error } = await supabase.from("matches").insert(matchRows);
    if (error) setError("Не удалось сохранить сетку: " + error.message);
    else await loadAll();

    setGeneratingCategoryId(null);
  }

  /**
   * Переносит команду в другую группу и пересчитывает mini round robin
   * для обеих затронутых групп (старой и новой) с новым составом —
   * остальные группы категории не трогаются. Переиспользует тот же
   * generateRoundRobinRounds, что и обычная генерация.
   */
  async function handleMoveToGroup(category: Category, teamId: string, fromGroup: number, toGroup: number) {
    setError(null);
    const { error: moveError } = await supabase.from("teams").update({ group_number: toGroup }).eq("id", teamId);
    if (moveError) { setError("Не удалось переместить участника: " + moveError.message); return; }

    const { error: deleteError } = await supabase.from("matches").delete().eq("category_id", category.id).in("group_number", [fromGroup, toGroup]);
    if (deleteError) { setError("Не удалось пересчитать матчи: " + deleteError.message); return; }

    const updatedTeams = teams.map((t) => (t.id === teamId ? { ...t, group_number: toGroup } : t));
    const newMatchRows: { tournament_id: string; category_id: string; round: number; group_number: number; team_a_id: string; team_b_id: string; status: string }[] = [];

    for (const groupNumber of [fromGroup, toGroup]) {
      const groupTeamIds = updatedTeams.filter((t) => t.category_id === category.id && t.group_number === groupNumber).map((t) => t.id);
      if (groupTeamIds.length < 2) continue;
      const rounds = generateRoundRobinRounds(groupTeamIds);
      rounds.forEach((pairs, idx) => {
        pairs.forEach(([a, b]) => {
          newMatchRows.push({
            tournament_id: tournamentId, category_id: category.id, round: idx + 1, group_number: groupNumber,
            team_a_id: a, team_b_id: b, status: "pending",
          });
        });
      });
    }

    if (newMatchRows.length > 0) {
      const { error: insertError } = await supabase.from("matches").insert(newMatchRows);
      if (insertError) { setError("Не удалось сохранить пересчитанные матчи: " + insertError.message); return; }
    }

    setEditingGroupComposition({});
    await loadAll();
  }

  function startEditMatch(match: Match) {
    setEditingMatchId(match.id);
    setEditMatchSelections({ teamA: match.team_a_id, teamB: match.team_b_id });
  }

  function cancelEditMatch() {
    setEditingMatchId(null);
    setEditMatchSelections(null);
  }

  /**
   * Сохраняет ручную замену команд в матче. Жёсткая проверка — участник не
   * может одновременно играть другой матч того же раунда (той же группы/
   * категории). Мягкая — если правка ломает целостность round robin
   * (кто-то не сыграет с кем-то, или сыграет дважды), администратора просто
   * предупреждают и дают решить самому, сохранять ли.
   */
  async function handleUpdateMatch(match: Match, newTeamAId: string, newTeamBId: string) {
    setError(null);
    if (newTeamAId === newTeamBId) { setError("Команда не может играть сама с собой."); return; }

    const sameRoundGroup = matches.filter((m) =>
      m.id !== match.id && m.category_id === match.category_id && m.round === match.round && m.group_number === match.group_number
    );
    const busy = new Set(sameRoundGroup.flatMap((m) => [m.team_a_id, m.team_b_id]));
    if (busy.has(newTeamAId) || busy.has(newTeamBId)) {
      setError("Один из выбранных участников уже играет в этом раунде в другом матче.");
      return;
    }

    const groupTeamIds = teams
      .filter((t) => t.category_id === match.category_id && t.group_number === match.group_number)
      .map((t) => t.id);
    const groupMatchPairs = matches
      .filter((m) => m.category_id === match.category_id && m.group_number === match.group_number)
      .map((m) => (m.id === match.id
        ? { round: m.round, teamA: newTeamAId, teamB: newTeamBId }
        : { round: m.round, teamA: m.team_a_id, teamB: m.team_b_id }));
    const issues = checkRoundRobinIntegrity(groupTeamIds, groupMatchPairs);
    if (issues.length > 0) {
      const proceed = window.confirm(
        "Внимание: после этого изменения корректность round robin не гарантируется:\n\n" + issues.join("\n") + "\n\nСохранить всё равно?"
      );
      if (!proceed) return;
    }

    const { error } = await supabase.from("matches").update({ team_a_id: newTeamAId, team_b_id: newTeamBId }).eq("id", match.id);
    if (error) { setError("Не удалось сохранить изменения: " + error.message); return; }
    cancelEditMatch();
    await loadAll();
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

            const isDoublesLike = category.match_category !== "singles";
            const categoryTeams = teams.filter((t) => t.category_id === category.id);
            const pendingTeams = isDoublesLike ? categoryTeams.filter((t) => !t.player_id_2) : [];
            const completeTeams = isDoublesLike ? categoryTeams.filter((t) => t.player_id_2) : [];
            const hasPending = pendingTeams.length > 0;
            const participantCount = isDoublesLike ? completeTeams.length : categoryRegistrations.length;

            const pending = pendingRegistration[category.id];
            const partnerSearch = (partnerSearchByCategory[category.id] || "").trim().toLowerCase();
            const partnerSearchResults = pending && partnerSearch
              ? players.filter((p) => !registeredPlayerIds.has(p.id) && p.id !== pending.playerId && p.full_name.toLowerCase().includes(partnerSearch)).slice(0, 8)
              : [];

            const selectedPairIds = selectedForPairing[category.id] || [];
            const oddOneOut = pendingTeams.length % 2 === 1 ? pendingTeams[pendingTeams.length - 1] : null;
            const otherPendingForOddOneOut = oddOneOut ? pendingTeams.filter((t) => t.id !== oddOneOut.id) : [];

            const categoryMatches = matches.filter((m) => m.category_id === category.id);
            const isLocked = categoryMatches.length > 0;
            const isGroupsFormat = tournament.format === "groups";
            // Состав группы берём из teams (а не из matches) — иначе группа,
            // после переноса оставшаяся с 1 участником (0 матчей), пропала бы
            // из интерфейса и стала бы недоступна для правки.
            const groupNumbersForDisplay = isGroupsFormat
              ? Array.from(new Set(categoryTeams.map((t) => t.group_number).filter((g): g is number => g !== null))).sort((a, b) => a - b)
              : [null];

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
                      const team = isDoublesLike ? categoryTeams.find((t) => t.player_id_1 === r.player_id || t.player_id_2 === r.player_id) : undefined;
                      const partnerName = team?.player_id_2
                        ? players.find((p) => p.id === (team.player_id_1 === r.player_id ? team.player_id_2 : team.player_id_1))?.full_name
                        : undefined;
                      return (
                        <div key={r.id} className={"flex items-center justify-between px-4 py-2.5 " + (i !== categoryRegistrations.length - 1 ? "border-b border-black/5" : "")}>
                          <span className="text-ink text-sm">
                            {player?.full_name || "Неизвестный игрок"}
                            {isDoublesLike && (
                              <span className="text-xs text-slateGray"> · {partnerName ? `в паре с ${partnerName}` : "ищет напарника"}</span>
                            )}
                          </span>
                          {!isLocked && (
                            <button onClick={() => handleRemovePlayer(r)} className="text-xs text-slateGray hover:text-shuttle transition">Убрать</button>
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
                ) : pending ? (
                  <div>
                    {!pending.awaitingPartner ? (
                      <div className="flex items-center justify-between bg-courtLine/60 rounded-lg px-4 py-3">
                        <span className="text-sm text-ink">Напарник для «{pending.playerName}»?</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleRegisterSolo(category.id, pending.playerId)} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-black/10 hover:border-court transition">Ищу напарника</button>
                          <button onClick={() => setPendingRegistration((prev) => ({ ...prev, [category.id]: { ...pending, awaitingPartner: true } }))} className="text-xs px-3 py-1.5 rounded-lg bg-shuttle text-white hover:bg-shuttle/90 transition">Есть напарник</button>
                          <button onClick={() => setPendingRegistration((prev) => { const next = { ...prev }; delete next[category.id]; return next; })} className="text-xs text-slateGray hover:text-shuttle transition">Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-ink mb-2">Напарник для «{pending.playerName}»:</p>
                        <input
                          type="text"
                          value={partnerSearchByCategory[category.id] || ""}
                          onChange={(e) => setPartnerSearchByCategory((prev) => ({ ...prev, [category.id]: e.target.value }))}
                          placeholder="Поиск напарника по имени..."
                          className="w-full border border-black/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-court"
                        />
                        {partnerSearchResults.length > 0 && (
                          <div className="border border-black/5 rounded-lg mt-2 overflow-hidden">
                            {partnerSearchResults.map((p, i) => (
                              <div key={p.id} className={"flex items-center justify-between px-4 py-2 " + (i !== partnerSearchResults.length - 1 ? "border-b border-black/5" : "")}>
                                <span className="text-ink text-sm">{p.full_name}</span>
                                <button onClick={() => handleRegisterPair(category.id, pending.playerId, p.id)} className="text-xs text-shuttle hover:text-shuttle/70 transition font-medium">+ Добавить пару</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => setPendingRegistration((prev) => { const next = { ...prev }; delete next[category.id]; return next; })} className="text-xs text-slateGray hover:text-shuttle transition mt-2">Отмена</button>
                      </div>
                    )}
                  </div>
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
                              onClick={() => {
                                if (isDoublesLike) {
                                  setPendingRegistration((prev) => ({ ...prev, [category.id]: { playerId: p.id, playerName: p.full_name, awaitingPartner: false } }));
                                  setSearchByCategory((prev) => ({ ...prev, [category.id]: "" }));
                                } else {
                                  handleAddPlayer(category.id, p.id);
                                  setSearchByCategory((prev) => ({ ...prev, [category.id]: "" }));
                                }
                              }}
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

                {!isLocked && isDoublesLike && pendingTeams.length > 0 && (
                  <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-ink">Ищут напарника ({pendingTeams.length})</h3>
                      <button onClick={() => handleAutoPairAll(category.id)} className="text-xs px-3 py-1.5 rounded-lg bg-shuttle text-white hover:bg-shuttle/90 transition">Сформировать пары автоматически</button>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {pendingTeams.filter((t) => t.id !== oddOneOut?.id).map((t) => {
                        const playerName = players.find((p) => p.id === t.player_id_1)?.full_name || "—";
                        const checked = selectedPairIds.includes(t.player_id_1);
                        return (
                          <label key={t.id} className="flex items-center gap-2 text-sm text-ink bg-white rounded-lg px-3 py-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedForPairing((prev) => {
                                const current = prev[category.id] || [];
                                if (checked) return { ...prev, [category.id]: current.filter((id) => id !== t.player_id_1) };
                                if (current.length >= 2) return prev;
                                return { ...prev, [category.id]: [...current, t.player_id_1] };
                              })}
                            />
                            {playerName}
                          </label>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => { if (selectedPairIds.length === 2) handleForcePair(category.id, selectedPairIds[0], selectedPairIds[1]); }}
                      disabled={selectedPairIds.length !== 2}
                      className="text-xs px-3 py-1.5 rounded-lg bg-court text-white hover:bg-court/90 transition disabled:opacity-40 mb-3"
                    >
                      Создать пару из выбранных
                    </button>

                    {oddOneOut && (
                      <div className="border-t border-black/10 pt-3">
                        <p className="text-sm text-ink mb-2">
                          {players.find((p) => p.id === oddOneOut.player_id_1)?.full_name || "—"} — <span className="text-shuttle font-medium">без пары</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={oddOneOutTarget[category.id] || ""}
                            onChange={(e) => setOddOneOutTarget((prev) => ({ ...prev, [category.id]: e.target.value }))}
                            className="border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-court bg-white"
                          >
                            <option value="">Назначить напарника...</option>
                            {otherPendingForOddOneOut.map((t) => (
                              <option key={t.player_id_1} value={t.player_id_1}>
                                {players.find((p) => p.id === t.player_id_1)?.full_name} (без пары)
                              </option>
                            ))}
                            {completeTeams.flatMap((t) => [
                              <option key={t.player_id_1} value={t.player_id_1}>
                                {players.find((p) => p.id === t.player_id_1)?.full_name} (в паре)
                              </option>,
                              <option key={t.player_id_2!} value={t.player_id_2!}>
                                {players.find((p) => p.id === t.player_id_2)?.full_name} (в паре)
                              </option>,
                            ])}
                          </select>
                          <button
                            onClick={() => {
                              const targetId = oddOneOutTarget[category.id];
                              if (!targetId) return;
                              const targetInPair = completeTeams.some((t) => t.player_id_1 === targetId || t.player_id_2 === targetId);
                              if (targetInPair && !window.confirm("Это расформирует существующую пару. Продолжить?")) return;
                              handleForcePair(category.id, oddOneOut.player_id_1, targetId);
                              setOddOneOutTarget((prev) => { const next = { ...prev }; delete next[category.id]; return next; });
                            }}
                            disabled={!oddOneOutTarget[category.id]}
                            className="text-xs px-3 py-2 rounded-lg bg-court text-white hover:bg-court/90 transition disabled:opacity-40"
                          >
                            Назначить
                          </button>
                          <button
                            onClick={() => handleRemovePlayer({ id: categoryRegistrations.find((r) => r.player_id === oddOneOut.player_id_1)!.id, category_id: category.id, player_id: oddOneOut.player_id_1 })}
                            className="text-xs text-slateGray hover:text-shuttle transition"
                          >
                            Убрать из категории
                          </button>
                        </div>
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
                        {groupNumbersForDisplay.map((groupNumber) => {
                          const groupTeamIds = groupNumber !== null
                            ? categoryTeams.filter((t) => t.group_number === groupNumber).map((t) => t.id)
                            : categoryTeams.map((t) => t.id);
                          const groupMatches = categoryMatches.filter((m) => m.group_number === groupNumber);

                          const roundsMap = new Map<number, Match[]>();
                          groupMatches.forEach((m) => {
                            if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
                            roundsMap.get(m.round)!.push(m);
                          });
                          const roundsForGroup = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);

                          const editKey = `${category.id}:${groupNumber}`;
                          const isEditingComposition = !!editingGroupComposition[editKey];
                          const otherGroupNumbers = groupNumbersForDisplay.filter((g): g is number => g !== null && g !== groupNumber);

                          return (
                            <div key={groupNumber ?? "single"}>
                              {groupNumber !== null && (
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold text-court">Группа {groupNumber}</p>
                                  <button
                                    onClick={() => setEditingGroupComposition((prev) => ({ ...prev, [editKey]: !prev[editKey] }))}
                                    className="text-xs text-shuttle hover:text-shuttle/70 transition"
                                  >
                                    {isEditingComposition ? "Готово" : "Изменить состав"}
                                  </button>
                                </div>
                              )}

                              {isEditingComposition && (
                                <div className="border border-black/10 rounded-lg p-3 mb-3 space-y-1.5 bg-courtLine/40">
                                  {groupTeamIds.length === 0 ? (
                                    <p className="text-xs text-slateGray">Группа пуста.</p>
                                  ) : groupTeamIds.map((teamId) => (
                                    <div key={teamId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-1.5">
                                      <span className="text-ink">{teamLabel(teamId)}</span>
                                      {otherGroupNumbers.length > 0 && (
                                        <select
                                          value=""
                                          onChange={(e) => { if (e.target.value) handleMoveToGroup(category, teamId, groupNumber!, parseInt(e.target.value, 10)); }}
                                          className="text-xs border border-black/10 rounded px-2 py-1 bg-white outline-none"
                                        >
                                          <option value="">Переместить в...</option>
                                          {otherGroupNumbers.map((g) => <option key={g} value={g}>Группа {g}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {groupTeamIds.length > 0 && roundsForGroup.length === 0 && (
                                <p className="text-xs text-slateGray">В группе меньше 2 участников — матчей нет.</p>
                              )}

                              <div className="space-y-4">
                                {roundsForGroup.map(([round, roundMatches]) => (
                                  <div key={round}>
                                    <p className="text-xs font-medium text-slateGray mb-1.5">Раунд {round}</p>
                                    <div className="space-y-1.5">
                                      {roundMatches.map((m) => {
                                        const isEditingThis = editingMatchId === m.id;
                                        const busyElsewhere = new Set(
                                          categoryMatches
                                            .filter((other) => other.id !== m.id && other.round === m.round && other.group_number === m.group_number)
                                            .flatMap((other) => [other.team_a_id, other.team_b_id])
                                        );
                                        const candidates = groupTeamIds.filter((id) => !busyElsewhere.has(id));

                                        if (!isEditingThis) {
                                          return (
                                            <div key={m.id} className="flex items-center justify-between text-sm bg-courtLine/60 rounded-lg px-3 py-2">
                                              <span className="text-ink">{teamLabel(m.team_a_id)}</span>
                                              <span className="text-slateGray text-xs">vs</span>
                                              <span className="text-ink">{teamLabel(m.team_b_id)}</span>
                                              <button onClick={() => startEditMatch(m)} className="text-xs text-shuttle hover:text-shuttle/70 transition ml-3">Изменить</button>
                                            </div>
                                          );
                                        }

                                        const sel = editMatchSelections!;
                                        return (
                                          <div key={m.id} className="flex items-center gap-2 text-sm bg-white border border-black/10 rounded-lg px-3 py-2 flex-wrap">
                                            <select
                                              value={sel.teamA}
                                              onChange={(e) => setEditMatchSelections({ ...sel, teamA: e.target.value })}
                                              className="text-xs border border-black/10 rounded px-2 py-1 bg-white outline-none"
                                            >
                                              {candidates.filter((id) => id !== sel.teamB).map((id) => (
                                                <option key={id} value={id}>{teamLabel(id)}</option>
                                              ))}
                                            </select>
                                            <span className="text-slateGray text-xs">vs</span>
                                            <select
                                              value={sel.teamB}
                                              onChange={(e) => setEditMatchSelections({ ...sel, teamB: e.target.value })}
                                              className="text-xs border border-black/10 rounded px-2 py-1 bg-white outline-none"
                                            >
                                              {candidates.filter((id) => id !== sel.teamA).map((id) => (
                                                <option key={id} value={id}>{teamLabel(id)}</option>
                                              ))}
                                            </select>
                                            <button onClick={() => handleUpdateMatch(m, sel.teamA, sel.teamB)} className="text-xs px-2 py-1 rounded bg-court text-white hover:bg-court/90 transition">Сохранить</button>
                                            <button onClick={cancelEditMatch} className="text-xs text-slateGray hover:text-shuttle transition">Отмена</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : hasPending ? (
                    <p className="text-xs text-shuttle">Не все игроки распределены по парам.</p>
                  ) : participantCount >= 2 ? (
                    (() => {
                      const isGroups = tournament.format === "groups";
                      const mode = distributionMode[category.id] ?? "auto";
                      const basis = manualBasis[category.id] ?? "size";
                      const rawValue = manualValue[category.id] || "";
                      const parsedValue = parseInt(rawValue, 10);
                      const hasValidValue = Number.isFinite(parsedValue) && parsedValue > 0;
                      const manualReady = mode !== "manual" || hasValidValue;
                      const canGenerate = !isGroups || manualReady;

                      const previewSizes = isGroups
                        ? resolveGroupSizes(
                            participantCount,
                            mode === "manual" && basis === "count" && hasValidValue ? parsedValue : undefined,
                            mode === "manual" && basis === "size" && hasValidValue ? parsedValue : undefined
                          )
                        : [];
                      const participantWord = isDoublesLike ? "пар" : "игроков";
                      const previewText = previewSizes.length
                        ? previewSizes.every((s) => s === previewSizes[0])
                          ? `${participantCount} ${participantWord} → ${previewSizes.length} ${previewSizes.length === 1 ? "группа" : "группы"} по ${previewSizes[0]}`
                          : `${participantCount} ${participantWord} → ${previewSizes.length} групп (${previewSizes.join(", ")})`
                        : "";

                      return (
                        <div>
                          {isGroups && (
                            <div className="mb-4 space-y-3">
                              <div className="flex gap-4">
                                {([
                                  { value: "auto", label: "Авто" },
                                  { value: "random", label: "Случайно" },
                                  { value: "manual", label: "Вручную" },
                                ] as { value: GroupDistributionMode; label: string }[]).map((opt) => (
                                  <label key={opt.value} className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`distribution-${category.id}`}
                                      checked={mode === opt.value}
                                      onChange={() => setDistributionMode((prev) => ({ ...prev, [category.id]: opt.value }))}
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>

                              {mode === "manual" && (
                                <div className="flex items-end gap-3">
                                  <div>
                                    <label className="text-xs text-slateGray mb-1 block">Параметр</label>
                                    <select
                                      value={basis}
                                      onChange={(e) => setManualBasis((prev) => ({ ...prev, [category.id]: e.target.value as "count" | "size" }))}
                                      className="border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-court bg-white"
                                    >
                                      <option value="size">Размер группы</option>
                                      <option value="count">Число групп</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-slateGray mb-1 block">{basis === "size" ? "Игроков в группе" : "Групп"}</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={rawValue}
                                      onChange={(e) => setManualValue((prev) => ({ ...prev, [category.id]: e.target.value }))}
                                      className="w-28 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-court"
                                    />
                                  </div>
                                </div>
                              )}

                              {previewText && <p className="text-xs text-slateGray">{previewText}</p>}
                            </div>
                          )}

                          <button
                            onClick={() => handleGenerateBracket(category)}
                            disabled={generatingCategoryId === category.id || !canGenerate}
                            className="px-5 py-2.5 rounded-xl bg-court text-white font-semibold hover:bg-court/90 transition disabled:opacity-50"
                          >
                            {generatingCategoryId === category.id ? "Генерирую..." : "Сгенерировать сетку"}
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-slateGray">
                      {isDoublesLike
                        ? "Нужно минимум 2 сформированные пары, чтобы сгенерировать сетку."
                        : "Нужно минимум 2 зарегистрированных игрока, чтобы сгенерировать сетку."}
                    </p>
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
