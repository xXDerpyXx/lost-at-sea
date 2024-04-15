var TOKEN = require("./token.js");
const baseBody = require("./spine")
const commands = require("./commandBuilder")
const generateMap = require("./mapGeneration")
const windCalc = require("./windSpeedCalculator.js")
const nutritionData = require("./nutritionData")
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
        this.softGrowth = 0; // same thing for soft damage
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

var foods = []
foods.push(items.tuna);
foods.push(items.coconut);
foods.push(items.grouper);

class player{
    constructor(id){
        // Player's discord id
        this.id = id;
        // When the player first starts the game, set their latitude randomly near the equator
        this.latitude = (Math.random()*20)-10
        this.longitude = (Math.random()*360)-180

        // Internal properties
        //this.hunger = 100;
        //this.thirst = 100;
        var tempPlayer = {}
        tempPlayer.nutrition = nutritionData.defaultStartingNutrientAmounts;
        for(var k in tempPlayer.nutrition){
            tempPlayer.nutrition[k] = 0;
        }
        for(var i = 0; i < 12; i ++){
            tempPlayer = eat(tempPlayer,randomFromArray(foods))
        }
        console.log(tempPlayer.nutrition)
        this.nutrition = tempPlayer.nutrition

        this.inv = [];

        this.sleep = 100;

        this.time = 12; //current time of day
        this.daysAtSea = 0; // Player's time spent in the game
        this.constantTime = 0; // hours of time in game TOTAL (used for timekeeping)

        this.weather = {
            temperature:294,
            humidity:1,
        }

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

function addMapKey(mapText){
    var key = [
        ["■","oceanic trench"],
        ["≡","ocean"],
        ["~","shallow water"],
        [".","shoal"],
        ["§","kelp"],
        ["-","reef"],
        ["░","beach"],
        ["▒","grassland"],
        ["▓","jungle"],
        ["█","mountain"]
    ]
    var lines = mapText.split("\n")
    var output = ""
    for(var i = 0; i < lines.length;i++){
        output += lines[i]
        if(i == 0){
            output += "  ¤:you"
        }
        if(i >= 2){
            for(j = 0; j < key.length; j++){
                if(mapText.includes(key[j][0])){
                    var k = key.splice(j,1)[0]
                    output += "  "+k[0]+":"+k[1]
                    break;
                }
            }
        }
        output += "\n"
    }
    
    return output
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
    output = addMapKey(output);
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
            start: "[2;36m",
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
        "§":{
            start: "[2;36m[2;32m",
            end: "[0m[2;36m[0m"
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

function biome(lat,lon){
    var key = [
        ["■","oceanic trench"],
        ["≡","ocean"],
        ["~","shallow water"],
        [".","shoal"],
        ["§","kelp"],
        ["-","reef"],
        ["░","beach"],
        ["▒","grassland"],
        ["▓","jungle"],
        ["█","mountain"]
    ]
    var coords = polarToPlanar(lat,lon)
    var tile = map[coords[0]][coords[1]].tileChar
    for(var i = 0; i < key.length;i++){
        if(key[i][0] == tile){
            return key[i][1]
        }
    }
    return "hell"
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


function healthBodycheck(b,part){
    if(part == null){
        part = "spine"
    }
    let tempInfections = [];
    let isInfected = false;
    //console.log(part)
    for(var i in b[part].modifiers){
        if(b[part].modifiers[i].spreads){
            isInfected = true;
            tempInfections.push(b[part].modifiers[i])
        }
    }
    for(let p in b[part]){
        if(p != "hp" && p != "modifiers" && p != "required"){
            for(var i in b[part][p].modifiers){
                if(b[part][p].modifiers[i].spreads && !hasModifier(b[part],b[part][p].modifiers[i].name)){
                    if(Math.random() < b[part][p].modifiers[i].spreadRate){
                        b = applyModifier(b,part,b[part][p].modifiers[i])
                    }
                }
            }
            for(let i in b[part][p].modifiers){
                if(b[part][p].modifiers[i].growth > 0){
                    b[part][p].modifiers[i].damage += b[part][p].modifiers[i].growth;
                }
            }

            for(let i in b[part][p].modifiers){
                if(b[part][p].modifiers[i].softGrowth > 0){
                    b[part][p].modifiers[i].softDamage += b[part][p].modifiers[i].softGrowth;
                }
            }
            if(isInfected){
                for(let i in tempInfections){
                    if(Math.random() < tempInfections[i].spreadRate  && !hasModifier(b[part][p],tempInfections[i].name)){
                        b = applyModifier(b,p,tempInfections[i])
                    }
                }
            }
            b[part] = healthBodycheck(b[part],p)
        }
    }
    return b
}

function healthTick(p){
    p.body = healthBodycheck(p.body)

    return p
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

function getAllModifiersString(b,part){
    var output = ""
    if(part == null){
        part = "spine"
    }
    if(b[part].modifiers.length > 0){
        output += part+": "
    }
    
    for(var i = 0; i < b[part].modifiers.length; i++){
        output += b[part].modifiers[i].name
        if(i < b[part].modifiers.length-1)
            output += ", "
    }
    if(b[part].modifiers.length > 0){
        output += "\n"
    }
    

    for(var p in b[part]){
        if(p != "hp" && p != "modifiers" && p != "required"){
            output += getAllModifiersString(b[part],p);
        }
    }
    return output
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

/**
 * Split a code block to 2000 character chunks
 * */
function splitCodeBlocks(s){
    // Our result string
    let stringChunks = []
    let sByLine = s.split("\n") // is now an array of strings, split by \n

    let postString = "";
    for (let i = 0 ; i < sByLine.length ; i++){
        // console.log(`poststring length: ${postString.length}`)
        if (postString.length < 1900 && postString.length + sByLine[i].length >= 1900){
            stringChunks.push("```ansi\n"+postString+"```")
            postString = (sByLine[i] + "\n"); //reset the string
        } else {
            postString += (sByLine[i] + "\n");
        }
    }

    // push the final stringchunks
    stringChunks.push("```ansi\n"+postString+"```")

    console.log(stringChunks.length)
    return stringChunks
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
        finalString+=" disabled!"
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

function hasModifier(bodyPart,modName){
    for(var i = 0; i < bodyPart.modifiers.length; i++){
        if(bodyPart.modifiers[i].name == modName){
            return true;
        }
    }
    return false;
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
    var tempHours = hours
    while(tempHours > 0){
        players[id] = nutritionTick(players[id])
        players[id] = healthTick(players[id])
        tempHours -= 1/12
    }
    // Account for hours
    while(players[id].time > 24){
        players[id].time -= 24;
        players[id].daysAtSea+=1
    }
}

//Handle starvation if the player's calorie reserves are less than 0
function handlePlayerStarvation(player){
    let alreadyStarving = false;
    for(let i = 0; i < player.body.spine.chest.stomach.modifiers.length; i++){
        if(player.body.spine.chest.stomach.modifiers[i].name === "starving"){
            alreadyStarving = true
            break;
        }
    }
    if(!alreadyStarving){
        // Define your starving variable
        let tempMod = new modifier("starving")
        tempMod.damage = 0
        tempMod.growth = 0.00082671

        // Apply starving to the stomach
        player.body.spine.chest.stomach = applyModifier(player.body.spine.chest.stomach,"this",tempMod)
    }

    return player;
}

function nutritionTick(player){
    let nutritionUsage = nutritionData.dailyValue

    const accuracy = 1000000;
    // Go though every nutrition value and then reduce the amount of that vitamin/mineral per game tick.
    for(let k in nutritionUsage){
        player.nutrition[k] -= Math.floor(((nutritionUsage[k]/24)/12)*accuracy)/accuracy
    }

    // Check if you have ran out of calories
    if(player.nutrition.calories <= 0 ){ handlePlayerStarvation(player) }

    return player;
}

function padd(string,length,filler,align){
    if(align === undefined){
        align = "left"
    }
    if(filler === undefined){
        filler = " "
    }
    if(align == "left")
        while(string.length < length)
            string += filler
    else if(align == "right")
        while(string.length < length)
            string = filler+string
    else if(align == "centered")
        while(string.length < length){
            if(string.length%2==0){
                string = filler+string
            }else{
                string += filler
            }
        }
    
    return string
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function eat(p,food){
    for(var k in food.nutrition){
        p.nutrition[k] += food.nutrition[k]
    }
    return p
}

function nutritionString(p){
    let nutritionUnits = nutritionData.units
    let dailyValue = nutritionData.dailyValue
    let overdoseLevels = nutritionData.overdoseLevels
    let intoxicationLevels = nutritionData.intoxicationLevels
    let commonNames = nutritionData.commonNames

    let output = ""
    output += padd("Nutrient",14)+padd("Reserve",11)+"Percentage of Daily Usage\n"
    for(let k in p.nutrition){
        let dailyValuePercent = Math.floor((p.nutrition[k]/dailyValue[k])*100)
        var nVal = Math.round(p.nutrition[k])
        //console.log(nVal.toString().length)
        if((nVal.toString().length >= 6)){
            nVal = nVal.toString().substring(0,5)+"+"
        }
        output += padd(commonNames[k],11)+" : "
            +colorBasedOnPercent(padd(nVal+" ",6," ","right"),dailyValuePercent,k,p)
            +padd(nutritionUnits[k]+" ",5)
            +padd(dailyValuePercent+"%",6)
        if(dailyValuePercent <= 0){
            if(k == "water")
                output += "dehydrated!"
            else if(k == "calories")
                output += "starving!"
            else
                output += "malnourished!"
        }
        var od = false
        if(overdoseLevels[k] != null){
            if(overdoseLevels[k] <= p.nutrition[k]){
                output += "overdosing!"
                od = true;
            }
        }
        if(intoxicationLevels[k] != null && !od){
            if(intoxicationLevels[k] <= p.nutrition[k])
                output += "intoxicated!"
        }
        output += "\n";
    }
    return output;
}

function colorBasedOnPercent(string,percent,nutrient,p){
    if(percent < 10){
        return "[2;31m"+string+"[0m" //red
    }
    if(percent < 50){
        return "[2;33m"+string+"[0m" //yellow
    }
    if(percent < 100){
        return "[2;32m"+string+"[0m" //green
    }
    if(percent < 200){
        return "[2;36m"+string+"[0m" //teal
    }

    if(nutritionData.overdoseLevels[nutrient] != null){
        if(nutritionData.overdoseLevels[nutrient] <= p.nutrition[nutrient]){
            return "[2;31m"+string+"[0m" //red
        }
    }
    if(nutritionData.intoxicationLevels[nutrient] != null){
        if(nutritionData.intoxicationLevels[nutrient] <= p.nutrition[nutrient])
            return "[2;35m"+string+"[0m" // pink
    }
    /*
    if(nutrient == "copper" && percent >= 7700){
         // pink
    }
    if(nutrient == "zinc" && percent >= 400){
        return "[2;35m"+string+"[0m" // pink
    }
    if(nutrient == "calcium" && percent >= 466){
        return "[2;35m"+string+"[0m" // pink
    }*/

    return "[2;34m"+string+"[0m" //blue
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

function movePlayer(p,lat,lon){
    p.latitude += lat;
    p.longitude += lon;
    [lat,lon] = adjustForCurve(lat,lon)
    p.latitude = lat;
    p.longitude = lon;
    return p;
}

function autoDrift(p,t){
    var lat = p.latitude
    var lon = p.longitude
    //console.log(lat+","+lon)
    var coords = windCalc.calculateWindDrift(t,lat,lon)
    return movePlayer(p,coords[0],coords[1])
}

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
                if(interaction.options.getNumber("softgrowth"))
                    mod.softGrowth = interaction.options.getNumber("softgrowth")
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
            await interaction.reply(randomFromArray(lostMessages))
            interaction.followUp("you are lost, I am not kidding, you're going to see nothing but ocean on the map for hundreds of miles, land makes up less than 1% of the world")
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
            var intervals = timeTaken*12
            var oLon = players[pid].longitude
            var oLat = players[pid].latitude
            for(var i = 0; i < intervals; i++){
                players[pid].longitude += plon/intervals
                players[pid].latitude -= plat/intervals
                var temp = adjustForCurve(players[pid].latitude,players[pid].longitude)
                players[pid].latitude = temp[0]
                players[pid].longitude = temp[1]
                players[pid].nutrition.calories -= 528 * (1/12)
                passTime(pid,1/12)
                players[pid] = autoDrift(players[pid],1/12)
                if(deadCheck(players[pid].body)[1]){
                    interaction.reply("you died while swimming")
                    return;
                }
            }
            
            
            
            
            
            const distanceMiles = (dist(players[pid].longitude,players[pid].latitude,oLon,oLat)*100).toFixed(2)
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


        if(interaction.commandName == "whereami"){
            interaction.reply("you look around and seem to be in "+biome(players[pid].latitude,players[pid].longitude))
            return;
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
                    players[pid] = autoDrift(players[pid],parseFloat(interaction.options.getString("hours")))
                    save(false)
                }
                
            }
            
            return;
        }

        if(interaction.commandName == "checkbody"){
            //await interaction.reply("```\n"+bodyToString(players[pid].body)+"\n```");
            var replyParts = splitCodeBlocks( bodyToString(players[pid].body)+"\n\n* means the part is required, if hp reaches 0%, you instantly die\n\nNourishment\n"+padd("",49,"─")+"\n"+nutritionString(players[pid]) )
            await interaction.reply(replyParts[0]);
            for(var i = 1; i < replyParts.length; i++){
                await interaction.followUp(replyParts[i])
            }
            return;
        }

        if(interaction.commandName == "checkhealth"){
            //await interaction.reply("```\n"+bodyToString(players[pid].body)+"\n```");
            var replyParts = splitCodeBlocks( getAllModifiersString(players[pid].body)+"\n\nNourishment\n"+padd("",49,"─")+"\n"+nutritionString(players[pid]) )
            await interaction.reply(replyParts[0]);
            for(var i = 1; i < replyParts.length; i++){
                await interaction.followUp(replyParts[i])
            }
            return;
        }

        if (interaction.commandName === "use"){
            interaction.reply("This is just a test for now")
        }
        if (interaction.commandName === "checklocation"){
            if (gods.includes(pid)){
                let playerX, playerY
                const playerLatitude = players[pid].latitude;
                const playerLongitude = players[pid].longitude;
                [playerX, playerY] = polarToPlanar(playerLatitude, playerLongitude);
                playerX = Math.floor(playerX);
                playerY = Math.floor(playerY);

                console.log(playerX, playerY)
                const replyString = `Map Cords : (${playerX}, ${playerY}) . ${getPlayerLocation(pid)}`
                interaction.reply(replyString)
            } else {
                interaction.reply(""+getPlayerLocation(pid)+"")
            }
        }
    }
})

client.login(TOKEN);