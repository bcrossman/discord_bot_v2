const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const moment = require('moment-timezone');  // Make sure to install this library

const filePath_advance = path.join(__dirname, '..', 'data', 'advance-states.json');
const filePath_played = path.join(__dirname, '..', 'data', 'played-states.json');

function readJson(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

const userIds = [
    'babobeavers',
    'hoxn8r',
    'bi3lo7',
    'magicrat1980',
    // 'bpro000',
    'peakhorizon4096',
    // 'coleman234dt',
	'Bcrossman',
	 'jacksonsheph'
    //'tomilo31',
    //'basbasbasbas2'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('played')
        .setDescription('Checks users who have played since the last advance'),
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply('This command can only be used in a server.');
        }

        await interaction.deferReply({ ephemeral: false });

        const guildId = interaction.guild.id;
        const advanceStates = readJson(filePath_advance);
        const playedStates = readJson(filePath_played);

        const advances = Array.isArray(advanceStates[guildId]) ? advanceStates[guildId] : [];
        const last_advance = advances.length > 0 ? advances[advances.length - 1] : "1970-01-01T00:00:00.000Z";

        const usersPlayedAfterLastAdvance = [];

        for (const [userId, times] of Object.entries(playedStates)) {
            for (const easternTime of times) {
                // Convert the Eastern Time back to UTC
                const utcTime = moment.tz(easternTime, 'M/D/YYYY, h:mm:ss A', 'America/New_York').utc().toISOString();
                if (utcTime > last_advance) {
                    usersPlayedAfterLastAdvance.push(userId);
                    break; // No need to check the rest of the times for this user, we know they played
                }
            }
        }

        // Determine users who haven't played since the last advance
        const usersNotPlayed = userIds.filter(userId => !usersPlayedAfterLastAdvance.includes(userId));
		const embed = new EmbedBuilder()
			.setTitle("Played Status")
			.setColor("#0099ff")  // Blue color
			.setThumbnail(interaction.guild.iconURL())
			.setTimestamp()
			.setFooter({ text: 'Brents Super Helpful Bot' });

		

        if (usersPlayedAfterLastAdvance.length === 0 && usersNotPlayed.length === 0) {
				return await interaction.editReply('No users have played since the last advance and all users are up to date.');
			} else {
				let replyMessage = '';

				if (usersPlayedAfterLastAdvance.length > 0) {
					embed.addFields({ 
						name: "Played", 
						value: '🟢 Played since the last advance: ' + usersPlayedAfterLastAdvance.map(id => `<@${id}>`).join(', ')
					});
				}

				if (usersNotPlayed.length > 0) {
					embed.addFields({ 
						name: "Not Played", 
						value: '🔴 Not Played since the last advance: ' + usersNotPlayed.map(id => `<@${id}>`).join(', ')
					});
				}

				return await interaction.editReply({ embeds: [embed] });
			}

    }
};
