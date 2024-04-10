const { REST, Routes,SlashCommandBuilder } = require('discord.js');

//Empty Set of commands


//Basically a Json of all the commands
const commandData=
    [
        {
            name: "getlost",
            description:'Gets you lost at sea.'
        },
        {
            name: "checktime",
            description:"Check the current time (from the user's perspective)."
        },
        {
            name: "checkbody",
            description:"Inspect the state of your body."
        },
        {
            name: "checkmap",
            description:"Inspect your local area."
        },
        {
            name: "checkmapcolor",
            description:"Inspect your local area, but in color."
        },
        {
            name: "checklocation",
            description:"Return the player's location (coordinates) on the map."
        },
        {
            name: "regenmap",
            description:"Regenerates the map."
        },
        {
            name: "sleep",
            description: 'you go to sleep',
            options: [
                {
                    type:"string",
                    name:"hours",
                    description: 'hours to sleep (can include decimals)',
                    required: true
                }
            ]
        },
        {
            name: "use",
            description: "Use an item, and provide any other items it may require.",
            options: [
                {
                    type:"string",
                    name:"item",
                    description: 'Item to show.',
                    required: true
                }
            ]
        },
        {
            name: "showitem",
            description: 'shows an item',
            options: [
                {
                    type:"string",
                    name:"item",
                    description: 'item to show',
                    required: true
                }
            ]
        },
        {
            name: "shatter",
            description: 'shatters bones',
            options: [
                {
                    type:"string",
                    name:"bodypart",
                    description: 'What part of the body to shatter.',
                    required: true
                },
                {
                    type:"string",
                    name:"target",
                    description: 'Who to shatter',
                    required: true
                }
            ]
        },

        {
            name: "shoot",
            description: 'shoots people',
            options: [
                {
                    type:"string",
                    name:"bodypart",
                    description: 'What part of the body to shoot.',
                    required: true
                },
                {
                    type:"string",
                    name:"target",
                    description: 'Who to shoot',
                    required: true
                }
            ]
        },
        {
            name: "swim",
            description: "Swim across the map.",
            options: [
                {
                    type:"string",
                    name:"lateral",
                    description: 'lattitude to travel (in miles, positive for north, negative for south)',
                    required: true
                },
                {
                    type:"string",
                    name:"longitudinal",
                    description: 'longitude to travel (in miles, positive for east, negative for west)',
                    required: true
                }
            ]
        },
        {
            name: "teleport",
            description: "Teleport Players to specific latitude and longitude",
            options: [
                {
                    type:"string",
                    name:"latitude",
                    description: 'lattitude to travel (Negative values for south of the equator)',
                    required: true
                },
                {
                    type:"string",
                    name:"longitude",
                    description: 'longitude to travel (Negative Values for West of the prime meridian)',
                    required: true
                }
            ]
        },
        {
            name: "applydamage",
            description: "applies custom damage modifiers to any target",
            options: [
                {
                    type:"string",
                    name:"bodypart",
                    description: 'part to modify',
                    required: true
                },
                {
                    type:"string",
                    name:"target",
                    description: 'who to modify on',
                    required: true
                },
                {
                    type:"string",
                    name:"name",
                    description: "Name of the injury/dissease",
                    required: false
                },
                {
                    type:"number",
                    name:"damage",
                    description: 'raw damage caused to the part it is applied to',
                    required: false
                },
                {
                    type:"number",
                    name:"growth",
                    description: "The rate of progression'",
                    required: false
                },
                {
                    type:"string",
                    name:"stage",
                    description: "Stage of the injury/dissease",
                    required: false
                },
                {
                    type:"boolean",
                    name:"spreads",
                    description: "If it spreads to other body parts",
                    required: false
                },
                {
                    type:"number",
                    name:"spreadrate",
                    description: 'rate it spreads across the body, if applicable',
                    required: false
                },
                {
                    type:"number",
                    name:"softdamage",
                    description: 'damage to the part in only usability, can\'t disable subparts',
                    required: false
                },
                {
                    type:"number",
                    name:"immunity",
                    description: "progression of disease immunity",
                    required: false
                },
                {
                    type:"boolean",
                    name:"unusable",
                    description: "'renders the part unusable regardless of damage",
                    required: false
                },
            ]
        }
    ]

function buildOption(op){
    return (
        option =>
            option
                .setName(op.name)
                .setDescription(op.description)
                .setRequired(op.required)
    )
}

/**
 * From the database of commands, automatically generate SlashCommandBuilder commands
 * @param commandData database of commands you want to construct. Contains all the necessary information.
 *  
 * @return A set of SlashCommandBuilderObjects 
 * */
function buildCommands(commandData){
    let commands = [];
    let c;

    for (let com of commandData){
        c = new SlashCommandBuilder()
            .setName(com.name)
            .setDescription(com.description)


        // Construct the string options if they exist
        if (com.options !== undefined){
            for (let op of com.options){

                // Check the type of the option and build accordingly
                switch (op.type){
                    case "string":
                        c.addStringOption( buildOption(op) );
                        break;
                    case  "number":
                        c.addNumberOption( buildOption(op) );
                        break;
                    case  "boolean":
                        c.addBooleanOption( buildOption(op) );
                        break;
                }
            }
        }
        // Add that completed command to the list of commands :troll:
        commands.push(c)
    }

    return commands
}

let commands = buildCommands(commandData);

module.exports = commands