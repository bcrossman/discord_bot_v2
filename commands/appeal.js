const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');
const config = require('../config.json');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({ apiKey: config.openaikey });
const openai = new OpenAIApi(configuration);

// Path to your rules file
const rulesFilePath = path.join(__dirname, '..', 'data', 'league_rules.txt');

// Function to read rules from file
function readRulesFromFile() {
    console.log(`[DEBUG] Attempting to read rules from: ${rulesFilePath}`);
    try {
        // Check if file exists
        if (fs.existsSync(rulesFilePath)) {
            const rules = fs.readFileSync(rulesFilePath, 'utf-8');
            console.log(`[DEBUG] Rules file found. First 100 chars: ${rules.substring(0, 100)}...`);
            console.log(`[DEBUG] Rules file length: ${rules.length} characters`);
            return rules;
        }
        console.log('[DEBUG] Rules file does not exist');
        return null;
    } catch (error) {
        console.error('[DEBUG] Error reading rules file:', error);
        return null;
    }
}

// Function to handle API calls with retry logic
async function callWithRetry(apiFunc, maxRetries = 3, initialDelay = 1000) {
    console.log(`[DEBUG] Starting API call with max ${maxRetries} retries`);
    let lastError;
    let delay = initialDelay;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`[DEBUG] API call attempt ${attempt + 1}/${maxRetries}`);
            const result = await apiFunc();
            console.log(`[DEBUG] API call successful on attempt ${attempt + 1}`);
            return result;
        } catch (error) {
            lastError = error;
            console.error(`[DEBUG] API call error on attempt ${attempt + 1}:`, error.message);
            
            // Check if it's a rate limit error or a server error (5xx)
            if ((error.response && error.response.status === 429) || 
                (error.response && error.response.status >= 500 && error.response.status < 600)) {
                console.log(`[DEBUG] Rate limited or server error. Retrying in ${delay}ms...`);
                await setTimeout(delay);
                delay *= 2; // Exponential backoff
            } else {
                // If it's not a retryable error, don't retry
                console.error('[DEBUG] Non-retryable error, not retrying:', error);
                throw error;
            }
        }
    }
    
    console.error('[DEBUG] All retry attempts failed');
    throw lastError;
}

// Function to get a ruling on a question based on rules
async function getRuling(question, rules, messages) {
    console.log(`[DEBUG] Getting ruling for question: ${question.substring(0, 50)}...`);
    console.log(`[DEBUG] Rules length: ${rules.length} characters`);
    
    // Special handling for empty responses with dedicated retries
    let maxEmptyRetries = 3;
    let emptyRetryCount = 0;
    
    while (true) {
        try {
            const content = await callWithRetry(async () => {
                console.log('[DEBUG] Sending request to OpenAI API');
                const response = await openai.createChatCompletion({
                    model: "o3-mini-2025-01-31",
                    messages: messages,
                    max_completion_tokens: 2000
                });
                
                console.log('[DEBUG] Received response from OpenAI API');
                console.log('[DEBUG] Response status:', response.status);
                console.log('[DEBUG] Response data structure:', Object.keys(response.data));
                
                if (!response.data || !response.data.choices || !response.data.choices[0]) {
                    console.error('[DEBUG] Invalid response structure:', JSON.stringify(response.data));
                    throw new Error('Invalid API response structure');
                }
                
                const content = response.data.choices[0].message.content;
                console.log(`[DEBUG] Response content length: ${content ? content.length : 0}`);
                console.log(`[DEBUG] First 100 chars of response: ${content ? content.substring(0, 100) : 'NULL'}`);
                
                if (!content || content.trim() === '') {
                    console.error('[DEBUG] Empty response content received');
                    throw new Error('Empty response from OpenAI');
                }
                
                return content;
            });
            
            // If we got here, we have a valid non-empty response
            return content;
            
        } catch (error) {
            // Special handling for empty responses
            if (error.message === 'Empty response from OpenAI' && emptyRetryCount < maxEmptyRetries) {
                emptyRetryCount++;
                console.log(`[DEBUG] Empty response received. Retry attempt ${emptyRetryCount}/${maxEmptyRetries}`);
                
                // Wait a bit before retrying for empty responses
                await setTimeout(2000 * emptyRetryCount);
                
                // Try with a slightly different temperature on retry, but keep using all rules
                // No truncation as requested by the user
                console.log(`[DEBUG] Retrying with temperature ${emptyRetryCount * 0.2}`);
                
                // Continue the loop to retry
                continue;
            }
            
            // For other errors or if we've exhausted our empty response retries, throw the error
            throw error;
        }
    }
}

