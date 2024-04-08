var TOKEN = require("./token.js");
const baseBody = require("./spine")
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

var items = {}

function loadItems(){
decks = {}
fs.readdirSync("./items/").forEach(file => {
    console.log("loading "+file);
    items[file.split(".")[0]] = require("./items/"+file)
    console.log(items[file.split(".")[0]].texture)
});
}

loadItems()

function getUserFromMention(mention) {
	if (!mention) return false;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return mention;
	}
}

var hourToDescription = {
    0:"night",
    1:"night",
    2:"night",
    3:"early morning",
    4:"early morning",
    5:"morning",
    7:"morning",
    8:"morning",
    9:"morning",
    10:"morning",
    11:"noon",
    12:"afternoon",
    13:"afternoon",
    14:"afternoon",
    15:"afternoon",
    16:"twilight",
    17:"evening",
    18:"evening",
    19:"evening",
    20:"night",
    21:"night",
    22:"night",
    23:"midnight",
}

function fuzzyTime(time){
    return hourToDescription[Math.floor(time)];
}

/**
 * Format time into a human friendly format.
 * Take a time value, converts it into a formatted time string in hh:mm (am/pm) format.
 * */
function formatTime(time){
    // Our result string
    var timeString = "";
    console.log(time)
    var suffix = "am"
    var parts = [];
    // No decimal point time
    if(parseInt(time) == parseFloat(time)){
        parts[0] = time;
        parts[1] = "0"
    }else{
        parts = time.toString().split(".")
    }
    
    parts[0] = parseFloat(parts[0])+1
    console.log(parts)

    // Check if afternoon
    if(parts[0] > 12){
        suffix = "pm"
        parts[0] = parts[0]-12
    }
    if(parts[1].length == 1){
        parts[1] += "0"
    }

    parts[1] = ((parseInt(parts[1])/100)*60)
    console.log(parts[1])
    if(parts[1] < 10){
        parts[1] = "0"+parts[1]
    }
    timeString = parts[0]+":"+parts[1]+suffix
    return timeString;
}

class Modifier{
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

class Body{
    constructor(){
        // Imported from spine.js file, because holy shit the datastructure is massive!
        this.spine = baseBody;
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
        softHp -= part.modifiers[k].softDamage
    }
    if(hp < 0){
        hp = 0;
    }
    if(softHp < 0){
        softHp = 0;
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

function subPartCount(part){
    count = 0;
    for(var p in part){
        if(p != "hp" && p != "modifiers" && p != "required"){
            count++
        }
    }
    return count;
}

function bodyToString(body,partName,layer,layerString){
    var finalString = "" // Result

    // Establish default values
    if(layerString == null){
        layerString = ""
    }
    if(layer == null){
        layer = 0;
    }else{
        layer++;
    }
    if(partName == null){ // We start from the base, which is the spine
        partName = "spine"
    }

    // Highlight if the part is required for survival!
    if (body[partName].required !== undefined && body[partName].required === true){
        finalString = "["+partName + " <" + parthpString(body[partName]) + ">] *";
    } else {
        finalString = "["+partName + " <" + parthpString(body[partName]) + ">]";
    }

    let partsDone = 0;
    let totalParts = subPartCount(body[partName]);

    //Construct the layerString
    layer++;
    while(layerString.includes("├──"))
        layerString = layerString.replace("├──","│  ")

    while(layerString.includes("└──"))
        layerString = layerString.replace("└──","   ")
    let oldLayerString = layerString

    for(let subBodyPart in body[partName]){
        // Check through every sub-body-part that body part has (exclude keys that aren't sub-body-parts ofc)
        if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
            finalString += "\n"
            partsDone++;
                if(partsDone === totalParts)
                    layerString = oldLayerString+"└──"
                else
                    layerString = oldLayerString+"├──"

            finalString += layerString+""+bodyToString(body[partName],subBodyPart,layer,layerString)
        }
    }

    return finalString
}

/**
 * Applies a given modifier to a target body part, starting the search from the base body part
 * and its subsequent sub-bodyparts
 * @param bodyPart Highest level body part to apply the Search in
 * @param targetPart part which the modifier needs to find to be applied to
 * @param modifier The modifier in question that needs to be applied
 *
 * @return bodyPart the base bodyPart, now modified from the function.
 * */
function applyModifier(bodyPart,targetPart,modifier){
    for(let subBodyPart in bodyPart){
        // Check through every sub-body-part that body part has (exclude keys that aren't sub-body-parts ofc)
        if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
            if(subBodyPart === targetPart){
                // Body part found, apply the modifier!
                bodyPart[subBodyPart].modifiers.push(modifier)
            }else{
                // Recursive case, perform your BFS until you find the body aprt
                bodyPart[subBodyPart] = applyModifier(bodyPart[subBodyPart],targetPart,modifier)
            }
        }
    }
    return bodyPart;
}

class Player{
    constructor(id){
        // Player's discord id
        this.id = id;
        // When the player first starts the game, set their latitude randomly near the equator
        this.latitude = (Math.random()*20)-10

        // Internal properties
        this.hunger = 100;
        this.thirst = 100;
        this.sleep = 100;

        this.time = 12; //current time of day
        this.daysAtSea = 0; // Player's time spent in the game
        this.constantTime = 0; // hours of time in game TOTAL (used for timekeeping)
        
        this.body = new Body()
    }
}

function passTime(id,hours){
    players[id].time += hours;
    players[id].constantTime += hours;
    if(players[id].time > 24){
        players[id].time -= 24;
        players[id].daysAtSea+=1
    }

}

var commands = [];

var c = new SlashCommandBuilder()
.setName('getlost')
.setDescription('Gets you lost at sea.')

commands.push(c)

c = new SlashCommandBuilder()
.setName('sleep')
.setDescription('you go to sleep')
.addStringOption(option =>
    option.setName('hours')
        .setDescription('hours to sleep (can include decimals)')
        .setRequired(true));
commands.push(c)

c = new SlashCommandBuilder()
.setName('showitem')
.setDescription('shows an item')
.addStringOption(option =>
    option.setName('item')
        .setDescription('item to show')
        .setRequired(true));
commands.push(c)

c = new SlashCommandBuilder()
.setName('checktime')
.setDescription('Checks the time.')

commands.push(c)

c = new SlashCommandBuilder()
.setName('checkbody')
.setDescription('Checks your body.')

commands.push(c)

c = new SlashCommandBuilder()
    .setName('use')
    .setDescription("Use an item, and provide any other items it may require.")
    .addStringOption(option =>
        option.setName('item')
            .setDescription('item to show')
            .setRequired(true)
    );
commands.push(c)

c = new SlashCommandBuilder()
    .setName('shatter')
    .setDescription("shatters bones")
    .addStringOption(option =>
        option.setName('bodypart')
            .setDescription('part to shatter')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('target')
            .setDescription('who to shatter')
            .setRequired(true)
    );
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
    "perhaps that cheap airline was too good to be true after all, now you're lost at sea", "fuck",
    "you fell off the cruise ship and they just kept going without you, good luck!",
    "that vacation on Easter Island was a mistake, now you're lost at sea",
    "Neptune himself has taken you to the sea, fuck you"
]

