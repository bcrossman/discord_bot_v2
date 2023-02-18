const Discord = require('discord.js');
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.on('ready', () => {

	client.on('message', (msg) => {
		if (msg.content === 'Hello') msg.reply('Hi');
	});
	console.log('The Bot is ready!');
});

client.login(process.env.BOT_TOKEN);

