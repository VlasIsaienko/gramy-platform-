// bracket.ts — генерация расписания матчей по формату турнира.
// Чистая логика без обращений к Supabase, чтобы её было легко переиспользовать
// и покрыть тестами отдельно от UI.

export type Round<T> = Array<[T, T]>;

/**
 * Round-robin по circle method: каждый участник играет с каждым ровно один раз.
 * При нечётном числе участников добавляется виртуальный bye — участник,
 * попавший на bye в раунде, в этом раунде просто не играет.
 */
export function generateRoundRobinRounds<T>(participants: T[]): Round<T>[] {
  if (participants.length < 2) return [];

  const current: (T | null)[] = [...participants];
  if (current.length % 2 !== 0) current.push(null);

  const n = current.length;
  const rounds: Round<T>[] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: Round<T> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);

    const fixed = current[0];
    const rest = current.slice(1);
    rest.unshift(rest.pop() as T | null);
    current.splice(0, current.length, fixed, ...rest);
  }

  return rounds;
}

export type TournamentFormat = "olympic" | "round_robin" | "groups" | "mexicano" | "americano";

/**
 * Один "пул" участников со своим расписанием. Для round_robin — единственный
 * пул со всеми участниками (groupNumber = null). Для groups — по одному пулу
 * на группу (groupNumber = 1, 2, 3...), внутри каждого свой mini round robin.
 */
export interface Pool<T> {
  groupNumber: number | null;
  participants: T[];
  rounds: Round<T>[];
}

/** Балансирует n элементов по numGroups группам: размеры отличаются максимум на 1. */
function computeGroupSizes(n: number, numGroups: number): number[] {
  const base = Math.floor(n / numGroups);
  const remainder = n % numGroups;
  return Array.from({ length: numGroups }, (_, g) => base + (g < remainder ? 1 : 0));
}

/**
 * Считает размеры групп по явному числу групп / размеру группы, а если ни то,
 * ни другое не задано — по умолчанию (целевой размер ~4, что на практике даёт
 * группы по 3-4 человека и без "сиротской" группы из 1 человека).
 */
export function resolveGroupSizes(n: number, groupCount?: number, groupSize?: number): number[] {
  let numGroups: number;
  if (groupCount && groupCount > 0) numGroups = Math.min(Math.floor(groupCount), n);
  else if (groupSize && groupSize > 0) numGroups = Math.ceil(n / groupSize);
  else numGroups = Math.ceil(n / 4);

  return computeGroupSizes(n, Math.max(1, numGroups));
}

/**
 * Делит участников на группы фиксированного целевого размера (без учёта
 * рейтинга или перемешивания — просто по порядку). Используется, когда
 * распределение внутри группы не важно.
 */
export function splitIntoGroups<T>(participants: T[], targetSize = 4): T[][] {
  const n = participants.length;
  if (n === 0) return [];

  const sizes = resolveGroupSizes(n, undefined, targetSize);
  const groups: T[][] = [];
  let idx = 0;
  for (const size of sizes) {
    groups.push(participants.slice(idx, idx + size));
    idx += size;
  }
  return groups;
}

/** Fisher-Yates shuffle. Публичный — переиспользуется и вне генератора сетки (например, для авто-формирования пар). */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Раздаёт участников по кругу: 1→A, 2→B, 3→C, 4→A, 5→B... (без учёта порядка). */
function dealCyclic<T>(items: T[], numGroups: number): T[][] {
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  items.forEach((item, i) => groups[i % numGroups].push(item));
  return groups;
}

/**
 * Раздаёт УЖЕ отсортированных участников змейкой: 1→A, 2→B, 3→C, затем
 * обратный порядок C→B→A, затем снова A→B→C, и т.д. — так топ-рейтинг
 * распределяется по группам равномерно, а не оседает в одной группе.
 * groupSizes может быть неравномерным (отличаться максимум на 1) —
 * группа, уже набравшая свой размер, пропускается.
 */
