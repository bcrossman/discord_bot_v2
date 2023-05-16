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
        .map(message => `"${message.author.username}",${message.createdAt.toISOString()},"${message.content.replace(/"/g, '""')}"`)
        .join('\n');
    return header + rows;
}

async function extractTextFromCSV(csvPath) {
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

    const oneDayAgo = mostRecentMessageTime.subtract(1, 'day');

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
        {"role": "user", "content": "Can you summarize what each Author said in this chat from my Madden league in discord?"}
    ];
// console.log(messages)
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
    });

    return response.data.choices[0].message.content;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Summarizes the last 24 hour of messages on the server'),
    async execute(interaction) {
        if (interaction.commandName === 'summarize') {
			await interaction.deferReply(); // Acknowledge the interaction and gain more time
			const channel = interaction.channel;
            const messagesArray = await fetchMessages(channel, 500); // Fetch 500 messages
            const csvData = messagesToCSV(messagesArray);
            writeMessages(csvData, filePath_messages);
            const text = await extractTextFromCSV(filePath_messages);
			// const truncatedText = truncateText(text, 2000); // GPT-3.5-turbo model has a limit of 4096 tokens
			const summary = await generateSummary(text);

            await interaction.editReply(`Summary: ${summary}`);
        }
    }
};

