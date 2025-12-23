import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../data/league.db');

// Ensure data directory exists
mkdirSync(join(__dirname, '../../data'), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Configuration table
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Seasons
  CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT 1,
    playoff_start_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Teams
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL UNIQUE,
    discord_role_id TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#FFFFFF',
    conference TEXT,
    division TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Team Staff
  CREATE TABLE IF NOT EXISTS team_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    discord_user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('gm', 'agm', 'captain', 'alternate')),
    appointed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(team_id, discord_user_id, role)
  );

  -- Players
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_user_id TEXT NOT NULL UNIQUE,
    roblox_user_id TEXT UNIQUE,
    roblox_username TEXT,
    verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Rosters
  CREATE TABLE IF NOT EXISTS rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    season_id INTEGER NOT NULL,
    position TEXT,
    jersey_number INTEGER,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
  );

  -- Trades
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    team1_id INTEGER NOT NULL,
    team2_id INTEGER NOT NULL,
    proposed_by_team INTEGER NOT NULL,
    proposed_by_user TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
    team1_accepted BOOLEAN DEFAULT 0,
    team2_accepted BOOLEAN DEFAULT 0,
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (team1_id) REFERENCES teams(id),
    FOREIGN KEY (team2_id) REFERENCES teams(id)
  );

  -- Trade Players
  CREATE TABLE IF NOT EXISTS trade_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    from_team_id INTEGER NOT NULL,
    to_team_id INTEGER NOT NULL,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (from_team_id) REFERENCES teams(id),
    FOREIGN KEY (to_team_id) REFERENCES teams(id)
  );

  -- Draft
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    draft_date TIMESTAMP NOT NULL,
    total_rounds INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'paused', 'completed')),
    current_round INTEGER DEFAULT 1,
    current_pick INTEGER DEFAULT 1,
    pick_time_limit INTEGER DEFAULT 120,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id)
  );

  -- Draft Order
  CREATE TABLE IF NOT EXISTS draft_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    round INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(draft_id, pick_number)
  );

  -- Draft Picks
  CREATE TABLE IF NOT EXISTS draft_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    round INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    picked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_by_user TEXT NOT NULL,
    FOREIGN KEY (draft_id) REFERENCES drafts(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(draft_id, pick_number)
  );

  -- Draft Eligible Players
  CREATE TABLE IF NOT EXISTS draft_eligible (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(draft_id, player_id)
  );

  -- Games/Schedule
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    game_number INTEGER,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    game_type TEXT DEFAULT 'regular' CHECK(game_type IN ('regular', 'playoff')),
    playoff_round INTEGER,
    playoff_series INTEGER,
    playoff_game INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
    home_score INTEGER,
    away_score INTEGER,
    overtime BOOLEAN DEFAULT 0,
    shootout BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP,
    roblox_game_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
  );

  -- Player Game Stats
  CREATE TABLE IF NOT EXISTS player_game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    plus_minus INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(game_id, player_id)
  );

  -- Standings (calculated view, but we'll cache it)
  CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    overtime_losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_differential INTEGER DEFAULT 0,
    streak TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(season_id, team_id)
  );

  -- Transaction Log
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('signing', 'cut', 'trade', 'draft', 'waiver')),
    player_id INTEGER NOT NULL,
    from_team_id INTEGER,
    to_team_id INTEGER,
    executed_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (from_team_id) REFERENCES teams(id),
    FOREIGN KEY (to_team_id) REFERENCES teams(id)
  );

  -- Audit Log
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    user_id TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Notifications Settings
  CREATE TABLE IF NOT EXISTS user_notifications (
    discord_user_id TEXT PRIMARY KEY,
    notify_trades BOOLEAN DEFAULT 1,
    notify_games BOOLEAN DEFAULT 1,
    notify_drafts BOOLEAN DEFAULT 1,
    notify_announcements BOOLEAN DEFAULT 1
  );

  -- Pending Game Reports (from in-game)
  CREATE TABLE IF NOT EXISTS pending_game_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER,
    roblox_game_id TEXT NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    overtime BOOLEAN DEFAULT 0,
    shootout BOOLEAN DEFAULT 0,
    player_stats TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id);
  CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id);
  CREATE INDEX IF NOT EXISTS idx_rosters_season ON rosters(season_id);
  CREATE INDEX IF NOT EXISTS idx_rosters_active ON rosters(is_active);
  CREATE INDEX IF NOT EXISTS idx_games_season ON games(season_id);
  CREATE INDEX IF NOT EXISTS idx_games_teams ON games(home_team_id, away_team_id);
  CREATE INDEX IF NOT EXISTS idx_games_scheduled_time ON games(scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_player_game_stats_game ON player_game_stats(game_id);
  CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_season ON transactions(season_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
  CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
`);

// Insert default configuration
const insertConfig = db.prepare(`
  INSERT OR IGNORE INTO config (key, value, description) VALUES (?, ?, ?)
`);

const defaultConfig = [
  ['roster_size_min', '8', 'Minimum roster size'],
  ['roster_size_max', '15', 'Maximum roster size'],
  ['trade_deadline_enabled', 'true', 'Whether trade deadline is enforced'],
  ['trade_deadline_days', '14', 'Days before playoffs that trades are frozen'],
  ['trades_enabled', 'true', 'Whether trades are currently allowed'],
  ['signings_enabled', 'true', 'Whether free agent signings are allowed'],
  ['draft_pick_time', '120', 'Default draft pick time in seconds'],
  ['points_win', '2', 'Points awarded for a win'],
  ['points_otl', '1', 'Points awarded for an overtime/shootout loss'],
  ['points_loss', '0', 'Points awarded for a regulation loss'],
  ['playoff_teams', '8', 'Number of teams that make playoffs'],
  ['regular_season_games', '24', 'Games each team plays in regular season'],
  ['allow_player_trades', 'true', 'Whether players can be traded'],
  ['require_both_gms', 'true', 'Whether both GMs must approve trades'],
  ['auto_assign_roles', 'true', 'Automatically assign Discord roles on roster changes'],
  ['ingame_reporting_enabled', 'true', 'Whether in-game score reporting is enabled'],
  ['require_staff_approval', 'true', 'Whether in-game reports need staff approval'],
  ['league_name', 'Roblox Hockey League', 'Full league name'],
  ['league_abbreviation', 'RHL', 'League abbreviation']
];

const insertConfigStmt = db.transaction((configs) => {
  for (const config of configs) {
    insertConfig.run(...config);
  }
});

insertConfigStmt(defaultConfig);

console.log('✅ Database initialized successfully!');
console.log(`📁 Database location: ${dbPath}`);

export default db;
