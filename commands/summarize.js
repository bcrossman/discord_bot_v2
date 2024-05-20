const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const config = require('../config.json');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({apiKey:config.openaikey});
const openai = new OpenAIApi(configuration);

const filePath_messages = path.join(__dirname, '..', 'data', 'messages_short.csv');

function readMessages(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data;
    } catch (err) {
        return '';
    }
}

function truncateText(text, maxTokens) {
    // Assume that an average word is about 5 characters long
    const avgTokenLength = 5;
    if (text.length / avgTokenLength > maxTokens) {
        return text.substring(0, maxTokens * avgTokenLength) + "...";
    }
    return text;
}

async function fetchMessages(channel, limit) {
    const batchSize = 100;
    let lastMessageId;
    let fetchedMessages = [];
    while (fetchedMessages.length < limit) {
        const remaining = limit - fetchedMessages.length;
        const fetchSize = Math.min(remaining, batchSize);
        const options = { limit: fetchSize };

        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const batch = await channel.messages.fetch(options);
        if (batch.size === 0) {
            break;
        }

        fetchedMessages = fetchedMessages.concat(Array.from(batch.values()));
        lastMessageId = fetchedMessages[fetchedMessages.length - 1].id;
    }
    return fetchedMessages;
}


function writeMessages(messages, filePath) {
    fs.writeFileSync(filePath, messages, 'utf-8');
}

function messagesToCSV(messages) {
    const header = 'Author,Date,Message\n';
    const rows = messages
        .filter(message => message.author.username !== "Brent's Annoying Madden Bot")
		.filter(message => message.author.username !== "Pingcord")
        .map(message => `"${message.author.username}",${message.createdAt.toISOString()},"${message.content.replace(/"/g, '""')}"`)
        .join('\n');
    return header + rows;
}

async function extractTextFromCSV(csvPath, hours) {
    let text = "";
    let mostRecentMessageTime = null;

    const data = fs.readFileSync(csvPath)
        .toString()
        .split('\n')
        .map(e => e.trim())
        .map(e => e.split(',').map(e => e.trim()));

    for(let i = 1; i < data.length; i++) {  // skip the first row
        const row = data[i];
        const messageTime = dayjs.utc(row[1], "YYYY-MM-DDTHH:mm:ss.SSSZ");
        if (mostRecentMessageTime === null || messageTime.isAfter(mostRecentMessageTime)) {
            mostRecentMessageTime = messageTime;
        }
    }

    const oneDayAgo = mostRecentMessageTime.subtract(hours, 'hours');

    for(let i = 1; i < data.length; i++) {  // skip the first row
        const row = data[i];
        const messageTime = dayjs.utc(row[1], "YYYY-MM-DDTHH:mm:ss.SSSZ");
        if (messageTime.isAfter(oneDayAgo)) {
            text += `Author: ${row[0]}, Message: ${row[2]}\n`;
        }
    }

    return text;
}

async function generateSummary(text) {
    const messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "assistant", "content": `The chat export is: ${text}`},
        {"role": "user", "content": "For each Author, provide a short, bullet pointed, multi-line, summary of their contributions to the chat for my madden league in discord. Please also provide an overall summary of the chat at the end. Make sure not to duplicate Authors."}
    ];

    try {
        const response = await openai.createChatCompletion({
            model: "GPT-4o",
            messages: messages,
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error occurred:', error.response.data.error);
        throw error; // you can throw the error to be handled upstream
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Summarizes the last n hours of messages on the server')
        .addIntegerOption(option => 
            option.setName('hours')
                .setDescription('The number of hours to summarize')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.commandName === 'summarize') {
			try {
				await interaction.deferReply(); // Acknowledge the interaction and gain more time
				const channel = interaction.channel;
				const hours = interaction.options.getInteger('hours');
				// Use the number of hours to determine how many messages to fetch
				// This part depends on your implementation of the fetchMessages function
				// Here's an example assuming you fetch 20 messages per hour
				const messagesArray = await fetchMessages(channel, hours * 20); 
				const csvData = messagesToCSV(messagesArray);
				writeMessages(csvData, filePath_messages);
				const text = await extractTextFromCSV(filePath_messages, hours);
				const summary = await generateSummary(text);

				await interaction.editReply(`Summary for the last ${hours} hours: ${summary}`);
			} catch (error) {
				// Handle error
				console.error('An error occurred:', error);
				await interaction.editReply('An error occurred while generating the summary. Please try again later.');
			}
        }
    }
};

