const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

const filePath_bug = path.join(__dirname, '..', 'data', 'bug-states.json');

function readBugStates() {
    try {
        const data = fs.readFileSync(filePath_bug);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

function writeBugStates(states) {
    fs.writeFileSync(filePath_bug, JSON.stringify(states, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bug')
        .setDescription('Toggles whether to bug a specific user\'s to play')
		.addUserOption(option =>
            option.setName('target')
                .setDescription('The user to annoy')
                .setRequired(true)),
    async execute(interaction) {
        if (interaction.commandName === 'bug') {
            if (!interaction.guild) {
                return await interaction.reply('This command can only be used in a server.');
            }
			const targetUser = interaction.options.getUser('target');
			const guildId = interaction.guild.id;
            const compoundKey = `${guildId}:${targetUser.id}`
            const bugStates = readBugStates();
            const enabled = bugStates[compoundKey] ?? false;
            bugStates[compoundKey] = !enabled;
            writeBugStates(bugStates);
            await interaction.reply(`Bug command is now ${enabled ? 'disabled' : 'enabled'} for user ${targetUser.username}.`);
        }
    },
};
