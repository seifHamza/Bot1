require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const OWNER_ID = '1452991268635410585'; 
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder().setName('banlist').setDescription('View banned users'),
    new SlashCommandBuilder().setName('org').setDescription('Manage server')
        .addSubcommand(sub => sub.setName('create_channel').setDescription('Create a new channel')
            .addStringOption(option => option.setName('name').setDescription('Channel name').setRequired(true))
            .addStringOption(option => option.setName('type').setDescription('Type').addChoices({name: 'Text', value: 'text'}, {name: 'Voice', value: 'voice'}))),
    new SlashCommandBuilder().setName('send').setDescription('Send DM').addStringOption(o => o.setName('userid').setDescription('Target ID').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Clear messages')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-99)'))
        .addBooleanOption(o => o.setName('all').setDescription('Delete ALL messages in this channel (Recreate it)')),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Commands updated.');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ Owner only!', ephemeral: true });

    // أمر Clear المطور
    if (interaction.commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        const all = interaction.options.getBoolean('all');

        if (all) {
            // حذف القناة وإعادة إنشائها
            const channel = interaction.channel;
            const newChannel = await channel.clone();
            await channel.delete();
            await newChannel.send('✅ Channel cleared successfully! ✨');
        } else if (amount) {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `✅ Deleted ${deleted.size} messages!`, ephemeral: true });
        } else {
            await interaction.reply({ content: '⚠️ Choose "amount" or set "all" to true.', ephemeral: true });
        }
    }

    // باقي الأوامر (org, send, banlist) كما هي..
    // (وضعت هنا اختصار لعدم تكرار الكود الطويل)
});

client.on('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(TOKEN);
