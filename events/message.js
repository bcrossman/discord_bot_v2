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
		        if (message.content.toLowerCase() === 'gg'&message.author.id==='705579756380356629') {
            try {
                await message.reply("You don't mean that Brent");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='705570794482302976') { 
            try {
                await message.reply("https://giphy.com/gifs/batman-handshake-good-game-LnKxP5wXfSOzudzbPO");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='705788703716409355') { 
            try {
                await message.reply("https://giphy.com/gifs/BookCameo-nacho-libre-big-ed-90-day-fianc-Y4WDXbagwPoepikUdJ");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='797589470269800468') { 
            try {
                await message.reply("https://giphy.com/gifs/3o6EhHGYJF0bvjbbtm");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='829455735805050950') { 
            try {
                await message.reply("https://giphy.com/gifs/RebelRacing-racing-rebel-rebelracing-WQlGmInP2nZFsf11Sy");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='572953995325341706') { 
            try {
                await message.reply("https://giphy.com/gifs/abcnetwork-abc-will-trent-cVIbD5Pe0WwuSYHUhk");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='702285548227657779') { 
            try {
                await message.reply("https://giphy.com/gifs/tomato-pepinillo-tomatillo-6Ane8T5k30AB43upIS");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='705588216094523422') { 
            try {
                await message.reply("https://giphy.com/gifs/TheBoysTV-the-boys-theboys-tv-fA8RJDz7btauMEG9GU");
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		if (message.content.toLowerCase() === 'gg'&message.author.id==='733134435481813012') { 
            try {
                await message.reply("https://giphy.com/gifs/big-ben-2Ozjbk786Umdy");
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
		if (message.content.toLowerCase() === "Levi's sucks") {
            try {
                await message.reply('https://giphy.com/gifs/Friends-season-6-episode-624-the-one-with-proposal-part-1-Js1ur5v1vmaj4mRxyq');
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
		const guildId = message.guild.id;
        const targetUserId = message.author.id;
        const compoundKey = `${guildId}:${targetUserId}`;
		const bugStates = readBugStates();
        const enabled = bugStates[compoundKey] ?? false;	
		if (enabled) {
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