import axios from 'axios';
import express from 'express';
import crypto from 'crypto';
import { pendingReports, games, teams } from './database/db.js';
import { embeds, buttons } from './utils.js';

// Roblox API client
class RobloxAPI {
  constructor() {
    this.baseURL = 'https://users.roblox.com';
    this.apiKey = process.env.ROBLOX_API_KEY;
  }

  async getUserByUsername(username) {
    try {
      const response = await axios.post(`${this.baseURL}/v1/usernames/users`, {
        usernames: [username],
        excludeBannedUsers: true
      });
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching Roblox user:', error.message);
      return null;
    }
  }

  async getUserById(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Roblox user by ID:', error.message);
      return null;
    }
  }

  async verifyUsername(username) {
    const user = await this.getUserByUsername(username);
    return user !== null;
  }

  async getPresence(userId) {
    try {
      const response = await axios.post('https://presence.roblox.com/v1/presence/users', {
        userIds: [userId]
      });
      return response.data.userPresences[0];
    } catch (error) {
      console.error('Error fetching presence:', error.message);
      return null;
    }
  }
}

// In-game webhook server for automated score reporting
class IngameWebhook {
  constructor(client) {
    this.app = express();
    this.port = process.env.INGAME_WEBHOOK_PORT || 3000;
    this.secret = process.env.INGAME_WEBHOOK_SECRET;
    this.client = client;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    
    // Verify webhook signature
    this.app.use((req, res, next) => {
      if (req.path === '/health') return next();
      
      const signature = req.headers['x-webhook-signature'];
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Game report endpoint
    this.app.post('/game/report', async (req, res) => {
      try {
        const {
          roblox_game_id,
          home_team_abbr,
          away_team_abbr,
          home_score,
          away_score,
          overtime,
          shootout,
          player_stats
        } = req.body;

        // Validate required fields
        if (!roblox_game_id || !home_team_abbr || !away_team_abbr || 
            home_score === undefined || away_score === undefined) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Find teams by abbreviation
        const allTeams = teams.getAll();
        const homeTeam = allTeams.find(t => t.abbreviation === home_team_abbr);
        const awayTeam = allTeams.find(t => t.abbreviation === away_team_abbr);

        if (!homeTeam || !awayTeam) {
          return res.status(404).json({ error: 'Teams not found' });
        }

        // Try to find matching scheduled game
        const scheduledGame = games.getUpcoming(null, 100).find(g => 
          (g.home_team_id === homeTeam.id && g.away_team_id === awayTeam.id) ||
          (g.away_team_id === homeTeam.id && g.home_team_id === awayTeam.id)
        );

        // Create pending report
        const reportId = pendingReports.create(
          scheduledGame?.id || null,
          roblox_game_id,
          homeTeam.id,
          awayTeam.id,
          home_score,
          away_score,
          overtime || false,
          shootout || false,
          player_stats || {}
        );

        // Send notification to staff channel
        await this.notifyStaff(reportId, homeTeam, awayTeam, home_score, away_score, overtime, shootout);

        res.json({ 
          success: true, 
          report_id: reportId,
          message: 'Report submitted for staff approval'
        });
      } catch (error) {
        console.error('Error processing game report:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Game start notification endpoint
    this.app.post('/game/start', async (req, res) => {
      try {
        const { roblox_game_id, home_team_abbr, away_team_abbr } = req.body;

        // Find scheduled game and update status
        const allTeams = teams.getAll();
        const homeTeam = allTeams.find(t => t.abbreviation === home_team_abbr);
        const awayTeam = allTeams.find(t => t.abbreviation === away_team_abbr);

        if (homeTeam && awayTeam) {
          // Update game status to in_progress
          // This could send a notification to a games channel
          console.log(`Game started: ${home_team_abbr} vs ${away_team_abbr}`);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error processing game start:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async notifyStaff(reportId, homeTeam, awayTeam, homeScore, awayScore, overtime, shootout) {
    const staffChannelId = process.env.STAFF_CHANNEL_ID;
    if (!staffChannelId) return;

    try {
      const channel = await this.client.channels.fetch(staffChannelId);
      
      const embed = {
        color: 0xffa500,
        title: '🏒 New Game Report (Awaiting Approval)',
        description: `A game result has been submitted from Roblox and requires staff approval.`,
        fields: [
          {
            name: 'Matchup',
            value: `**${homeTeam.name}** vs **${awayTeam.name}**`,
            inline: false
          },
          {
            name: 'Final Score',
            value: `**${homeTeam.abbreviation}** ${homeScore} - ${awayScore} **${awayTeam.abbreviation}**${overtime ? ' (OT)' : ''}${shootout ? ' (SO)' : ''}`,
            inline: false
          },
          {
            name: 'Report ID',
            value: `#${reportId}`,
            inline: true
          },
          {
            name: 'Status',
            value: '⏳ Pending Review',
            inline: true
          }
        ],
        footer: {
          text: 'Use the buttons below to approve or reject this report'
        },
        timestamp: new Date().toISOString()
      };

      await channel.send({
        embeds: [embed],
        components: [buttons.gameReportActions(reportId)]
      });
    } catch (error) {
      console.error('Error sending staff notification:', error);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`✅ In-game webhook server listening on port ${this.port}`);
      console.log(`📡 Endpoint: http://localhost:${this.port}/game/report`);
    });
  }
}

export { RobloxAPI, IngameWebhook };
