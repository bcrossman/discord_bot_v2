const { SlashCommandBuilder } = require('discord.js');

const urls = [
  'https://giphy.com/gifs/theoffice-the-office-tv-a-benihana-christmas-IjJ8FVe4HVk66yvlV2',
  'https://giphy.com/gifs/funny-thats-what-she-said-IJLVLpZQuS4z6',
  'https://giphy.com/gifs/the-office-steve-carell-michael-scott-elPYgmQ506HK0',
  'https://giphy.com/gifs/NaqFWnnLebY4M',
  'https://giphy.com/gifs/theoffice-Zgo2A2oOpbGhQdf09T',
  'https://giphy.com/gifs/victorypointssocial-i-agree-what-she-said-tracey-matney-2ONjoz6NEtXQonnaE2',
  'https://giphy.com/gifs/kccougars-milb-kane-county-cougars-yourcougars-5kFJkMhfOnQ02VdkHy',
  'https://giphy.com/gifs/theoffice-episode-1-the-office-tv-esR1eKgmOnxWKR627f',
  'https://giphy.com/gifs/kccougars-milb-kane-county-cougars-yourcougars-5kFJkMhfOnQ02VdkHy'
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('twss')
		.setDescription('Replies with TWSS gif!'),
	async execute(interaction) {
		if (interaction.commandName === 'twss') {
			if (interaction.message && interaction.message.reference) {
				await interaction.deferReply();
				const message = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
				await message.reply(urls[Math.floor(Math.random() * urls.length)]);
			} else {
				await interaction.reply(urls[Math.floor(Math.random() * urls.length)]);
			}
		}
	},
};