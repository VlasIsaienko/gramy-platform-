import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-court">graMY</h1>
        <p className="mt-2 text-slateGray">
          Платформа любительских турниров и рейтинга
        </p>
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        <Link
          href="/admin"
          className="px-8 py-5 rounded-2xl bg-court text-white text-lg font-semibold shadow-md hover:bg-court/90 transition"
        >
          Я организатор / клуб
        </Link>
        <Link
          href="/player"
          className="px-8 py-5 rounded-2xl bg-shuttle text-white text-lg font-semibold shadow-md hover:bg-shuttle/90 transition"
        >
          Я игрок
        </Link>
      </div>
    </main>
  );
}
