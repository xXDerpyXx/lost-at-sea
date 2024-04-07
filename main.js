var TOKEN = require("./token.js");
var CLIENT_ID = "337712474713489418"
var fs = require("fs")

const { REST, Routes,SlashCommandBuilder } = require('discord.js');

var gods = ["246589957165023232","216465467806580737"]

var c = new SlashCommandBuilder()
.setName('startuno')
.setDescription('opens a lobby for uno that anyone else can `/join`')
.addStringOption(option =>
  option.setName('input')
      .setDescription('deck to be used for this game')
      .setRequired(false));

commands.push(c)

const rest = new REST({ version: '10' }).setToken(TOKEN);


client.on('messageCreate', (msg) => {
})

client.on('interactionCreate', async interaction => {
})

client.login(TOKEN);