var TOKEN = require("./token.js");
const baseBody = require("./spine")
const commands = require("./commandBuilder")
const generateMap = require("./mapGeneration")
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
    var suffix = "am"
    var parts = [];
    // No decimal point time
    if(parseInt(time) == parseFloat(time)){
        parts[0] = time;
        parts[1] = "0"
    }else{
        parts = time.toFixed(2).toString().split(".")
    }
    
    parts[0] = parseFloat(parts[0])+1

    // Check if afternoon
    if(parts[0] > 12){
        suffix = "pm"
        parts[0] = parts[0]-12
    }
    if(parts[1].length == 1){
        parts[1] += "0"
    }

    parts[1] = Math.round((parseInt(parts[1])/100)*60)
    if(parts[1] < 10){
        parts[1] = "0"+parts[1]
    }
    timeString = parts[0]+":"+parts[1]+suffix
    return timeString;
}

function formatLengthOfTime(hours){
    // Our result string
    var timeString = "";
    var parts = [];
    // No decimal point time
    if(parseInt(hours) == parseFloat(hours)){
        parts[0] = hours;
        parts[1] = "0"
    }else{
        parts = hours.toFixed(2).toString().split(".")
        if(parseInt(parts[1]) < 10 && parts[1].length == 1){
            parts[1] = parts[1]*10
        }
    }
    
    parts[0] = parseFloat(parts[0])
    parts[1] = ((parseInt(parts[1])/100)*60)

    if(parts[1] != 0){
        timeString = parts[0]+" hours, "+parts[1].toFixed(0)+" minutes"
    }else{
        timeString = parts[0]+" hours"
    }

    return timeString;
}

class modifier{
    constructor(n){
        this.name = n; // name of the injury/disease (bruise/scratch/polio/etc)
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
        this.spine = structuredClone(baseBody);
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

        this.swimmingSpeed = 2

        this.body = new body()
    }
}

var map = []

function oob(x,y){
    if(x > 0 && x < 3600 && y > 0 && y < 1800){
        return false;
    }
    return true;
}


function dist(ax,ay,bx,by){
    return Math.sqrt(((ax-bx)*(ax-bx))+((ay-by)*(ay-by)))
}

function drawMap(x,y,radius,showingCenter){
    if(showingCenter == null){
        showingCenter == false;
    }
    var output = "";
    for(var j = y-radius; j < y+radius; j++){
        for(var i = x-radius; i < x+radius; i++){
            if(!oob(i,j)){
                //console.log(dist(y,x,j,i))
                if(i == x && j == y && showingCenter){
                    output +="¤"
                }else{
                    if(dist(x,y,i,j) <= radius-1){
                        output += map[i][j].tileChar;
                    }else
                        output += " "
                }
            }else
                output += " "
        }
        output +="\n"
    }
    return output;
}

