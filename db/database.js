
var jsonfile = require('jsonfile');
var axios = require('axios');

const nameRegex = /([\w\s]*)\sCR\s(\d*)/;
const xpRegex = /<b>\w*<\/b>.([0-9,]*)<br \/>/;
const allRegex = /ItemName=([\w-\s]*)">/g
const url = 'http://www.archivesofnethys.com/MonsterDisplay.aspx?ItemName=';
const cr1XP = 400;
const cr2XP = 600;

var monsters, locations, items;



jsonfile.readFile('../data/monsters.js', function (err, obj) {
    monsters = obj || {};
    loadLocations();
});


function loadLocations() {
    jsonfile.readFile('../data/locations.js', function (err, obj) {
        locations = obj;
        checkMonsters();
    })


}

function checkMonsters() {
    var locationLength = Object.keys(locations).length;
    var cur = 1;
    var location, monster;

    for (var key in locations) {
        location = locations[key];

        for (var monsterKey in location.monsters) {
            monster = location.monsters[monsterKey];

            if (!monsters[monster]) {
                getMonster(monster, writeMonsters);

            }
        }
    }

}

function writeMonsters() {
    console.log("Writing");
    jsonfile.writeFile('./data/monsters.js', monsters, { spaces: 4 }, loadItems);
}

/*
function assignMonsters() {
    for (var key in monsters) {
        let monster = monsters[key];

        monster.locations.forEach(function (monsterLocation) {
            if(locations[monsterLocation])
                locations[monsterLocation].monsters.push(monster.name);
            else
            console.log("error, location doesn't exist " + monsterLocation);
        });
    }

    writeLocations();
}

function writeLocations() {
    jsonfile.writeFile('./data/locations.js', locations,{spaces: 4}, loadItems);
}
*/

function loadItems() {
    jsonfile.readFile("./data/items.js", function (err, obj) {
        items = obj || {};
    });
}

function generateEncounter(location, cr, msg, include, penalty) {
	var encounter = [];
	var list = {};
	var xpBudget = getXPForCR(cr);
	var included;
	
	if(include && include != null) {
		included = monsters[include];
		if(!included)
			msg.author.send("Error " + include + " not found in monster database!");
		if(penalty){ 
			if(getPenalty(cr - included.cr) * included.xp > xpBudget)
				msg.author.send("Error : Included monsters XP cost exceeds the total XP budget for a CR " + cr + " encounter");
			else{
				encounter.push(included);
				xpBudget -= included.xp * getPenalty(cr- included.cr);
			}
			
		}
		else{
			if(included.xp > xpBudget)
				msg.author.send("Error : Included monsters XP cost exceeds the total XP budget for a CR " + cr + " encounter");
			else{
				encounter.push(included);
				xpBudget -= included.xp;
			}
		}
	}
	list = locations[location].monsters.slice();
	selectMonsterRound(cr, xpBudget, list, encounter, msg, penalty);
	
	generateEncounterMessage(cr, encounter, msg, penalty);
		
}

function generateEncounterMessage(cr, encounter, msg, penalty) {
    var response = "";
    var monster;


    response += "****Encounter results*****\n";
    response += "CR: " + cr + " XP: " + getXPForEncounter(encounter, cr, penalty) + "\n";
    
    for (var mon in encounter) {
        monster = encounter[mon];
        if(penalty)
        response += monster.name + " CR: " + monster.cr + " XP: "  + monster.xp * getPenalty(cr - monster.cr)  + "(" + monster.xp + ")\n";
        else
        response += monster.name + " CR: " + monster.cr + " XP: " + monster.xp + "\n";
    }

    msg.author.send(response);

}

function getXPForCR(cr) {
    if (cr >= 1) {
        if(cr == 1)
            return cr1XP;
        if(cr == 2)
            return cr2XP;

        if (isEven(cr)) {
            return getXPRecursive(cr, 2, cr2XP);
        }
        else {
            return getXPRecursive(cr, 1, cr1XP);
        }
    }
    else {
        //TODO: Create fractional Cr algorithm
        return 0;
    }
}

function getXPRecursive(cr, cur, xp) {
    if (cur != cr) {
        cur += 2;
        xp *= 2;
        return getXPRecursive(cr, cur, xp);
    }
    else
        return xp;
}

function getXPForEncounter(encounter, cr, penalty) {
    var xp = 0;
    for (var mon in encounter)
        if(penalty)
            xp += (encounter[mon].xp * getPenalty(cr - encounter[mon].cr));
        else
            xp += encounter[mon].xp;
    return xp;
}


