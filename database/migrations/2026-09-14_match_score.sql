-- ============================================================
-- Миграция: счёт матча — общий для всех форматов сетки
-- ============================================================
-- Как применить: Supabase → твой проект → SQL Editor →
-- вставить этот файл целиком → Run.
--
-- Один сет до 15 очков; при 14:14 нужен перевес в 2 очка, но жёсткий
-- потолок на 16 — 16:15 тоже завершает матч (разница всего 1 очко).
-- Допустимые финальные счета: 15:X (X=0..13), 16:14, 16:15.
-- ============================================================

alter table matches add column score_team_a integer;
alter table matches add column score_team_b integer;

alter table matches add constraint matches_score_valid check (
  score_team_a is null or score_team_b is null or (
    score_team_a <> score_team_b
    and greatest(score_team_a, score_team_b) <= 16
    and (
      (greatest(score_team_a, score_team_b) = 15 and abs(score_team_a - score_team_b) >= 2)
      or greatest(score_team_a, score_team_b) = 16
    )
  )
);
