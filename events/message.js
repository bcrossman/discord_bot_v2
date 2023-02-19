const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    execute: async function (msg) {
        if (message.content.toLowerCase() === 'hello') {
            try {
                await message.reply('Hello Mark!');
            } catch (error) {
                console.error(error);
                await msg.reply({
                    content: "Didn't work!",
                    ephemeral: true,
                });
            }
        }
    },
};