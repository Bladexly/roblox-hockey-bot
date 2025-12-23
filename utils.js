import { PermissionFlagsBits } from 'discord.js';
import { teams } from './database/db.js';

// Permission checks
export const permissions = {
  isAdmin: (interaction) => {
    const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    return interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
           adminIds.includes(interaction.user.id);
  },
  
  isCommissioner: (interaction) => {
    const commissionerRole = process.env.LEAGUE_COMMISSIONER_ROLE_ID;
    return permissions.isAdmin(interaction) || 
           (commissionerRole && interaction.member.roles.cache.has(commissionerRole));
  },
  
  isGM: (interaction, teamId = null) => {
    const gmRole = process.env.GM_ROLE_ID;
    if (gmRole && interaction.member.roles.cache.has(gmRole)) return true;
    
    // Check if they're a GM of the specific team
    if (teamId) {
      const team = teams.getById(teamId);
      return team && interaction.member.roles.cache.has(team.discord_role_id);
    }
    
    return false;
  },
  
  isStaff: (interaction) => {
    const staffRole = process.env.STAFF_ROLE_ID;
    return permissions.isAdmin(interaction) || 
           permissions.isCommissioner(interaction) ||
           (staffRole && interaction.member.roles.cache.has(staffRole));
  },
  
  canManageTeam: (interaction, teamId) => {
    return permissions.isCommissioner(interaction) || permissions.isGM(interaction, teamId);
  }
};

