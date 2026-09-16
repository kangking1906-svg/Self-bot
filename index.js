require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = ",";

let running = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Bot is ready.");
});

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.author.id !== process.env.OWNER_ID) return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === `${PREFIX}help`) {
        return message.reply(
            "**Commands**\n\n" +
            "`,help` — Show commands\n" +
            "`,send <number>` — Send messages\n" +
            "`,stop` — Stop sending"
        );
    }

    if (command === `${PREFIX}stop`) {
        if (!running) {
            return message.reply("Nothing is currently running.");
        }

        running = false;
        return message.reply("Stopping...");
    }

    if (command !== `${PREFIX}send`) return;

    if (running) {
        return message.reply("Already running.");
    }

    const amount = Number(args[1]);

    if (!Number.isInteger(amount) || amount < 1) {
        return message.reply("Use `,send <number>`.");
    }

    if (amount > 200) {
        return message.reply("The maximum is 200 messages.");
    }

    const channelId = process.env.CHANNEL_ID;

    if (!channelId) {
        return message.reply("CHANNEL_ID is missing from `.env`.");
    }

    const channel = await client.channels
        .fetch(channelId)
        .catch(() => null);

    if (!channel || !channel.isTextBased()) {
        return message.reply("The configured channel was not found.");
    }

    if (channel.guild?.id !== message.guild.id) {
        return message.reply("The configured channel must be in this server.");
    }

    const permissions = channel.permissionsFor(client.user);

    if (
        !permissions ||
        !permissions.has(PermissionsBitField.Flags.SendMessages)
    ) {
        return message.reply("I cannot send messages in that channel.");
    }

    running = true;

    await message.reply(
        `Sending ${amount} messages in <#${channel.id}>.`
    );

    let sent = 0;

    try {
        for (let i = 1; i <= amount && running; i++) {
            await channel.send(`Message ${i}`);
            sent++;

            // Controlled interval to avoid unrestricted flooding.
            await sleep(250);
        }
    } catch (error) {
        console.error(error);
    }

    running = false;

    await message.channel.send(
        `Finished. Sent ${sent}/${amount} messages.`
    ).catch(() => {});
});

client.login(process.env.DISCORD_TOKEN);
