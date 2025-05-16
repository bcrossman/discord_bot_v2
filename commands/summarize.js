const { SlashCommandBuilder } = require('discord.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { setTimeout } = require('timers/promises');
dayjs.extend(utc);
const config = require('../config.json');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: config.openaikey });

// Simple in-memory cache for recent summaries
const summaryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Sends a long message to Discord by properly chunking it to respect Discord's limits
 * @param {Object} interaction - The Discord interaction object
 * @param {string} content - The full message content to send
 * @param {string} title - Optional title for the first message
 */
async function sendLongDiscordMessage(interaction, content, title = '') {
  // Discord has a 2000 character limit per message
  const MAX_LENGTH = 1900; // Leaving some buffer
  
  if (!content || content.trim() === '') {
    return interaction.editReply('No content to send.');
  }

  // If content fits in one message, send it directly
  if ((title + content).length <= MAX_LENGTH) {
    return interaction.editReply(title + content);
  }

  // First attempt to split by markdown sections (###, ##)
  let chunks = [];
  
  // Try to split by headers first
  const headerRegex = /(?=^#{1,3}\s.*$)/m;
  let sections = content.split(headerRegex);
  
  // If we have sections with headers, process them
  if (sections.length > 1) {
    let currentChunk = title;
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      // If adding this section exceeds the limit, save the current chunk and start a new one
      if (currentChunk.length + section.length > MAX_LENGTH) {
        chunks.push(currentChunk);
        currentChunk = section;
      } else {
        currentChunk += section;
      }
    }
    
    // Add the final chunk if there's content
    if (currentChunk.trim()) {
      chunks.push(currentChunk);
    }
  } 
  // If header splitting didn't work, fall back to simpler paragraph-based chunking
  else {
    let paragraphs = content.split('\n\n');
    let currentChunk = title;
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      const formattedParagraph = '\n\n' + paragraph;
      
      // If adding this paragraph exceeds the limit, push current chunk and start a new one
      if (currentChunk.length + formattedParagraph.length > MAX_LENGTH) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += formattedParagraph;
      }
    }
    
    // Add the final chunk if there's content
    if (currentChunk.trim()) {
      chunks.push(currentChunk);
    }
  }
  
  // If we still have no valid chunks, fallback to fixed-length chunks
  if (chunks.length === 0) {
    chunks = [];
    for (let i = 0; i < content.length; i += MAX_LENGTH) {
      let chunk = content.substring(i, i + MAX_LENGTH);
      
      // Try not to break in the middle of a word or line
      if (i + MAX_LENGTH < content.length) {
        const lastNewline = chunk.lastIndexOf('\n');
        const lastSpace = chunk.lastIndexOf(' ');
        
        // Prefer breaking at a newline, then a space if possible
        if (lastNewline > MAX_LENGTH * 0.8) {
          chunk = chunk.substring(0, lastNewline + 1);
          i = i - (MAX_LENGTH - lastNewline - 1); // Adjust the index
        } else if (lastSpace > MAX_LENGTH * 0.8) {
          chunk = chunk.substring(0, lastSpace + 1);
          i = i - (MAX_LENGTH - lastSpace - 1); // Adjust the index
        }
      }
      
      chunks.push(chunk);
    }
  }
  
  // Send the first message by editing the reply
  await interaction.editReply(chunks[0]);
  
  // Send the rest as follow-up messages
  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({
      content: `**Part ${i+1}/${chunks.length}**\n\n${chunks[i]}`,
      ephemeral: false
    });
  }
  
  return true;
}

/**
 * Formats the AI-generated summary for Discord
 * @param {string} summary - The raw summary text
 * @param {number} hours - The time period that was summarized
 * @returns {string} - The formatted summary ready for Discord
 */
function formatSummaryForDiscord(summary, hours) {
  // Make sure there is content
  if (!summary || summary.trim() === '') {
    return `# Summary for the last ${hours} hours\n\nNo activity found in the given time period.`;
  }
  
  // Add a title and ensure proper Discord markdown formatting
  let formattedSummary = `# Summary for the last ${hours} hours\n\n`;
  
  // Ensure proper bullet formatting for Discord
  summary = summary
    // Make sure bullet points have proper spacing
    .replace(/^-\s+/gm, '- ')
    // Ensure bold text has proper spacing
    .replace(/\*\*(.*?)\*\*/g, '**$1**')
    // Clean up any potential double newlines that might cause formatting issues
    .replace(/\n{3,}/g, '\n\n');
  
  return formattedSummary + summary;
}

/**
 * Fetches messages in parallel batches for better performance
 */
async function fetchMessages(channel, limit) {
    const batchSize = 100; // Discord API max
    let lastMessageId;
    let fetchedMessages = [];
    
    // Get first batch to establish starting point
    const initialBatch = await channel.messages.fetch({ limit: batchSize });
    fetchedMessages = Array.from(initialBatch.values());
    
    if (fetchedMessages.length === 0 || fetchedMessages.length >= limit) {
        return fetchedMessages.slice(0, limit);
    }
    
    lastMessageId = fetchedMessages[fetchedMessages.length - 1].id;
    
    // Continue fetching in batches until we reach the limit
    while (fetchedMessages.length < limit) {
        const remaining = limit - fetchedMessages.length;
        const fetchSize = Math.min(remaining, batchSize);
        
        const batch = await channel.messages.fetch({ 
            limit: fetchSize,
            before: lastMessageId
        });
        
        if (batch.size === 0) break;
        
        const batchArray = Array.from(batch.values());
        fetchedMessages = fetchedMessages.concat(batchArray);
        
        if (batchArray.length > 0) {
            lastMessageId = batchArray[batchArray.length - 1].id;
        }
    }
    
    return fetchedMessages.slice(0, limit);
}