function selectMonsterRound(cr, budget, list, encounter, msg, penalty) {
	var newList = JSON.parse(JSON.stringify(list));
	let updatedBudget = budget;
	
	console.log("Starting budget is " + updatedBudget + " starting list is "  + newList.length + " : "+ newList);
	let cut = [];

	for(var monster = 0; monster < newList.length; monster++) {
		var mon = monsters[newList[monster]];
		
		console.log("Cycling to  " + monster + " : "+ mon.name);
		if(mon == undefined) {
			console.log("Undefined?");
			
			msg.author.send("Monster " + newList[monster] + " not found in database, encounter generation failed");
			return;
		}
		
		if(!penalty || penalty == false) {
			if(mon.xp > updatedBudget) {
				cut.push(newList[monster])
			}
		}
		else{
			console.log("Monster is " + mon.name + " xp cost is " + mon.xp * getPenalty(cr - mon.cr) + " of budget " + updatedBudget);
			if((mon.xp * getPenalty(cr - mon.cr)) > updatedBudget || mon.cr > cr) {
				console.log("Cut " + mon.name);
				cut.push(newList[monster]);
			}
		}
	}
	
	for(var i = 0; i < cut.length; i++)
		newList.splice(newList.indexOf(cut[i]), 1);
	
	if(newList.length == 0)
		return;
	
	newList = shuffle(newList);
	
	let pick = Math.floor(Math.random() * newList.length);
	let selected = monsters[newList[pick]];
	
	encounter.push(selected);
	
	console.log("adding " + monsters[newList[pick]].name);
	if(penalty == true){
		updatedBudget -= (selected.xp * getPenalty(cr - selected.cr));
		
	}
	else{
		updatedBudget -= (selected.xp);
	}
	
	if(updatedBudget == 0)
		return;
	
	selectMonsterRound(cr, updatedBudget, newList, encounter, msg, penalty);
}

function isEven(number) {
    return number % 2 == 0;
}

function shuffle(array) {
    for(var i = array.length - 1; i >= 0; i--) {
        let randomIndex = Math.floor(Math.random() * (i + 1));
        let itemAtIndex = array[randomIndex];

        array[randomIndex] = array[i];
        array[i] = itemAtIndex;
    }

    return array;
}

function getPenalty(difference)
{
    if(difference == 0 || difference == 1)
        return 1;
    
    if(difference > 5)
    	return .75;
    
    if(difference < 0)
    	return 1;

    let mod = 1 - addXTimes(.05, difference - 1)
        
    return mod < .75 ? .75 : mod;
}

function addXTimes(value, times){
	let result = 0;
	for(var i = 0; i < times; i++)
		result += value;
	return result;
		
}

function getMonster(name, cb) {
    console.log("Getting " + name);
    axios.get(url + name)
        .then(response => {
            var name = response.data.match(nameRegex)[1];
            var cr = parseInt(response.data.match(nameRegex)[2]);
            var xp = parseInt(response.data.match(xpRegex)[1].replace(/,/g, ""));

            if (name != null && cr != null && xp != null) {
                monsters[name] = {
                    name: name,
                    cr: cr,
                    xp: xp
                }
            }
            else {
                console.log("Error in getting " + name);
            }
            if (cb)
                cb();

        })
        .catch(error => {
            console.log("error in getting response for" + name);
        })

}

function getAll() {

    axios.get('http://www.archivesofnethys.com/Monsters.aspx?Letter=U')
        .then(response => {
            var names = [];
            do {
                m = allRegex.exec(response.data)
                if (m) {
                    console.log("Adding " + m[1] + " to list of names ")
                    var name = m[1];
                    names.push(name);
                }
            } while (m)

            getAllRecurse(names);
            //console.log("Array length is " + names.length + " and will take between " + (3000 * names.length) / 1000 / 60 + " and " + (5000 * names.length) / 1000 / 60 + " minutes")

        })
        .catch(error => {
            console.log(error);
        })
}

function getAllRecurse(arr) {
    if (arr.length > 0) {
        setTimeout(function () {
            getMonster(arr.pop());
            getAllRecurse(arr);
        }, Math.floor(Math.random() * (5000 - 3000 + 1) + 3000))
    }
    else
        setTimeout(writeMonsters, 10000);
}
module.exports = {
    monsters: monsters,
    locations: locations,
    items: items,
    getAll: getAll,
    generateEncounter: generateEncounter
};