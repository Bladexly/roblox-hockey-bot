import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/league.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Configuration helpers
export const config = {
  get: (key) => {
    const result = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return result ? result.value : null;
  },
  set: (key, value, userId) => {
    db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    audit('config', 'update', null, userId, { key }, { key, value });
  },
  getAll: () => {
    return db.prepare('SELECT * FROM config ORDER BY key').all();
  }
};

// Season helpers
export const seasons = {
  getCurrent: () => {
    return db.prepare('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1').get();
  },
  create: (name, startDate, userId) => {
    const result = db.prepare('INSERT INTO seasons (name, start_date) VALUES (?, ?)').run(name, startDate);
    audit('season', 'create', result.lastInsertRowid, userId, null, { name, startDate });
    return result.lastInsertRowid;
  },
  end: (seasonId, userId) => {
    db.prepare('UPDATE seasons SET is_active = 0, end_date = DATE() WHERE id = ?').run(seasonId);
    audit('season', 'end', seasonId, userId);
  }
};

// Team helpers
export const teams = {
  getAll: () => {
    return db.prepare('SELECT * FROM teams ORDER BY name').all();
  },
  getById: (id) => {
    return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  },
  getByRole: (roleId) => {
    return db.prepare('SELECT * FROM teams WHERE discord_role_id = ?').get(roleId);
  },
  create: (name, abbreviation, roleId, userId) => {
    const result = db.prepare('INSERT INTO teams (name, abbreviation, discord_role_id) VALUES (?, ?, ?)').run(name, abbreviation, roleId);
    audit('team', 'create', result.lastInsertRowid, userId, null, { name, abbreviation, roleId });
    return result.lastInsertRowid;
  },
  update: (id, field, value, userId) => {
    const old = teams.getById(id);
    db.prepare(`UPDATE teams SET ${field} = ? WHERE id = ?`).run(value, id);
    audit('team', 'update', id, userId, old, { [field]: value });
  },
  delete: (id, userId) => {
    const old = teams.getById(id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);
    audit('team', 'delete', id, userId, old);
  }
};

