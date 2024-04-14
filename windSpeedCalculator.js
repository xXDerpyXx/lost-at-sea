
/**
 * Generalized version of the function y = e^(-x^2)
 * -> a*(e^(-(b(x+c))^2))
 * @param a scalar factor
 * @param b x spread
 * @param c x shift
 * @param x input x
 */
function generalEx2(a,b,c,x){
    return (a * Math.exp( - Math.pow(b * (x + c) , 2) ) )
}

function getMagnitude(vector2D){
    return Math.sqrt( (vector2D[0] ** 2) + (vector2D[1] ** 2));
}

function getNormalizedVector(vector2D){
    const magnitude = getMagnitude(vector2D);
    return vector2D.map(
        a => (a * (1/magnitude))
    );
}

function multiplyVector(vector2D, k){
    return vector2D.map(
        a => a*k
    )
}

/**
 * Generate a*sin(c) + b*cos(d), but a,b,c,d are randomly generated variables
 *
 */
function generateSinCosNoise(){
    const noiseA = (Math.random() / 2) // [0,0.5] domain
    const noiseB = (Math.random() / 2) // [0,0.5] domain
    const noiseC = (Math.random() * Math.PI)
    const noiseD = (Math.random() * Math.PI)

    const sinNoise = noiseA * Math.sin(noiseC)
    const cosNoise = noiseB * Math.sin(noiseD)

    return sinNoise + cosNoise
}
// theta = arctan(y / x) (theta is in radians btw)
function getVectorAngle(vector2D){
    return (Math.atan(vector2D[1] / vector2D[0]))
}

/**
 * Compute the longitudinal wind speed, on the player's latitude
 * positive latitude is north
 * positive longitude is east
 *
 */
function getLongitudnialWindSpeed(latitude){
    //Compute some random noise variables

    const northEastTradeWind = generalEx2(-4, 1/10, -15, latitude)
    const southEastTradeWind = generalEx2(-4, 1/10, +15, latitude)
    const westerliesNorth =  generalEx2(4, 1/15, -60, latitude)
    const westerliesSouth =  generalEx2(4, 1/15, +60, latitude)
    // Polar winds
    const easterliesNorth = generalEx2(-2, 1/15, -90, latitude)
    const easterliesSouth = generalEx2(-2, 1/15, +90, latitude)

    return (northEastTradeWind + southEastTradeWind + westerliesNorth + westerliesSouth +
        easterliesNorth + easterliesSouth + generateSinCosNoise())
}

/**
 * Computer the longitudinal wind speed, on the player's latitude
 * positive latitude is north
 * positive longitude is east
 *
 */
function getLatitudinalWindSpeed(latitude){
    const northEastTradeWind = generalEx2(-2, 1/10, -15, latitude)
    const southEastTradeWind = generalEx2(+2, 1/10, +15, latitude)
    const westerliesNorth =  generalEx2(4, 1/15, -60, latitude)
    const westerliesSouth =  generalEx2(-4, 1/15, +60, latitude)
    // Polar winds
    const easterliesNorth = generalEx2(-3, 1/12, -90, latitude)
    const easterliesSouth = generalEx2(3, 1/12, +90, latitude)

    return (northEastTradeWind + southEastTradeWind + westerliesNorth + westerliesSouth
        + easterliesNorth + easterliesSouth + generateSinCosNoise())
}

/**
 * Compute the maximum windspeed of a given latiutude, before taking into account weather effects
 *
 * @param latitude
 */
function getMaxNormalWindSpeed(latitude){
    const noiseA = (Math.random() * 2) // [0,0.5] domain
    const noiseB = (Math.random() * 2) // [0,0.5] domain
    const noiseC = (Math.random() * Math.PI)
    const noiseD = (Math.random() * Math.PI)

    const northernHemisphere = generalEx2(26, 1/35, -55, latitude)
    const southernHemisphere = generalEx2(-26, 1/35, +55, latitude)

    const sinNoise = noiseA * Math.sin(latitude + noiseC)
    const cosNoise = noiseB * Math.sin(latitude + noiseD)

    return (northernHemisphere + southernHemisphere + sinNoise + cosNoise)
}


/**
 * vector is in the form [latitude. longitude]
 * */
function getWindVector(latitude){
    const latSpeed = getLatitudinalWindSpeed(latitude);
    const lonSpeed = getLongitudnialWindSpeed(latitude)
    let windspeedVector = [latSpeed, lonSpeed]
    const maxWindSpeed = getMaxNormalWindSpeed(windspeedVector)

    // If above the maximum wind speed, then normalize it
    if (getMagnitude(windspeedVector) > maxWindSpeed){
        windspeedVector = multiplyVector(getNormalizedVector(windspeedVector), maxWindSpeed)
        console.log("Had to be normalized bruh")
    }

    return windspeedVector;
}


/**
 * Compute the player's new latitude and longitude drifting after a period of time
 * @param time (in hours)
 * @param latitude player's latitude
 * @param longitude player's longitude
 * */
function calculateWindDrift(time, latitude, longitude){
    const tick = 1 / 12; // Tick every 5 minutes
    // Calculation timeleft
    let timeLeft = time;

    //Our Result latitudes and longitudes
    let newLatitude = latitude;
    let newLongitude = longitude;

    while (timeLeft > 0){
        let dt = tick; // dt is the difference of time
        if (timeLeft < tick){ dt = timeLeft } //acount for remainder time

        let windSpeedVector = getWindVector(latitude);
        // windspeed is in mph, so multiply it with the dt and divide it by
        // 69 (miles) which is one degree of longitude or latitude
        newLatitude += (windSpeedVector[0] * dt) / 69;
        newLongitude += (windSpeedVector[1] * dt) / 69;
        //console.log(`drifted to [${newLatitude},${newLongitude}]`)

        timeLeft -= dt
    }

    return [newLatitude, newLongitude]
}


calculateWindDrift(33, 89,2)

module.exports = {getMagnitude, getVectorAngle, multiplyVector, getWindVector, calculateWindDrift}