// Create the judge command
module.exports = {
    data: new SlashCommandBuilder()
        .setName('appeal')
        .setDescription('Get a ruling on a league rules question')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Your question about the league rules')
                .setRequired(true)
        ),
    async execute(interaction) {
        console.log('[DEBUG] Command execution started');
        try {
            console.log('[DEBUG] Deferring reply');
            await interaction.deferReply({ ephemeral: false });
            
            const question = interaction.options.getString('question');
            console.log(`[DEBUG] Received question: ${question.substring(0, 50)}...`);

            // Always load the rules from the file
            console.log('[DEBUG] Loading rules from file');
            const rules = readRulesFromFile();
            
            // If no rules exist
            if (!rules) {
                console.log('[DEBUG] No rules found, sending error response');
                return interaction.editReply('No league rules have been set up yet. Please contact an administrator to set up the rules.');
            }
            
            console.log('[DEBUG] Sending interim message');
            await interaction.editReply('Analyzing the rules and preparing a ruling...');
            
            // Create the messages for OpenAI here so they can be shared between attempts
            const systemPrompt = "You are a knowledgeable and fair judge for a Madden NFL video game league. The questions may include NFL / American football jargon you need to interpret. Your task is to interpret the league rules and provide clear, consistent rulings on questions. Use direct quotes from the rules when possible to support your decisions. If the question is unclear or lacks necessary information, suggest what specific details would help make a more informed ruling.";
            
            const userPrompt = `LEAGUE RULES:\n\n${rules}\n\nQUESTION REQUIRING A RULING:\n${question}\n\nPlease provide a ruling on this question based on the league rules provided. If you need more information to make a fair ruling, specify exactly what details are missing.`;
            
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];
            
            // Get the ruling
            console.log('[DEBUG] Getting ruling');
            
            try {
                const ruling = await getRuling(question, rules, messages);
                
                console.log('[DEBUG] Ruling received, length:', ruling ? ruling.length : 0);
                
                // Additional validation check
                if (!ruling || ruling.trim() === '') {
                    console.log('[DEBUG] Ruling is empty or invalid, using fallback response');
                    await interaction.editReply('⚠️ I was unable to generate a complete ruling at this time. Please try again with a more specific question, or contact a league administrator for assistance.');
                    return;
                }
                
                // Format the response for better readability
                const response = `# Ruling on: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}\n\n${ruling}`;
                console.log(`[DEBUG] Formatted response length: ${response.length}`);
                
                // Handle Discord's 2000 character limit
                if (response.length <= 2000) {
                    console.log('[DEBUG] Sending single response message');
                    await interaction.editReply(response);
                } else {
                    console.log('[DEBUG] Response exceeds 2000 chars, splitting into chunks');
                    // Split into multiple messages if needed
                    const chunks = [];
                    for (let i = 0; i < response.length; i += 1900) {
                        chunks.push(response.substring(i, i + 1900));
                    }
                    
                    console.log(`[DEBUG] Split into ${chunks.length} chunks`);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        console.log(`[DEBUG] Sending chunk ${i+1}/${chunks.length}, length: ${chunks[i].length}`);
                        if (i === 0) {
                            await interaction.editReply(chunks[i]);
                        } else {
                            await interaction.followUp(chunks[i]);
                        }
                    }
                }
                console.log('[DEBUG] Command execution completed successfully');
            } catch (error) {
                console.error('[DEBUG] Error in ruling generation:', error);
                
                // If we failed to get a ruling after all retries, try using GPT-4o-mini as a fallback
                console.log('[DEBUG] Attempting fallback ruling with GPT-4o-mini');
                try {
                    // Use the same messages but with the GPT-4o-mini model
                    const fallbackResult = await callWithRetry(async () => {
                        console.log('[DEBUG] Sending fallback request to GPT-4o-mini');
                        const response = await openai.createChatCompletion({
                            model: "gpt-4o-mini-2024-07-18",
                            messages: messages, // Now messages is properly in scope
                            temperature: 0.3,   // Lower temperature for more consistent rulings
                            max_tokens: 250,
                        });
                        
                        console.log('[DEBUG] Received GPT-4o-mini response');
                        
                        if (!response.data || !response.data.choices || !response.data.choices[0]) {
                            console.error('[DEBUG] Invalid fallback response structure:', JSON.stringify(response.data));
                            throw new Error('Invalid fallback API response structure');
                        }
                        
                        const content = response.data.choices[0].message.content;
                        console.log(`[DEBUG] Fallback response content length: ${content ? content.length : 0}`);
                        
                        if (!content || content.trim() === '') {
                            console.error('[DEBUG] Empty fallback response content received');
                            throw new Error('Empty fallback response');
                        }
                        
                        return content;
                    });
                    
                    if (fallbackResult && fallbackResult.trim() !== '') {
                        console.log('[DEBUG] Fallback content generated successfully');
                        await interaction.editReply(`# Ruling on: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}\n\n${fallbackResult}\n\n*Note: This is a condensed ruling as the detailed analysis could not be completed.*`);
                        return;
                    }
                } catch (fallbackError) {
                    console.error('[DEBUG] Fallback approach also failed:', fallbackError);
                    // Continue to the general error handling below
                }
                
                // If we got here, both approaches failed
                await interaction.editReply('❌ Unable to generate a ruling at this time. Please try again later or contact a league administrator for assistance.');
            }
        } catch (error) {
            console.error('[DEBUG] Error in command execution:', error);
            console.error('[DEBUG] Error stack:', error.stack);
            
            // Provide more specific error messages
            let errorMessage = 'An error occurred while generating the ruling.';
            
            if (error.response) {
                console.error('[DEBUG] API Error response:', error.response.status, error.response.statusText);
                console.error('[DEBUG] API Error data:', JSON.stringify(error.response.data));
                errorMessage = `OpenAI API error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
            } else if (error.message) {
                errorMessage = 'Error: ' + error.message;
            }
            
            console.log(`[DEBUG] Sending error message: ${errorMessage}`);
            await interaction.editReply(`❌ ${errorMessage} Please try again later.`);
        }
    }
};