// Embed builders
export const embeds = {
  success: (title, description) => ({
    color: 0x00ff00,
    title: `✅ ${title}`,
    description,
    timestamp: new Date().toISOString()
  }),
  
  error: (title, description) => ({
    color: 0xff0000,
    title: `❌ ${title}`,
    description,
    timestamp: new Date().toISOString()
  }),
  
  info: (title, description) => ({
    color: 0x0099ff,
    title: `ℹ️ ${title}`,
    description,
    timestamp: new Date().toISOString()
  }),
  
  warning: (title, description) => ({
    color: 0xffaa00,
    title: `⚠️ ${title}`,
    description,
    timestamp: new Date().toISOString()
  }),
  
  team: (team, roster) => ({
    color: parseInt(team.primary_color.replace('#', ''), 16),
    title: `${team.name} (${team.abbreviation})`,
    thumbnail: team.logo_url ? { url: team.logo_url } : undefined,
    fields: [
      {
        name: 'Conference',
        value: team.conference || 'N/A',
        inline: true
      },
      {
        name: 'Division',
        value: team.division || 'N/A',
        inline: true
      },
      {
        name: 'Roster Size',
        value: `${roster.length} players`,
        inline: true
      },
      {
        name: 'Players',
        value: roster.length > 0 
          ? roster.map(r => `• ${r.roblox_username}${r.position ? ` (${r.position})` : ''}`).join('\n')
          : 'No players on roster',
        inline: false
      }
    ],
    timestamp: new Date().toISOString()
  }),
  
  trade: (trade, tradePlayers) => {
    const team1Players = tradePlayers.filter(p => p.from_team_id === trade.team1_id);
    const team2Players = tradePlayers.filter(p => p.from_team_id === trade.team2_id);
    
    return {
      color: 0xff6b6b,
      title: '🔄 Trade Proposal',
      description: `**Trade ID:** ${trade.id}`,
      fields: [
        {
          name: `${team1Players[0]?.from_team_name || 'Team 1'} Sends`,
          value: team1Players.map(p => `• ${p.roblox_username}`).join('\n') || 'Nothing',
          inline: true
        },
        {
          name: `${team2Players[0]?.from_team_name || 'Team 2'} Sends`,
          value: team2Players.map(p => `• ${p.roblox_username}`).join('\n') || 'Nothing',
          inline: true
        },
        {
          name: 'Status',
          value: `Team 1: ${trade.team1_accepted ? '✅' : '⏳'}\nTeam 2: ${trade.team2_accepted ? '✅' : '⏳'}`,
          inline: false
        }
      ],
      footer: {
        text: `Proposed by User ID: ${trade.proposed_by_user}`
      },
      timestamp: new Date(trade.proposed_at).toISOString()
    };
  },
  
  game: (game, detailed = false) => {
    const embed = {
      color: game.status === 'completed' ? 0x00ff00 : 0x0099ff,
      title: `${game.home_team_name} vs ${game.away_team_name}`,
      fields: [
        {
          name: 'Status',
          value: game.status.charAt(0).toUpperCase() + game.status.slice(1),
          inline: true
        },
        {
          name: 'Scheduled Time',
          value: new Date(game.scheduled_time).toLocaleString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    if (game.status === 'completed') {
      embed.fields.push({
        name: 'Final Score',
        value: `**${game.home_team_abbr}** ${game.home_score} - ${game.away_score} **${game.away_team_abbr}**${game.overtime ? ' (OT)' : ''}${game.shootout ? ' (SO)' : ''}`,
        inline: false
      });
    }
    
    return embed;
  },
  
  standings: (standingsData) => {
    const fields = [];
    let rank = 1;
    
    for (const team of standingsData) {
      fields.push({
        name: `${rank}. ${team.team_name}`,
        value: `**${team.points}** pts | ${team.wins}-${team.losses}-${team.overtime_losses} | GF: ${team.goals_for} | GA: ${team.goals_against} | Diff: ${team.goal_differential >= 0 ? '+' : ''}${team.goal_differential}`,
        inline: false
      });
      rank++;
    }
    
    return {
      color: 0xffd700,
      title: '🏆 League Standings',
      fields,
      timestamp: new Date().toISOString()
    };
  }
};

// Button builders
export const buttons = {
  confirmation: (customId, label = 'Confirm', style = 'Success') => ({
    type: 1,
    components: [
      {
        type: 2,
        style: style === 'Success' ? 3 : style === 'Danger' ? 4 : 1,
        label,
        custom_id: `${customId}_yes`
      },
      {
        type: 2,
        style: 4,
        label: 'Cancel',
        custom_id: `${customId}_no`
      }
    ]
  }),
  
  tradeActions: (tradeId, isTeam1, isTeam2) => ({
    type: 1,
    components: [
      {
        type: 2,
        style: 3,
        label: 'Accept',
        custom_id: `trade_accept_${tradeId}`,
        disabled: (!isTeam1 && !isTeam2)
      },
      {
        type: 2,
        style: 4,
        label: 'Decline',
        custom_id: `trade_decline_${tradeId}`,
        disabled: (!isTeam1 && !isTeam2)
      },
      {
        type: 2,
        style: 2,
        label: 'Cancel',
        custom_id: `trade_cancel_${tradeId}`,
        disabled: (!isTeam1 && !isTeam2)
      }
    ]
  }),
  
  gameReportActions: (reportId) => ({
    type: 1,
    components: [
      {
        type: 2,
        style: 3,
        label: 'Approve',
        custom_id: `report_approve_${reportId}`
      },
      {
        type: 2,
        style: 4,
        label: 'Reject',
        custom_id: `report_reject_${reportId}`
      },
      {
        type: 2,
        style: 2,
        label: 'View Details',
        custom_id: `report_details_${reportId}`
      }
    ]
  }),
  
  pagination: (currentPage, totalPages, baseId) => ({
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: '⏮️ First',
        custom_id: `${baseId}_first`,
        disabled: currentPage === 1
      },
      {
        type: 2,
        style: 2,
        label: '◀️ Previous',
        custom_id: `${baseId}_prev`,
        disabled: currentPage === 1
      },
      {
        type: 2,
        style: 2,
        label: `Page ${currentPage}/${totalPages}`,
        custom_id: `${baseId}_current`,
        disabled: true
      },
      {
        type: 2,
        style: 2,
        label: 'Next ▶️',
        custom_id: `${baseId}_next`,
        disabled: currentPage === totalPages
      },
      {
        type: 2,
        style: 2,
        label: 'Last ⏭️',
        custom_id: `${baseId}_last`,
        disabled: currentPage === totalPages
      }
    ]
  })
};

// Select menu builders
export const selectMenus = {
  teams: (allTeams, customId, placeholder = 'Select a team') => ({
    type: 1,
    components: [
      {
        type: 3,
        custom_id: customId,
        placeholder,
        options: allTeams.map(team => ({
          label: team.name,
          value: team.id.toString(),
          description: team.abbreviation,
          emoji: undefined
        }))
      }
    ]
  }),
  
  players: (players, customId, placeholder = 'Select a player') => ({
    type: 1,
    components: [
      {
        type: 3,
        custom_id: customId,
        placeholder,
        options: players.map(player => ({
          label: player.roblox_username || `User ${player.discord_user_id}`,
          value: player.id.toString(),
          description: `Discord: ${player.discord_user_id}`
        }))
      }
    ]
  })
};

// Modal builders
export const modals = {
  tradeProposal: (customId) => ({
    title: 'Propose Trade',
    custom_id: customId,
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'team1_id',
            label: 'Your Team ID',
            style: 1,
            required: true,
            placeholder: 'Enter team ID'
          }
        ]
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'team2_id',
            label: 'Other Team ID',
            style: 1,
            required: true,
            placeholder: 'Enter team ID'
          }
        ]
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'players_out',
            label: 'Player IDs You\'re Trading (comma-separated)',
            style: 2,
            required: true,
            placeholder: '1, 2, 3'
          }
        ]
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'players_in',
            label: 'Player IDs You\'re Receiving (comma-separated)',
            style: 2,
            required: true,
            placeholder: '4, 5, 6'
          }
        ]
      }
    ]
  })
};

// Formatters
export const format = {
  date: (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  record: (wins, losses, otl) => {
    return `${wins}-${losses}-${otl}`;
  },
  
  userMention: (userId) => {
    return `<@${userId}>`;
  },
  
  roleMention: (roleId) => {
    return `<@&${roleId}>`;
  },
  
  channelMention: (channelId) => {
    return `<#${channelId}>`;
  }
};

// Validators
export const validate = {
  rosterSize: (rosterSize, min, max) => {
    return rosterSize >= min && rosterSize <= max;
  },
  
  tradeDeadline: (config) => {
    if (config.get('trades_enabled') !== 'true') return false;
    // Additional trade deadline logic can be added here
    return true;
  },
  
  robloxUsername: (username) => {
    // Roblox usernames: 3-20 chars, alphanumeric and underscore only
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  }
};

export default {
  permissions,
  embeds,
  buttons,
  selectMenus,
  modals,
  format,
  validate
};
