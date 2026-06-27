export default function PlayersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-court">Игроки</h1>
        <button className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition">
          + Добавить игрока
        </button>
      </div>

      <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
        Список игроков клуба появится здесь (до 72 игроков на турнир).
        <p className="text-xs mt-4 text-slateGray/70">
          (Заготовка. Следующий шаг — подключить таблицу <code>players</code>{" "}
          из Supabase.)
        </p>
      </div>
    </div>
  );
}