// Player helpers
export const players = {
  getByDiscordId: (discordId) => {
    return db.prepare('SELECT * FROM players WHERE discord_user_id = ?').get(discordId);
  },
  getByRobloxId: (robloxId) => {
    return db.prepare('SELECT * FROM players WHERE roblox_user_id = ?').get(robloxId);
  },
  link: (discordId, robloxId, robloxUsername, verified = false) => {
    const existing = players.getByDiscordId(discordId);
    if (existing) {
      db.prepare('UPDATE players SET roblox_user_id = ?, roblox_username = ?, verified = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_user_id = ?')
        .run(robloxId, robloxUsername, verified ? 1 : 0, discordId);
      return existing.id;
    }
    const result = db.prepare('INSERT INTO players (discord_user_id, roblox_user_id, roblox_username, verified) VALUES (?, ?, ?, ?)')
      .run(discordId, robloxId, robloxUsername, verified ? 1 : 0);
    return result.lastInsertRowid;
  },
  unlink: (discordId) => {
    db.prepare('UPDATE players SET roblox_user_id = NULL, roblox_username = NULL, verified = 0, updated_at = CURRENT_TIMESTAMP WHERE discord_user_id = ?').run(discordId);
  },
  verify: (playerId, verified = true) => {
    db.prepare('UPDATE players SET verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(verified ? 1 : 0, playerId);
  }
};

// Roster helpers
export const rosters = {
  getTeamRoster: (teamId, seasonId) => {
    return db.prepare(`
      SELECT r.*, p.discord_user_id, p.roblox_username, p.roblox_user_id
      FROM rosters r
      JOIN players p ON r.player_id = p.id
      WHERE r.team_id = ? AND r.season_id = ? AND r.is_active = 1
      ORDER BY r.position, p.roblox_username
    `).all(teamId, seasonId);
  },
  getPlayerTeam: (playerId, seasonId) => {
    return db.prepare(`
      SELECT r.*, t.name as team_name, t.abbreviation as team_abbreviation
      FROM rosters r
      JOIN teams t ON r.team_id = t.id
      WHERE r.player_id = ? AND r.season_id = ? AND r.is_active = 1
    `).get(playerId, seasonId);
  },
  sign: (playerId, teamId, seasonId, userId) => {
    const result = db.prepare('INSERT INTO rosters (player_id, team_id, season_id) VALUES (?, ?, ?)').run(playerId, teamId, seasonId);
    transactions.log(seasonId, 'signing', playerId, null, teamId, userId);
    audit('roster', 'sign', result.lastInsertRowid, userId, null, { playerId, teamId, seasonId });
    return result.lastInsertRowid;
  },
  cut: (playerId, teamId, seasonId, userId) => {
    db.prepare('UPDATE rosters SET is_active = 0, released_at = CURRENT_TIMESTAMP WHERE player_id = ? AND team_id = ? AND season_id = ? AND is_active = 1')
      .run(playerId, teamId, seasonId);
    transactions.log(seasonId, 'cut', playerId, teamId, null, userId);
    audit('roster', 'cut', null, userId, null, { playerId, teamId, seasonId });
  },
  getFreeAgents: (seasonId) => {
    return db.prepare(`
      SELECT p.*
      FROM players p
      WHERE p.id NOT IN (
        SELECT player_id FROM rosters WHERE season_id = ? AND is_active = 1
      )
      AND p.verified = 1
      ORDER BY p.roblox_username
    `).all(seasonId);
  }
};

// Trade helpers
export const trades = {
  create: (seasonId, team1Id, team2Id, proposedByTeam, proposedByUser, players) => {
    const trade = db.prepare('INSERT INTO trades (season_id, team1_id, team2_id, proposed_by_team, proposed_by_user) VALUES (?, ?, ?, ?, ?)')
      .run(seasonId, team1Id, team2Id, proposedByTeam, proposedByUser);
    
    const tradeId = trade.lastInsertRowid;
    
    const insertPlayer = db.prepare('INSERT INTO trade_players (trade_id, player_id, from_team_id, to_team_id) VALUES (?, ?, ?, ?)');
    for (const player of players) {
      insertPlayer.run(tradeId, player.playerId, player.fromTeam, player.toTeam);
    }
    
    audit('trade', 'propose', tradeId, proposedByUser, null, { team1Id, team2Id, players });
    return tradeId;
  },
  accept: (tradeId, teamId, userId) => {
    const trade = trades.getById(tradeId);
    if (trade.team1_id === teamId) {
      db.prepare('UPDATE trades SET team1_accepted = 1 WHERE id = ?').run(tradeId);
    } else {
      db.prepare('UPDATE trades SET team2_accepted = 1 WHERE id = ?').run(tradeId);
    }
    
    const updated = trades.getById(tradeId);
    if (updated.team1_accepted && updated.team2_accepted) {
      trades.execute(tradeId, userId);
    }
    audit('trade', 'accept', tradeId, userId);
  },
  decline: (tradeId, userId) => {
    db.prepare('UPDATE trades SET status = "declined" WHERE id = ?').run(tradeId);
    audit('trade', 'decline', tradeId, userId);
  },
  cancel: (tradeId, userId) => {
    db.prepare('UPDATE trades SET status = "cancelled" WHERE id = ?').run(tradeId);
    audit('trade', 'cancel', tradeId, userId);
  },
  execute: (tradeId, userId) => {
    const trade = trades.getById(tradeId);
    const tradePlayers = db.prepare('SELECT * FROM trade_players WHERE trade_id = ?').all(tradeId);
    
    for (const tp of tradePlayers) {
      rosters.cut(tp.player_id, tp.from_team_id, trade.season_id, 'SYSTEM');
      rosters.sign(tp.player_id, tp.to_team_id, trade.season_id, 'SYSTEM');
    }
    
    db.prepare('UPDATE trades SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(tradeId);
    audit('trade', 'execute', tradeId, userId);
  },
  getById: (tradeId) => {
    return db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
  },
  getPending: () => {
    return db.prepare('SELECT * FROM trades WHERE status = "pending" ORDER BY proposed_at DESC').all();
  },
  getPlayers: (tradeId) => {
    return db.prepare(`
      SELECT tp.*, p.discord_user_id, p.roblox_username,
             t1.name as from_team_name, t2.name as to_team_name
      FROM trade_players tp
      JOIN players p ON tp.player_id = p.id
      JOIN teams t1 ON tp.from_team_id = t1.id
      JOIN teams t2 ON tp.to_team_id = t2.id
      WHERE tp.trade_id = ?
    `).all(tradeId);
  }
};

// Draft helpers
export const drafts = {
  create: (seasonId, draftDate, totalRounds, userId) => {
    const result = db.prepare('INSERT INTO drafts (season_id, draft_date, total_rounds) VALUES (?, ?, ?)')
      .run(seasonId, draftDate, totalRounds);
    audit('draft', 'create', result.lastInsertRowid, userId, null, { seasonId, draftDate, totalRounds });
    return result.lastInsertRowid;
  },
  getCurrent: () => {
    return db.prepare('SELECT * FROM drafts WHERE status IN ("scheduled", "in_progress", "paused") ORDER BY draft_date DESC LIMIT 1').get();
  },
  setOrder: (draftId, order, userId) => {
    db.prepare('DELETE FROM draft_order WHERE draft_id = ?').run(draftId);
    const insert = db.prepare('INSERT INTO draft_order (draft_id, pick_number, round, team_id) VALUES (?, ?, ?, ?)');
    
    let pickNumber = 1;
    for (let round = 1; round <= order.length; round++) {
      for (const teamId of order[round - 1]) {
        insert.run(draftId, pickNumber++, round, teamId);
      }
    }
    audit('draft', 'set_order', draftId, userId);
  },
  addEligible: (draftId, playerId, userId) => {
    db.prepare('INSERT OR IGNORE INTO draft_eligible (draft_id, player_id) VALUES (?, ?)').run(draftId, playerId);
    audit('draft', 'add_eligible', draftId, userId, null, { playerId });
  },
  removeEligible: (draftId, playerId, userId) => {
    db.prepare('DELETE FROM draft_eligible WHERE draft_id = ? AND player_id = ?').run(draftId, playerId);
    audit('draft', 'remove_eligible', draftId, userId, null, { playerId });
  },
  getEligible: (draftId) => {
    return db.prepare(`
      SELECT p.*
      FROM draft_eligible de
      JOIN players p ON de.player_id = p.id
      WHERE de.draft_id = ?
      ORDER BY p.roblox_username
    `).all(draftId);
  },
  start: (draftId, userId) => {
    db.prepare('UPDATE drafts SET status = "in_progress" WHERE id = ?').run(draftId);
    audit('draft', 'start', draftId, userId);
  },
  pick: (draftId, playerId, teamId, userId) => {
    const draft = drafts.getCurrent();
    const pick = db.prepare('SELECT * FROM draft_order WHERE draft_id = ? AND pick_number = ?').get(draftId, draft.current_pick);
    
    db.prepare('INSERT INTO draft_picks (draft_id, pick_number, round, team_id, player_id, picked_by_user) VALUES (?, ?, ?, ?, ?, ?)')
      .run(draftId, pick.pick_number, pick.round, teamId, playerId, userId);
    
    const season = seasons.getCurrent();
    rosters.sign(playerId, teamId, season.id, 'DRAFT');
    transactions.log(season.id, 'draft', playerId, null, teamId, userId, `Round ${pick.round}, Pick ${pick.pick_number}`);
    
    // Advance to next pick
    const totalPicks = db.prepare('SELECT COUNT(*) as count FROM draft_order WHERE draft_id = ?').get(draftId).count;
    if (draft.current_pick >= totalPicks) {
      db.prepare('UPDATE drafts SET status = "completed" WHERE id = ?').run(draftId);
    } else {
      db.prepare('UPDATE drafts SET current_pick = current_pick + 1 WHERE id = ?').run(draftId);
    }
    
    audit('draft', 'pick', draftId, userId, null, { playerId, teamId, pickNumber: pick.pick_number });
  },
  getPicks: (draftId) => {
    return db.prepare(`
      SELECT dp.*, p.roblox_username, p.discord_user_id, t.name as team_name, t.abbreviation as team_abbreviation
      FROM draft_picks dp
      JOIN players p ON dp.player_id = p.id
      JOIN teams t ON dp.team_id = t.id
      WHERE dp.draft_id = ?
      ORDER BY dp.pick_number
    `).all(draftId);
  }
};

// Game helpers
export const games = {
  create: (seasonId, homeTeamId, awayTeamId, scheduledTime, userId) => {
    const result = db.prepare('INSERT INTO games (season_id, home_team_id, away_team_id, scheduled_time) VALUES (?, ?, ?, ?)')
      .run(seasonId, homeTeamId, awayTeamId, scheduledTime);
    audit('game', 'create', result.lastInsertRowid, userId, null, { seasonId, homeTeamId, awayTeamId, scheduledTime });
    return result.lastInsertRowid;
  },
  report: (gameId, homeScore, awayScore, overtime, shootout, userId) => {
    db.prepare('UPDATE games SET home_score = ?, away_score = ?, overtime = ?, shootout = ?, status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(homeScore, awayScore, overtime ? 1 : 0, shootout ? 1 : 0, gameId);
    
    // Update standings
    const game = games.getById(gameId);
    standings.updateAfterGame(game.season_id, game.home_team_id, game.away_team_id, homeScore, awayScore, overtime || shootout);
    
    audit('game', 'report', gameId, userId, null, { homeScore, awayScore, overtime, shootout });
  },
  getById: (gameId) => {
    return db.prepare(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.id = ?
    `).get(gameId);
  },
  getUpcoming: (seasonId, limit = 10) => {
    return db.prepare(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.season_id = ? AND g.status = 'scheduled' AND g.scheduled_time > datetime('now')
      ORDER BY g.scheduled_time
      LIMIT ?
    `).all(seasonId, limit);
  }
};

// Standings helpers
export const standings = {
  get: (seasonId) => {
    return db.prepare(`
      SELECT s.*, t.name as team_name, t.abbreviation as team_abbreviation
      FROM standings s
      JOIN teams t ON s.team_id = t.id
      WHERE s.season_id = ?
      ORDER BY s.points DESC, s.wins DESC, s.goal_differential DESC
    `).all(seasonId);
  },
  updateAfterGame: (seasonId, homeTeamId, awayTeamId, homeScore, awayScore, overtime) => {
    const pointsWin = parseInt(config.get('points_win') || '2');
    const pointsOTL = parseInt(config.get('points_otl') || '1');
    const pointsLoss = parseInt(config.get('points_loss') || '0');
    
    const homeWin = homeScore > awayScore;
    const homePoints = homeWin ? pointsWin : (overtime ? pointsOTL : pointsLoss);
    const awayPoints = !homeWin ? pointsWin : (overtime ? pointsOTL : pointsLoss);
    
    // Update home team
    db.prepare(`
      INSERT INTO standings (season_id, team_id, games_played, wins, losses, overtime_losses, points, goals_for, goals_against, goal_differential)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(season_id, team_id) DO UPDATE SET
        games_played = games_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        overtime_losses = overtime_losses + ?,
        points = points + ?,
        goals_for = goals_for + ?,
        goals_against = goals_against + ?,
        goal_differential = goal_differential + ?,
        last_updated = CURRENT_TIMESTAMP
    `).run(
      seasonId, homeTeamId,
      homeWin ? 1 : 0, homeWin ? 0 : (overtime ? 0 : 1), homeWin ? 0 : (overtime ? 1 : 0),
      homePoints, homeScore, awayScore, homeScore - awayScore,
      homeWin ? 1 : 0, homeWin ? 0 : (overtime ? 0 : 1), homeWin ? 0 : (overtime ? 1 : 0),
      homePoints, homeScore, awayScore, homeScore - awayScore
    );
    
    // Update away team
    db.prepare(`
      INSERT INTO standings (season_id, team_id, games_played, wins, losses, overtime_losses, points, goals_for, goals_against, goal_differential)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(season_id, team_id) DO UPDATE SET
        games_played = games_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        overtime_losses = overtime_losses + ?,
        points = points + ?,
        goals_for = goals_for + ?,
        goals_against = goals_against + ?,
        goal_differential = goal_differential + ?,
        last_updated = CURRENT_TIMESTAMP
    `).run(
      seasonId, awayTeamId,
      !homeWin ? 1 : 0, !homeWin ? 0 : (overtime ? 0 : 1), !homeWin ? 0 : (overtime ? 1 : 0),
      awayPoints, awayScore, homeScore, awayScore - homeScore,
      !homeWin ? 1 : 0, !homeWin ? 0 : (overtime ? 0 : 1), !homeWin ? 0 : (overtime ? 1 : 0),
      awayPoints, awayScore, homeScore, awayScore - homeScore
    );
  }
};

// Transaction log
export const transactions = {
  log: (seasonId, type, playerId, fromTeam, toTeam, userId, notes = null) => {
    db.prepare('INSERT INTO transactions (season_id, transaction_type, player_id, from_team_id, to_team_id, executed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(seasonId, type, playerId, fromTeam, toTeam, userId, notes);
  },
  getRecent: (seasonId, limit = 20) => {
    return db.prepare(`
      SELECT t.*, p.roblox_username, p.discord_user_id,
             ft.name as from_team_name, tt.name as to_team_name
      FROM transactions t
      JOIN players p ON t.player_id = p.id
      LEFT JOIN teams ft ON t.from_team_id = ft.id
      LEFT JOIN teams tt ON t.to_team_id = tt.id
      WHERE t.season_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(seasonId, limit);
  }
};

// Audit log
export const audit = (entityType, action, entityId, userId, oldValues = null, newValues = null) => {
  db.prepare('INSERT INTO audit_log (entity_type, action, entity_id, user_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)')
    .run(entityType, action, entityId, userId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null);
};

// Pending game reports
export const pendingReports = {
  create: (gameId, robloxGameId, homeTeamId, awayTeamId, homeScore, awayScore, overtime, shootout, playerStats) => {
    const result = db.prepare(`
      INSERT INTO pending_game_reports 
      (game_id, roblox_game_id, home_team_id, away_team_id, home_score, away_score, overtime, shootout, player_stats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(gameId, robloxGameId, homeTeamId, awayTeamId, homeScore, awayScore, overtime ? 1 : 0, shootout ? 1 : 0, JSON.stringify(playerStats));
    return result.lastInsertRowid;
  },
  getPending: () => {
    return db.prepare(`
      SELECT pr.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM pending_game_reports pr
      JOIN teams ht ON pr.home_team_id = ht.id
      JOIN teams at ON pr.away_team_id = at.id
      WHERE pr.status = 'pending'
      ORDER BY pr.reported_at DESC
    `).all();
  },
  getById: (id) => {
    return db.prepare('SELECT * FROM pending_game_reports WHERE id = ?').get(id);
  },
  approve: (id, userId) => {
    const report = pendingReports.getById(id);
    
    if (report.game_id) {
      games.report(report.game_id, report.home_score, report.away_score, report.overtime, report.shootout, userId);
    }
    
    db.prepare('UPDATE pending_game_reports SET status = "approved", reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(userId, id);
  },
  reject: (id, userId) => {
    db.prepare('UPDATE pending_game_reports SET status = "rejected", reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(userId, id);
  }
};

export default db;
