import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { teams, rosters, seasons, config } from '../database/db.js';
import { embeds, permissions, buttons, selectMenus } from '../utils.js';

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('team')
      .setDescription('Team management commands')
      .addSubcommand(subcommand =>
        subcommand
          .setName('create')
          .setDescription('Create a new team')
          .addStringOption(option =>
            option.setName('name')
              .setDescription('Team name')
              .setRequired(true)
          )
          .addRoleOption(option =>
            option.setName('role')
              .setDescription('Discord role for this team')
              .setRequired(true)
          )
          .addStringOption(option =>
            option.setName('abbreviation')
              .setDescription('Team abbreviation (3-4 letters)')
              .setRequired(true)
              .setMaxLength(4)
          )
          .addStringOption(option =>
            option.setName('primary_color')
              .setDescription('Primary color (hex code, e.g. #FF0000)')
              .setRequired(false)
          )
          .addStringOption(option =>
            option.setName('secondary_color')
              .setDescription('Secondary color (hex code)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('delete')
          .setDescription('Delete a team')
          .addIntegerOption(option =>
            option.setName('team_id')
              .setDescription('Team ID to delete')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('info')
          .setDescription('View team information')
          .addIntegerOption(option =>
            option.setName('team_id')
              .setDescription('Team ID to view')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('edit')
          .setDescription('Edit team information')
          .addIntegerOption(option =>
            option.setName('team_id')
              .setDescription('Team ID')
              .setRequired(true)
          )
          .addStringOption(option =>
            option.setName('field')
              .setDescription('Field to edit')
              .setRequired(true)
              .addChoices(
                { name: 'Name', value: 'name' },
                { name: 'Abbreviation', value: 'abbreviation' },
                { name: 'Conference', value: 'conference' },
                { name: 'Division', value: 'division' },
                { name: 'Primary Color', value: 'primary_color' },
                { name: 'Secondary Color', value: 'secondary_color' },
                { name: 'Logo URL', value: 'logo_url' }
              )
          )
          .addStringOption(option =>
            option.setName('value')
              .setDescription('New value')
              .setRequired(true)
          )
      ),
    async execute(interaction) {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'create') {
        if (!permissions.isCommissioner(interaction)) {
          return interaction.reply({
            embeds: [embeds.error('Permission Denied', 'Only commissioners can create teams.')],
            ephemeral: true
          });
        }
        
        const name = interaction.options.getString('name');
        const role = interaction.options.getRole('role');
        const abbreviation = interaction.options.getString('abbreviation').toUpperCase();
        const primaryColor = interaction.options.getString('primary_color') || '#000000';
        const secondaryColor = interaction.options.getString('secondary_color') || '#FFFFFF';
        
        try {
          const teamId = teams.create(name, abbreviation, role.id, interaction.user.id);
          
          if (primaryColor !== '#000000') {
            teams.update(teamId, 'primary_color', primaryColor, interaction.user.id);
          }
          if (secondaryColor !== '#FFFFFF') {
            teams.update(teamId, 'secondary_color', secondaryColor, interaction.user.id);
          }
          
          return interaction.reply({
            embeds: [embeds.success(
              'Team Created',
              `Successfully created **${name}** (${abbreviation})\nTeam ID: ${teamId}\nRole: ${role}`
            )]
          });
        } catch (error) {
          return interaction.reply({
            embeds: [embeds.error('Error', 'Failed to create team. The abbreviation or role may already be in use.')],
            ephemeral: true
          });
        }
      }
      
      if (subcommand === 'delete') {
        if (!permissions.isCommissioner(interaction)) {
          return interaction.reply({
            embeds: [embeds.error('Permission Denied', 'Only commissioners can delete teams.')],
            ephemeral: true
          });
        }
        
        const teamId = interaction.options.getInteger('team_id');
        const team = teams.getById(teamId);
        
        if (!team) {
          return interaction.reply({
            embeds: [embeds.error('Team Not Found', `No team found with ID ${teamId}.`)],
            ephemeral: true
          });
        }
        
        await interaction.reply({
          embeds: [embeds.warning(
            'Confirm Deletion',
            `Are you sure you want to delete **${team.name}**?\n\n⚠️ This will remove all roster records and cannot be undone.`
          )],
          components: [buttons.confirmation(`team_delete_${teamId}`, 'Delete Team', 'Danger')],
          ephemeral: true
        });
      }
      
      if (subcommand === 'info') {
        let teamId = interaction.options.getInteger('team_id');
        
        // If no team specified, try to find user's team
        if (!teamId) {
          const allTeams = teams.getAll();
          const userTeam = allTeams.find(t => 
            interaction.member.roles.cache.has(t.discord_role_id)
          );
          
          if (!userTeam) {
            return interaction.reply({
              embeds: [embeds.error('No Team', 'Please specify a team ID or join a team role.')],
              ephemeral: true
            });
          }
          
          teamId = userTeam.id;
        }
        
        const team = teams.getById(teamId);
        
        if (!team) {
          return interaction.reply({
            embeds: [embeds.error('Team Not Found', `No team found with ID ${teamId}.`)],
            ephemeral: true
          });
        }
        
        const season = seasons.getCurrent();
        const roster = season ? rosters.getTeamRoster(teamId, season.id) : [];
        
        return interaction.reply({
          embeds: [embeds.team(team, roster)]
        });
      }
      
      if (subcommand === 'edit') {
        if (!permissions.isCommissioner(interaction)) {
          return interaction.reply({
            embeds: [embeds.error('Permission Denied', 'Only commissioners can edit teams.')],
            ephemeral: true
          });
        }
        
        const teamId = interaction.options.getInteger('team_id');
        const field = interaction.options.getString('field');
        const value = interaction.options.getString('value');
        
        const team = teams.getById(teamId);
        
        if (!team) {
          return interaction.reply({
            embeds: [embeds.error('Team Not Found', `No team found with ID ${teamId}.`)],
            ephemeral: true
          });
        }
        
        try {
          teams.update(teamId, field, value, interaction.user.id);
          
          return interaction.reply({
            embeds: [embeds.success(
              'Team Updated',
              `Successfully updated ${field} for **${team.name}** to: ${value}`
            )]
          });
        } catch (error) {
          return interaction.reply({
            embeds: [embeds.error('Error', 'Failed to update team. Please check your input.')],
            ephemeral: true
          });
        }
      }
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('roster')
      .setDescription('View a team\'s roster')
      .addIntegerOption(option =>
        option.setName('team_id')
          .setDescription('Team ID to view')
          .setRequired(false)
      ),
    async execute(interaction) {
      let teamId = interaction.options.getInteger('team_id');
      
      if (!teamId) {
        const allTeams = teams.getAll();
        const userTeam = allTeams.find(t => 
          interaction.member.roles.cache.has(t.discord_role_id)
        );
        
        if (!userTeam) {
          return interaction.reply({
            embeds: [embeds.error('No Team', 'Please specify a team ID or join a team role.')],
            ephemeral: true
          });
        }
        
        teamId = userTeam.id;
      }
      
      const team = teams.getById(teamId);
      
      if (!team) {
        return interaction.reply({
          embeds: [embeds.error('Team Not Found', `No team found with ID ${teamId}.`)],
          ephemeral: true
        });
      }
      
      const season = seasons.getCurrent();
      
      if (!season) {
        return interaction.reply({
          embeds: [embeds.error('No Active Season', 'There is no active season.')],
          ephemeral: true
        });
      }
      
      const roster = rosters.getTeamRoster(teamId, season.id);
      
      return interaction.reply({
        embeds: [embeds.team(team, roster)]
      });
    }
  },
  
  {
    data: new SlashCommandBuilder()
      .setName('teamlist')
      .setDescription('List all teams in the league'),
    async execute(interaction) {
      const allTeams = teams.getAll();
      
      if (allTeams.length === 0) {
        return interaction.reply({
          embeds: [embeds.info('No Teams', 'There are no teams in the league yet.')],
          ephemeral: true
        });
      }
      
      const fields = allTeams.map(team => ({
        name: `${team.name} (${team.abbreviation})`,
        value: `ID: ${team.id} | Role: <@&${team.discord_role_id}>`,
        inline: false
      }));
      
      return interaction.reply({
        embeds: [{
          color: 0x0099ff,
          title: '🏒 League Teams',
          fields,
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
];
