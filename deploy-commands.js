import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Import commands
import { commands as playerCommands } from './commands/player.js';
import { commands as teamCommands } from './commands/team.js';
import { commands as allCommands } from './commands/all.js';

dotenv.config();

const allCommandsList = [
  ...playerCommands,
  ...teamCommands,
  ...allCommands
];

const commands = allCommandsList.map(cmd => cmd.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║     🔄 DEPLOYING SLASH COMMANDS                           ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📝 Registering ${commands.length} application (/) commands...`);
    console.log('');

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Successfully registered commands:');
    console.log('');
    
    for (const command of data) {
      console.log(`   /${command.name} - ${command.description}`);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ Command deployment complete!');
    console.log('═══════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
