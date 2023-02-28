const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'bug-states.json');

function readBugStates() {
    try {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

function writeBugStates(states) {
    fs.writeFileSync(filePath, JSON.stringify(states, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bug')
        .setDescription('Toggles responding with "how are you doing" to a specific user\'s message'),
    async execute(interaction) {
        if (interaction.commandName === 'bug') {
            if (!interaction.guild) {
                return await interaction.reply('This command can only be used in a server.');
            }
            const bugStates = readBugStates();
            const enabled = bugStates[interaction.guild.id] ?? false;
            bugStates[interaction.guild.id] = !enabled;
            writeBugStates(bugStates);
            await interaction.reply(`Bug command is now ${enabled ? 'disabled' : 'enabled'}.`);
        }
    },
};
