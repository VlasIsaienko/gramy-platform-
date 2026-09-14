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
// Olympic / Single Elimination.
//
// Принципиально отличается от round_robin/groups: полная сетка не
// известна заранее — раунд N+1 строится только когда известны
// победители раунда N. Поэтому Olympic не проходит через общий
// generateSchedule() (его контракт — вся сетка целиком, Pool<T>[]) —
// у него свои функции: generateOlympicBracket() для первого раунда
// (сразу целиком, с посевом и bye) и generateNextOlympicRound() для
// каждого последующего раунда по мере готовности результатов.
// ============================================================

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Классический порядок сеяния турнирной сетки: для size=8 даёт
 * [1,8,4,5,2,7,3,6] — сеед 1 и 2 не могут встретиться раньше финала,
 * сеед 1 и 3/4 — раньше полуфинала, и т.д. Возвращает номера сеедов
 * (1-индексация) в порядке позиций в сетке, длина = size.
 */
function computeSeedOrder(size: number): number[] {
  let seeds = [1];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) next.push(s, n + 1 - s);
    seeds = next;
  }
  return seeds;
}

/**
 * Случайно раскидывает участников по size позициям, гарантируя, что
 * bye не достанется сразу двум позициям одной пары (иначе получился
 * бы матч без единого реального участника).
 */
function randomSeedSlots<T>(participants: T[], size: number): (T | null)[] {
  const n = participants.length;
  const byeCount = size - n;
  const pairCount = size / 2;
  const shuffledParticipants = shuffle(participants);
  const byePairs = new Set(shuffle(Array.from({ length: pairCount }, (_, i) => i)).slice(0, byeCount));

  const slots: (T | null)[] = new Array(size).fill(null);
  let ptr = 0;
  for (let pair = 0; pair < pairCount; pair++) {
    slots[pair * 2] = shuffledParticipants[ptr++];
    slots[pair * 2 + 1] = byePairs.has(pair) ? null : shuffledParticipants[ptr++];
  }
  return slots;
}

export type OlympicSeedingMode = "auto" | "random" | "manual";

export interface OlympicScheduleOptions<T> {
  seedingMode?: OlympicSeedingMode; // по умолчанию "auto"
  getRating?: (participant: T) => number; // нужен для "auto"
  manualSlots?: (T | null)[]; // нужен для "manual": длина = ближайшая степень двойки, null = bye
}

export interface OlympicFirstRoundMatch<T> {
  bracketPosition: number;
  teamA: T | null;
  teamB: T | null; // null означает bye — teamA автоматически проходит дальше
}

export interface OlympicBracket<T> {
  size: number; // ближайшая степень двойки ≥ числу участников
  totalRounds: number; // log2(size)
  firstRound: OlympicFirstRoundMatch<T>[];
}

export function generateOlympicBracket<T>(participants: T[], options?: OlympicScheduleOptions<T>): OlympicBracket<T> {
  const n = participants.length;
  const size = nextPowerOfTwo(n);
  const totalRounds = Math.log2(size);
  const mode = options?.seedingMode ?? "auto";

  let slots: (T | null)[];
  if (mode === "manual") {
    if (!options?.manualSlots || options.manualSlots.length !== size) {
      throw new Error("Для ручного посева нужно указать участника или bye для каждой позиции сетки.");
    }
    slots = options.manualSlots;
  } else if (mode === "random") {
    slots = randomSeedSlots(participants, size);
  } else {
    const sorted = [...participants].sort((a, b) => (options?.getRating?.(b) ?? 0) - (options?.getRating?.(a) ?? 0));
    const seedOrder = computeSeedOrder(size);
    slots = seedOrder.map((seedNum) => (seedNum <= n ? sorted[seedNum - 1] : null));
  }

  const firstRound: OlympicFirstRoundMatch<T>[] = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({ bracketPosition: i, teamA: slots[2 * i], teamB: slots[2 * i + 1] });
  }

  return { size, totalRounds, firstRound };
}

