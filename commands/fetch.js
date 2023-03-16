const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const filePath_messages = path.join(__dirname, '..', 'data', 'messages.csv');

function readMessages(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data;
    } catch (err) {
        return '';
    }
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
    const rows = messages.map(message => `"${message.author.username}",${message.createdAt.toISOString()},"${message.content.replace(/"/g, '""')}"`).join('\n');
    return header + rows;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fetch')
        .setDescription('Fetches and downloads previous messages to a CSV file'),
    async execute(interaction) {
        if (interaction.commandName === 'fetch') {
            if (!interaction.guild) {
                return await interaction.reply('This command can only be used in a server.');
            }

            const channel = interaction.channel;
			const messagesArray = await fetchMessages(channel, 10000); // Fetch 500 messages
            const csvData = messagesToCSV(messagesArray);
            writeMessages(csvData, filePath_messages);

            await interaction.reply('The CSV file of the previous messages has been saved to the data folder.');
        }
    }
};
