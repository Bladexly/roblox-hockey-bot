import { trades, teams, pendingReports, games } from './database/db.js';
import { embeds, permissions } from './utils.js';

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  
  // Trade actions
  if (customId.startsWith('trade_accept_')) {
    const tradeId = parseInt(customId.replace('trade_accept_', ''));
    const trade = trades.getById(tradeId);
    
    if (!trade || trade.status !== 'pending') {
      return interaction.update({
        embeds: [embeds.error('Trade Not Found', 'This trade is no longer available.')],
        components: []
      });
    }
    
    const team1 = teams.getById(trade.team1_id);
    const team2 = teams.getById(trade.team2_id);
    
    const isTeam1 = interaction.member.roles.cache.has(team1.discord_role_id);
    const isTeam2 = interaction.member.roles.cache.has(team2.discord_role_id);
    
    if (!isTeam1 && !isTeam2) {
      return interaction.reply({
        embeds: [embeds.error('Permission Denied', 'You are not part of either team in this trade.')],
        ephemeral: true
      });
    }
    
    trades.accept(tradeId, isTeam1 ? team1.id : team2.id, interaction.user.id);
    
    const updatedTrade = trades.getById(tradeId);
    
    if (updatedTrade.status === 'completed') {
      const tradePlayers = trades.getPlayers(tradeId);
      
      return interaction.update({
        embeds: [{
          ...embeds.trade(updatedTrade, tradePlayers),
          color: 0x00ff00,
          title: '✅ Trade Completed!'
        }],
        components: []
      });
    }
    
    return interaction.update({
      embeds: [embeds.info('Trade Accepted', 'Waiting for the other team to accept...')],
      components: []
    });
  }
  
  if (customId.startsWith('trade_decline_')) {
    const tradeId = parseInt(customId.replace('trade_decline_', ''));
    const trade = trades.getById(tradeId);
    
    if (!trade || trade.status !== 'pending') {
      return interaction.update({
        embeds: [embeds.error('Trade Not Found', 'This trade is no longer available.')],
        components: []
      });
    }
    
    trades.decline(tradeId, interaction.user.id);
    
    return interaction.update({
      embeds: [embeds.error('Trade Declined', 'This trade has been declined.')],
      components: []
    });
  }
  
  if (customId.startsWith('trade_cancel_')) {
    const tradeId = parseInt(customId.replace('trade_cancel_', ''));
    const trade = trades.getById(tradeId);
    
    if (!trade || trade.status !== 'pending') {
      return interaction.update({
        embeds: [embeds.error('Trade Not Found', 'This trade is no longer available.')],
        components: []
      });
    }
    
    if (trade.proposed_by_user !== interaction.user.id && !permissions.isCommissioner(interaction)) {
      return interaction.reply({
        embeds: [embeds.error('Permission Denied', 'Only the proposer or a commissioner can cancel this trade.')],
        ephemeral: true
      });
    }
    
    trades.cancel(tradeId, interaction.user.id);
    
    return interaction.update({
      embeds: [embeds.warning('Trade Cancelled', 'This trade has been cancelled.')],
      components: []
    });
  }
  
  // Game report actions
  if (customId.startsWith('report_approve_')) {
    if (!permissions.isStaff(interaction)) {
      return interaction.reply({
        embeds: [embeds.error('Permission Denied', 'Only staff can approve game reports.')],
        ephemeral: true
      });
    }
    
    const reportId = parseInt(customId.replace('report_approve_', ''));
    const report = pendingReports.getById(reportId);
    
    if (!report || report.status !== 'pending') {
      return interaction.update({
        embeds: [embeds.error('Report Not Found', 'This report is no longer available.')],
        components: []
      });
    }
    
    pendingReports.approve(reportId, interaction.user.id);
    
    const game = report.game_id ? games.getById(report.game_id) : null;
    
    return interaction.update({
      embeds: [{
        color: 0x00ff00,
        title: '✅ Game Report Approved',
        description: `Report #${reportId} has been approved and the game result has been recorded.`,
        fields: [
          {
            name: 'Final Score',
            value: `${report.home_score} - ${report.away_score}${report.overtime ? ' (OT)' : ''}${report.shootout ? ' (SO)' : ''}`,
            inline: false
          },
          {
            name: 'Approved By',
            value: `<@${interaction.user.id}>`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }],
      components: []
    });
  }
  
  if (customId.startsWith('report_reject_')) {
    if (!permissions.isStaff(interaction)) {
      return interaction.reply({
        embeds: [embeds.error('Permission Denied', 'Only staff can reject game reports.')],
        ephemeral: true
      });
    }
    
    const reportId = parseInt(customId.replace('report_reject_', ''));
    const report = pendingReports.getById(reportId);
    
    if (!report || report.status !== 'pending') {
      return interaction.update({
        embeds: [embeds.error('Report Not Found', 'This report is no longer available.')],
        components: []
      });
    }
    
    pendingReports.reject(reportId, interaction.user.id);
    
    return interaction.update({
      embeds: [{
        color: 0xff0000,
        title: '❌ Game Report Rejected',
        description: `Report #${reportId} has been rejected.`,
        fields: [
          {
            name: 'Rejected By',
            value: `<@${interaction.user.id}>`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }],
      components: []
    });
  }
  
  // Team deletion confirmation
  if (customId.startsWith('team_delete_') && customId.endsWith('_yes')) {
    if (!permissions.isCommissioner(interaction)) {
      return interaction.reply({
        embeds: [embeds.error('Permission Denied', 'Only commissioners can delete teams.')],
        ephemeral: true
      });
    }
    
    const teamId = parseInt(customId.replace('team_delete_', '').replace('_yes', ''));
    const team = teams.getById(teamId);
    
    if (!team) {
      return interaction.update({
        embeds: [embeds.error('Team Not Found', 'This team no longer exists.')],
        components: []
      });
    }
    
    teams.delete(teamId, interaction.user.id);
    
    return interaction.update({
      embeds: [embeds.success('Team Deleted', `**${team.name}** has been deleted from the league.`)],
      components: []
    });
  }
  
  if (customId.endsWith('_no')) {
    return interaction.update({
      embeds: [embeds.info('Cancelled', 'Action cancelled.')],
      components: []
    });
  }
}

export async function handleSelectMenuInteraction(interaction) {
  // Handle select menu interactions here
  // This would be used for interactive trade builder, player selection, etc.
  
  return interaction.reply({
    embeds: [embeds.info('Select Menu', 'Select menu interactions handled here.')],
    ephemeral: true
  });
}

export async function handleModalSubmit(interaction) {
  // Handle modal submissions here
  // This would be used for trade proposals, custom forms, etc.
  
  return interaction.reply({
    embeds: [embeds.info('Modal Submit', 'Modal submissions handled here.')],
    ephemeral: true
  });
}
