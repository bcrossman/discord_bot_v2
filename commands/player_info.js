const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const playerDataPath = path.join(__dirname, '..', 'data', 'player_data.csv');


async function readPlayerData(filePath) {
    return new Promise((resolve, reject) => {
        const players = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                const { team, firstName, lastName, position } = row;
                const choice = `${team} ${firstName} ${lastName} (${position})`;
                players.push(choice);
            })
            .on('end', () => {
                resolve(players);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

async function createChoice(input, choices) {
    return choices.filter(choice => choice.toLowerCase().includes(input.toLowerCase()));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('player_info')
        .setDescription('Get info on Player')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Player you are interested in')
                .setRequired(true)
                .setAutocomplete(true)),
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply('This command can only be used in a server.');
        }
        const targetChoice = interaction.options.getString('player');
        await interaction.reply(`Player you are interested in is ${targetChoice}.`);
    },
    async autocomplete(interaction) {
        const input = interaction.options.getFocused();
        const choices = await readPlayerData(playerDataPath);
        const results = await createChoice(input, choices);
        await interaction.respond(results.map(result => ({ name: result, value: result })));
    },
};