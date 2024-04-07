const Discord = require("discord.js");
const duckling = new Discord.Client();
const token = require("./token.js");


var shuffle = function (array) {

	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;

};

var standardcardtypes = {
    "ace":{
        type:"ace",
        draw:0,
        suit:"random"
    },
    "2":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "3":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "4":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "5":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "6":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "7":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "8":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "9":{
        type:"number",
        draw:0,
        suit:"random"
    },
    "10":{
        type:"number",
        draw:2,
        suit:"random"
    },
    "jack":{
        type:"color",
        draw:0,
        suit:"random"
    },
    "queen":{
        type:"color",
        draw:4,
        suit:"random"
    },
    "king":{
        type:"reverse",
        draw:0,
        suit:"random"
    }

}

var unocardtypes = {
    "0":{
        type:"number",
        draw:0,
        color:"random"
    },
    "1":{
        type:"number",
        draw:0,
        color:"random"
    },
    "2":{
        type:"number",
        draw:0,
        color:"random"
    },
    "3":{
        type:"number",
        draw:0,
        color:"random"
    },
    "4":{
        type:"number",
        draw:0,
        color:"random"
    },
    "5":{
        type:"number",
        draw:0,
        color:"random"
    },
    "6":{
        type:"number",
        draw:0,
        color:"random"
    },
    "7":{
        type:"number",
        draw:0,
        color:"random"
    },
    "8":{
        type:"number",
        draw:0,
        color:"random"
    },
    "9":{
        type:"number",
        draw:0,
        color:"random"
    },
    "draw-two":{
        type:"number",
        draw:2,
        color:"random"
    },
    "color-pick":{
        type:"color",
        draw:0,
        color:"wild"
    },
    "draw-four":{
        type:"color",
        draw:4,
        color:"wild"
    },
    "reverse":{
        type:"reverse",
        draw:0,
        color:"random"
    },
    "skip":{
        type:"skip",
        draw:0,
        color:"random"
    }

}
var colors = [
    "red",
    "green",
    "blue",
    "yellow"
]

var suits = [
    "hearts",
    "diamonds",
    "spades",
    "clubs"
]


function makeDeck(types,variant,variants){
    var d = [];
    for(var i = 0; i < variants.length; i++){
        for(var k in types){
            var c = {};
            Object.assign(c,types[k]);
            if(types[k][variant] == "random"){
                c[variant] = variants[i];
            }
            c.name = k;
            d.push(c);
        }
    }
    return d;
}


class player{
    constructor(id){
        this.id = id;
        this.hand = [];
    }

    stringHand(m){
        var temp = "";
        for(var i = 0; i < this.hand.length; i++){
            temp += this.hand[i].color+" "+this.hand[i].name
            if(i <= this.hand.length){
                temp+=", "
            }
        }
        return temp+" "+m;
    }
}

class game{
    constructor(type,deckOptions){
        this.players = [];
        this.type = type;
        this.deck = makeDeck(deckOptions.types,deckOptions.variant,deckOptions.variants);
        this.deck = shuffle(this.deck);
        this.running = false;
        this.turn = 0;
        this.turnCounter = 1;
        this.colorPicking = false;
        this.targetPicking = false;
        this.draw = 0;
        this.lastCard = null;

    }

    addPlayer(id){
        this.players.push(new player(id))
    }

    notifyunocards(id,m){
        duckling.fetchUser(id).then((user) => {
            var i = 0;
            for(var k = 0; k < this.players.length;k++){
                if(this.players[k].id == id){
                    i = k;
                    break;
                }
            }
            user.send(this.players[i].stringHand(m));
        });
    }

    giveCard(p,i){ //i == card index
        var c = this.deck.splice(i,1)[0]
        if(c.type == "color"){
            c.color = "wild";
        }
        this.players[p].hand.push(c);
    }

    returnCard(p,i){ //i == card index
        var c = this.players[p].hand.splice(i,1)[0]
        if(c.type == "color"){
            c.color = "wild";
        }
        this.deck.push(c);
    }

    nextTurn(){
        this.turn += this.turnCounter;
        if(this.turn < 0){
            this.turn = this.players.length-1;
        }else if(this.turn >= this.players.length){
            this.turn = 0;
        }
    }
}

var games = {};

