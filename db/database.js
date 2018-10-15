
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
	console.log("Checking monsters");
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
   
    assignMonsters();
}

function writeMonsters() {
    console.log("Writing");
    jsonfile.writeFile('../data/monsters.js', monsters, { spaces: 4 }, loadItems);
}

function assignMonsters() {
	console.log("Assigning monsters to locations");
    for (var key in monsters) {
        let monster = monsters[key];

        monster.locations.forEach(function (monsterLocation) {
            if(locations[monsterLocation]){
            	console.log("Adding monster " + monster.name + " to " + locations[monsterLocation]);
                locations[monsterLocation].monsters.push(monster.name);
            	console.log(locations[monsterLocation]);

            }
            else
            	locations[monsterLocation] = {name : monsterLocation, monsters : [monster.name]};
        });
    }
    cleanLocations();
}

function cleanLocations() {
	console.log("Cleaning locations");
	for(var key in locations) {
		let location = locations[key];
		let remove = [];
		console.log("Searching " + location.name)
		
		for(var monKey in location.monsters){
			console.log("Checking " + location.monsters[monKey] + " in " + location.name)
			if(monsters[location.monsters[monKey]].locations.indexOf(location.name) == null){
				console.log("Monster " + location.monsters[monKey] + " not found, removing");
				remove.push(location.monsters[monKey]);
			}
		}
		for(var loc in remove) {
			location.monsters.splice(location.monsters.indexOf(remove[loc]), 1);
			console.log("Removing " + remove[loc] + " from " + location.name);
		}
	}
	
    writeLocations();

}

function writeLocations() {
    jsonfile.writeFile('../data/locations.js', locations,{spaces: 4}, loadItems);
}


function loadItems() {
    jsonfile.readFile("./data/items.js", function (err, obj) {
        items = obj || {};
    });
}

function generateEncounter(location, apl, mod, msg, include) {
    var encounter = [];
    var list = {};

    var cr = apl;
    if (!mod) {
        let roll = Math.floor(Math.random() * 4);
        if (roll == 3)
            roll = -1;
        if (roll == 4)
            roll = -2

        cr += roll
    }
    else {
        cr += mod
    }

    var xpBudget = getXPForCR(cr);
    var included;

    if (include && include != null) {
        included = monsters[include];
        if (!included)
            msg.author.send("Error " + include + " not found in monster database!");
        if (included.xp > xpBudget)
            msg.author.send("Error : Included monsters XP cost exceeds the total XP budget for a CR " + cr + " encounter");
        else {
            encounter.push(included);
            xpBudget -= included.xp;
        }

    }
    list = locations[location].monsters.slice();
    selectMonsterRound(cr, xpBudget, list, encounter, msg);

    generateEncounterMessage(cr, encounter, msg);

}

function generateEncounterMessage(cr, encounter, msg) {
    var response = "";
    var monster;


    response += "*****Encounter results*****\n";
    response += "CR: " + cr + " XP: " + getXPForEncounter(encounter, cr) + "\n";

    encounter.sort(function(a, b){return b.cr - a.cr});

    for (var mon in encounter) {
        monster = encounter[mon];
        response += monster.name + " CR: " + monster.cr + " XP: " + monster.xp + "\n";
    }

    msg.author.send(quoteMessage(response));

}

function quoteMessage(text) {
    let resp = "```" + text + "```";
    return resp;
}

function getXPForCR(cr) {
    if (cr >= 1) {
        if (cr == 1)
            return cr1XP;
        if (cr == 2)
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

function getXPForEncounter(encounter, cr) {
    var xp = 0;
    for (var mon in encounter)
        xp += encounter[mon].xp;

    return xp;
}


function selectMonsterRound(cr, budget, list, encounter, msg) {
    var newList = JSON.parse(JSON.stringify(list));
    let updatedBudget = budget;

    console.log("Starting budget is " + updatedBudget + " starting list is " + newList.length + " : " + newList);
    let cut = [];

    for (var monster = 0; monster < newList.length; monster++) {
        var mon = monsters[newList[monster]];

        console.log("Cycling to  " + monster + " : " + mon.name);
        if (mon == undefined) {
            console.log("Undefined?");

            msg.author.send("Monster " + newList[monster] + " not found in database, encounter generation failed");
            return;
        }


        if (mon.xp > updatedBudget) {
            cut.push(newList[monster])
        }


    }

    for (var i = 0; i < cut.length; i++)
        newList.splice(newList.indexOf(cut[i]), 1);

    if (newList.length == 0)
        return;

    newList = shuffle(newList);

    let pick = Math.floor(Math.random() * newList.length);
    let selected = monsters[newList[pick]];

    encounter.push(selected);
    updatedBudget -= (selected.xp);
    
    if (updatedBudget == 0)
        return;

    selectMonsterRound(cr, updatedBudget, newList, encounter, msg);
}

function isEven(number) {
    return number % 2 == 0;
}

function shuffle(array) {
    for (var i = array.length - 1; i >= 0; i--) {
        let randomIndex = Math.floor(Math.random() * (i + 1));
        let itemAtIndex = array[randomIndex];

        array[randomIndex] = array[i];
        array[i] = itemAtIndex;
    }

    return array;
}

function addXTimes(value, times) {
    let result = 0;
    for (var i = 0; i < times; i++)
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
                    xp: xp,
                    locations: []
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