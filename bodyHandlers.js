// Functions that handle the Body object

const nutritionData = require("./nutritionData");

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

    return "[2;34m"+string+"[0m" //blue
}

/**
 * Go through the entire body and update the state of any modifiers it has.
 *
 * @param body body that is to be modified
 * @param part part of the body that is to be modified. Default value is the spine
 * */
function updateBodyModifiers(body,part){
    if(part == null){ part = "spine"; } // Base case, when the function is being called non-recursively.

    let tempInfections = [];
    let isInfected = false;
    //console.log(part)
    for(var i in body[part].modifiers){
        if(body[part].modifiers[i].spreads){
            isInfected = true;
            tempInfections.push(body[part].modifiers[i])
        }
    }
    for(let p in body[part]){
        if(p !== "hp" && p !== "modifiers" && p !== "required"){
            // Check through modifiers apply spread is applicable
            for(let i in body[part][p].modifiers){
                if(body[part][p].modifiers[i].spreads && !hasModifier(body[part],body[part][p].modifiers[i].name)){
                    if(Math.random() < body[part][p].modifiers[i].spreadRate){
                        body = applyModifier(body,part,body[part][p].modifiers[i])
                    }
                }
            }
            // Check through modifiers and apply growing damage if applicable
            for(let i in body[part][p].modifiers){
                if(body[part][p].modifiers[i].growth > 0){
                    body[part][p].modifiers[i].damage += body[part][p].modifiers[i].growth;
                }
            }
            // Go through modifiers and apply soft growing damage
            for(let i in body[part][p].modifiers){
                if(body[part][p].modifiers[i].softGrowth > 0){
                    body[part][p].modifiers[i].softDamage += body[part][p].modifiers[i].softGrowth;
                }
            }
            // Check for damage
            if(isInfected){
                for(let i in tempInfections){
                    if(Math.random() < tempInfections[i].spreadRate  && !hasModifier(body[part][p],tempInfections[i].name)){
                        body = applyModifier(body,p,tempInfections[i])
                    }
                }
            }
            // Recursive case
            body[part] = updateBodyModifiers(body[part],p);
        }
    }
    return body;
}

/**
 * Update the body's health state (modifiers) per game tick
 * */
function healthTick(p){
    p.body = updateBodyModifiers(p.body);

    return p; // Body with update state
}

/**
 * Go through the player's body parts and check if any required organs are zero HP or not
 * */
function deadCheck(body,part){
    let dead = false
    // Check for pairs of organs
    if(part == null){
        part = "spine"
        const isLeftLungZeroHP = getBodyPartHp(body["spine"]["chest"]["leftLung"])[0] === 0;
        const isRightLungZeroHP = getBodyPartHp(body["spine"]["chest"]["rightLung"])[0] === 0;
        const isLeftKidneyZeroHP = getBodyPartHp(body["spine"]["lowerTorso"]["leftKidney"])[0] === 0;
        const isRightKidneyZeroHP = getBodyPartHp(body["spine"]["lowerTorso"]["rightKidney"])[0] === 0;
        if (isLeftLungZeroHP && isRightLungZeroHP) { return [body[part],true]; }
        if (isLeftKidneyZeroHP && isRightKidneyZeroHP) { return [body[part],true] }
    }

    if(getBodyPartHp(body)[0] === 0 && body.required){
        dead = true;
        return [body[part],dead]
    }
    for(let subBodyPart in body){
        if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
            //
            let check = deadCheck(body[subBodyPart],subBodyPart);
            if(check[1]){
                dead = true;
                return [body[part],dead]
            }
        }
    }
    return [body[part],dead]
}

function getAllModifiersString(body,part){
    let output = ""
    if(part == null){ part = "spine"; }
    // print the initial body part
    if(body[part].modifiers.length > 0){ output += part+": "; }

    for(let i = 0; i < body[part].modifiers.length; i++){
        output += body[part].modifiers[i].name;
        if (i < body[part].modifiers.length-1) { output += ", "; }
    }
    if (body[part].modifiers.length > 0) { output += "\n"; }

    for(var p in body[part]){
        if(p !== "hp" && p !== "modifiers" && p !== "required"){
            output += getAllModifiersString(body[part],p);
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

function bodyToString(body,partName,layer,layerString){
    var finalString = "" // Result

    // Establish default values
    if (layerString == null) { layerString = ""; }
    if (layer == null){
        layer = 0;
    }else{
        layer++;
    }
    // We start from the base, which is the spine
    if(partName == null){ partName = "spine"; }

    // Highlight if the part is required for survival!
    let highlight = "";
    if (body[partName].required !== undefined && body[partName].required === true){ highlight = " *";}
    let mods = ""
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

    if(targetPart === "this"){
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

/**
 * check if the body part has a modifier of a specified modifier name
 * @param bodyPart body part
 * @param modName modifier name to check against
 * */
function hasModifier(bodyPart,modName){
    for(let i = 0; i < bodyPart.modifiers.length; i++){
        if(bodyPart.modifiers[i].name === modName){ return true; }
    }
    return false;
}

/**
 * Internal helper function to applyComplexDamage
 *
 * */
function complexDamage(damageType,mod,bodyPart,effectProbability){
    if (effectProbability == null) { effectProbability = 0.5; } //Assume 50/50

    applyModifier(bodyPart,"this",mod)
    if(damageType === "penetration"){
        for(let subBodyPart in bodyPart){
            // Check through every sub-body-part that body part has (exclude keys that aren't damageType
            if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
                if(Math.random() < effectProbability){
                    // Recursive case, perform your BFS until you find the body aprt
                    bodyPart[subBodyPart] = complexDamage(damageType,mod,bodyPart[subBodyPart],effectProbability)
                }
            }
        }
    }
    return bodyPart
}

function applyComplexDamage(damageType,mod,bodyPart,effectProbability,targetPart){
    for(let subBodyPart in bodyPart){
        // Check through every sub-body-part that body part has (exclude keys that aren'damageType sub-body-parts ofc)
        if(subBodyPart !== "hp" && subBodyPart !== "modifiers" && subBodyPart !== "required"){
            if(subBodyPart === targetPart){
                // Body part found, apply the modifier!
                bodyPart[subBodyPart] = complexDamage(damageType,mod,bodyPart[subBodyPart],effectProbability)
                return bodyPart
            }else{
                // Recursive case, perform your BFS until you find the body aprt
                bodyPart[subBodyPart] = applyComplexDamage(damageType,mod,bodyPart[subBodyPart],effectProbability,targetPart)
            }
        }
    }
    return bodyPart;
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

module.exports = {
    updateBodyModifiers,
    healthTick,
    deadCheck,
    getAllModifiersString,
    getBodyPartHp,
    hpToString,
    getSubBodyPartCount,
    bodyToString,
    applyModifier,
    hasModifier,
    applyComplexDamage,
    handlePlayerStarvation,
    nutritionTick,
    nutritionString
}

