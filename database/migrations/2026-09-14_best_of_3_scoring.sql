-- ============================================================
-- Миграция: выбор формата счёта на категорию — один сет до 15
-- или best of 3 (до 2 побед в сетах)
-- ============================================================
-- Как применить: Supabase → твой проект → SQL Editor →
-- вставить этот файл целиком → Run.
-- ============================================================

alter table categories add column scoring_format text not null default 'single_set'
  check (scoring_format in ('single_set','best_of_3'));

-- Таблица sets уже существовала в схеме, но не использовалась (best_of_3
-- не был реализован) — сейчас задействуем её. tournament_id добавляем для
-- единообразия с остальными таблицами (быстрая выборка по турниру, как
-- у registrations/teams/matches).
alter table sets add column tournament_id uuid references tournaments(id) on delete cascade;

alter table sets add constraint sets_match_set_number_unique unique (match_id, set_number);

alter table sets add constraint sets_score_valid check (
  team_a_score <> team_b_score
  and greatest(team_a_score, team_b_score) <= 16
  and (
    (greatest(team_a_score, team_b_score) = 15 and abs(team_a_score - team_b_score) >= 2)
    or greatest(team_a_score, team_b_score) = 16
  )
);
