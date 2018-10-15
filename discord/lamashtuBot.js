const Discord = require('discord.js');

const client = new Discord.Client();
var token = require("../config/discord.js");
var db = require('../db/database.js');

const nameRegex = /([\w\s]*)\sCR\s(\d*)/;


client.once('ready', () => {
    console.log("Lamashtu ready for your commands, master.")
})

client.on('message', message => {
    if(message.content.charAt(0) === '!')
    {
        if(message.content == "!Generate")
        for(var i = 0; i < 5; i++)
            db.generateEncounter("Darkmoon Forest", 5, 0,  message, null, true);
    }
})



client.login(token);