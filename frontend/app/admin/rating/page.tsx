export default function RatingPage() {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-court mb-6">
        Рейтинг
      </h1>

      <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
        Общий рейтинг клуба появится здесь после завершения первого турнира.
        <p className="text-xs mt-4 text-slateGray/70">
          (Заготовка. Считается по таблицам <code>ratings</code> и{" "}
          <code>rating_history</code>, с помощью функций из{" "}
          <code>lib/elo.ts</code>.)
        </p>
      </div>
    </div>
  );
}
