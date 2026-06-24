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

const OWNER_ID = '1452991268635410585'; 
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// --- نظام الإسبام المطور (يحذف الرسائل واحدة بواحدة لضمان المسح) ---
client.on('messageCreate', async message => {
    if (message.author.bot || message.author.id === OWNER_ID) return;

    const now = Date.now();
    const userData = messageCounts.get(message.author.id) || { count: 0, lastMessage: now };

    if (now - userData.lastMessage < 3000) {
        userData.count++;
    } else {
        userData.count = 1;
    }
    userData.lastMessage = now;
    messageCounts.set(message.author.id, userData);

    if (userData.count > 5) {
        // 1. جلب آخر 100 رسالة في القناة
        const messages = await message.channel.messages.fetch({ limit: 100 });
        // 2. تصفية رسائل المستخدم المزعج فقط
        const userMessages = messages.filter(m => m.author.id === message.author.id);
        
        // 3. مسح كل رسالة بشكل فردي (هذا الحل يضمن المسح)
        for (const [id, msg] of userMessages) {
            try {
                await msg.delete();
            } catch (err) {
                console.error("Could not delete message ID:", id);
            }
        }

        // 4. إرسال تنبيه خاص لك (Private DM)
        try {
            const owner = await client.users.fetch(OWNER_ID);
            await owner.send(`⚠️ **Spam Alert!**\nUser: **${message.author.tag}**\nChannel: **#${message.channel.name}**\nAction: I deleted all their recent messages.`);
        } catch (err) { console.error("Could not send DM to owner."); }

        messageCounts.delete(message.author.id);
    }
});
        // 1. مسح جميع رسائل المستخدم المزعجة في القناة
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(m => m.author.id === message.author.id);
        
        try {
            await message.channel.bulkDelete(userMessages, true);
        } catch (err) { console.error("Could not delete spam messages."); }

        // 2. إرسال تنبيه خاص لك (Private DM)
        try {
            const owner = await client.users.fetch(OWNER_ID);
            await owner.send(`⚠️ **Spam Alert!**\nUser: **${message.author.tag}**\nChannel: **${message.channel.name}**\nAction: I deleted all their messages.`);
        } catch (err) { console.error("Could not send DM to owner."); }

        messageCounts.delete(message.author.id);
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
