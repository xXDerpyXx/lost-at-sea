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
    fs.readdirSync("./items/").forEach(file => {
        console.log("loading "+file);
        items[file.split(".")[0]] = require("./items/"+file)
        console.log(items[file.split(".")[0]].texture)
    });
}

loadItems()

var recipes = {}

function loadRecipes(){
    fs.readdirSync("./recipes/").forEach(file => {
        console.log("loading "+file);
        recipes[file.split(".")[0]] = require("./recipes/"+file)
    });
}

loadRecipes()

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
        // Imported from spine.js file, because holy shit the datastructure is massive!
        this.spine = baseBody;
    }
}

class player{
    constructor(id){
        // Player's discord id
        this.id = id;
        // When the player first starts the game, set their latitude randomly near the equator
        this.latitude = (Math.random()*20)-10
        this.longitude = (Math.random()*360)-180

        // Internal properties
        this.hunger = 100;
        this.thirst = 100;
        this.sleep = 100;

        this.time = 12; //current time of day
        this.daysAtSea = 0; // Player's time spent in the game
        this.constantTime = 0; // hours of time in game TOTAL (used for timekeeping)

        this.body = new body()
    }
}

map = []

function oob(x,y){
    if(x > 0 && x < 3600 && y > 0 && y < 1800){
        return false;
    }
    return true;
}

function generateMap(){
    var width = 3600
    var height = 1800
    var smoothness = 2
    var seaLevel = 105
    var m = []
    console.log("map generating")
    for(var x = 0; x < width; x++){
        m[x] = []
        for(var y = 0; y < height; y++){
            m[x][y] = {
                elevation:110-(Math.random()*11),
                tileChar:"~",
                land:false,
                reef:false
            }
        }
    }
    console.log("smoothing terrain")

    for(var k = 0; k < smoothness; k++){
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                var avg = 0
                var tiles = 0
                for(var i = -1; i < 2; i++){
                    for(var j = -1; j < 2; j++){
                        if(!oob(x+i,y+j)){
                            tiles++;
                            avg += m[x+i][y+j].elevation
                        }
                    }
                }
                m[x][y].elevation = avg/tiles
            }
        }
    }
    console.log("generating textures")
    for(var x = 0; x < width; x++){
        for(var y = 0; y < height; y++){
            if(m[x][y].elevation <= seaLevel){
                if(m[x][y].reef){
                    m[x][y].tileChar = "-"
                }else
                    m[x][y].tileChar = "~"
            }else if(m[x][y].elevation <= seaLevel+1){
                m[x][y].tileChar = "░"
                m[x][y].land = true;
            }else if(m[x][y].elevation <= seaLevel+2){
                m[x][y].tileChar = "▒"
                m[x][y].land = true;
            }else if(m[x][y].elevation <= seaLevel+3){
                m[x][y].tileChar = "▓"
                m[x][y].land = true;
            }else{
                m[x][y].tileChar = "█"
                m[x][y].land = true;
            }
            

        }
    }

    console.log("map complete")
    return m;
}



function dist(ax,ay,bx,by){
    return Math.sqrt(((ax-bx)*(ax-bx))+((ay-by)*(ay-by)))
}

function drawMap(x,y,radius){
    var output = "";
    for(var i = x-radius; i < x+radius; i++){
        for(var j = y-radius; j < y+radius; j++){
            if(!oob(i,j)){
                if(dist(x,y,i,j) <= radius-1){
                    output += map[i][j].tileChar;
                }else
                    output += " "
            }else
                output += " "
        }
        output +="\n"
    }
    return output;
}

