require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- ضع الـ ID الخاص بك هنا ---
const OWNER_ID = '1452991268635410585'; 

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('View the list of banned users and unban them'),
    new SlashCommandBuilder()
        .setName('org')
        .setDescription('Manage your server')
        .addSubcommand(sub => sub.setName('create_channel').setDescription('Create a new channel')
            .addStringOption(option => option.setName('name').setDescription('Channel name').setRequired(true))
            .addStringOption(option => option.setName('type').setDescription('Channel type')
                .addChoices({name: 'Text', value: 'text'}, {name: 'Voice', value: 'voice'}))),
    new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a private message (DM) to a user')
        .addStringOption(option => option.setName('userid').setDescription('Target User ID').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('The message content').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Commands registered successfully.');
    } catch (e) { console.error('Registration Error:', e); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // التحقق: هل المستخدم هو أنت؟
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Only the owner can use this command.', ephemeral: true });
    }

    // أمر الـ send
    if (interaction.commandName === 'send') {
        const userId = interaction.options.getString('userid');
        const messageContent = interaction.options.getString('message');

        try {
            const user = await client.users.fetch(userId);
            await user.send(messageContent);
            await interaction.reply({ content: `✅ Message sent successfully to **${user.tag}**!`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `❌ Could not send message. The user might have DMs blocked.`, ephemeral: true });
        }
    }

    // أمر الـ org
    if (interaction.commandName === 'org') {
        const subCommand = interaction.options.getSubcommand();
        if (subCommand === 'create_channel') {
            const name = interaction.options.getString('name');
            const type = interaction.options.getString('type') === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
            const channel = await interaction.guild.channels.create({ name, type });
            await interaction.reply(`✅ Channel **#${channel.name}** has been created! ✨`);
        }
    }

    // أمر الـ banlist
    if (interaction.commandName === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply("🚫 There are no banned users.");
        const banList = Array.from(bans.values());
        let response = "📜 **Banned Users:**\n" + banList.map((b, i) => `${i + 1}- ${b.user.tag}`).join('\n');
        response += "\n\n**Reply with the number to unban:**";
        await interaction.reply({ content: response });
        const filter = m => m.author.id === interaction.user.id && !isNaN(m.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        collector.on('collect', async m => {
            const index = parseInt(m.content) - 1;
            if (index >= 0 && index < banList.length) {
                const user = banList[index].user;
                await interaction.guild.members.unban(user.id);
                await m.reply(`✅ Successfully unbanned **${user.tag}**! 🔓`);
            } else {
                m.reply("⚠️ Invalid number.");
            }
        });
    }
});

client.on('ready', () => console.log(`✅ Bot is online as ${client.user.tag}`));
client.login(TOKEN);