export interface DecidedOlympicMatch<T> {
  bracketPosition: number;
  teamA: T;
  teamB: T | null;
  winner: T;
}

export interface NextOlympicRoundResult<T> {
  matches: Array<{ bracketPosition: number; teamA: T; teamB: T }>;
  thirdPlace: { teamA: T; teamB: T } | null;
}

/**
 * Строит следующий раунд из победителей уже решённого раунда (bye тоже
 * считается решённым матчем со своим winner). Если это был полуфинал
 * (ровно 2 матча) и playThirdPlace=true, дополнительно возвращает матч
 * за 3-е место между проигравшими полуфиналов.
 */
export function generateNextOlympicRound<T>(
  currentRoundMatches: DecidedOlympicMatch<T>[],
  playThirdPlace: boolean
): NextOlympicRoundResult<T> {
  const sorted = [...currentRoundMatches].sort((a, b) => a.bracketPosition - b.bracketPosition);
  const winners = sorted.map((m) => m.winner);

  if (winners.length < 2) return { matches: [], thirdPlace: null };

  const matches: Array<{ bracketPosition: number; teamA: T; teamB: T }> = [];
  for (let i = 0; i < winners.length / 2; i++) {
    matches.push({ bracketPosition: i, teamA: winners[2 * i], teamB: winners[2 * i + 1] });
  }

  let thirdPlace: { teamA: T; teamB: T } | null = null;
  if (playThirdPlace && sorted.length === 2) {
    const loserOf = (m: DecidedOlympicMatch<T>): T => (m.winner === m.teamA ? m.teamB! : m.teamA);
    thirdPlace = { teamA: loserOf(sorted[0]), teamB: loserOf(sorted[1]) };
  }

  return { matches, thirdPlace };
}

/** Понятная подпись раунда для двух последних раундов сетки на выбывание. */
export function olympicRoundLabel(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round;
  if (roundsFromEnd === 0) return "Финал";
  if (roundsFromEnd === 1) return "Полуфинал";
  if (roundsFromEnd === 2) return "1/4 финала";
  if (roundsFromEnd === 3) return "1/8 финала";
  return `Раунд ${round}`;
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

// ============================================================
// Счёт матча — общий для всех форматов (round_robin, groups, olympic,
// в будущем mexicano/americano). Один сет до 15 очков; при 14:14 нужен
// перевес в 2 очка, но жёсткий потолок на 16 — 16:15 тоже завершает
// матч, даже с разницей в 1 очко.
// ============================================================

export interface MatchScoreResult {
  valid: boolean;
  error?: string;
  winner?: "A" | "B";
}

/** Допустимые финальные счета: 15:X (X=0..13, перевес ≥2), 16:14, 16:15. */
export function validateMatchScore(scoreA: number, scoreB: number): MatchScoreResult {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return { valid: false, error: "Счёт должен быть неотрицательным целым числом." };
  }
  if (scoreA === scoreB) {
    return { valid: false, error: "Счёт не может быть равным — нужен победитель." };
  }

  const leader = Math.max(scoreA, scoreB);
  const trailer = Math.min(scoreA, scoreB);

  if (leader > 16) {
    return { valid: false, error: "Счёт не может превышать 16 очков." };
  }
  const isFinished = (leader === 15 && leader - trailer >= 2) || leader === 16;
  if (!isFinished) {
    return { valid: false, error: "Незавершённый счёт: игра до 15 (перевес ≥2) либо до потолка 16." };
  }

  return { valid: true, winner: scoreA > scoreB ? "A" : "B" };
}

export type ScoringFormat = "single_set" | "best_of_3";

/**
 * Best of 3: побеждает тот, кто первым выиграл 2 сета. Каждый сет по
 * отдельности уже должен быть валиден по validateMatchScore — эта функция
 * просто считает победы по уже сыгранным сетам и не решает ничего, пока
 * побед меньше 2 (третий сет играется только при счёте 1:1).
 */
