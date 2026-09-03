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
 * Диспетчер расписания по формату турнира. Сейчас реализован только
 * round_robin. Groups (round robin внутри каждой группы) и
 * Mexicano/Americano (свой подбор пар по раундам) добавятся сюда
 * отдельными ветками, переиспользуя generateRoundRobinRounds где уместно.
 */
export function generateSchedule<T>(format: TournamentFormat, participants: T[]): Round<T>[] {
  switch (format) {
    case "round_robin":
      return generateRoundRobinRounds(participants);
    default:
      throw new Error(`Формат "${format}" пока не поддерживается генератором сетки.`);
  }
}
