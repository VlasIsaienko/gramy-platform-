// types.ts — общие типы данных платформы graMY

export type TournamentFormat =
  | "olympic"
  | "round_robin"
  | "groups"
  | "mexicano"
  | "americano";

export type TournamentStatus = "draft" | "active" | "finished";

export type MatchCategory = "singles" | "doubles" | "mixed";

export interface Club {
  id: string;
  name: string;
  city: string;
}

export interface Player {
  id: string;
  full_name: string;
  club_id: string | null;
  rating_singles: number;
  rating_doubles: number;
  photo_url: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  club_id: string;
  format: TournamentFormat;
  category: MatchCategory;
  status: TournamentStatus;
  max_players: number; // до 72
}

export interface Team {
  id: string;
  tournament_id: string;
  player_ids: string[]; // 1 игрок для singles, 2 для doubles/mixed
}

export interface SetScore {
  team_a_score: number;
  team_b_score: number;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  team_a_id: string;
  team_b_id: string;
  sets: SetScore[];
  winner_team_id: string | null;
  status: "pending" | "approved" | "in_progress" | "completed" | "walkover" | "retired" | "dq";
}

export interface RatingHistoryEntry {
  id: string;
  player_id: string;
  tournament_id: string;
  old_rating: number;
  new_rating: number;
  delta: number;
  created_at: string;
}
