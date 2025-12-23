# 📖 Command Reference Guide

Complete reference for all bot commands with examples and use cases.

## 🎮 Player Management Commands

### /link
**Description:** Link your Discord account to your Roblox username  
**Usage:** `/link roblox_username:<username>`  
**Example:** `/link roblox_username:JohnDoe123`  
**Permissions:** Anyone  
**Notes:** Account must be verified by staff before joining teams

### /unlink
**Description:** Unlink your Roblox account  
**Usage:** `/unlink`  
**Permissions:** Anyone  
**Notes:** Cannot unlink while on a team roster

### /verify
**Description:** Verify or unverify a player's Roblox link  
**Usage:** `/verify user:<@user> verified:<true/false>`  
**Example:** `/verify user:@JohnDoe verified:true`  
**Permissions:** Staff only

### /whois
**Description:** Look up a player's Roblox information  
**Usage:** `/whois user:<@user>`  
**Example:** `/whois user:@JohnDoe`  
**Permissions:** Anyone

### /lookup
**Description:** Find a Discord user by Roblox username  
**Usage:** `/lookup roblox_username:<username>`  
**Example:** `/lookup roblox_username:JohnDoe123`  
**Permissions:** Anyone

---

## 🏆 Team Management Commands

### /team create
**Description:** Create a new team  
**Usage:** `/team create name:<name> role:<@role> abbreviation:<abbr>`  
**Example:** `/team create name:Toronto Maple Leafs role:@Leafs abbreviation:TOR`  
**Permissions:** Commissioner only  
**Optional:** `primary_color:#FF0000 secondary_color:#0000FF`

### /team delete
**Description:** Delete a team (requires confirmation)  
**Usage:** `/team delete team_id:<id>`  
**Example:** `/team delete team_id:1`  
**Permissions:** Commissioner only  
**Warning:** This deletes all roster history

### /team info
**Description:** View detailed team information and roster  
**Usage:** `/team info team_id:<id>`  
**Example:** `/team info team_id:1`  
**Permissions:** Anyone  
**Notes:** Omit team_id to view your own team

### /team edit
**Description:** Edit team information  
**Usage:** `/team edit team_id:<id> field:<field> value:<value>`  
**Example:** `/team edit team_id:1 field:name value:New Team Name`  
**Permissions:** Commissioner only  
**Fields:** name, abbreviation, conference, division, primary_color, secondary_color, logo_url

### /roster
**Description:** View a team's current roster  
**Usage:** `/roster team_id:<id>`  
**Example:** `/roster team_id:1`  
**Permissions:** Anyone  
**Notes:** Shows player names, positions, jersey numbers

### /teamlist
**Description:** List all teams in the league  
**Usage:** `/teamlist`  
**Permissions:** Anyone

---

## 💼 Transaction Commands

### /sign
**Description:** Sign a free agent to a team  
**Usage:** `/sign player:<@user> team_id:<id>`  
**Example:** `/sign player:@JohnDoe team_id:1`  
**Permissions:** GM/Commissioner  
**Checks:** Roster limits, player verification, free agent status

### /cut
**Description:** Release a player from a team  
**Usage:** `/cut player:<@user> team_id:<id>`  
**Example:** `/cut player:@JohnDoe team_id:1`  
**Permissions:** GM/Commissioner  
**Notes:** Automatically removes team role

### /trade propose
**Description:** Propose a trade between two teams  
**Usage:** `/trade propose your_team:<id> other_team:<id>`  
**Example:** `/trade propose your_team:1 other_team:2`  
**Permissions:** GM/Commissioner  
**Notes:** Opens interactive trade builder

### /trade list
**Description:** View all pending trades  
**Usage:** `/trade list`  
**Permissions:** Anyone

### /trade view
**Description:** View details of a specific trade  
**Usage:** `/trade view trade_id:<id>`  
**Example:** `/trade view trade_id:5`  
**Permissions:** Anyone  
**Notes:** Shows approve/decline buttons for involved teams

### /freeagents
**Description:** List all available free agents  
**Usage:** `/freeagents`  
**Permissions:** Anyone  
**Notes:** Only shows verified players

---

## 📅 Schedule & Game Commands

### /schedule view
**Description:** View upcoming games  
**Usage:** `/schedule view limit:<number>`  
**Example:** `/schedule view limit:10`  
**Permissions:** Anyone  
**Default:** Shows 10 games

### /schedule game
**Description:** Schedule a new game  
**Usage:** `/schedule game home_team:<id> away_team:<id> datetime:<YYYY-MM-DD HH:MM>`  
**Example:** `/schedule game home_team:1 away_team:2 datetime:2024-09-15 19:00`  
**Permissions:** Commissioner only

### /game report
**Description:** Manually report a game result  
**Usage:** `/game report game_id:<id> home_score:<#> away_score:<#> overtime:<true/false>`  
**Example:** `/game report game_id:1 home_score:5 away_score:3 overtime:false`  
**Permissions:** Staff only  
**Notes:** Automatically updates standings

### /game details
**Description:** View detailed game information  
**Usage:** `/game details game_id:<id>`  
**Example:** `/game details game_id:1`  
**Permissions:** Anyone

