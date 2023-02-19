const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    execute: async function (message) {
        if (message.content.toLowerCase() === 'gg') {
            try {
                await message.reply('Do you really mean good game, or is this an attempt to jinx your opponent?');
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