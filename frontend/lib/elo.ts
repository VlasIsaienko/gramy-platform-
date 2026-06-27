/**
 * elo.ts
 * Только математика рейтинга. Никакого интерфейса, никаких запросов к базе.
 *
 * Главное правило проекта graMY:
 * рейтинг всегда считается индивидуально для каждого игрока,
 * даже если матч был парным (Team A vs Team B).
 */

export const DEFAULT_RATING = 1000;
export const K_FACTOR = 32;

/**
 * Ожидаемый результат игрока/команды A против B по классической формуле ELO.
 * Возвращает число от 0 до 1.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Одиночный матч.
 * winnerRating / loserRating — текущий рейтинг каждого игрока.
 * Возвращает новые рейтинги обоих игроков.
 */
export function calculateSinglesMatch(
  winnerRating: number,
  loserRating: number,
  k: number = K_FACTOR
) {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  const newWinnerRating = winnerRating + k * (1 - expectedWinner);
  const newLoserRating = loserRating + k * (0 - expectedLoser);

  return {
    winner: {
      oldRating: winnerRating,
      newRating: Math.round(newWinnerRating),
      delta: Math.round(newWinnerRating - winnerRating),
    },
    loser: {
      oldRating: loserRating,
      newRating: Math.round(newLoserRating),
      delta: Math.round(newLoserRating - loserRating),
    },
  };
}

/**
 * Парный матч (Team A: 2 игрока vs Team B: 2 игрока).
 *
 * Логика:
 * 1. Рейтинг команды = средний рейтинг двух игроков.
 * 2. Считаем ожидаемый результат команды против команды (как в одиночном матче).
 * 3. Изменение рейтинга команды применяется К КАЖДОМУ игроку индивидуально,
 *    но пропорционально тому, насколько его личный рейтинг отличается
 *    от среднего по команде (чтобы более слабый игрок в паре получал
 *    чуть больше очков за победу, а более сильный — чуть меньше,
 *    и наоборот при поражении).
 */
export function calculateDoublesMatch(
  winnerTeam: [number, number],
  loserTeam: [number, number],
  k: number = K_FACTOR
) {
  const winnerTeamRating = (winnerTeam[0] + winnerTeam[1]) / 2;
  const loserTeamRating = (loserTeam[0] + loserTeam[1]) / 2;

  const expectedWinnerTeam = expectedScore(winnerTeamRating, loserTeamRating);
  const expectedLoserTeam = expectedScore(loserTeamRating, winnerTeamRating);

  const teamDeltaWinner = k * (1 - expectedWinnerTeam);
  const teamDeltaLoser = k * (0 - expectedLoserTeam);

  const applyIndividual = (
    playerRating: number,
    teamRating: number,
    teamDelta: number
  ) => {
    // компенсирующий коэффициент: слабее команды → больше прибавка
    const diff = teamRating - playerRating; // >0, если игрок слабее партнёра
    const adjustment = diff * 0.1; // мягкая коррекция, не более 10% от разницы
    const newRating = playerRating + teamDelta + adjustment;
    return {
      oldRating: playerRating,
      newRating: Math.round(newRating),
      delta: Math.round(newRating - playerRating),
    };
  };

  return {
    winners: [
      applyIndividual(winnerTeam[0], winnerTeamRating, teamDeltaWinner),
      applyIndividual(winnerTeam[1], winnerTeamRating, teamDeltaWinner),
    ],
    losers: [
      applyIndividual(loserTeam[0], loserTeamRating, teamDeltaLoser),
      applyIndividual(loserTeam[1], loserTeamRating, teamDeltaLoser),
    ],
  };
}
