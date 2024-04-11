function oob(x,y){
    if(x > 0 && x < 3600 && y > 0 && y < 1800){
        return false;
    }
    return true;
}

function generateMap(interaction){
    var width = 3600
    var height = 1800
    var smoothness = 20
    var seaLevel = 105
    var m = []
    if(interaction != null)
        interaction.followUp("map generating")
    else
        console.log("map generating")
    for(var x = 0; x < width; x++){
        m[x] = []
        for(var y = 0; y < height; y++){
            m[x][y] = {
                elevation:110-(Math.random()*20),
                tileChar:"~",
                land:false,
                r:false,
                k:false
            }
        }
    }
    if(interaction != null)
        interaction.followUp("adding islands")
    else
        console.log("adding islands")

    for(var x = 0; x < width; x++){
        for(var y = 0; y < height; y++){
            if(Math.random() > 0.999){
                var size = Math.floor(Math.random()*10)
                for(var i = -1*size; i < size; i++){
                    for(var j = -1*size; j < size; j++){
                        if(!oob(x+i,y+j)){
                            m[x+i][y+j].elevation += (Math.random()*10)
                        }
                    }
                }
            }
        }
    }

    if(interaction != null)
        interaction.followUp("smoothing ocean ("+smoothness+" passes)")
    else
        console.log("smoothing ocean ("+smoothness+" passes)")

    for(var k = 0; k < smoothness; k++){
        tm = m.slice()
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
                tm[x][y].elevation = avg/tiles
            }
        }
        m = tm.slice()
    }
    if(interaction != null)
        interaction.followUp("generating island terrain")
    else
        console.log("generating island terrain")

    for(var x = 0; x < width; x++){
        for(var y = 0; y < height; y++){
            if(m[x][y].elevation > seaLevel){
                m[x][y].elevation += (Math.random()*4)-2
            }
        }
    }

    var islandSmoothness = 3

    if(interaction != null)
        interaction.followUp("smoothing islands ("+islandSmoothness+" passes)")
    else
        console.log("smoothing islands ("+islandSmoothness+" passes)")


    for(var k = 0; k < islandSmoothness; k++){
        tm = m.slice()
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                if(m[x][y].elevation > seaLevel){
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
                    tm[x][y].elevation = avg/tiles
                }
            }
        }
        m = tm.slice()
    }


    if(interaction != null)
        interaction.followUp("generating reefs")
    else
        console.log("generating reefs")
    for(var k = 0; k < smoothness; k++){
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                if(m[x][y].elevation < seaLevel-1 && m[x][y].elevation > seaLevel-2){
                    if(Math.random() > 0.999){
                        m[x][y].r = true;
                    }
                }
            }
        }
    }

    var reefChecks = 3

    for(var k = 0; k < reefChecks; k++){
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                if( m[x][y].reef && Math.random() > 0.25){
                    for(var i = -1; i < 2; i++){
                        for(var j = -1; j < 2; j++){
                            if(!oob(x+i,y+j)){
                                if(m[x+i][y+j].elevation < seaLevel-1 && m[x+i][y+j].elevation > seaLevel-2){
                                    m[x+i][y+j].r = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if(interaction != null)
        interaction.followUp("generating kelp")
    else
        console.log("generating kelp")
    for(var k = 0; k < smoothness; k++){
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                if(m[x][y].elevation < seaLevel-1 && m[x][y].elevation > seaLevel-2){
                    if(Math.random() > 0.999){
                        m[x][y].k = true;
                    }
                }
            }
        }
    }

    var kelpChecks = 3

    for(var k = 0; k < kelpChecks; k++){
        for(var x = 0; x < width; x++){
            for(var y = 0; y < height; y++){
                if( m[x][y].k && Math.random() > 0.25){
                    for(var i = -1; i < 2; i++){
                        for(var j = -1; j < 2; j++){
                            if(!oob(x+i,y+j)){
                                if(m[x+i][y+j].elevation < seaLevel-2 && m[x+i][y+j].elevation > seaLevel-4){
                                    m[x+i][y+j].k = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    var totalTiles = 0;
    var land = 0;
    if(interaction != null)
        interaction.followUp("generating textures")
    else
        console.log("generating textures")
    for(var x = 0; x < width; x++){
        for(var y = 0; y < height; y++){
            totalTiles++;
            land++;
            if(m[x][y].elevation <= seaLevel){
                land--;
                if(m[x][y].r){
                    m[x][y].tileChar = "-"
                }else if(m[x][y].k){
                    m[x][y].tileChar = "§"
                }else{
                    if(m[x][y].elevation >= seaLevel-2){
                        m[x][y].tileChar = "."
                    }else if(m[x][y].elevation >= seaLevel-4){
                        m[x][y].tileChar = "~"
                    }else if(m[x][y].elevation >= seaLevel-6){
                        m[x][y].tileChar = "≡"
                    }else{
                        m[x][y].tileChar = "■"
                    }
                }
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
    console.log("land percentage: "+((land/totalTiles)*100))
    if(interaction != null)
        interaction.followUp("map complete")
    else
        console.log("map complete")
    return m;
}

module.exports = generateMap