function colorifyMap(map){
    // Consider putting into a different file as a json object
    var ansiColorMapper = {
        " ":{
            start: "",
            end:""
        },
        "~":{ // blue
            start: "[2;34m",
            end: "[0m"
        },
        ".":{ // blue
            start: "[2;34m",
            end: "[0m"
        },
        "≡":{ // blue
            start: "[2;34m",
            end: "[0m"
        },
        "■":{ // blue
            start: "[2;34m",
            end: "[0m"
        },
        "-":{
            start: "[2;35m",
            end: "[0m"
        },
        "░":{
            start: "[2;33m",
            end: "[0m"
        },
        "▒":{
            start: "[2;36m[2;32m",
            end: "[0m[2;36m[0m"
        },
        "▓": {
            start: "[2;36m[2;32m",
            end: "[0m"
        },
        "█": {
            start: "[2;30m",
            end: "[0m"
        }
    }

    //We make sure that you shouldn't do coloring overlaps
    let colorInUse = false;
    let currentSymbol = "";
    let currentColor;

    // Our result string
    let coloredmap = "";
    // Set of accepted characters - feel free to extend if there is more characters
    //let characterSetRegex = /[ ~.\-■░▒█]/;
    let regString = "["
    for(var k in ansiColorMapper){
        regString += "\\"+k
    }
    regString += "]"
    let characterSetRegex = new RegExp(regString)

    for (let i = 0 ; i < map.length ; i++){

        // If the charcter is different from the previous character and it's already doing coloring,
        // end the coloring lol
        if (colorInUse === true && map[i] !== currentSymbol){
            coloredmap += `${ansiColorMapper[currentSymbol].end}`;
            currentSymbol = map[i];
            colorInUse = false;
        }

        // If nothing is being colored rn, start coloring
        if (characterSetRegex.test(map[i]) && colorInUse === false){
            currentSymbol = map[i];
            colorInUse = true;
            coloredmap += `${ansiColorMapper[map[i]].start}${map[i]}`;
        }
        else if (map[i] === " "){
            currentSymbol = map[i];
            colorInUse = true;
            coloredmap += `${ansiColorMapper[map[i]].start}${map[i]}`;
        } else { // Our catch all case wtf, if things are already being colored and
            // the next character isn't diffrent from the currentSymbol
            coloredmap += map[i];
        }
    }

    return coloredmap;
}

/**
 * Take a player's latitude and longitude (on the globe) and then transform it to the (flat) map's co odinates
 *
 * */
function polarToPlanar(lat,lon){
    const y = Math.floor((lat+90)*10) //lat
    const x = Math.floor((lon+180)*10) //lon
    return [x,y]
}

function planarToPolar(x, y){
    const lat = (x / 10) - 90;
    const lon = (y / 10) - 180

    return [lon, lat]
}

function adjustForCurve(lat,lon){
    while(lat > 90)
        lat-=180
    while(lat < -90)
        lat+=180

    while(lon > 180)
        lon-=360
    while(lon < -180)
        lon+=360
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
        if(getBodyPartHp(b["spine"]["chest"]["leftLung"])[0] == 0 && getBodyPartHp(b["spine"]["chest"]["rightLung"])[0] == 0){
            return [b[part],true]
        }
        if(getBodyPartHp(b["spine"]["lowerTorso"]["leftKidney"])[0] == 0 && getBodyPartHp(b["spine"]["lowerTorso"]["rightKidney"])[0] == 0){
            return [b[part],true]
        }
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
    if(getBodyPartHp(body[partName])[0] == 0)
        return finalString+" destroyed!"
    else if(getBodyPartHp(body[partName])[1] == 0)
        return finalString+" disabled!"
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
    if(targetPart == "this"){
        bodyPart.modifiers.push(modifier)
    }else{
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
    }
    
    return bodyPart;
}

function complexDamage(t,mod,bodyPart,r){

    if(r == null){
        r = 0.5
    }

    applyModifier(bodyPart,"this",mod)
    if(t == "penetration"){
        for(let subBodyPart in bodyPart){
            // Check through every sub-body-part that body part has (exclude keys that aren't sub-body-parts ofc)
            if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
                if(Math.random() < r){
                    // Recursive case, perform your BFS until you find the body aprt
                    bodyPart[subBodyPart] = complexDamage(t,mod,bodyPart[subBodyPart],r)
                }
            }
        }
    }
    return bodyPart
}

