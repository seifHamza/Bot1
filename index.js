// 1. استيراد المكتبات الضرورية
require('dotenv').config(); 
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

// 2. إعداد البوت
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildModeration, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// 3. قراءة الإعدادات من نظام الاستضافة (Environment Variables)
// Set DISCORD_TOKEN, CLIENT_ID, and GUILD_ID as environment variables on the service.
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 4. تسجيل الأمر /banlist
const commands = [
    new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('View banned users and unban them'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Registered /banlist command in your server.');
    } catch (e) { console.error('Registration Error:', e); }
})();

// 5. منطق عمل البوت
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

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
                await m.delete().catch(() => {});
            } else {
                m.reply("Invalid number.");
            }
        });
    }
});

// 6. تشغيل البوت
client.login(TOKEN);