function say(msg, text) {
    msg.channel.startTyping();
    var wc = text.split(" ").length;
    setTimeout(function () {
        msg.channel.send(text);
        console.log("[DUCKLING] " + text);
        msg.channel.stopTyping(true);
    }, ((wc * (60 / wpm)) * 1000));
}

    function save(){
        fs.writeFileSync("./anglish.json",JSON.stringify(dictionary),"utf8");
    }

    var prefix = "!";

    duckling.on('message', function (msg) {
        try{
            if(games[msg.channel.id]){
                if(games[msg.channel.id].running){
                    for(var i = 0; i < games[msg.channel.id].players.length; i++){
                        if(games[msg.channel.id].players[i].hand.length == 0){
                            msg.channel.send("<@"+games[msg.channel.id].players[i].id+"> wins!");
                            games[msg.channel.id] = null;
                            delete games[msg.channel.id];
                            return;
                        }
                    }

                    
                }

                if(games[msg.channel.id].players[games[msg.channel.id].turn].id == msg.author.id){
                    if(games[msg.channel.id].targetPicking){
                        if(msg.mentions.members.first() != null){
                            msg.channel.send("they now draw "+games[msg.channel.id].draw+" unocards");
                            var p = 0;
                            for(var k = 0; k < games[msg.channel.id].players.length; k++){
                                if(games[msg.channel.id].players[k].id == games[msg.channel.id].players[(games[msg.channel.id].turn+1)%games[msg.channel.id].players.length].id){
                                    p = k;
                                }
                            }
                            var temp = "";
                            for(var i = 0; i < games[msg.channel.id].draw; i++){
                                temp += games[msg.channel.id].deck[0].color+" "+games[msg.channel.id].deck[0].name+", "
                                games[msg.channel.id].giveCard(p,0);
                            }
                            games[msg.channel.id].notifyunocards(games[msg.channel.id].players[(games[msg.channel.id].turn+1)%games[msg.channel.id].players.length].id,"[forced to draw "+temp+" unocards]")
                            games[msg.channel.id].draw = 0;
                            if(!games[msg.channel.id].colorPicking){
                                games[msg.channel.id].nextTurn();
                            }
                            games[msg.channel.id].targetPicking = false;
                            msg.channel.send("it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                        }else{
                            msg.channel.send("you need to pick a target");
                        }
                        return;
                    }
    
                    if(games[msg.channel.id].colorPicking){
                        if(msg.content != null){
                            if(colors.includes(msg.content)){
                                msg.channel.send("the color is now "+msg.content);
                                games[msg.channel.id].lastCard.color = msg.content;
                                //if(!games[msg.channel.id].targetPicking){
                                    games[msg.channel.id].nextTurn();
                                //}
                                games[msg.channel.id].colorPicking = false;

                                msg.channel.send("it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                            }else{
                                msg.channel.send("you need to pick a color");
                            }
    
                        }else{
                            msg.channel.send("you need to pick a color");
                        }
                        return;
                    }
                }
            }
            var content = msg.content.split(" ");
            if(content[0] == prefix+"startuno"){
                msg.channel.send("starting uno game in this channel, use "+prefix+"join to join the game, use "+prefix+"begin to start the game");
                games[msg.channel.id] = new game("uno",{"types":unocardtypes,"variant":"color","variants":colors});
                games[msg.channel.id].addPlayer(msg.author.id);
            }

            if(games[msg.channel.id] != null){
                if(games[msg.channel.id].type == "uno"){
                    if(content[0] == prefix+"begin"){
                        games[msg.channel.id].running = true;
                        msg.channel.send("game started! it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                        var cardCount = 5;
                        if(content[1] != null){
                            cardCount = parseInt(content[1])
                        }
                        for(var j = 0; j < cardCount;j++){
                            for(var i = 0; i < games[msg.channel.id].players.length; i++){
                                games[msg.channel.id].giveCard(i,0);
                            }
                        }
            
                        for(var i = 0; i < games[msg.channel.id].players.length; i++){
                            games[msg.channel.id].notifyunocards(games[msg.channel.id].players[i].id,"[game begun]");
                        }
                    }
            
                    if(content[0] == prefix+"join"){
                        if(games[msg.channel.id] == null){
                            msg.channel.send("there's no game going on in this channel")
                        }else{
                            games[msg.channel.id].addPlayer(msg.author.id);
                            msg.channel.send("joined game!");
                        }
                    }
            
                    if(content[0] == prefix+"drop" || content[0] == prefix+"play" ){
                        var id = games[msg.channel.id].players[games[msg.channel.id].turn].id;
                        var p = games[msg.channel.id].turn;
                        if(msg.author.id == id){
                            if(content[1] != null){
                                if(content[2] != null){
                                    var exists = false;
                                    var spot = 0;
                                    for(var i = 0; i < games[msg.channel.id].players[p].hand.length;i++){
                                        if(games[msg.channel.id].players[p].hand[i].color == content[1] && games[msg.channel.id].players[p].hand[i].name == content[2]){
                                            exists = true;
                                            spot = i;
                                            break;
                                        }
                                    }
                                    if(!exists){
                                        msg.channel.send("you dont have that card");
                                        return;
                                    }
                                    if(games[msg.channel.id].lastCard == null || content[1] == "wild" || content[1] == games[msg.channel.id].lastCard.color || content[2] == games[msg.channel.id].lastCard.name){
                                        if(games[msg.channel.id].players[p].hand[spot].type == "number" && games[msg.channel.id].players[p].hand[spot].draw == 0){
                                            if(games[msg.channel.id].players[games[msg.channel.id].turn].hand.length == 2){
                                                msg.channel.send("Uno <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">!");
                                            }
                                            games[msg.channel.id].nextTurn();
                                            msg.channel.send("it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                                        }else{
                                            if(games[msg.channel.id].players[p].hand[spot].type == "color"){
                                                games[msg.channel.id].colorPicking = true;
                                            }
            
                                            if(games[msg.channel.id].players[p].hand[spot].type == "reverse"){
                                                games[msg.channel.id].turnCounter *= -1;
                                                if(games[msg.channel.id].players[games[msg.channel.id].turn].hand.length == 2){
                                                    msg.channel.send("Uno <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">!");
                                                }
                                                games[msg.channel.id].nextTurn();
                                                msg.channel.send("it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                                            }
                                            if(games[msg.channel.id].players[p].hand[spot].type == "skip"){
                                                if(games[msg.channel.id].players[games[msg.channel.id].turn].hand.length == 2){
                                                    msg.channel.send("Uno <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">!");
                                                }
                                                games[msg.channel.id].nextTurn();
                                                games[msg.channel.id].nextTurn();
                                                msg.channel.send("it's <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">'s turn!");
                                            }
            
                                        }
                                        console.log(games[msg.channel.id].players[p].hand[spot]);
                                        games[msg.channel.id].draw = games[msg.channel.id].players[p].hand[spot].draw;
                                        if(games[msg.channel.id].draw > 0){
                                            games[msg.channel.id].targetPicking = true;
                                            msg.channel.send("ping a target");
                                        }
                                        games[msg.channel.id].lastCard = games[msg.channel.id].players[p].hand[spot];
                                        games[msg.channel.id].returnCard(p,spot)
                                        games[msg.channel.id].notifyunocards(id,"[used the "+content[1]+" "+content[2]+" card]");
                                        msg.channel.send("you used the "+content[1]+" "+content[2]+" card");
                                        if(games[msg.channel.id].players[games[msg.channel.id].turn].hand.length == 1){
                                            msg.channel.send("Uno <@"+games[msg.channel.id].players[games[msg.channel.id].turn].id+">!");
                                        }
                                    }else{
                                        msg.channel.send("you cant use that card")
                                    }
            
            
                                }else{
                                    msg.channel.send("specify a card");
                                }
                            }else{
                                msg.channel.send("specify a color");
                            }
            
                        }else{
                            msg.channel.send("not your turn");
                        }
                    }

                    if(content[0] == prefix+"deck"){
                        if(!games[msg.channel.id]){
                            msg.channel.send("there is no game in this channel")
                            return;
                        }
                        msg.channel.send("deck has "+games[msg.channel.id].deck.length+" unocards left in it")
                    }
            
                    if(content[0] == prefix+"draw"){
                        if(msg.author.id == games[msg.channel.id].players[games[msg.channel.id].turn].id){
                            msg.channel.send("you drew a card");
                            var temp = games[msg.channel.id].deck[0];
                            games[msg.channel.id].giveCard(games[msg.channel.id].turn,0);
                            games[msg.channel.id].notifyunocards(msg.author.id,"[decided to draw "+temp.color+" "+temp.name+"]");
                        }else{
                            msg.channel.send("not your turn");
                        }
                    }
                }
            }
        }catch(err){
            console.log(err);
        }
        

    });
//}
duckling.login(token);
