const { Discord } = require('discord.js');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({apiKey:config.openaikey});
const openai = new OpenAIApi(configuration);

const filePath_bug = path.join(__dirname, '..', 'data', 'bug-states.json');
const filePath_advance = path.join(__dirname, '..', 'data', 'advance-states.json');
const filePath_played = path.join(__dirname, '..', 'data', 'played-states.json');

const axios = require("axios"); // Install Axios using npm install axios

const csvParser = require('csv-parser');

// TinyURL shortener
async function shortenUrl(longUrl) {
    const apiKey = config.tinyurlApiKey;
    if (!apiKey) throw new Error('Missing tinyurlApiKey in config.json');
    const axios = require('axios');
    const response = await axios.post('https://api.tinyurl.com/create', {
        url: longUrl,
        domain: 'tinyurl.com'
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });
    return response.data.data.tiny_url;
}

// Helper to format the Discord post
function formatFlightPostDiscord(row, urls) {
    function stopsText(stops) {
        if (stops === '0') return 'Nonstop';
        if (stops === '1') return '1 stop';
        return `${stops} stops`;
    }
    function formatDuration(hoursDecimal) {
        const hours = Math.floor(hoursDecimal);
        const minutes = Math.round((hoursDecimal - hours) * 60);
        return `${hours}h${minutes > 0 ? minutes + 'm' : ''}`;
    }
    function formatSavings(price, avg, z_score) {
        if (z_score !== '' && !isNaN(z_score) && Number(z_score) < -1 && avg && !isNaN(avg)) {
            const savings = Math.round(Number(avg) - Number(price));
            if (savings > 0) {
                return ` (🔥 $${savings} below avg)`;
            }
        }
        return '';
    }
    const AIRPORT_CITY_MAP = {
      ATL: "Atlanta, GA", LAX: "Los Angeles, CA", DFW: "Dallas-Fort Worth, TX", DEN: "Denver, CO", ORD: "Chicago, IL", JFK: "New York, NY (JFK)", MCO: "Orlando, FL", LAS: "Las Vegas, NV", CLT: "Charlotte, NC", MIA: "Miami, FL", SEA: "Seattle, WA", EWR: "Newark, NJ", SFO: "San Francisco, CA", PHX: "Phoenix, AZ", IAH: "Houston, TX", FLL: "Fort Lauderdale, FL", MSP: "Minneapolis, MN", LGA: "New York, NY (LGA)", DTW: "Detroit, MI", BNA: "Nashville, TN", MSY: "New Orleans, LA", SAN: "San Diego, CA", AUS: "Austin, TX", PDX: "Portland, OR", HNL: "Honolulu, HI", TPA: "Tampa, FL", CHS: "Charleston, SC", SAV: "Savannah, GA", DCA: "Washington, DC", PWM: "Portland, ME", BOS: "Boston, MA", CUN: "Cancun, Mexico", MEX: "Mexico City, Mexico", SJU: "San Juan, Puerto Rico", PUJ: "Punta Cana, DR", MBJ: "Montego Bay, Jamaica", LHR: "London, UK (LHR)", IST: "Istanbul, Turkey", CDG: "Paris, France", AMS: "Amsterdam, Netherlands", MAD: "Madrid, Spain", FRA: "Frankfurt, Germany", BCN: "Barcelona, Spain", FCO: "Rome, Italy", LGW: "London, UK (LGW)", MUC: "Munich, Germany", LIS: "Lisbon, Portugal", DUB: "Dublin, Ireland", PMI: "Palma de Mallorca, Spain", ORY: "Paris, France (ORY)", ATH: "Athens, Greece", SYR: "Syracuse, NY", MHT: "Manchester, NH", PVD: "Providence, RI", BDL: "Hartford, CT"
    };
    const [origin, dest] = row['Origin_Destination'].split('-');
    const stops = stopsText(row['Num Stops']);
    const price = row['Price ($)'];
    const duration = formatDuration(Number(row['Travel time']));
    const savings = formatSavings(price, row['avg_price'], row['z_score']);
    // Add city names if available
    const originCity = AIRPORT_CITY_MAP[origin] || origin;
    const destCity = AIRPORT_CITY_MAP[dest] || dest;
    let post = `✈️ ${origin} → ${dest}\n`;
    post += `(${originCity} - ${destCity})\n`;
    if (urls.length === 2) {
        post += `🪂 One-way (separate tickets)\n`;
        post += `• Out: ${row['Outbound Departure date']}, ${row['Outbound Departure time']}\n`;
        post += `• Back: ${row['Return Departure date']}, ${row['Return Departure time']}\n`;
        post += `💸 $${price}${savings} | ${stops} | ${duration}\n`;
        post += `Outbound:\n${urls[0]}\n`;
        post += `Return:\n${urls[1]}\n`;
    } else {
        post += `🔁 Roundtrip\n`;
        post += `🗓️ ${row['Departure date'] || row['Outbound Departure date']}, ${row['Departure time'] || row['Outbound Departure time']}\n`;
        post += `💸 $${price}${savings} | ${stops} | ${duration}\n`;
        post += `${urls[0]}\n`;
    }
    // Discord message limit is 2000 chars, but our posts are much shorter
    return post;
}

