const config = require("./config.json");
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Discord = require("discord.js");
const mumbleBros = [
    'IRON JIMBA',
    'Iron Stamos',
    'iron chulo',
    'GIM Goobs',
    'Fe Nonney',
    'IRN LUMJACK',
    'FatherJoeB',
]

const getIsSingleSkillCheck = (parts) => {
    let single = config.skills.find(x => {
        return x.some(y => y === (parts[parts.length - 1].toLowerCase()));
    });
    if (single) return single[0];
    else return single;
};

const getEmoji = (skill) => config.emojis[skill];

const isFailFast = (message) => {
    if (message.author.bot) return true;
    if (!message.cleanContent.startsWith(".")) return true;
    if (!message.cleanContent.startsWith(".osrs")) return true;
};

const getPlayerDataObject = (raw) => {
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

const formatPlayerData = (playerData, playerName, single) => {
    let result = new Discord.MessageEmbed()
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

const fetchPlayerData = async (playerName) => {
    const res = await fetch(`${config.hiscoresRootUrl}${playerName}`, {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        "method": "GET",
        "mode": "cors"
      });
    const text = await res.text()
    if(text.includes('404 - Page not found<')){
        return {
            bro: playerName,
            noob: true,
        }
            
    }
    return getPlayerDataObject(text)
}

const getPlayerData = async (playerName) => {
    const playerData = await fetchPlayerData(playerName);
    return formatPlayerData(
        playerData, 
        playerName, 
        false
    )
}


const getMumbleHighscores = async () => {
    const mumblePlayerData = await Promise.all(mumbleBros.map(async (bro) => {
        const data = await fetchPlayerData(bro);
        return {
            bro,
            totalExp: Number(data?.total?.exp) || 0,
            totalLevel: Number(data?.total?.level) || 0,
            highestSkill: Object.entries(data).filter(([aSkill, aValues]) => aSkill !== 'total').sort(([aSkill, aValues], [bSkill, bValues]) => {
                return bValues.level - aValues.level;
            })[0],
            ...data
        };
    }))
    const sorted = mumblePlayerData.sort((a, b) => {
        return b.totalExp - a.totalExp;
    });
    return formatMumbleHighScores(sorted)

}

const formatMumbleHighScores = (mumblePlayerData) => {
    let msg = new Discord.MessageEmbed()
    .setAuthor(':)', 'https://cdn.discordapp.com/avatars/565514713606258718/e2722afa8e07d7c26ea78f34efbfcd87.png')
    .setTitle(`Papi Chulo: ${mumblePlayerData[0].bro}`);
    mumblePlayerData.forEach(({
        highestSkill,
        bro,
        totalExp,
        totalLevel,
        noob
    }, idx) => {
        const [highestSkillName, highestSkillInfo] = highestSkill
        const highestSkillIcon = getEmoji(highestSkillName)
        if(noob){
            msg.addField(`this dude broke this bot cuz he aint even on the high scores lol`, bro, false);
            return
        }

        msg.addField(
            `#${idx+1}. ${bro}\t`,
            `Total Level: ${totalLevel}\t
            Total Exp: ${totalExp}
            Highest Skill: ${highestSkillInfo.level} ${highestSkillName} ${highestSkillIcon}
            `
        , false);
    })
    return msg

}


module.exports = {
    getPlayerData: (playerName) => getPlayerData(playerName),
    getMumbleHighscores,
};
