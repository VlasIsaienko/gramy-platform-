export default function TournamentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-court">Турниры</h1>
        <button className="px-5 py-2.5 rounded-xl bg-shuttle text-white font-semibold hover:bg-shuttle/90 transition">
          + Создать турнир
        </button>
      </div>

      <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
        Здесь пока нет турниров.
        <br />
        Нажми «Создать турнир», чтобы начать.
        <p className="text-xs mt-4 text-slateGray/70">
          (Эта страница — заготовка. Следующий шаг — подключить таблицу{" "}
          <code>tournaments</code> из Supabase, чтобы турниры реально
          сохранялись.)
        </p>
      </div>
    </div>
  );
}
