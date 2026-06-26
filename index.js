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

// --- إعدادات أساسية ---
const OWNER_ID = '1452991268635410585';
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// --- نظام التحذير (بدون مسح رسائل) ---
const warningCounts = new Map();

client.on('messageCreate', async message => {
    // تجاهل البوتات وصاحب البوت
    if (message.author.bot || message.author.id === OWNER_ID) return;

    // النظام يعمل فقط في الرسائل الخاصة (DM)
    if (message.channel.type === ChannelType.DM) {
        const userId = message.author.id;
        const currentCount = warningCounts.get(userId) || 5; 

        if (currentCount > 0) {
            const newCount = currentCount - 1;
            warningCounts.set(userId, newCount);

            if (newCount > 0) {
                await message.channel.send(`⚠️ **Please wait, Seif will answer.**\nYou have **${newCount}** chances left.`);
            } else {
                await message.channel.send("🚫 **You have used all your chances.** You are now blocked from messaging this bot.");
            }
        } else {
            // البلوك البرمجي: لا يرد البوت على أي رسالة بعد وصول العداد لـ 0
            return;
        }
    }
});

// --- الأوامر (Slash Commands) ---
const commands = [
    new SlashCommandBuilder().setName('banlist').setDescription('View banned users'),
    new SlashCommandBuilder().setName('org').setDescription('Manage server')
        .addSubcommand(sub => sub.setName('create_channel').setDescription('Create a new channel')
            .addStringOption(o => o.setName('name').setDescription('Channel name').setRequired(true))
            .addStringOption(o => o.setName('type').setDescription('Type').addChoices({name: 'Text', value: 'text'}, {name: 'Voice', value: 'voice'}))),
    new SlashCommandBuilder().setName('send').setDescription('Send DM').addStringOption(o => o.setName('userid').setDescription('Target ID').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Clear messages')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-99)'))
        .addBooleanOption(o => o.setName('all').setDescription('Delete ALL messages (Recreate channel)')),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Commands registered successfully.');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ Only owner!', ephemeral: true });

    if (interaction.commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        const all = interaction.options.getBoolean('all');
        if (all) {
            const newChannel = await interaction.channel.clone();
            await interaction.channel.delete();
            await newChannel.send('✅ Channel cleared!');
        } else if (amount) {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `✅ Deleted ${deleted.size} messages!`, ephemeral: true });
        }
    }

    if (interaction.commandName === 'send') {
        try {
            const user = await client.users.fetch(interaction.options.getString('userid'));
            await user.send(interaction.options.getString('message'));
            await interaction.reply({ content: `✅ Sent!`, ephemeral: true });
        } catch (e) { await interaction.reply({ content: `❌ Failed.`, ephemeral: true }); }
    }

    if (interaction.commandName === 'org') {
        const name = interaction.options.getString('name');
        const type = interaction.options.getString('type') === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const channel = await interaction.guild.channels.create({ name, type });
        await interaction.reply(`✅ Created **#${channel.name}**`);
    }

    if (interaction.commandName === 'banlist') {
        if (!interaction.guild) return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply("🚫 No bans.");
        const banList = Array.from(bans.values());
        let response = "📜 **Banned:**\n" + banList.map((b, i) => `${i + 1}- ${b.user.tag}`).join('\n');
        response += "\n\n**Reply with number to unban:**";
        await interaction.reply(response);
        const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === OWNER_ID, time: 30000, max: 1 });
        collector.on('collect', async m => {
            const index = parseInt(m.content) - 1;
            if (index >= 0 && index < banList.length) {
                await interaction.guild.members.unban(banList[index].user.id);
                await m.reply(`✅ Unbanned **${banList[index].user.tag}**`);
            }
        });
    }
});

client.on('ready', () => console.log(`✅ Bot ready as ${client.user.tag}`));
client.login(TOKEN);