async function getRandomGifUrl(keyword) {
    try {
        const apiKey = config.giphyApiKey;
        const response = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${keyword}&limit=50`);
        
        const gifs = response.data.data;
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        
        return randomGif.url;
    } catch (error) {
        console.error(error);
        return null;
    }
}

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

function calculateAverageTimeBetweenAdvances(advances) {
    if (advances.length < 2) {
        return 0;
    }

    let totalTime = 0;

    for (let i = 1; i < advances.length; i++) {
        totalTime += new Date(advances[i]) - new Date(advances[i - 1]);
    }

    return totalTime / (advances.length - 1);
}

module.exports = {
    name: 'messageCreate',
    execute: async function execute(message) {
        // Prevent the bot from responding to its own messages
        if (message.author.bot) return;
        // --- FLIGHT CSV POSTING LOGIC ---
        try {
            const fs = require('fs');
            const path = require('path');
            const goodFlightsDir = 'C:/Users/brent/OneDrive/Documents/GitHub/travel_bsky_bot/good_flights';
            const channelId = '1359621649049194608';
            const channel = message.client.channels.cache.get(channelId);
            if (channel) {
                const files = fs.readdirSync(goodFlightsDir).filter(f => f.endsWith('.csv'));
                for (const file of files) {
                    const absCsv = path.join(goodFlightsDir, file);
                    const postedMarker = absCsv + '.bot_posted';
                    if (fs.existsSync(postedMarker)) continue;
                    // Mark as posted immediately to avoid reprocessing
                    fs.writeFileSync(postedMarker, '');
                    // Parse CSV and post for each row
                    const rows = [];
                    await new Promise((resolve, reject) => {
                        fs.createReadStream(absCsv)
                            .pipe(csvParser())
                            .on('data', (row) => rows.push(row))
                            .on('end', resolve)
                            .on('error', reject);
                    });
                    let posted = false;
                    for (const row of rows) {
                        if (!row['Origin_Destination'] || !row['Price ($)'] || !row['url']) continue;
                        const origUrls = row['url'].split(',').map(u => u.trim());
                        let shortUrls = [];
                        for (const url of origUrls) {
                            try {
                                shortUrls.push(await shortenUrl(url));
                            } catch (e) {
                                console.error('Failed to shorten URL:', url, e.message);
                                shortUrls.push(url); // fallback to original if failed
                            }
                        }
                        const postText = formatFlightPostDiscord(row, shortUrls);
                        // Discord max message length is 2000 chars, but our posts are much shorter
                        if (postText.length <= 2000) {
                            await channel.send(postText);
                            posted = true;
                        }
                    }
                    if (posted) {
                        fs.writeFileSync(postedMarker, '');
                    }
                }
            }
        } catch (err) {
            console.error('Error posting flight deals:', err);
        }
        // --- END FLIGHT CSV POSTING LOGIC ---
        // Prevent the bot from responding to its own messages
        if (message.author.bot) return;


        if (message.content.toLowerCase() === 'gg') {
    try {
        const gifUrl = await getRandomGifUrl("good game"); // Replace with your keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't work!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Didn't work!",
            ephemeral: true,
        });
    }
}
/* 		        if (message.content.toLowerCase() === 'gg'&message.author.id==='705579756380356629') {
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
                await message.reply("https://giphy.com/gifs/handshake-good-game-nicely-done-JQGVOMyW49z25ZpTw0");
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
                await message.reply("https://giphy.com/gifs/reaction-wMsD35WIjjUFq");
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
        } */
	if (message.content.toLowerCase() === 'twss') {
    try {
        const gifUrl = await getRandomGifUrl("twss"); // Replace with your keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't work!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Didn't work!",
            ephemeral: true,
        });
    }
}

const excludedUserId = '1076250443207942207'; 

if (/(\bsim\b)/i.test(message.content) && message.author.id !== excludedUserId) {
    try {
        const gifUrl = await getRandomGifUrl("The Sims"); // Updated keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't find a relevant GIF!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Error occurred!",
            ephemeral: true,
        });
    }
}

if (/(\bkicker\b)/i.test(message.content) && message.author.id !== excludedUserId) {
    try {
        const gifUrl = await getRandomGifUrl("kicker"); // Updated keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't find a relevant GIF!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Error occurred!",
            ephemeral: true,
        });
    }
}

if (/(\bhuge sack\b)/i.test(message.content) && message.author.id !== excludedUserId) {
    try {
        const gifUrl = await getRandomGifUrl("Huge sack"); // Updated keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't find a relevant GIF!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Error occurred!",
            ephemeral: true,
        });
    }
}


const triggerUserId = '3874244'; 

async function generateSummary(text) {
    const messages = [
        {
            "role": "system", 
            "content": "You are a snarky Discord commenter who always reminds Alex that he lost 4 Super Bowls in a row to Brent. Your responses should be short, witty, and reference this fact while also directly responding to Alex's message."
        },
        {
            "role": "user", 
            "content": `Alex just posted: "${text}". Generate a short, snarky response that both addresses his message and reminds him about losing 4 Super Bowls in a row to Brent.`
        }
    ];

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4.1-2025-04-14",
            messages: messages,
            max_tokens: 150 // Keep responses brief
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error occurred:', error);
        return "Nice try, Alex. Maybe you'll have better luck with this than those 4 Super Bowls you lost to Brent.";
    }
}

if (message.author.id === triggerUserId) {
    try {
        const summary = await generateSummary(message.content);
        if (summary) {
            await message.reply(summary);
        } else {
            await message.reply({
                content: "Couldn't generate a summary!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error('Error occurred:', error);
        await message.reply({
            content: "Error occurred!",
            ephemeral: true,
        });
    }
}

	if (message.content.toLowerCase() === 'go tom') {
    try {
        const gifUrl = await getRandomGifUrl("Honda car"); // Replace with your keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't work!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Didn't work!",
            ephemeral: true,
        });
    }
}

	if (message.content.toLowerCase() === 'go matt') {
    try {
        const gifUrl = await getRandomGifUrl("BMW car"); // Replace with your keyword
        if (gifUrl) {
            await message.reply(gifUrl);
        } else {
            await message.reply({
                content: "Didn't work!",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error(error);
        await message.reply({
            content: "Didn't work!",
            ephemeral: true,
        });
    }
}
		
		if (message.content.toLowerCase().includes('is madden out yet')) {
			const currentDate = new Date();
			const maddenReleaseDate = new Date(currentDate.getFullYear(), 7, 15); // August 15th (Month is 0-indexed, so 7 is August)
			const timeDifference = maddenReleaseDate - currentDate;
			const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

			try {
				let replyMessage;

				if (daysDifference <= 0) {
					replyMessage = "Well, well, well, isn't this just fan-fcking-tastic? Madden's finally out, as if we haven't had enough of that shtshow already. Get ready for more overpriced mediocrity, folks. But hey, let's not let that stop us from wasting our precious time, right? Game on, I guess.";
				} else {
					replyMessage = `Hey, ${daysDifference} more fucking days until Madden's dropping alright? So don't get your panties in a twist just yet.`;
				}
				await message.reply(replyMessage);
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
		const this_advance = message.createdAt.toISOString();
		const advanceStates = readStates(filePath_advance);
		const advances = Array.isArray(advanceStates[guildId]) ? advanceStates[guildId] : [];
		const last_advance = advances.length > 0 ? advances[advances.length - 1] : "1970-01-01T00:00:00.000Z";
		const diffInMillis = new Date(this_advance) - new Date(last_advance);
		const diffInHours = diffInMillis / (1000*60*60);
		if (message.content === 'Advanced #official' || message.content === 'advanced #official') {
			try {
			advances.push(this_advance);
			
			if (advances.length > 10) {
				advances.shift();
			}

			advanceStates[guildId] = advances;
			writeStates(advanceStates, filePath_advance);

			const averageTimeInMillis = calculateAverageTimeBetweenAdvances(advances);
			const averageTimeInHours = averageTimeInMillis / (1000 * 60 * 60);

			await message.reply(`Time since last advance: ${diffInHours.toFixed(2)} hours\nAverage time between the last 10 advances: ${averageTimeInHours.toFixed(2)} hours`);
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