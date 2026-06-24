require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('View banned users and unban them'),
    new SlashCommandBuilder()
        .setName('org')
        .setDescription('Manage channels and perform administrative tasks'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Registered commands successfully.');
    } catch (e) { console.error('Registration Error:', e); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'org') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        return interaction.reply('⚙️ The org command is active.');
    }

    if (interaction.commandName === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply("There are no banned users.");

        const banList = Array.from(bans.values());
        let response = "📜 **Banned Users:**\n";
        banList.forEach((b, i) => response += `${i + 1}- ${b.user.tag} (ID: ${b.user.id})\n`);
        response += "\n*Reply with the number to unban.*";

        await interaction.reply({ content: response, fetchReply: true });

        const filter = m => m.author.id === interaction.user.id && !isNaN(m.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async m => {
            const index = parseInt(m.content) - 1;
            if (index >= 0 && index < banList.length) {
                const user = banList[index].user;
                await interaction.guild.members.unban(user.id);
                await m.reply(`✅ **Successfully unbanned ${user.tag}**`);
                await interaction.deleteReply().catch(() => {});
            } else {
                m.reply("Invalid number.");
            }
        });
    }
});

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
});

client.login(TOKEN);
