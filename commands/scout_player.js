const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const playerDataPath = path.join(__dirname, '..', 'data', 'player_data.csv');
const playerDataimg = path.join(__dirname, '..', 'data', 'scout_player.png');

async function readPlayerData(filePath) {
    return new Promise((resolve, reject) => {
        const players = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                const { team, firstName, lastName, position, playerBestOvr, devTrait, contractSalary, contractBonus, contractLength, contractYearsLeft, capHit, age } = row;
                const choice = `${team} ${firstName} ${lastName} (${position})`;
                players.push({
                    choice,
                    playerBestOvr,
                    devTrait,
                    contractSalary,
                    contractBonus,
                    contractLength,
                    contractYearsLeft,
                    capHit,
                    age
                });
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
    return choices.filter(choice => choice.choice.toLowerCase().includes(input.toLowerCase()));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scout_player')
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
        const players = await readPlayerData(playerDataPath);
        const selectedPlayer = players.find(player => player.choice === targetChoice);
		const response = await fetch(`http://127.0.0.01:9396/plot?api_provided=${encodeURIComponent(targetChoice)}`);
        await interaction.reply(`Player you are interested in is ${targetChoice}.`);
		await interaction.channel.send({	
								files: [{
									attachment: playerDataimg,
									name: 'scout_player.png'
								  }]
								});
    },
    async autocomplete(interaction) {
        const input = interaction.options.getFocused();
        const choices = await readPlayerData(playerDataPath);
        const results = await createChoice(input, choices);
        await interaction.respond(results.map(result => ({ name: result.choice, value: result.choice })));
    },
};
