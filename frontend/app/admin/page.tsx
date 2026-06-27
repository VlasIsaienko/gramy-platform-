export default function AdminHome() {
  const steps = [
    "Создать турнир",
    "Добавить игроков (до 72)",
    "Выбрать формат (Olympic / Round Robin / Groups)",
    "Сгенерировать сетку",
    "Подкорректировать сетку",
    "Подтвердить раунд (Approve Round)",
    "Ввести результаты матчей",
    "Закрыть раунд (Close Round)",
    "Сгенерировать следующий раунд",
    "Завершить турнир (Finish Tournament)",
    "Пересчитать рейтинг каждого игрока",
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-court mb-2">
        Панель организатора
      </h1>
      <p className="text-slateGray mb-8">
        Это пошаговый путь, который проходит организатор турнира в graMY.
      </p>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex items-center gap-4 bg-white rounded-xl px-5 py-3 shadow-sm"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-court text-white text-sm font-semibold">
              {i + 1}
            </span>
            <span className="text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
