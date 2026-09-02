-- ============================================================
-- graMY Platform — схема базы данных (Supabase / PostgreSQL)
-- ============================================================
-- Как использовать: Supabase → твой проект → SQL Editor →
-- вставить весь этот файл целиком → Run.
-- Подробности — в docs/README.md, раздел "Шаг 5: база данных".
-- ============================================================

-- Клубы
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  created_at timestamp with time zone default now()
);

-- Игроки
create table players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  club_id uuid references clubs(id),
  rating_singles integer not null default 1000,
  rating_doubles integer not null default 1000,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- Турниры
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null check (date >= current_date),
  club_id uuid references clubs(id),
  format text not null check (format in ('olympic','round_robin','groups','mexicano','americano')),
  category text not null check (category in ('singles','doubles','mixed')),
  status text not null default 'draft' check (status in ('draft','active','finished')),
  max_players integer not null default 32,
  created_at timestamp with time zone default now()
);

-- Категории внутри турнира (например: "мужской одиночный", "женская пара")
create table categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  name text not null,
  match_category text not null check (match_category in ('singles','doubles','mixed'))
);

-- Регистрации игроков на турнир/категорию
create table registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  player_id uuid references players(id),
  created_at timestamp with time zone default now(),
  unique (category_id, player_id)
);

-- Команды (1 игрок для одиночек, 2 игрока для пар/микста)
create table teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  player_id_1 uuid references players(id),
  player_id_2 uuid references players(id) -- null для одиночного разряда
);

-- Матчи
create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  round integer not null,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  winner_team_id uuid references teams(id),
  status text not null default 'pending'
    check (status in ('pending','approved','in_progress','completed','walkover','retired','dq')),
  created_at timestamp with time zone default now()
);

-- Сеты внутри матча (счёт)
create table sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  set_number integer not null check (set_number in (1,2,3)),
  team_a_score integer not null,
  team_b_score integer not null
);

-- Текущий рейтинг (агрегат — для быстрого чтения; источник правды — rating_history)
create table ratings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) unique,
  rating_singles integer not null default 1000,
  rating_doubles integer not null default 1000,
  updated_at timestamp with time zone default now()
);

-- История изменений рейтинга (одна запись на игрока на турнир)
create table rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  tournament_id uuid references tournaments(id),
  match_category text not null check (match_category in ('singles','doubles','mixed')),
  old_rating integer not null,
  new_rating integer not null,
  delta integer not null,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- Важное правило проекта: даже в парных матчах (teams с двумя
-- игроками) изменения рейтинга записываются ОТДЕЛЬНО для
-- player_id_1 и player_id_2 — каждый получает свою строку
-- в rating_history. Командного рейтинга как отдельной сущности
-- не существует — он считается на лету как среднее.
-- ============================================================
