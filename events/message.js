const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

const filePath = path.join(__dirname, '..', 'data', 'bug-states.json');

function readBugStates() {
    try {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

module.exports = {
    name: Events.MessageCreate,
    execute: async function (message) {
        if (message.content.toLowerCase() === 'gg') {
            try {
                await message.reply('Do you really mean good game, or is this an attempt to jinx your opponent?');
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'twss') {
            try {
                await message.reply(urls[Math.floor(Math.random() * urls.length)]);
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'that was fun') {
            try {
                await message.reply('Congratulations on your win!');
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'who is the last to play?') {
            try {
                await message.reply('James!');
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		const bugStates = readBugStates();
        const enabled = bugStates[message.guild.id] ?? false;	
		if (enabled && message.author.id === '705579756380356629') {
            try {
                await message.reply('When are you going to play?');
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
    },
};