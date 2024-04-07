var TOKEN = require("./token.js");
var CLIENT_ID = "738108203505549342"
var fs = require("fs")

const { REST, Routes,SlashCommandBuilder } = require('discord.js');

const { Client, GatewayIntentBits, Intents } = require('discord.js');
const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
]
 });


var gods = ["246589957165023232","216465467806580737"]

function formatTime(t){
    var s = "";
    var suffix = "am"
    var parts = toString(t).split(".")
    if(!toString(t).includes(".")){
        parts[0] = t;
        parts[1] = "0"
    }
    
    
    parts[0] = parseInt(parts[0])+1
    console.log(parts[0])
    if(parts[0] > 12){
        suffix = "pm"
        parts[0] = parts[0]-12
    }
    parts[1] = (parseInt(parts[1])/100)*60
    if(parts[1] < 10){
        parts[1] = "0"+parts[1]
    }
    s = parts[0]+":"+parts[1]+suffix
    return s;
}

class body{
    constructor(){

    }
}

class player{
    constructor(id){
        this.id = id;
        this.lattitude = (Math.random()*20)-10
        this.hunger = 100;
        this.sleep = 100;
        this.time = 12;
        this.daysAtSea = 0;
    }
}

var commands = [];

var c = new SlashCommandBuilder()
.setName('getlost')
.setDescription('gets you lost at sea')

commands.push(c)

var c = new SlashCommandBuilder()
.setName('checktime')
.setDescription('checks the time')

commands.push(c)

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
      console.log('Started refreshing application (/) commands.');
  
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  })();

var players = {}

function randomFromArray(array){
    return array[Math.floor(Math.random() * array.length)];
}

var lostMessages = [
    "great going, you decided to go cheap on a \"cruise\" and now you're in the pacific",
    "perhaps that cheap airline was too good to be true after all, now you're lost at sea"
]

client.on('messageCreate', (msg) => {
})

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    var pid = interaction.member.id;

    if(players[pid] == null && interaction.commandName != "getlost"){
        interaction.reply("you aren't lost at sea, try using `/getlost`")
        return;
    }else{
        if(interaction.commandName == "getlost"){
            interaction.reply(randomFromArray(lostMessages))
            players[pid] = new player(pid);
            return;
        }

        if(interaction.commandName == "checktime"){
            interaction.reply(formatTime(players[pid].time));
            return;
        }
    }
})

client.login(TOKEN);