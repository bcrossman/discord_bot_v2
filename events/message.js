const { Discord } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
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

const filePath_bug = path.join(__dirname, '..', 'data', 'bug-states.json');
const filePath_advance = path.join(__dirname, '..', 'data', 'advance-states.json');
const filePath_played = path.join(__dirname, '..', 'data', 'played-states.json');

function getHoursCount(times) {
  const hoursCount = new Array(24).fill(0);
  times.forEach((time) => {
    const date = new Date(time);
    const hour = date.getHours();
    hoursCount[hour]++;
  });
  return hoursCount;
}

function createChartConfiguration(labels, data) {
  return {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Times Played',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.4)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: 'white',
            font: {
              size: 16,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.5)',
          },
        },
        x: {
          ticks: {
            color: 'white',
            font: {
              size: 16,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
      backgroundColor: 'white',
    },
  };
}


async function sendBarChart(message, authorKey) {
  const userId = authorKey
  const filePath_played = path.join(__dirname, '..', 'data', 'played-states.json');
  const jsonData = readStates(filePath_played);

  if (!jsonData[userId]) {
    return message.channel.send("No data found for this user.");
  }

  const timestamps = jsonData[userId];
  const hours = getHoursCount(timestamps);

  // Create an array of hour labels
  const hourLabels = Array.from({length: 24}, (_, i) => i.toString());

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 600, height: 400 });
  const configuration = createChartConfiguration(hourLabels, hours);
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    // Save the image to the data folder
  const imagePath = path.join(__dirname, '..', 'data', `chart.png`);
  await fs.promises.writeFile(imagePath, image);
}

function writeStates(states, filePath) {
    fs.writeFileSync(filePath, JSON.stringify(states, null, 2));
}

function readStates(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

module.exports = {
    name: 'messageCreate',
    execute: async function (message) {
		        if (message.content.toLowerCase() === 'gg'&message.author.id==='705579756380356629') {
            try {
                await message.reply("https://giphy.com/gifs/theoffice-4wnrJ7cWFluAZVkHBU");
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
                await message.reply("https://giphy.com/gifs/thumbs-up-maybe-joaquin-phoenix-FX3OLJAUhOZNK");
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
                await message.reply("https://giphy.com/gifs/good-game-hard-barely-win-jRHuBqNdkuWFMIX3Pi");
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
                await message.reply("https://giphy.com/gifs/A1eSports-good-game-ggwp-well-played-bmr28cfgGWGV7CdalB");
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
                await message.reply("https://giphy.com/gifs/redbull-streetfighter-gachi-kun-gachikun-8PEfCbYgGzpIBsYNo7");
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
                await message.reply("https://giphy.com/gifs/theoffice-the-office-tv-weight-loss-part-2-fah08IDMr10VtDrcoh");
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
                await message.reply("https://media.giphy.com/media/n4IQ67uRDEml2/giphy.gif");
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
                await message.reply("https://giphy.com/gifs/handshake-good-game-nicely-done-JQGVOMyW49z25ZpTw0");
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
                await message.reply("https://giphy.com/gifs/eunitedgg-legion-eunited-legiqn-JQcyE2EB0klfJvHVbn");
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
		if (message.content.toLowerCase().includes('is live over at')) {
			  try {
				const playedStates = readStates(filePath_played);
				const words = message.content.split(' ');
				const phraseIndex = words.findIndex(word => word.toLowerCase() === 'is') - 1;
				const authorKey = phraseIndex >= 0 ? words[phraseIndex] : '';
				const times = playedStates[authorKey] ?? [];
				const easternTime = message.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' });
				times.push(easternTime);
				playedStates[authorKey] = times;
				writeStates(playedStates, filePath_played);
				await sendBarChart(message, authorKey);
				const imagePath = path.join(__dirname, '..', 'data', `chart.png`);
				await message.channel.send({
								files: [{
									attachment: imagePath,
									name: 'chart.png'
								  }]
								});
				} catch (error) {
				console.error(error);
				await message.reply({
				  content: "Didn't work!",
				  ephemeral: true,
				});
			  }
			}
			
		if (message.content.toLowerCase() === "levi's sucks") {
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
		const advanceStates = readStates(filePath_advance);
		const last_advance = advanceStates[guildId] ?? "1970-01-01T00:00:00.000Z";	
        const this_advance = message.createdAt.toISOString();
		const diffInMillis = new Date(this_advance) - new Date(last_advance);
		const diffInHours = diffInMillis / (1000*60*60);
		if (message.content === 'Advanced #official') {
            try {
				advanceStates[guildId] = this_advance;
                writeStates(advanceStates, filePath_advance);
                await message.reply(`Time since last advance: ${diffInHours.toFixed(2)} hours`);
            } catch (error) {
                console.error(error);
                await message.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
		const targetUserId = message.author.id;
        const compoundKey = `${guildId}:${targetUserId}`;
		const bugStates = readStates(filePath_bug);
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