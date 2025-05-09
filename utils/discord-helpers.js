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
  
  module.exports = {
    sendLongDiscordMessage,
    formatSummaryForDiscord
  };