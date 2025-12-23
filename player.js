import { SlashCommandBuilder } from 'discord.js';
import { players, rosters, seasons } from '../database/db.js';
import { RobloxAPI } from '../roblox.js';
import { embeds, permissions } from '../utils.js';

const robloxAPI = new RobloxAPI();

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('link')
      .setDescription('Link your Discord account to your Roblox username')
      .addStringOption(option =>
        option.setName('roblox_username')
          .setDescription('Your Roblox username')
          .setRequired(true)
      ),
    async execute(interaction) {
      const robloxUsername = interaction.options.getString('roblox_username');
      
      await interaction.deferReply({ ephemeral: true });
      
      // Verify Roblox username exists
      const robloxUser = await robloxAPI.getUserByUsername(robloxUsername);
      
      if (!robloxUser) {
        return interaction.editReply({
          embeds: [embeds.error('User Not Found', `The Roblox user "${robloxUsername}" does not exist.`)]
        });
      }
      
      // Check if Roblox account is already linked
      const existingLink = players.getByRobloxId(robloxUser.id.toString());
      if (existingLink && existingLink.discord_user_id !== interaction.user.id) {
        return interaction.editReply({
          embeds: [embeds.error('Already Linked', 'This Roblox account is already linked to another Discord user.')]
        });
      }
      
      // Link accounts
      players.link(
        interaction.user.id,
        robloxUser.id.toString(),
        robloxUser.name,
        false // Not automatically verified
      );
      
      return interaction.editReply({
        embeds: [embeds.success(
          'Account Linked',
          `Successfully linked your Discord account to Roblox user **${robloxUser.name}** (ID: ${robloxUser.id}).\n\n⚠️ Your account needs to be verified by a staff member before you can participate in the league. Please wait for verification.`
        )]
      });
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('unlink')
      .setDescription('Unlink your Roblox account from your Discord'),
    async execute(interaction) {
      const player = players.getByDiscordId(interaction.user.id);
      
      if (!player || !player.roblox_user_id) {
        return interaction.reply({
          embeds: [embeds.error('Not Linked', 'You do not have a Roblox account linked.')],
          ephemeral: true
        });
      }
      
      // Check if player is on a roster
      const season = seasons.getCurrent();
      if (season) {
        const roster = rosters.getPlayerTeam(player.id, season.id);
        if (roster) {
          return interaction.reply({
            embeds: [embeds.error('Cannot Unlink', 'You cannot unlink while on a team roster. Please contact your GM or league staff.')],
            ephemeral: true
          });
        }
      }
      
      players.unlink(interaction.user.id);
      
      return interaction.reply({
        embeds: [embeds.success('Account Unlinked', 'Your Roblox account has been unlinked from your Discord.')],
        ephemeral: true
      });
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('verify')
      .setDescription('Verify a player\'s Roblox link (Staff only)')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The Discord user to verify')
          .setRequired(true)
      )
      .addBooleanOption(option =>
        option.setName('verified')
          .setDescription('Whether to verify or unverify')
          .setRequired(false)
      ),
    async execute(interaction) {
      if (!permissions.isStaff(interaction)) {
        return interaction.reply({
          embeds: [embeds.error('Permission Denied', 'Only staff members can verify players.')],
          ephemeral: true
        });
      }
      
      const user = interaction.options.getUser('user');
      const verified = interaction.options.getBoolean('verified') ?? true;
      
      const player = players.getByDiscordId(user.id);
      
      if (!player || !player.roblox_user_id) {
        return interaction.reply({
          embeds: [embeds.error('Not Linked', 'This user does not have a Roblox account linked.')],
          ephemeral: true
        });
      }
      
      players.verify(player.id, verified);
      
      return interaction.reply({
        embeds: [embeds.success(
          verified ? 'Player Verified' : 'Player Unverified',
          `${user.username} (Roblox: **${player.roblox_username}**) has been ${verified ? 'verified' : 'unverified'}.`
        )]
      });
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('whois')
      .setDescription('Look up a player\'s Roblox account')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The Discord user to look up')
          .setRequired(true)
      ),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const player = players.getByDiscordId(user.id);
      
      if (!player || !player.roblox_user_id) {
        return interaction.reply({
          embeds: [embeds.error('Not Found', 'This user does not have a Roblox account linked.')],
          ephemeral: true
        });
      }
      
      const season = seasons.getCurrent();
      let teamInfo = 'Free Agent';
      
      if (season) {
        const roster = rosters.getPlayerTeam(player.id, season.id);
        if (roster) {
          teamInfo = `${roster.team_name} (${roster.team_abbreviation})`;
        }
      }
      
      return interaction.reply({
        embeds: [{
          color: 0x0099ff,
          title: `Player Information: ${user.username}`,
          thumbnail: {
            url: `https://www.roblox.com/headshot-thumbnail/image?userId=${player.roblox_user_id}&width=150&height=150&format=png`
          },
          fields: [
            {
              name: 'Roblox Username',
              value: player.roblox_username,
              inline: true
            },
            {
              name: 'Roblox User ID',
              value: player.roblox_user_id,
              inline: true
            },
            {
              name: 'Verified',
              value: player.verified ? '✅ Yes' : '❌ No',
              inline: true
            },
            {
              name: 'Current Team',
              value: teamInfo,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('lookup')
      .setDescription('Find a Discord user by their Roblox username')
      .addStringOption(option =>
        option.setName('roblox_username')
          .setDescription('The Roblox username to search for')
          .setRequired(true)
      ),
    async execute(interaction) {
      const robloxUsername = interaction.options.getString('roblox_username');
      
      await interaction.deferReply();
      
      // Get Roblox user ID
      const robloxUser = await robloxAPI.getUserByUsername(robloxUsername);
      
      if (!robloxUser) {
        return interaction.editReply({
          embeds: [embeds.error('User Not Found', `The Roblox user "${robloxUsername}" does not exist.`)]
        });
      }
      
      const player = players.getByRobloxId(robloxUser.id.toString());
      
      if (!player) {
        return interaction.editReply({
          embeds: [embeds.info('Not Linked', `The Roblox user **${robloxUser.name}** is not linked to any Discord account in this league.`)]
        });
      }
      
      const season = seasons.getCurrent();
      let teamInfo = 'Free Agent';
      
      if (season) {
        const roster = rosters.getPlayerTeam(player.id, season.id);
        if (roster) {
          teamInfo = `${roster.team_name} (${roster.team_abbreviation})`;
        }
      }
      
      return interaction.editReply({
        embeds: [{
          color: 0x0099ff,
          title: `Player Found: ${robloxUser.name}`,
          thumbnail: {
            url: `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.id}&width=150&height=150&format=png`
          },
          fields: [
            {
              name: 'Discord User',
              value: `<@${player.discord_user_id}>`,
              inline: true
            },
            {
              name: 'Verified',
              value: player.verified ? '✅ Yes' : '❌ No',
              inline: true
            },
            {
              name: 'Current Team',
              value: teamInfo,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
];