export function bestOf3Winner(setResults: Array<{ scoreA: number; scoreB: number }>): "A" | "B" | null {
  const aWins = setResults.filter((s) => s.scoreA > s.scoreB).length;
  const bWins = setResults.filter((s) => s.scoreB > s.scoreA).length;
  if (aWins >= 2) return "A";
  if (bWins >= 2) return "B";
  return null;
}

// ============================================================
// Mexicano / Americano — корты по 4 человека (2×2), партнёры меняются
// каждый раунд. Участник здесь — ИГРОК, а не команда (в отличие от
// round_robin/groups/olympic, где участник — уже сформированная команда):
// пары внутри корта формируются заново на каждый раунд.
// ============================================================

export interface Court<T> {
  courtNumber: number;
  teamA: [T, T];
  teamB: [T, T];
}

function requireMultipleOfFour(n: number): void {
  if (n % 4 !== 0) {
    throw new Error(`Число игроков должно быть кратно 4 для формата Mexicano/Americano, сейчас: ${n}`);
  }
}

/** Корт 1 = первые 4 по порядку, корт 2 = следующие 4 и т.д. Внутри корта — 1-й+4-й против 2-го+3-го (баланс силы). */
function formCourtsFromOrder<T>(orderedPlayers: T[]): Court<T>[] {
  const courts: Court<T>[] = [];
  for (let i = 0; i < orderedPlayers.length; i += 4) {
    const [p1, p2, p3, p4] = orderedPlayers.slice(i, i + 4);
    courts.push({ courtNumber: i / 4 + 1, teamA: [p1, p4], teamB: [p2, p3] });
  }
  return courts;
}

export type MexicanoSeedingMode = "auto" | "random";

/** Первый раунд Mexicano: посев по рейтингу или случайный, затем разбивка на корты. */
export function generateMexicanoRound<T>(
  players: T[],
  options: { seedingMode: MexicanoSeedingMode; getRating?: (p: T) => number }
): Court<T>[] {
  requireMultipleOfFour(players.length);
  const ordered = options.seedingMode === "random"
    ? shuffle(players)
    : [...players].sort((a, b) => (options.getRating?.(b) ?? 0) - (options.getRating?.(a) ?? 0));
  return formCourtsFromOrder(ordered);
}

/**
 * Следующий раунд Mexicano: игроки пересортировываются по накопленным
 * очкам с начала турнира (по убыванию) и снова разбиваются на корты по 4
 * той же балансировкой — так "победители играют с победителями".
 */
export function generateMexicanoNextRound<T>(players: T[], getCumulativePoints: (p: T) => number): Court<T>[] {
  requireMultipleOfFour(players.length);
  const ordered = [...players].sort((a, b) => getCumulativePoints(b) - getCumulativePoints(a));
  return formCourtsFromOrder(ordered);
}

/**
 * Полная сетка Americano на roundCount раундов: фиксирует первого игрока,
 * вращает остальных (тот же принцип, что и circle method round robin),
 * группами по 4 внутри каждого раунда — так партнёры/соперники меняются
 * от раунда к раунду. Не гарантирует математически отсутствие повторов
 * при большом числе раундов относительно числа игроков — для этого нужна
 * отдельная комбинаторная схема, что excessive для текущей задачи.
 */
export function generateAmericanoSchedule<T>(players: T[], roundCount: number): Court<T>[][] {
  requireMultipleOfFour(players.length);
  const rounds: Court<T>[][] = [];
  let current = [...players];

  for (let r = 0; r < roundCount; r++) {
    rounds.push(formCourtsFromOrder(current));

    const fixed = current[0];
    const rest = current.slice(1);
    rest.unshift(rest.pop() as T);
    current = [fixed, ...rest];
  }

  return rounds;
}