function applyComplexDamage(t,mod,bodyPart,r,targetPart){
    for(let subBodyPart in bodyPart){
        // Check through every sub-body-part that body part has (exclude keys that aren't sub-body-parts ofc)
        if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
            if(subBodyPart === targetPart){
                // Body part found, apply the modifier!
                bodyPart[subBodyPart] = complexDamage(t,mod,bodyPart[subBodyPart],r)
                return bodyPart
            }else{
                // Recursive case, perform your BFS until you find the body aprt
                bodyPart[subBodyPart] = applyComplexDamage(t,mod,bodyPart[subBodyPart],r,targetPart)
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
    while(players[id].time > 24){
        players[id].time -= 24;
        players[id].daysAtSea+=1
    }
}

function getPlayerLocation(id){
    let locationString = "";
    // We round to 4dp
    let latitude = players[id].latitude.toFixed(4);
    let longitude = players[id].longitude.toFixed(4);

    let latsuffix = "°S"
    let lonsuffix = "°E"
    if (latitude < 0){ // Account for negative latitude (aka south of the equator)
        latsuffix = "°S"
    } else {
        latsuffix = "°N"
    }

    if (longitude < 0){ // Account for negative longitude
        lonsuffix = "°W"
    } else {
        lonsuffix = "°E"
    }

    locationString += `Your location is (`+Math.abs(latitude)+latsuffix+", "+Math.abs(longitude)+lonsuffix+`)`;


    return locationString;
}

/**
 * Return miles into kilometers rounded to 2dp
 * */
function mileToKm(miles){
    return (miles * 1.609).toFixed(2);
}
//
// console.log(commands)

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

function save(saveMap){
    fs.writeFileSync("players.json",JSON.stringify(players))
    if(saveMap !== false)
        fs.writeFileSync("map.json",JSON.stringify(map))
}

function load(){
    var temp = fs.readFileSync("players.json")
    players = JSON.parse(temp)
    if(fs.existsSync("map.json")){
        temp = fs.readFileSync("map.json")
        map = JSON.parse(temp)
    }else{
        map = []
    }
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
    if(map[1] == null){
        map = generateMap();
        var coords = polarToPlanar(0,0)
        var mapText = drawMap(coords[0],coords[1],1800)
        fs.writeFileSync("map.txt",mapText)
        save()
    }
    
})

var repeats = 0;

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
                await interaction.reply("regenerating map")
                map = generateMap(interaction);
                var coords = polarToPlanar(0,0)
                var mapText = drawMap(coords[0],coords[1],1800)
                fs.writeFileSync("map.txt",mapText)
                save()
            }

            if (interaction.commandName === "teleport"){
                const latitude = parseFloat(interaction.options.getString("latitude"))
                const longitude = parseFloat(interaction.options.getString("longitude"))
                players[pid].latitude = latitude
                players[pid].longitude = longitude
                var temp = adjustForCurve(players[pid].latitude,players[pid].longitude)
                players[pid].latitude = temp[0]
                players[pid].longitude = temp[1]
                interaction.reply(""+getPlayerLocation(pid)+"")
    
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
                save(false);
            }

            if(interaction.commandName == "shoot"){
                var bt = interaction.options.getString("bodypart");
                var target = getUserFromMention(interaction.options.getString("target"));
                var mod = new modifier("gunshot wound")
                if(players[target] == null){
                    interaction.reply("they do not exist")
                    return;
                }
                mod.damage = 5
                players[target].body = applyComplexDamage("penetration",mod,players[target].body,0.75,bt)
                interaction.reply("you shot <@"+target+">'s "+bt)
                save(false);
            }

            if(interaction.commandName == "applydamage"){
                var bt = interaction.options.getString("bodypart");
                var target = getUserFromMention(interaction.options.getString("target"))

                var mod = new modifier(interaction.options.getString("name"))
                if(players[target] == null){
                    interaction.reply("they do not exist")
                    return;
                }
                if(interaction.options.getNumber("damage"))
                    mod.damage = interaction.options.getNumber("damage")
                if(interaction.options.getNumber("growth"))
                    mod.growth = interaction.options.getNumber("growth")
                if(interaction.options.getString("stage"))
                    mod.stage = interaction.options.getString("stage")
                if(interaction.options.getBoolean("spreads"))
                    mod.spreads = interaction.options.getBoolean("spreads")
                if(interaction.options.getNumber("spreadrate"))
                    mod.spreadRate = interaction.options.getNumber("spreadrate")
                if(interaction.options.getNumber("softdamage"))
                    mod.softDamage = interaction.options.getNumber("softdamage")
                if(interaction.options.getNumber("immunity"))
                    mod.immunity = interaction.options.getNumber("immunity")
                if(interaction.options.getBoolean("unusable"))
                    mod.unusable = interaction.options.getBoolean("unusable")



                players[target].body = applyModifier(players[target].body,bt,mod)
                interaction.reply("you applied '"+mod.name+"' <@"+target+">'s "+bt)
                save(false);
            }
        }
        if(interaction.commandName == "getlost"){
            interaction.reply(randomFromArray(lostMessages))
            // Generate the player properties mapped to their user id
            players[pid] = new player(pid);
            save(false);
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

        if(interaction.commandName == "swim"){
            var lon = parseFloat(interaction.options.getString("longitudinal"));
            var lat = parseFloat(interaction.options.getString("lateral"));

            if(lat+" " == "NaN " || lon+" " == "NaN "){
                interaction.reply("use a number in miles, decimals are allowed, but numbers only")
                return;
            }

            plon = lon/100; //longitude in degrees
            plat = lat/100; //latitude in degrees
            var distance = dist(players[pid].longitude,players[pid].latitude,players[pid].longitude+plon,players[pid].latitude+plat)
            var timeTaken = (distance*100)*(1/players[pid].swimmingSpeed)
            players[pid].longitude += plon
            players[pid].latitude -= plat
            var temp = adjustForCurve(players[pid].latitude,players[pid].longitude)
            players[pid].latitude = temp[0]
            players[pid].longitude = temp[1]
            passTime(pid,timeTaken)
            if(deadCheck(players[pid].body)[1]){
                interaction.reply("you died while swimming")
                return;
            }
            const distanceMiles = (distance*100).toFixed(2)
            interaction.reply(
            `You travelled ${distanceMiles} miles (${mileToKm(distanceMiles)}km) and it took ${formatLengthOfTime(timeTaken)}!`
            )
            save(false)
            return;
        }

        if(interaction.commandName == "checkmap"){
            var coords = polarToPlanar(players[pid].latitude,players[pid].longitude)
            interaction.reply("```\n"+drawMap(coords[0],coords[1],10)+"\n```")
        }

        if(interaction.commandName == "checkmapcolor"){
            var coords = polarToPlanar(players[pid].latitude,players[pid].longitude)
            let mapText = drawMap(coords[0],coords[1],10,true)
            let mapTextClean = drawMap(coords[0],coords[1],10,false)
            let msg = await interaction.reply("```ansi\n"+colorifyMap(mapText)+"\n```");
              //map scanner, may become its own command one day in the distant future, leave here for reference
            let repeats = 0;
            setTimeout(()=>{
                msg.edit("```ansi\n"+colorifyMap(mapTextClean)+"\n```")
            }, 1000);
            setTimeout(()=>{
                msg.edit("```ansi\n"+colorifyMap(mapText)+"\n```")
            }, 2000);
            setTimeout(()=>{
                msg.edit("```ansi\n"+colorifyMap(mapTextClean)+"\n```")
            }, 3000);
            setTimeout(()=>{
                msg.edit("```ansi\n"+colorifyMap(mapText)+"\n```")
            }, 4000);
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
                    save(false);
                    return
                }else{
                    passTime(pid,parseFloat(interaction.options.getString("hours")))
                    interaction.reply("you have slept "+interaction.options.getString("hours")+" hours");
                    save(false)
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
            let playerX, playerY
            const playerLatitude = players[pid].latitude;
            const playerLongitude = players[pid].longitude;
            [playerX, playerY] = polarToPlanar(playerLatitude, playerLongitude);
            playerX = Math.floor(playerX);
            playerY = Math.floor(playerY);

            console.log(playerX, playerY)

             const replyString = `Map Cords : (${playerX}, ${playerY}) . ${getPlayerLocation(pid)}`
            interaction.reply(replyString)
            // interaction.reply(""+getPlayerLocation(pid)+"")
        }
        

    }
})

client.login(TOKEN);