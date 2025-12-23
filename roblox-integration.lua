--[[
    Roblox Hockey League - In-Game Score Reporter
    
    This script should be placed in ServerScriptService and will automatically
    report game results to your Discord bot when games end.
    
    Setup Instructions:
    1. Update WEBHOOK_URL with your bot's webhook URL
    2. Update WEBHOOK_SECRET with your secret from .env
    3. Update TEAM_ABBREVIATIONS table with your league's teams
    4. Hook this up to your game's scoring system
]]

local HttpService = game:GetService("HttpService")

-- ============================================================
-- CONFIGURATION - UPDATE THESE VALUES
-- ============================================================

local WEBHOOK_URL = "http://your-bot-server.com:3000/game/report"
local WEBHOOK_SECRET = "your-webhook-secret-here" -- Must match INGAME_WEBHOOK_SECRET in .env

local TEAM_ABBREVIATIONS = {
    ["Red Team"] = "RED",
    ["Blue Team"] = "BLU",
    ["Toronto Maple Leafs"] = "TOR",
    ["Montreal Canadiens"] = "MTL",
    -- Add all your league teams here
}

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Generate HMAC-SHA256 signature for webhook authentication
local function generateSignature(payload)
    -- Note: Roblox doesn't have native HMAC support
    -- You'll need to use a Roblox HMAC library or implement signing server-side
    -- For now, this is a placeholder
    
    -- Example using a hypothetical HMAC module:
    -- local HMAC = require(script.Parent.HMAC)
    -- return HMAC.sha256(payload, WEBHOOK_SECRET)
    
    -- Temporary workaround: Send secret in header and verify server-side
    return WEBHOOK_SECRET
end

-- Convert team name to abbreviation
local function getTeamAbbreviation(teamName)
    return TEAM_ABBREVIATIONS[teamName] or teamName:sub(1, 3):upper()
end

-- ============================================================
-- SCORE REPORTING FUNCTION
-- ============================================================

function ReportGameScore(gameData)
    --[[
        gameData structure:
        {
            HomeTeam = "Toronto Maple Leafs",
            AwayTeam = "Montreal Canadiens",
            HomeScore = 5,
            AwayScore = 3,
            Overtime = false,
            Shootout = false,
            PlayerStats = {
                [123456789] = {  -- Roblox User ID
                    Goals = 2,
                    Assists = 1,
                    Shots = 5,
                    PlusMinus = 2
                }
            }
        }
    ]]
    
    -- Prepare the payload
    local payload = {
        roblox_game_id = game.JobId,
        home_team_abbr = getTeamAbbreviation(gameData.HomeTeam),
        away_team_abbr = getTeamAbbreviation(gameData.AwayTeam),
        home_score = gameData.HomeScore,
        away_score = gameData.AwayScore,
        overtime = gameData.Overtime or false,
        shootout = gameData.Shootout or false,
        player_stats = gameData.PlayerStats or {}
    }
    
    -- Convert to JSON
    local jsonPayload = HttpService:JSONEncode(payload)
    
    -- Generate signature
    local signature = generateSignature(jsonPayload)
    
    -- Prepare headers
    local headers = {
        ["Content-Type"] = "application/json",
        ["X-Webhook-Signature"] = signature
    }
    
    -- Send the request
    local success, response = pcall(function()
        return HttpService:PostAsync(
            WEBHOOK_URL,
            jsonPayload,
            Enum.HttpContentType.ApplicationJson,
            false,
            headers
        )
    end)
    
    if success then
        local responseData = HttpService:JSONDecode(response)
        if responseData.success then
            print("[League Bot] Game report submitted successfully!")
            print("[League Bot] Report ID:", responseData.report_id)
            return true, responseData.report_id
        else
            warn("[League Bot] Failed to submit report:", responseData.error or "Unknown error")
            return false, responseData.error
        end
    else
        warn("[League Bot] HTTP request failed:", response)
        return false, response
    end
end

-- ============================================================
-- GAME START NOTIFICATION (Optional)
-- ============================================================

