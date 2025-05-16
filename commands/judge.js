const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');
const config = require('../config.json');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: config.openaikey });

// Path to your rules file
const rulesFilePath = path.join(__dirname, '..', 'data', 'league_rules.txt');

// Function to read rules from file
function readRulesFromFile() {
    try {
        // Check if file exists
        if (fs.existsSync(rulesFilePath)) {
            return fs.readFileSync(rulesFilePath, 'utf-8');
        }
        return null;
    } catch (error) {
        console.error('Error reading rules file:', error);
        return null;
    }
}

// Function to handle API calls with retry logic
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

// Function to get a ruling on a question based on rules
async function getRuling(question, rules) {
    const messages = [
        {
            role: "system", 
            content: "You are a knowledgeable and fair judge for a Madden NFL video game league. The questions may include NFL / American football jargon you need to interpret. Your task is to interpret the league rules and provide clear, consistent rulings on questions. Use direct quotes from the rules when possible to support your decisions. If the question is unclear or lacks necessary information, suggest what specific details would help make a more informed ruling."
        },
        {
            role: "user", 
            content: `LEAGUE RULES:\n\n${rules}\n\nQUESTION REQUIRING A RULING:\n${question}\n\nPlease provide a ruling on this question based on the league rules provided. Please provide the relevant sections to support the ruling. If you need more information to make a fair ruling, specify exactly what details are missing.`
        }
    ];

    return callWithRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "o4-mini-2025-04-16",
            messages: messages,
            max_completion_tokens: 8000,
        });
        console.log('OpenAI API response:', JSON.stringify(response, null, 2));

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
            return 'Sorry, I was unable to generate a ruling. Please check the rules or try again.';
        }

        return response.choices[0].message.content || 'Sorry, I was unable to generate a ruling. Please check the rules or try again.';
    });
}

// Create the judge command
module.exports = {
    data: new SlashCommandBuilder()
        .setName('judge_quick')
        .setDescription('Get a ruling on a league rules question')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Your question about the league rules')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });
            
            const question = interaction.options.getString('question');

            // Always load the rules from the file
            const rules = readRulesFromFile();
            
            // If no rules exist
            if (!rules) {
                return interaction.editReply('No league rules have been set up yet. Please contact an administrator to set up the rules.');
            }
            
            await interaction.editReply('Analyzing the rules and preparing a ruling...');
            
            // Get the ruling
            const ruling = await getRuling(question, rules);
            
            // Format the response for better readability
            const response = `# Ruling on: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}\n\n${ruling}`;
            
            // Handle Discord's 2000 character limit
            if (response.length <= 2000) {
                await interaction.editReply(response);
            } else {
                // Split into multiple messages if needed
                for (let i = 0; i < response.length; i += 1900) {
                    const chunk = response.substring(i, i + 1900);
                    if (i === 0) {
                        await interaction.editReply(chunk);
                    } else {
                        await interaction.followUp(chunk);
                    }
                }
            }
        } catch (error) {
            console.error('An error occurred:', error);
            
            // Provide more specific error messages
            let errorMessage = 'An error occurred while generating the ruling.';
            if (error.message && error.message.includes('API')) {
                errorMessage = 'OpenAI API error: ' + error.message;
            }
            
            await interaction.editReply(`❌ ${errorMessage} Please try again later.`);
        }
    }
};
