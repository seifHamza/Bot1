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

const OWNER_ID = '1452991268635410585'; // ضع الـ ID الخاص بك هنا
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// نظام كشف الإسبام (Memory)
const messageCounts = new Map();

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // لا تراقب نفسك
    if (message.author.id === OWNER_ID) return;

    const now = Date.now();
    const userSpamData = messageCounts.get(message.author.id) || { count: 0, lastMessage: now };

    // إذا أرسل أكثر من 5 رسائل في 3 ثوانٍ، اعتبره سبام
    if (now - userSpamData.lastMessage < 3000) {
        userSpamData.count++;
    } else {
        userSpamData.count = 1;
    }
    userSpamData.lastMessage = now;
    messageCounts.set(message.author.id, userSpamData);

    if (userSpamData.count > 5) {
        try {
            const owner = await client.users.fetch(OWNER_ID);
            await owner.send(`⚠️ Alert: User **${message.author.tag}** is spamming in channel **#${message.channel.name}**!`);
            // اختيارياً: يمكنك حذف الرسالة المسببة للسبام
            // await message.delete().catch(() => {});
        } catch (err) {
            console.error("Could not send DM to owner.");
        }
        // إعادة تعيين العداد حتى لا يرسل رسائل متكررة لك
        messageCounts.delete(message.author.id);
    }
});

// --- باقي الأوامر (Slash Commands) كما في الكود السابق ---
// تأكد من دمج أجزاء الكود لتكون في ملف واحد (index.js)