function NotifyGameStart(homeTeam, awayTeam)
    local payload = {
        roblox_game_id = game.JobId,
        home_team_abbr = getTeamAbbreviation(homeTeam),
        away_team_abbr = getTeamAbbreviation(awayTeam)
    }
    
    local jsonPayload = HttpService:JSONEncode(payload)
    local signature = generateSignature(jsonPayload)
    
    local headers = {
        ["Content-Type"] = "application/json",
        ["X-Webhook-Signature"] = signature
    }
    
    pcall(function()
        HttpService:PostAsync(
            WEBHOOK_URL:gsub("/game/report", "/game/start"),
            jsonPayload,
            Enum.HttpContentType.ApplicationJson,
            false,
            headers
        )
    end)
    
    print("[League Bot] Game start notification sent")
end

-- ============================================================
-- EXAMPLE USAGE
-- ============================================================

--[[
    Example 1: Report a completed game
    
    local gameResult = {
        HomeTeam = "Toronto Maple Leafs",
        AwayTeam = "Montreal Canadiens",
        HomeScore = 5,
        AwayScore = 3,
        Overtime = false,
        Shootout = false,
        PlayerStats = {
            [123456789] = {  -- Player's Roblox User ID
                Goals = 2,
                Assists = 1,
                Shots = 5
            },
            [987654321] = {
                Goals = 1,
                Assists = 2,
                Shots = 4
            }
        }
    }
    
    ReportGameScore(gameResult)
]]

--[[
    Example 2: Notify when game starts
    
    NotifyGameStart("Toronto Maple Leafs", "Montreal Canadiens")
]]

-- ============================================================
-- INTEGRATION WITH YOUR GAME
-- ============================================================

-- Hook this into your game's end-game logic
-- For example, if you have a GameManager:

--[[
local GameManager = require(game.ServerScriptService.GameManager)

GameManager.OnGameEnd:Connect(function(results)
    local gameData = {
        HomeTeam = results.HomeTeamName,
        AwayTeam = results.AwayTeamName,
        HomeScore = results.HomeScore,
        AwayScore = results.AwayScore,
        Overtime = results.WentToOvertime,
        Shootout = results.WentToShootout,
        PlayerStats = results.PlayerStats
    }
    
    local success, reportId = ReportGameScore(gameData)
    
    if success then
        -- Optionally show a message to players
        for _, player in pairs(game.Players:GetPlayers()) do
            player:Kick("Game ended! Results submitted to league bot.")
        end
    end
end)

GameManager.OnGameStart:Connect(function(homeTeam, awayTeam)
    NotifyGameStart(homeTeam, awayTeam)
end)
]]

-- ============================================================
-- PLAYER STAT TRACKING EXAMPLE
-- ============================================================

local PlayerStats = {}

function InitializePlayerStats(player)
    PlayerStats[player.UserId] = {
        Goals = 0,
        Assists = 0,
        Shots = 0,
        Saves = 0,
        PlusMinus = 0
    }
end

function RecordGoal(scorer, assisters)
    if PlayerStats[scorer.UserId] then
        PlayerStats[scorer.UserId].Goals = PlayerStats[scorer.UserId].Goals + 1
    end
    
    for _, assister in ipairs(assisters or {}) do
        if PlayerStats[assister.UserId] then
            PlayerStats[assister.UserId].Assists = PlayerStats[assister.UserId].Assists + 1
        end
    end
end

function RecordShot(shooter)
    if PlayerStats[shooter.UserId] then
        PlayerStats[shooter.UserId].Shots = PlayerStats[shooter.UserId].Shots + 1
    end
end

function GetAllPlayerStats()
    return PlayerStats
end

-- Initialize stats for all players when they join
game.Players.PlayerAdded:Connect(function(player)
    InitializePlayerStats(player)
end)

-- ============================================================
-- HEALTH CHECK (Optional)
-- ============================================================

function CheckWebhookConnection()
    local success, response = pcall(function()
        return HttpService:GetAsync(WEBHOOK_URL:gsub("/game/report", "/health"))
    end)
    
    if success then
        local data = HttpService:JSONDecode(response)
        if data.status == "ok" then
            print("[League Bot] ✅ Webhook connection healthy")
            return true
        end
    end
    
    warn("[League Bot] ❌ Webhook connection failed")
    return false
end

-- Check connection when script loads
wait(2)
CheckWebhookConnection()

print("[League Bot] Score reporter loaded and ready!")

return {
    ReportGameScore = ReportGameScore,
    NotifyGameStart = NotifyGameStart,
    InitializePlayerStats = InitializePlayerStats,
    RecordGoal = RecordGoal,
    RecordShot = RecordShot,
    GetAllPlayerStats = GetAllPlayerStats,
    CheckWebhookConnection = CheckWebhookConnection
}
