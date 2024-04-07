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

class modifier{
    constructor(n){
        this.name = n;
        this.damage = 0; // flat rate damage done to body part when modifier is applied
        this.growth = 0; // rate that damage increases during medical check
        this.stage = "malignant"; // stage of cancer/infection/disease (malignant/immune/etc)
        this.spreads = false; // spreads to other body parts?
        this.spreadRate = 0; // chance of spreading during medical tick
        this.softDamage = 0; //"damage" that cant result in a bodypart being destroyed
        this.immunity = 0; // immunity to infection or disease
        this.unusable = false; // renders the bodypart unusable regardless of damage
    }

}

class body{
    constructor(){
        this.spine = {
            hp:10,
            modifiers:[],
            chest:{
                hp:10,
                modifiers:[],
                required:true,
                neck:{
                    hp:8,
                    modifiers:[],
                    required:true,
                    head:{
                        hp:10,
                        modifiers:[],
                        required:true,
                        skull:{
                            hp:10,
                            modifiers:[],
                            brain:{
                                hp:10,
                                modifiers:[],
                                required:true
                            }
                        },
                        leftEye:{hp:5,modifiers:[]},
                        rightEye:{hp:5,modifiers:[]},
                        leftEar:{hp:5,modifiers:[]},
                        rightEar:{hp:5,modifiers:[]},
                        mouth:{
                            hp:5,
                            modifiers:[],
                            tongue:{hp:3,modifiers:[]},
                            upperTeeth:{hp:5,modifiers:[]},
                            lowerTeeth:{hp:5,modifiers:[]}
                        },
                        nose:{hp:5,modifiers:[]}
                    }
                },
                leftShoulder:{
                    hp:7,
                    modifiers:[],
                    leftUpperArm:{
                        hp:5,
                        modifiers:[],
                        leftLowerArm:{
                            hp:5,
                            modifiers:[],
                            leftHand:{
                                hp:5,
                                modifiers:[],
                                leftThumb:{hp:3,modifiers:[]},
                                leftIndexFinger:{hp:3,modifiers:[]},
                                leftMiddleFinger:{hp:2,modifiers:[]},
                                leftRingFinger:{hp:2,modifiers:[]},
                                leftPinkyFinger:{hp:1,modifiers:[]}
                            }
                        }
                    }
                },
                rightShoulder:{
                    hp:7,
                    modifiers:[],
                    rightUpperArm:{
                        hp:5,
                        modifiers:[],
                        rightLowerArm:{
                            hp:5,
                            modifiers:[],
                            rightHand:{
                                hp:5,
                                modifiers:[],
                                rightThumb:{hp:3,modifiers:[]},
                                rightIndexFinger:{hp:3,modifiers:[]},
                                rightMiddleFinger:{hp:2,modifiers:[]},
                                rightRingFinger:{hp:1,modifiers:[]},
                                rightPinkyFinger:{hp:1,modifiers:[]}
                            }
                        }
                    }
                },
                heart:{
                    hp:7,
                    modifiers:[],
                    required:true
                },
                leftLung:{hp:5,modifiers:[]},
                rightLung:{hp:5,modifiers:[]},
                stomach:{hp:5,modifiers:[]},
                liver:{hp:5,modifiers:[]}
            },
            lowerTorso:{
                hp:10,
                modifiers:[],
                required:true,
                leftUpperLeg:{
                    hp:7,
                    modifiers:[],
                    leftLowerLeg:{
                        hp:7,
                        modifiers:[],
                        leftFoot:{
                            hp:5,
                            modifiers:[],
                            leftFirstToe:{hp:3,modifiers:[]},
                            leftSecondToe:{hp:3,modifiers:[]},
                            leftThirdToe:{hp:2,modifiers:[]},
                            leftFourthToe:{hp:2,modifiers:[]},
                            leftFifthToe:{hp:1,modifiers:[]}
                        }
                    }
                },
                rightUpperLeg:{
                    hp:7,
                    modifiers:[],
                    rightLowerLeg:{
                        hp:7,
                        modifiers:[],
                        rightFoot:{
                            hp:5,
                            modifiers:[],
                            rightFirstToe:{hp:3,modifiers:[]},
                            rightSecondToe:{hp:3,modifiers:[]},
                            rightThirdToe:{hp:2,modifiers:[]},
                            rightFourthToe:{hp:2,modifiers:[]},
                            rightFifthToe:{hp:1,modifiers:[]}
                        }
                    }
                },
                intestines:{hp:5,modifiers:[]},
                leftKidney:{hp:5,modifiers:[]},
                rightKidney:{hp:5,modifiers:[]}
            }
        }
    }
}

function healthTick(b,part){
    if(part == null){
        part = "spine"
    }
    for(var p in b[part]){
        if(p != "hp" && p != "modifiers" && p != "required"){
            b[part] = healthTick(b[part],p)
        }
    }
    return b[part]
}

function parthp(part){
    var hp = part.hp
    var softHp = part.hp
    for(var k in part.modifiers){
        hp -= part.modifiers[k].damage
        softHp -= part.modifiers[k].damage
        softHp -= part.modifiers[k].softDamagedamage
    }
    if(hp < 0){
        hp = 0;
    }

    return [hp,softHp];
}

function parthpString(part){
    var hp = parthp(part)
    var percentage = Math.floor((hp[0]/part.hp)*100)
    var softPercentage = Math.floor((hp[1]/part.hp)*100)
    if(percentage == softPercentage){
        return percentage+"%"
    }else{
        return softPercentage+"% ("+percentage+"%)"
    }

}

function bodyToString(b,part,layer){
    var finalString = ""
    if(layer == null){
        layer = 0;
    }else{
        layer++;
    }
    if(part == null){
        part = "spine"
    }
    finalString = part + " <" + parthpString(b[part]) + ">";
    for(var p in b[part]){
        if(p != "hp" && p != "modifiers" && p != "required"){
            finalString += "\n"
            for(var i = 0; i < layer; i++){

                if (i === layer - 1){
                    finalString += "├───"
                } else {
                    finalString += "|   "
                }
            }
            finalString += "["+bodyToString(b[part],p,layer)+"]"
        }
    }

    return finalString
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
        
        this.body = new body()
    }
}

var commands = [];

var c = new SlashCommandBuilder()
.setName('getlost')
.setDescription('Gets you lost at sea.')

commands.push(c)

c = new SlashCommandBuilder()
.setName('checktime')
.setDescription('Checks the time.')

commands.push(c)

c = new SlashCommandBuilder()
.setName('checkbody')
.setDescription('Checks your body.')

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

        if(interaction.commandName == "checkbody"){
            interaction.reply(bodyToString(players[pid].body));
            return;
        }
    }
})

client.login(TOKEN);