const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

const filePath_superbowl = path.join(__dirname, '..', 'data', 'superbowl-states.json');

function readsuperbowlStates() {
    try {
        const data = fs.readFileSync(filePath_superbowl);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

function writesuperbowlStates(states) {
    fs.writeFileSync(filePath_superbowl, JSON.stringify(states, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('superbowl')
        .setDescription('Tracks time between super bowls'),
    async execute(interaction) {
        if (interaction.commandName === 'superbowl') {
            if (!interaction.guild) {
                return await interaction.reply('This command can only be used in a server.');
            }
            const guildId = interaction.guild.id;
            const superbowlStates = readsuperbowlStates();
            const last_superbowl = superbowlStates[guildId] ?? "1970-01-01T00:00:00.000Z";	
            const this_superbowl = interaction.createdAt.toISOString();
            const diffInMillis = new Date(this_superbowl) - new Date(last_superbowl);
            const diffInDays = diffInMillis / (1000*60*60*24);
            superbowlStates[guildId] = this_superbowl;
            writesuperbowlStates(superbowlStates);
            await interaction.reply(`Time since last superbowl: ${diffInDays.toFixed(2)} days`);
        }
    }
};
