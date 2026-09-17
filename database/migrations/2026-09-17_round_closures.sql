-- ============================================================
-- Миграция: явное "Закрыть раунд" для Olympic/Mexicano/Americano
-- ============================================================
-- Как применить: Supabase → твой проект → SQL Editor →
-- вставить этот файл целиком → Run.
--
-- Только для форматов, где раунды генерируются по одному
-- (Olympic/Mexicano/Americano) — кнопка "Сгенерировать следующий
-- раунд" становится доступна только после явного закрытия текущего
-- раунда организатором (а не автоматически по факту готовности
-- счёта). Для Round Robin/Groups эта таблица не используется —
-- там вся сетка генерируется сразу целиком.
-- ============================================================

create table round_closures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  round integer not null,
  closed_at timestamp with time zone default now(),
  unique (category_id, round)
);