---

## 📊 Standings & Statistics Commands

### /standings
**Description:** View current league standings  
**Usage:** `/standings`  
**Permissions:** Anyone  
**Shows:** W-L-OTL, Points, Goals For/Against, Differential

### /stats player
**Description:** View player statistics (planned feature)  
**Usage:** `/stats player user:<@user>`  
**Permissions:** Anyone

### /stats team
**Description:** View team statistics (planned feature)  
**Usage:** `/stats team team_id:<id>`  
**Permissions:** Anyone

---

## ⚙️ Configuration Commands

### /config view
**Description:** View all league configuration settings  
**Usage:** `/config view`  
**Permissions:** Commissioner only  
**Shows:** All configurable league parameters

### /config set
**Description:** Update a configuration value  
**Usage:** `/config set key:<key> value:<value>`  
**Example:** `/config set key:roster_size_max value:15`  
**Permissions:** Commissioner only

**Available Configuration Keys:**
- `roster_size_min` - Minimum roster size
- `roster_size_max` - Maximum roster size
- `trades_enabled` - Enable/disable trades
- `trade_deadline_enabled` - Enforce trade deadline
- `trade_deadline_days` - Days before playoffs to freeze trades
- `points_win` - Points for a win
- `points_otl` - Points for overtime loss
- `points_loss` - Points for regulation loss
- `auto_assign_roles` - Auto-assign Discord roles
- `ingame_reporting_enabled` - Allow in-game reports
- `require_staff_approval` - Require staff approval for reports

---

## 🏒 Season Management Commands

### /season create
**Description:** Create a new season  
**Usage:** `/season create name:<name> start_date:<YYYY-MM-DD>`  
**Example:** `/season create name:2024-2025 start_date:2024-09-01`  
**Permissions:** Commissioner only

### /season info
**Description:** View current season information  
**Usage:** `/season info`  
**Permissions:** Anyone

### /season end (planned)
**Description:** End the current season  
**Usage:** `/season end`  
**Permissions:** Commissioner only

---

## 🎯 Draft Commands (planned)

### /draft create
**Description:** Set up a new draft  
**Usage:** `/draft create date:<YYYY-MM-DD> rounds:<number>`  
**Permissions:** Commissioner only

### /draft eligible add
**Description:** Add a player to the draft pool  
**Usage:** `/draft eligible add user:<@user>`  
**Permissions:** Commissioner only

### /draft start
**Description:** Begin the draft  
**Usage:** `/draft start`  
**Permissions:** Commissioner only

### /draft pick
**Description:** Make a draft pick  
**Usage:** `/draft pick user:<@user>`  
**Permissions:** Team on the clock

---

## 🔔 Notification Commands (planned)

### /notify trades
**Description:** Toggle trade notifications  
**Usage:** `/notify trades`  
**Permissions:** Anyone

### /notify games
**Description:** Toggle game notifications  
**Usage:** `/notify games`  
**Permissions:** Anyone

---

## 📝 Administrative Commands

### /announce
**Description:** Send a league-wide announcement  
**Usage:** `/announce message:<text>`  
**Permissions:** Commissioner only

### /permissions set
**Description:** Assign team staff roles  
**Usage:** `/permissions set team_id:<id> user:<@user> role:<gm/agm/captain>`  
**Permissions:** Commissioner only

---

## 💡 Tips & Best Practices

### For Players
- Link your account as soon as possible
- Keep your Roblox username up to date
- Check `/freeagents` to see signing opportunities
- Use `/whois` to verify your information

### For GMs
- Always verify a player is a free agent before signing
- Check roster limits with `/roster`
- Propose trades early to allow time for negotiation
- Communicate with players before cuts

### For Commissioners
- Set all configuration values before the season starts
- Create a backup schedule with `/schedule game`
- Review in-game reports promptly
- Keep teams balanced with draft order

### For Staff
- Verify players quickly to keep onboarding smooth
- Review game reports for accuracy
- Monitor transactions channel for issues
- Help new users with commands

---

## 🆘 Common Issues & Solutions

**"Player not verified"**
→ Player must link account and wait for staff verification

**"Roster full"**
→ Team has reached maximum roster size, must cut a player first

**"Permission Denied"**
→ You don't have the required role for this command

**"Trade deadline passed"**
→ Trades are frozen, commissioner must enable them

**"Team not found"**
→ Double-check the team ID with `/teamlist`

---

## 🔄 Interactive Features

### Trade Approval
When viewing a trade with `/trade view`, teams will see:
- ✅ **Accept** - Approve the trade
- ❌ **Decline** - Reject the trade
- 🔄 **Cancel** - Proposer can cancel

### In-Game Report Approval
Staff members will see in the staff channel:
- ✅ **Approve** - Accept and record the result
- ❌ **Reject** - Decline the report
- ℹ️ **View Details** - See full game information

### Confirmation Dialogs
Destructive actions (team deletion, etc.) require confirmation:
- ✅ **Confirm**
- ❌ **Cancel**

---

**For more information, see README.md or contact your league administrators.**