/**
 * Process messages directly in memory without CSV conversion
 */
function processMessages(messages, hours) {
    // Find the most recent message timestamp
    let mostRecentTime = null;
    for (const msg of messages) {
        const msgTime = dayjs.utc(msg.createdAt);
        if (mostRecentTime === null || msgTime.isAfter(mostRecentTime)) {
            mostRecentTime = msgTime;
        }
    }
    
    if (mostRecentTime === null) {
        return '';
    }
    
    const cutoffTime = mostRecentTime.subtract(hours, 'hour');
    
    // Filter and format messages in one pass
    return messages
        .filter(msg => 
            msg.author.username !== "Brent's Annoying Madden Bot" && 
            msg.author.username !== "Pingcord" &&
            dayjs.utc(msg.createdAt).isAfter(cutoffTime)
        )
        .map(msg => `Author: ${msg.author.username}, Message: ${msg.content}`)
        .join('\n');
}

/**
 * Calls OpenAI API with retry logic for rate limits
 */
async function callWithRetry(apiFunc, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    let delay = initialDelay;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiFunc();
        } catch (error) {
            lastError = error;
            
            // Check if it's a rate limit error
            if (error.response && error.response.status === 429) {
                console.log(`Rate limited. Retrying in ${delay}ms...`);
                await setTimeout(delay);
                delay *= 2; // Exponential backoff
            } else {
                // If it's not a rate limit error, don't retry
                throw error;
            }
        }
    }
    
    throw lastError;
}

/**
 * Generate summary using OpenAI API
 */
async function generateSummary(text) {
    if (!text || text.trim() === '') {
        return 'No messages to summarize.';
    }
    
    const messages = [
        {"role": "system", "content": "You are a helpful assistant that summarizes Discord conversations for a Madden league."},
        {"role": "user", "content": `Provide a summary of the following Discord conversation from my Madden league. For each unique author, create a bullet-pointed summary of their contributions. Then provide an overall summary of the conversation at the end. Here's the chat: ${text}`}
    ];

    return callWithRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "o4-mini-2025-04-16",
            messages: messages,
            max_completion_tokens: 2000,
        });

        if (!response || !response.choices || !response.choices[0]) {
            throw new Error('Invalid OpenAI response. Please check the API status and try again.');
        }
        return response.choices[0].message.content;
    });
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
                await interaction.deferReply({ ephemeral: false });
                
                const channel = interaction.channel;
                const hours = interaction.options.getInteger('hours');
                const messagesPerHour = 20; // Adjust as needed
                const messageLimit = hours * messagesPerHour;
                
                // Check cache first
                const cacheKey = `${channel.id}_${hours}`;
                const cachedResult = summaryCache.get(cacheKey);
                
                if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
                    return sendLongDiscordMessage(
                        interaction, 
                        cachedResult.summary,
                        ''
                    );
                }
                
                await interaction.editReply(`Fetching up to ${messageLimit} messages from the last ${hours} hours...`);
                
                // Performance measurement
                const startTime = Date.now();
                
                // Fetch messages
                const messagesArray = await fetchMessages(channel, messageLimit);
                
                if (messagesArray.length === 0) {
                    return interaction.editReply('No messages found in the specified time period.');
                }
                
                const fetchTime = Date.now() - startTime;
                await interaction.editReply(`Fetched ${messagesArray.length} messages in ${fetchTime}ms. Processing...`);
                
                // Process messages directly (no CSV conversion)
                const text = processMessages(messagesArray, hours);
                
                if (!text || text.trim() === '') {
                    return interaction.editReply('No relevant messages found in the specified time period.');
                }
                
                const processTime = Date.now() - startTime - fetchTime;
                await interaction.editReply(`Processed ${messagesArray.length} messages in ${processTime}ms. Generating summary...`);
                
                // Generate summary
                const summary = await generateSummary(text);
                
                // Format for Discord
                const formattedSummary = formatSummaryForDiscord(summary, hours);
                
                // Cache the result
                summaryCache.set(cacheKey, {
                    summary: formattedSummary,
                    timestamp: Date.now()
                });
                
                // Send to Discord with proper chunking
                await sendLongDiscordMessage(interaction, formattedSummary);
                
                const totalTime = Date.now() - startTime;
                console.log(`Command completed in ${totalTime}ms (Fetch: ${fetchTime}ms, Process: ${processTime}ms, AI: ${totalTime - fetchTime - processTime}ms)`);
                
            } catch (error) {
                console.error('An error occurred:', error);
                
                // Provide more specific error messages
                let errorMessage = 'An error occurred while generating the summary.';
                
                if (error.response) {
                    errorMessage = `API error (${error.response.status}): ${error.response.statusText}`;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                await interaction.editReply(`❌ ${errorMessage} Please try again later.`);
            }
        }
    }
};