function polarToPlanar(lat,lon){
    lat = Math.floor((lat+90)*10)
    lon = Math.floor((lon+180)*10)
    return [lat,lon]
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

function deadCheck(b,part){
    dead = false
    if(part == null){
        part = "spine"
    }
    if(getBodyPartHp(b)[0] == 0 && b.required){
        dead = true;
        return [b[part],dead]
    }
    for(var p in b){
        if(p != "hp" && p != "modifiers" && p != "required"){
            var check = deadCheck(b[p],p);
            if(check[1]){
                dead = true;
                return [b[part],dead]
            }
        }
    }
    return [b[part],dead]
}

/**
 * Compute the HP (and softHP) of a body part
 *
 * @param bodyPart body part in question to get the HP computation
 *
 * */
function getBodyPartHp(bodyPart){
    let HP = bodyPart.hp
    let softHP = bodyPart.hp

    for(var i in bodyPart.modifiers){
        HP -= bodyPart.modifiers[i].damage
        softHP -= (bodyPart.modifiers[i].damage + bodyPart.modifiers[i].softDamage);
    }
    // Account for negative Health
    if(HP < 0){ HP = 0; }
    if(softHP < 0){ softHP = 0; }

    // Return them as a pair
    return [HP,softHP];
}

/**
 * Parse the HP and SoftHP into a string for the user to read
 *
 * @param bodyPart Body part in question to get it's HP to parse.
 * */
function hpToString(bodyPart){
    let HP, softHP
    [HP, softHP] = getBodyPartHp(bodyPart)
    let percantageHP = Math.floor((HP/bodyPart.hp)*100)
    let percentageSoftHP = Math.floor((softHP/bodyPart.hp)*100)
    if(percantageHP === percentageSoftHP){
        return percantageHP+"%"
    }else{
        // Show both values
        return `${percentageSoftHP}% (${percantageHP}%)`
    }
}

/**
 * Compute how many sub body parts a body part has
 *
 * @param bodyPart the body part in question
 * */
function getSubBodyPartCount(bodyPart){
    count = 0; // Where we build the result
    for(var subBodyPartKey in bodyPart){
        if(subBodyPartKey !== "hp" && subBodyPartKey !== "modifiers" && subBodyPartKey !== "required"){
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
    var highlight = ""
    if (body[partName].required !== undefined && body[partName].required === true){
        highlight = " *"
    }
    var mods = ""
    for(var i = 0; i < body[partName].modifiers.length; i++){
        mods += body[partName].modifiers[i].name
        if(i < body[partName].modifiers.length-1){
            mods +=", "
        }
    }

    if(mods.length > 0){
        mods = " ("+mods+")"
    }
    finalString = "["+partName + " <" + hpToString(body[partName]) + ">"+mods+"]"+highlight;

    let partsDone = 0;
    let totalParts = getSubBodyPartCount(body[partName]);

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


/**
 * Increment the time passed relative to a certain player
 * @param id user's discord id
 * @param hours how many hours you want to increment
 * */
function passTime(id,hours){
    players[id].time += hours;
    players[id].constantTime += hours;

    // Account for hours
    if(players[id].time > 24){
        players[id].time -= 24;
        players[id].daysAtSea+=1
    }
}

function getPlayerLocation(id){
    let locationString = "";
    // We round to 4dp
    let latitude = Math.abs(players[id].latitude.toFixed(4));
    let longitude = Math.abs(players[id].longitude.toFixed(4));

    let latsuffix = "°S"
    let lonsuffix = "°E"
    if (latitude < 0){ // Account for negative latitude (aka south of the equator)
        latsuffix = "°S"
    } else {
        latsuffix = "°N"
    }

    if (latitude < 0){ // Account for negative longitude
        lonsuffix = "°W"
    } else {
        lonsuffix = "°E"
    }

    locationString += `Your location is (`+latitude+latsuffix+", "+longitude+lonsuffix+`)`;


    return locationString;
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
.setName('checkmap')
.setDescription('Checks your local area.')

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

c = new SlashCommandBuilder()
    .setName('checklocation')
    .setDescription("get the player's location on the map")

commands.push(c)

c = new SlashCommandBuilder()
    .setName('regenmap')
    .setDescription("regenerates the map")

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

client.on('ready',()=>{
    map = generateMap();
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

            if(interaction.commandName == "regenmap"){
                interaction.reply("the world has been erased then remade")
                map = generateMap();
            }

            

            if(interaction.commandName == "shatter"){
                var bt = interaction.options.getString("bodypart");
                var target = getUserFromMention(interaction.options.getString("target"));
                var mod = new modifier("shattered")
                if(players[target] == null){
                    interaction.reply("they do not exist")
                    return;
                }
                mod.damage = 50
                players[target].body = applyModifier(players[target].body,bt,mod)
                interaction.reply("you shattered <@"+target+">'s "+bt)
                save();
            }
        }
        if(interaction.commandName == "getlost"){
            interaction.reply(randomFromArray(lostMessages))
            // Generate the player properties mapped to their user id
            players[pid] = new player(pid);
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

        if(interaction.commandName == "checkmap"){
            var coords = polarToPlanar(players[pid].latitude,players[pid].longitude)
            interaction.reply("```\n"+drawMap(coords[0],coords[1],10)+"\n```")
        }

        if(interaction.commandName == "sleep"){
            if(parseFloat(interaction.options.getString("hours")) > 24){
                interaction.reply("you cant sleep for more than 24 hours at a time")
            }else if(parseFloat(interaction.options.getString("hours")) < 0){
                interaction.reply("you cant unsleep")
            }else if(parseFloat(interaction.options.getString("hours"))+" " == "NaN "){
                interaction.reply("that's not a number")
            }else{
                if(deadCheck(players[pid].body)[1]){
                    interaction.reply("you died in your sleep :pensive:")
                    players[pid] = null;
                    delete players[pid];
                    save();
                    return
                }else{
                    passTime(pid,parseFloat(interaction.options.getString("hours")))
                    interaction.reply("you have slept "+interaction.options.getString("hours")+" hours");
                    save()
                }
                
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
        if (interaction.commandName === "checklocation"){
            interaction.reply(""+getPlayerLocation(pid)+"")

        }
    }
})

client.login(TOKEN);