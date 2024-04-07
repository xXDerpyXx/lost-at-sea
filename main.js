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

// Theology is solved! :troll:
var gods = ["246589957165023232","216465467806580737"]

/**
 * Format time into a human friendly format.
 * Take a time value, converts it into a formatted time string in hh:mm (am/pm) format.
 * */
function formatTime(time){
    // Our result string
    var timeString = "";

    var suffix = "am"
    var parts = toString(time).split(".")
    // No decimal point time
    if(!toString(time).includes(".")){
        parts[0] = time;
        parts[1] = "0"
    }
    
    parts[0] = parseInt(parts[0])+1
    console.log(parts[0])

    // Check if afternoon
    if(parts[0] > 12){
        suffix = "pm"
        parts[0] = parts[0]-12
    }

    parts[1] = (parseInt(parts[1])/100)*60
    if(parts[1] < 10){
        parts[1] = "0"+parts[1]
    }
    timeString = parts[0]+":"+parts[1]+suffix
    return timeString;
}

class body{
    constructor(){
        // Dummy body parts, no implementation yet
        this.head = {};
        this.neck = {];
        this.chest = {};
        this.lowerTorso = {};
        this.leftArm = {};
        this.rightArm = {};
        this.leftHand = {};
        this.rightHand = {};
        this.leftLeg = {};
        this.rightLeg = {};
        this.leftFoot = {};
        this.rightFoot = {};
    }
}

class player{
    constructor(id){
        // Player's discord id
        this.id = id;
        // When the player first starts the game, set their latitude randomly near the equator
        this.latitude = (Math.random()*20)-10

        // Internal properties
        this.hunger = 100;
        this.sleep = 100;

        this.time = 12; //current time of day
        this.daysAtSea = 0; // Player's time spent in the game
    }
}

var commands = [];

var c = new SlashCommandBuilder()
.setName('getlost')
.setDescription('Gets you lost at sea.')

commands.push(c)

var c = new SlashCommandBuilder()
.setName('checktime')
.setDescription('Checks the time.')

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

// "Database" of players
var players = {}

function save(){
    fs.writeFileSync("players.json",JSON.stringify(players))
}

function load(){
    var temp = fs.readFileSync("players.json")
    players = JSON.parse(temp)
}

load()

function randomFromArray(array){
    return array[Math.floor(Math.random() * array.length)];
}

var lostMessages = [
    "great going, you decided to go cheap on a \"cruise\" and now you're in the pacific",
    "perhaps that cheap airline was too good to be true after all, now you're lost at sea"
]

client.on('messageCreate', (msg) => {
})

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    var pid = interaction.member.id;

    if(players[pid] == null && interaction.commandName != "getlost"){
        interaction.reply("you aren't lost at sea yet, try using `/getlost`")
        return;
    }else{
        if(interaction.commandName == "getlost"){
            interaction.reply(randomFromArray(lostMessages))
            // Generate the player properties mapped to their user id
            players[pid] = new player(pid);
            save();
            return;
        }

        if(interaction.commandName == "checktime"){
            interaction.reply(formatTime(players[pid].time));
            return;
        }
    }
})

client.login(TOKEN);