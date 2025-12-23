# 🏒 Roblox Hockey League Discord Bot

A comprehensive, production-ready Discord bot for managing a Roblox hockey league with automated scoring, interactive components, and complete league management features.

## ✨ Features

### 🎮 Player Management
- **Discord-Roblox Linking** - Link Discord accounts to Roblox usernames
- **Verification System** - Staff verification for player eligibility
- **Player Lookup** - Search by Discord user or Roblox username
- **Roster Management** - Track player assignments to teams

### 🏆 Team Management
- **Team Creation** - Create teams with Discord roles, colors, and logos
- **Roster Control** - Sign and release players with automatic role assignment
- **Team Information** - View detailed team rosters and statistics
- **Conference/Division** - Organize teams into conferences and divisions

### 💼 Transaction System
- **Free Agent Signings** - Sign players to teams with roster limit enforcement
- **Player Cuts** - Release players from rosters
- **Trade Proposals** - Interactive trade builder with multi-player support
- **Trade Approvals** - Require both GMs to accept trades
- **Transaction History** - Complete audit trail of all moves

### 📋 Draft System
- **Draft Creation** - Set up drafts with custom rounds and pick order
- **Draft Pool Management** - Add/remove eligible players
- **Live Draft Tracking** - Real-time draft picks with pick timer
- **Draft History** - Complete record of all picks

### 📅 Schedule & Games
- **Game Scheduling** - Schedule games with flexible date/time
- **Automated Score Reporting** - In-game webhook integration for automatic scoring
- **Manual Score Entry** - Staff can manually report game results
- **Game Details** - View complete game information and statistics
- **Staff Approval** - Require staff approval for in-game reported scores

### 📊 Standings & Statistics
- **Live Standings** - Automatically updated based on game results
- **Player Statistics** - Track goals, assists, and other stats
- **Team Statistics** - Goals for, goals against, goal differential
- **Playoff Seeding** - Automatic playoff bracket generation

### ⚙️ Configuration
- **Flexible Settings** - Over 20 configurable league parameters
- **Roster Limits** - Min/max roster size enforcement
- **Points System** - Customizable points for wins, OT losses
- **Trade Deadlines** - Automatic trade freeze before playoffs
- **Feature Toggles** - Enable/disable specific features

### 🔔 Notifications
- **Transaction Alerts** - Notify channels of signings, cuts, trades
- **Game Reminders** - Scheduled game notifications
- **Draft Updates** - Live draft pick announcements
- **Staff Alerts** - In-game reports requiring approval

## 🚀 Installation

### Prerequisites
- Node.js 18.0.0 or higher
- Discord Bot with appropriate permissions
- Discord Server (Guild)

### Step 1: Clone or Download
```bash
git clone <your-repo-url>
cd roblox-hockey-bot
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

**Required Configuration:**
- `DISCORD_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your Discord application client ID
- `GUILD_ID` - Your Discord server ID
- `ADMIN_USER_IDS` - Comma-separated list of admin Discord user IDs
- `STAFF_CHANNEL_ID` - Channel ID for staff notifications
- `INGAME_WEBHOOK_SECRET` - Secret key for in-game webhook (generate a secure random string)

### Step 4: Initialize Database
```bash
npm run db:init
```

### Step 5: Deploy Commands
```bash
npm run deploy
```

### Step 6: Start Bot
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 🎮 In-Game Integration

### Roblox Game Setup

The bot includes an HTTP webhook server that your Roblox game can send score reports to.

**Endpoint:** `http://your-server:3000/game/report`

**Required Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: <HMAC-SHA256 signature>`

**Request Body:**
```json
{
  "roblox_game_id": "unique-game-identifier",
  "home_team_abbr": "TOR",
  "away_team_abbr": "MTL",
  "home_score": 5,
  "away_score": 3,
  "overtime": false,
  "shootout": false,
  "player_stats": {
    "player_roblox_id": {
      "goals": 2,
      "assists": 1,
      "shots": 5
    }
  }
}
```

### Generating Webhook Signature (Lua Example)
```lua
local HttpService = game:GetService("HttpService")
local CryptoService = game:GetService("CryptoService")

local payload = HttpService:JSONEncode(data)
local signature = CryptoService:HMACSHA256(payload, WEBHOOK_SECRET)

local headers = {
    ["Content-Type"] = "application/json",
    ["X-Webhook-Signature"] = signature
}