client.on('messageCreate', (msg) => {
    var pid = msg.member.id;

    if(players[pid] != null){

    }
})

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    var pid = interaction.member.id;

    if(players[pid] == null && interaction.commandName != "getlost"){
        interaction.reply("you aren't lost at sea yet, try using `/getlost`")
        return;
    }else{

        if(gods.includes(pid)){
            if(interaction.commandName == "showitem"){
                var i = interaction.options.getString("item");
                if(items[i] != null)
                    interaction.reply("```\n"+items[i].texture+"\n```")
                else
                    interaction.reply("that's not real, this game only contains real things")
                return;
            }

            if(interaction.commandName == "shatter"){
                var bt = interaction.options.getString("bodypart");
                var target = getUserFromMention(interaction.options.getString("target"));
                var mod = new Modifier("shattered")
                mod.damage = 50
                players[target].body = applyModifier(players[target].body,bt,mod)
                interaction.reply("you shattered <@"+target+">'s "+bt)
                save();
            }
        }
        if(interaction.commandName == "getlost"){
            interaction.reply(randomFromArray(lostMessages))
            // Generate the player properties mapped to their user id
            players[pid] = new Player(pid);
            save();
            return;
        }

        if(interaction.commandName == "checktime"){
            var t = players[pid].time;
            if(players[pid].daysAtSea == 1){
                interaction.reply(formatTime(t)+", "+fuzzyTime(t)+", "+players[pid].daysAtSea+" day at sea");
            }else if(players[pid].daysAtSea > 1){
                interaction.reply(formatTime(t)+", "+fuzzyTime(t)+", "+players[pid].daysAtSea+" days at sea");
            }else
                interaction.reply(formatTime(t)+", "+fuzzyTime(t));
            return;
        }

        if(interaction.commandName == "sleep"){
            if(parseFloat(interaction.options.getString("hours")) > 24){
                interaction.reply("you cant sleep for more than 24 hours at a time")
            }else if(parseFloat(interaction.options.getString("hours")) < 0){
                interaction.reply("you cant unsleep")
            }else if(parseFloat(interaction.options.getString("hours"))+" " == "NaN "){
                interaction.reply("that's not a number")
            }else{
                passTime(pid,parseFloat(interaction.options.getString("hours")))
                interaction.reply("you have slept "+interaction.options.getString("hours")+" hours");
                save()
            }
            
            return;
        }

        if(interaction.commandName == "checkbody"){
            await interaction.reply("```\n"+bodyToString(players[pid].body)+"\n```");
            await interaction.followUp("```\n* means the part is required, if hp reaches 0%, you instantly die```")
            return;
        }

        if (interaction.commandName === "use"){
            interaction.reply("This is just a test for now")
        }
    }
})

client.login(TOKEN);