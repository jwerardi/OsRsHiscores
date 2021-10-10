// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const {getPlayerData, getMumbleHighscores} = require('./osrs.js');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});


client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
    console.log(interaction)

	const { commandName, channel } = interaction;

	if (commandName === 'ppppping') {
		await interaction.reply('sup');
	} else if (commandName === 'osrs') {
        const name = interaction.options.getString('name');
        if(name){
            const playerData = await getPlayerData(name)
            await channel.send({ embeds: [playerData] })
        }else{
            const mumbleData = await getMumbleHighscores()
            await channel.send({ embeds: [mumbleData] })
        }
	} else if (commandName === 'user') {
		await interaction.reply('User info.');
	}
});

client.login(token);