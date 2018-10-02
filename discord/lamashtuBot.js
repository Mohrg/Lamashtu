const Discord = require('discord.js');

const client = new Discord.Client();
var db = require('../db/database.js');

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



client.login('NDg1NTMzMDMxODM5MzAxNjUy.Dmx_HA.mMq4Su-IFDHhfpbdhFf1L2IRr2M');