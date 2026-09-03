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

/**
 * Делит участников на группы фиксированного целевого размера, балансируя
 * последнюю группу так, чтобы не оставалось "сиротской" группы из 1 человека
 * (например, 10 участников при targetSize=4 → группы 4/3/3, а не 4/4/2).
 */
export function splitIntoGroups<T>(participants: T[], targetSize = 4): T[][] {
  const n = participants.length;
  if (n === 0) return [];

  const numGroups = Math.max(1, Math.ceil(n / targetSize));
  const base = Math.floor(n / numGroups);
  const remainder = n % numGroups;

  const groups: T[][] = [];
  let idx = 0;
  for (let g = 0; g < numGroups; g++) {
    const size = base + (g < remainder ? 1 : 0);
    groups.push(participants.slice(idx, idx + size));
    idx += size;
  }
  return groups;
}

/**
 * Диспетчер расписания по формату турнира. Round robin и groups реализованы
 * (groups переиспользует generateRoundRobinRounds внутри каждой группы).
 * Mexicano/Americano — свой подбор пар по раундам — добавятся сюда отдельной
 * веткой позже.
 */
export function generateSchedule<T>(format: TournamentFormat, participants: T[]): Pool<T>[] {
  switch (format) {
    case "round_robin":
      return [{ groupNumber: null, participants, rounds: generateRoundRobinRounds(participants) }];
    case "groups":
      return splitIntoGroups(participants).map((group, i) => ({
        groupNumber: i + 1,
        participants: group,
        rounds: generateRoundRobinRounds(group),
      }));
    default:
      throw new Error(`Формат "${format}" пока не поддерживается генератором сетки.`);
  }
}
