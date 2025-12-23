import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from './database/db.js';
import { RobloxAPI, IngameWebhook } from './roblox.js';
import { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit } from './interactions.js';

// Import commands
import { commands as playerCommands } from './commands/player.js';
import { commands as teamCommands } from './commands/team.js';
import { commands as allCommands } from './commands/all.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// Store commands in collection
client.commands = new Collection();

// Combine all commands
const allCommandsList = [
  ...playerCommands,
  ...teamCommands,
  ...allCommands
];

for (const command of allCommandsList) {
  client.commands.set(command.data.name, command);
}

// Initialize Roblox API
const robloxAPI = new RobloxAPI();

// Bot ready event
client.once('ready', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     🏒 ROBLOX HOCKEY LEAGUE BOT - READY                   ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🏢 Serving ${client.guilds.cache.size} server(s)`);
  console.log(`📝 ${client.commands.size} commands loaded`);
  console.log('');
  
  // Start in-game webhook server
  if (process.env.INGAME_WEBHOOK_SECRET) {
    const webhook = new IngameWebhook(client);
    webhook.start();
  } else {
    console.log('⚠️  In-game webhook not configured (missing INGAME_WEBHOOK_SECRET)');
  }
  
  console.log('');
  console.log('🎮 Bot is ready to manage your league!');
  console.log('═══════════════════════════════════════════════════════════');
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        return interaction.reply({
          content: '❌ Command not found.',
          ephemeral: true
        });
      }
      
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    const errorMessage = {
      content: '❌ An error occurred while executing this command.',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Handle errors
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

export { client, robloxAPI };
