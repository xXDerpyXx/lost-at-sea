//Units of measurement each nutrient uses
let units = {
    "a":"μg", // Vitamin A
    "b12":"μg", // Vitamin B12
    "c":"mg", // Vitamin C
    "e":"mg", // Vitamin E
    "fe":"mg", // Iron
    "iodine":"μg",
    "sodium":"mg",
    "potassium":"mg",
    "calcium":"mg",
    "zinc":"mg",
    "copper":"μg",
    "water":"ml", // Thirst level essentially
    "calories":"kCal", // All activities consume calories
}

// How much the player starts off as a default (placeholder, will be replaced with random food values)
let defaultStartingNutrientAmounts = {
    "a":1800, //micrograms // Vitamin A
    "b12":4.8, //micrograms // Vitamin B12
    "c":160, //milligrams // Vitamin C
    "e":30, //milligrams // Vitamin E
    "fe":24, //milligrams // Iron
    "iodine":300, // micrograms
    "sodium":1000, // milligrams
    "potassium":6000, //milligrams
    "calcium":300, //milligrams
    "zinc":20, //milligrams
    "copper":1800, //micrograms
    "water":4000, //grams // Thirst level essentially
    "calories":4000, //kCal // All activities consume calories
}

// How much the player **should** consume in a day (if they're completely stationary)
let dailyValue = {
    "a":900, //micrograms // Vitamin A
    "b12":2.4, //micrograms // Vitamin B12
    "c":80, //milligrams // Vitamin C
    "e":15, //milligrams // Vitamin E
    "fe":12, //milligrams // Iron
    "iodine":150, // micrograms
    "sodium":500, // milligrams
    "potassium":3000, //milligrams
    "calcium":150, //milligrams
    "zinc":10, //milligrams
    "copper":900, //micrograms
    "water":2000, //grams // Thirst level essentially
    "calories":2000, //kCal // All activities consume calories
}

/** TODO: Research overdose levels for the remainder of the nutrients (does not apply to all nutrients)*/
let overdoseLevels = {
    "copper":70000,
    "iron":25,
    "zinc":40,
    "calcium":700
}

let intoxicationLevels = {
    "copper":70000, // fix this
    "iron":25, // fix this
    "zinc":40, // fix this
    "calcium":700, // fix this
    "b12":20, // currently an estimate
    "water":8000
}

// Map of key names to their names used in common vocabulary (as well as capitalization)
let commonNames = {
    "a":"Vitamin A",
    "b12":"Vitamin B12",
    "c":"Vitamin C",
    "e":"Vitamin E",
    "fe":"Iron",
    "iodine":"Iodine",
    "sodium":"Sodium",
    "potassium":"Potassium",
    "calcium":'Calcium',
    "zinc":"Zinc",
    "copper":"Copper",
    "water":"Water",
    "calories":"Calories",
}

module.exports = {units, defaultStartingNutrientAmounts,dailyValue, overdoseLevels, intoxicationLevels, commonNames}