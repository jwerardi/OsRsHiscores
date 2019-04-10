const https = require('https');
const Discord = require("discord.js");
const SimpleNodeLogger = require('simple-node-logger')

const config = require("./config.json");

let log = SimpleNodeLogger.createSimpleLogger({
    logFilePath: './logs/requests.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss'
});
let errorLog = SimpleNodeLogger.createSimpleLogger({
    logFilePath: './logs/error.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss'
});
errorLog.setLevel('error');

var client;

let getIsSingleSkillCheck = (parts) => {
    let single = config.skills.find(x => {
        return x.some(y => y === (parts[parts.length - 1].toLowerCase()));
    });
    if (single) return single[0];
    else return single;
};

let isFailFast = (message) => {
    if (message.author.bot) return true;
    if (!message.cleanContent.startsWith(".")) return true;
    if (!message.cleanContent.startsWith(".osrs")) return true;
};

function getPlayerDataObject(raw) {
    let lines = raw.split(/\r?\n/);
    let obj = {};
    config.skills.forEach((skillNames, index) => {
        let line = lines[index].split(",");
        obj[skillNames[0]] = {
            rank: line[0],
            level: line[1],
            exp: line[2],
        };
    });
    return obj;
}

function getPlayerData(playerName) {
    return new Promise((resolve, reject) => {
        https.get(config.hiscoresRootUrl + playerName, (res) => {
            var { statusCode } = res;

            let error;
            if (statusCode !== 200) error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);

            if (error) {
                console.error(error.message);
                res.resume();
            }
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(getPlayerDataObject(rawData));
                } catch (e) {
                    reject(e.message);
                }
            });
        }).on('error', (e) => {
            reject(`Got error: ${e.message}`);
        });
    });
};

const titleCase = (str) => str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();

let getEmoji = (skill) => config.emojis[skill];

function getRichMessage(playerData, playerName, single) {
    let result = new Discord.RichEmbed()
        .setAuthor(playerName, 'https://cdn.discordapp.com/avatars/565514713606258718/e2722afa8e07d7c26ea78f34efbfcd87.png')
        .setTitle(single ? titleCase(single) : 'Levels');
    if (single) {
        let skill = playerData[single];
        result.addField(`${getEmoji(single)} ${skill.level}`, `#${skill.rank}, ${skill.exp}XP`, false)
    } else {
        config.displayOrder.forEach(skillName => {
            let skill = playerData[skillName];
            result.addField(`${getEmoji(skillName)} ${skill.level}`, `#${skill.rank}, ${skill.exp} XP`, true)
        });
    }
    return result;
}

let setup = () => {
    client = new Discord.Client({
        disableEveryone: true,
        disabledEvents: ["TYPING_START"],
        autoReconnect: true
    });

    client.login(config.token).then(() => {
        console.log("Logged in");
    }).catch(reason => errorLog.error(reason));

    client.on("ready", () => {
        console.log(`Ready as ${client.user.username}`);
    });

    client.on("message", (message) => {
        if (isFailFast(message)) return;

        var parts = message.cleanContent.split(" ");
        var singleSkill = getIsSingleSkillCheck(parts);

        let nameEndIndex = parts.length - (singleSkill ? 1 : 0);
        var playerNameParts = parts.slice(1, nameEndIndex);
        var playerName = playerNameParts.join(" ");



        getPlayerData(playerName).then(playerData => {
            let richEmbed = getRichMessage(playerData, playerName, singleSkill);
            message.channel.send(richEmbed);
            console.log(playerName, singleSkill);
        }).catch((reason) => {
            console.log(reason);
        });

        if (!singleSkill) {

        }


    });

    client.on("error", (error) => {
        errorLog.log(error);
    });
};

setup();