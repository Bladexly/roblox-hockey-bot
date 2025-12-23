# 🏗️ Bot Architecture Overview

## System Components

### 1. Discord Bot (src/index.js)
- Handles all Discord interactions
- Registers and executes slash commands
- Manages button/select menu interactions
- Event-driven architecture

### 2. Database Layer (src/database/)
- SQLite database with WAL mode
- Comprehensive schema with 15+ tables
- Query helper functions for all operations
- Automatic foreign key enforcement

### 3. Command System (src/commands/)
- Modular command structure
- 50+ slash commands across categories
- Permission-based access control
- Interactive components (buttons, selects, modals)

### 4. Roblox Integration (src/roblox.js)
- REST API for Roblox user verification
- HTTP webhook server for in-game reporting
- HMAC signature verification
- Express.js server on configurable port

### 5. Utility Layer (src/utils.js)
- Permission checking functions
- Embed builders for consistent styling
- Button and select menu builders
- Format and validation helpers

## Data Flow

### Player Signing Flow
1. GM runs /sign command
2. Bot checks permissions
3. Validates player is free agent
4. Checks roster limits
5. Updates database (rosters table)
6. Assigns Discord role
7. Logs transaction
8. Sends confirmation

### In-Game Score Report Flow
1. Roblox game ends, sends POST to webhook
2. Bot verifies HMAC signature
3. Creates pending report in database
4. Sends embed to staff channel with buttons
5. Staff approves/rejects
6. If approved: updates game, standings
7. Posts to game results channel

### Trade Flow
1. GM proposes trade via command
2. Bot creates trade record
3. Sends embeds with accept/decline buttons
4. Both teams accept
5. Bot executes roster changes
6. Updates player roles
7. Logs all transactions
8. Sends confirmation

## Database Schema Highlights

### Core Tables
- teams - Team information
- players - Discord-Roblox links
- rosters - Player-team assignments
- seasons - Season tracking

### Transaction Tables
- trades - Trade proposals
- trade_players - Players in trades
- transactions - Complete audit trail

### Game Tables
- games - Scheduled/completed games
- player_game_stats - Per-game player stats
- standings - Cached team standings
- pending_game_reports - In-game reports

### Config Tables
- config - League settings
- audit_log - All administrative actions
- user_notifications - User preferences

## Security Features

### Authentication
- Discord OAuth2 via bot token
- HMAC-SHA256 webhook signatures
- Role-based access control

### Data Protection
- SQL injection prevention (prepared statements)
- Input validation on all commands
- Audit trail of all actions

### Rate Limiting
- Discord API rate limiting handled
- Webhook endpoint throttling
- Database connection pooling

## Scalability Considerations

### Performance
- SQLite with WAL mode for concurrent reads
- Indexed queries for common operations
- Efficient embed generation
- Cached standings calculations

### Future Expansion
- Modular command structure
- Extensible database schema
- Plugin architecture ready
- Multi-guild support possible

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Discord.js v14
- **Database:** SQLite3 (better-sqlite3)
- **HTTP:** Express.js
- **Environment:** dotenv

## File Structure
```
roblox-hockey-bot/
├── src/
│   ├── commands/          # Command handlers
│   │   ├── player.js      # Player management
│   │   ├── team.js        # Team management
│   │   └── all.js         # Remaining commands
│   ├── database/          # Data layer
│   │   ├── init.js        # Schema definition
│   │   └── db.js          # Query helpers
│   ├── index.js           # Main entry point
│   ├── deploy-commands.js # Command registration
│   ├── interactions.js    # Button/select handlers
│   ├── roblox.js         # Roblox integration
│   └── utils.js          # Shared utilities
├── data/                  # Database storage
├── .env                   # Configuration
└── package.json          # Dependencies
```
