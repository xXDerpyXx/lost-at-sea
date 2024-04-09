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
                    name:"bodypart",
                    description: 'What part of the body to shatter.',
                    required: true
                },
                {
                    name:"target",
                    description: 'Who to shatter',
                    required: true
                }
            ]
        },
        {
            name: "swim",
            description: "Swim across the map.",
            options: [
                {
                    name:"lateral",
                    description: 'lattitude to travel (in miles, positive for north, negative for south)',
                    required: true
                },
                {
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
                    name:"latitude",
                    description: 'lattitude to travel (Negative values for south of the equator)',
                    required: true
                },
                {
                    name:"longitude",
                    description: 'longitude to travel (Negative Values for West of the prime meridian)',
                    required: true
                }
            ]
        }
    ]

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
                c.addStringOption(
                    option =>
                        option
                            .setName(op.name)
                            .setDescription(op.description)
                            .setRequired(op.required)
                )
            }
        }
        // Add that completed command to the list of commands :troll:
        commands.push(c)
    }



    return commands
}


let commands = buildCommands(commandData);

console.log(commands);

module.exports = commands