function snakeSeed<T>(sortedParticipants: T[], groupSizes: number[]): T[][] {
  const groups: T[][] = groupSizes.map(() => []);
  const maxRounds = Math.max(...groupSizes);
  const indices = groupSizes.map((_, i) => i);
  let ptr = 0;

  for (let round = 0; round < maxRounds; round++) {
    const order = round % 2 === 0 ? indices : [...indices].reverse();
    for (const gi of order) {
      if (groups[gi].length < groupSizes[gi] && ptr < sortedParticipants.length) {
        groups[gi].push(sortedParticipants[ptr]);
        ptr++;
      }
    }
  }
  return groups;
}

export type GroupDistributionMode = "auto" | "random" | "manual";

export interface GroupsScheduleOptions<T> {
  distributionMode?: GroupDistributionMode; // по умолчанию "auto"
  groupCount?: number; // используется только для "manual"
  groupSize?: number; // используется только для "manual" (если groupCount не задан)
  getRating?: (participant: T) => number; // нужен для "auto"/"manual"-змейки; для "random" не используется
}

function generateGroupsSchedule<T>(participants: T[], options?: GroupsScheduleOptions<T>): Pool<T>[] {
  const mode = options?.distributionMode ?? "auto";
  const groupSizes = resolveGroupSizes(participants.length, options?.groupCount, options?.groupSize);

  const groups: T[][] =
    mode === "random"
      ? dealCyclic(shuffle(participants), groupSizes.length)
      : snakeSeed(
          [...participants].sort((a, b) => (options?.getRating?.(b) ?? 0) - (options?.getRating?.(a) ?? 0)),
          groupSizes
        );

  return groups.map((group, i) => ({
    groupNumber: i + 1,
    participants: group,
    rounds: generateRoundRobinRounds(group),
  }));
}

/**
 * Диспетчер расписания по формату турнира. Round robin и groups реализованы
 * (groups переиспользует generateRoundRobinRounds внутри каждой группы).
 * Mexicano/Americano — свой подбор пар по раундам — добавятся сюда отдельной
 * веткой позже.
 */
export function generateSchedule<T>(
  format: TournamentFormat,
  participants: T[],
  groupsOptions?: GroupsScheduleOptions<T>
): Pool<T>[] {
  switch (format) {
    case "round_robin":
      return [{ groupNumber: null, participants, rounds: generateRoundRobinRounds(participants) }];
    case "groups":
      return generateGroupsSchedule(participants, groupsOptions);
    default:
      throw new Error(`Формат "${format}" пока не поддерживается генератором сетки.`);
  }
}

// ============================================================
// Поддержка ручного редактирования уже сгенерированной сетки.
// Не меняет и не вызывает алгоритмы генерации/распределения выше —
// это отдельная, чисто проверочная функция для матчей после правки.
// ============================================================

export interface MatchPair {
  round: number;
  teamA: string;
  teamB: string;
}

/**
 * Проверяет целостность round robin для одной группы/категории:
 * никто не играет дважды в одном раунде, каждая пара участников
 * встречается ровно один раз. Используется только для необязательного
 * предупреждения после ручной правки матча — ничего не блокирует.
 */
export function checkRoundRobinIntegrity(participantIds: string[], matchPairs: MatchPair[]): string[] {
  const issues = new Set<string>();
  const pairCounts = new Map<string, number>();
  const roundOccupants = new Map<number, Set<string>>();

  for (const { round, teamA, teamB } of matchPairs) {
    if (teamA === teamB) {
      issues.add("Участник не может играть сам с собой.");
      continue;
    }
    const key = [teamA, teamB].sort().join("||");
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);

    const occupants = roundOccupants.get(round) ?? new Set<string>();
    if (occupants.has(teamA) || occupants.has(teamB)) {
      issues.add(`Кто-то играет больше одного матча в раунде ${round}.`);
    }
    occupants.add(teamA);
    occupants.add(teamB);
    roundOccupants.set(round, occupants);
  }

  for (const count of pairCounts.values()) {
    if (count > 1) issues.add("Какая-то пара играет между собой больше одного раза.");
  }

  const expectedPairs = (participantIds.length * (participantIds.length - 1)) / 2;
  if (pairCounts.size < expectedPairs) {
    issues.add("Не все участники сыграют друг с другом ровно один раз.");
  }

  return Array.from(issues);
}