HttpService:PostAsync(WEBHOOK_URL, payload, Enum.HttpContentType.ApplicationJson, false, headers)
```

## 📝 Command List

### Player Commands
- `/link <roblox_username>` - Link your Roblox account
- `/unlink` - Unlink your Roblox account
- `/verify <user> [verified]` - Verify a player (Staff)
- `/whois <user>` - Look up a player's Roblox account
- `/lookup <roblox_username>` - Find Discord user by Roblox username

### Team Commands
- `/team create <name> <role> <abbreviation>` - Create a team
- `/team delete <team_id>` - Delete a team
- `/team info [team_id]` - View team information
- `/team edit <team_id> <field> <value>` - Edit team details
- `/roster [team_id]` - View team roster
- `/teamlist` - List all teams

### Transaction Commands
- `/sign <player> [team_id]` - Sign a free agent
- `/cut <player> [team_id]` - Release a player
- `/trade propose <your_team> <other_team>` - Propose a trade
- `/trade list` - View pending trades
- `/trade view <trade_id>` - View trade details
- `/freeagents` - List available free agents

### Game Commands
- `/schedule view [limit]` - View upcoming games
- `/schedule game <home> <away> <datetime>` - Schedule a game (Staff)
- `/game report <id> <home_score> <away_score>` - Report game result (Staff)
- `/game details <game_id>` - View game details

### Standings & Stats
- `/standings` - View league standings
- `/stats player <user>` - View player statistics (TODO)
- `/stats team <team>` - View team statistics (TODO)

### Configuration
- `/config view` - View all settings (Commissioner)
- `/config set <key> <value>` - Update a setting (Commissioner)
- `/season create <name> <start_date>` - Create season (Commissioner)
- `/season info` - View current season

## 🔧 Configuration Options

### Roster Settings
- `roster_size_min` - Minimum roster size (default: 8)
- `roster_size_max` - Maximum roster size (default: 15)

### Trade Settings
- `trades_enabled` - Whether trades are allowed (default: true)
- `trade_deadline_enabled` - Enforce trade deadline (default: true)
- `trade_deadline_days` - Days before playoffs to freeze trades (default: 14)
- `require_both_gms` - Both GMs must approve (default: true)

### Game Settings
- `points_win` - Points for a win (default: 2)
- `points_otl` - Points for OT/SO loss (default: 1)
- `points_loss` - Points for regulation loss (default: 0)
- `regular_season_games` - Games per team (default: 24)
- `playoff_teams` - Teams making playoffs (default: 8)

### Feature Toggles
- `auto_assign_roles` - Auto-assign Discord roles (default: true)
- `ingame_reporting_enabled` - Allow in-game reports (default: true)
- `require_staff_approval` - Reports need approval (default: true)

## 📁 Project Structure

```
roblox-hockey-bot/
├── src/
│   ├── commands/           # Slash command handlers
│   │   ├── player.js       # Player management
│   │   ├── team.js         # Team management
│   │   └── all.js          # All other commands
│   ├── database/           # Database layer
│   │   ├── init.js         # Schema & initialization
│   │   └── db.js           # Query helpers
│   ├── index.js            # Main bot entry point
│   ├── deploy-commands.js  # Command registration
│   ├── interactions.js     # Button/select handlers
│   ├── roblox.js          # Roblox API & webhook
│   └── utils.js            # Utilities & helpers
├── data/                   # SQLite database
├── .env                    # Configuration
├── .env.example           # Configuration template
└── package.json           # Dependencies
```

## 🗄️ Database Schema

The bot uses SQLite with the following main tables:
- **teams** - Team information and branding
- **players** - Player Discord-Roblox links
- **rosters** - Player-team assignments
- **seasons** - Season tracking
- **games** - Scheduled and completed games
- **standings** - Team standings and records
- **trades** - Trade proposals and history
- **drafts** - Draft events and picks
- **transactions** - Complete transaction log
- **config** - League configuration
- **audit_log** - Complete audit trail

## 🔒 Security Features

- **HMAC-SHA256 Signatures** - Webhook request verification
- **Permission System** - Role-based access control
- **Audit Logging** - Complete activity tracking
- **Input Validation** - Prevent SQL injection and XSS
- **Rate Limiting** - Built-in request throttling

## 🐛 Troubleshooting

### Commands not showing up
1. Ensure bot has `applications.commands` scope
2. Run `npm run deploy` to register commands
3. Wait a few minutes for Discord to update

### Database errors
1. Ensure `data/` directory exists and is writable
2. Run `npm run db:init` to recreate database
3. Check file permissions

### Webhook not receiving reports
1. Verify `INGAME_WEBHOOK_SECRET` is set correctly
2. Ensure port 3000 is open and accessible
3. Check webhook signature generation in Roblox
4. Review bot logs for error messages

### Role assignment not working
1. Ensure bot role is above team roles
2. Verify bot has "Manage Roles" permission
3. Check `auto_assign_roles` config is enabled

## 📈 Future Enhancements

- [ ] Advanced player statistics tracking
- [ ] Playoff bracket visualization
- [ ] Automated schedule generation
- [ ] Player cards with stats and avatars
- [ ] Live game updates via websockets
- [ ] Discord voice channel integrations
- [ ] Web dashboard for league management
- [ ] Mobile app companion
- [ ] Advanced analytics and insights
- [ ] Multi-league support

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 💬 Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for the Roblox Hockey community**
