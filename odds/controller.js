const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get } = require('lodash');
const { TABLES } = require('../enums');

const updateOddsForIpl = async (req, res) => {
    const apiResp = [];
    try {
        const { db } = await global.cricFunnBackend;
        console.log(`Inside updateOddsForIpl: start - ${new Date()}`);
        apiResp.push(`Inside updateOddsForIpl: start - ${new Date()}`);
        const tomorrowStartDate = moment().add(1,"day").startOf("day").toISOString();
        const tomorrowEndDate = moment().add(1,"day").endOf("day").toISOString();
        console.log(`startdate: ${tomorrowStartDate}, enddate: ${tomorrowEndDate}`);
        apiResp.push(`startdate: ${tomorrowStartDate}, enddate: ${tomorrowEndDate}`);

        console.log(`fetching matches`);
        apiResp.push(`fetching matches`);
        const resp = await db.collection(TABLES.MATCH_COLLECTION).where("dateTimeGMT", ">=", tomorrowStartDate).where("dateTimeGMT", "<=", tomorrowEndDate).get();
        const matches = resp.docs.map(doc => doc.data());
        console.log(`${matches.length} matches found`);
        apiResp.push(`${matches.length} matches found`);

        console.log('fetching odds');
        apiResp.push('fetching odds');
        const upcomingOdds = await getUpcomingOdds();
        console.log('fetching odds completed');
        apiResp.push('fetching odds completed');
        
        for(const match of matches) {
            const matchOddsVal = upcomingOdds.filter(uo => uo.commence_time == match.dateTimeGMT) || {};
            const defaultOdds = [{ name: match.teamInfo[0].name, price: 1 }, { name: match.teamInfo[1].name, price: 1 }];
            const odds = get(matchOddsVal, '[0].bookmakers[0].markets[0].outcomes', defaultOdds);
            if(odds[0]?.name === "Royal Challengers Bangalore")
                odds[0].name = "Royal Challengers Bengaluru";

            if(odds[1]?.name === "Royal Challengers Bangalore")
                odds[1].name = "Royal Challengers Bengaluru";

            if(odds && odds[0].name != match.team1) {
                const temp = odds[0];
                odds[0] = odds[1];
                odds[1] = temp;
            }
            console.log(match.name, odds);
            apiResp.push(match.name, odds);

            await db.collection(TABLES.MATCH_COLLECTION).doc(match.id).update({
                odds: odds
            });
            apiResp.push("Odds updated!");
        }
        console.log(`Updation completed for ${new Date()}`);
        apiResp.push(`Updation completed for ${new Date()}`);

        res.json({ msg: 'odds updated successfully', apiResp });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Failed to update odds",
            error: e,
            apiResp
        });
    }
}

const getUpcomingOdds = async () => {
    const config = {
        method: 'get',
        url: 'https://api.the-odds-api.com/v4/sports/cricket_ipl/odds/?apiKey=f8330878dd0337f2838d2493f69bff14&regions=uk&dateFormat=iso',//'https://api.the-odds-api.com/v4/sports/cricket_icc_trophy/odds/?apiKey=f8330878dd0337f2838d2493f69bff14&regions=uk&dateFormat=iso',
        headers: { }
    };

    const resp = await axios(config);
    const oddsResp = get(resp, 'data', []);

    return oddsResp;
}

const getTeamAbbr = (name) => {
    if(name === "Punjab Kings") return "PBKS";
    if(name === "Sunrisers Hyderabad") return "SRH";

    const words = name.split(" ");

    if(words.length > 1)    return words.map(word => word[0]).join("").toUpperCase();
    return words[0].slice(0,3).toUpperCase();
}

const getImg = (team) => {
    if(team === "RCB")  return "https://g.cricapi.com/iapi/261-637852957972423711.png?w=500";
    if(team === "DC")  return "https://g.cricapi.com/iapi/148-637874596301457910.png?w=500";
    if(team === "KKR")  return "https://g.cricapi.com/iapi/206-637852958714346149.png?w=500";
    if(team === "SRH")  return "https://g.cricapi.com/iapi/279-637852957609490368.png?w=500";
    if(team === "MI")  return "https://g.cricapi.com/iapi/226-637852956375593901.png?w=500";
    if(team === "GT")  return "https://g.cricapi.com/iapi/172-637852957798476823.png?w=500";
    if(team === "PBKS")  return "https://g.cricapi.com/iapi/247-637852956959778791.png?w=500";
    if(team === "RR")  return "https://g.cricapi.com/iapi/251-637852956607161886.png?w=500";
    if(team === "CSK")  return "https://g.cricapi.com/iapi/135-637852956181378533.png?w=500";
    return  "https://g.cricapi.com/iapi/215-637876059669009476.png?w=500";
}

const matchPostersMapping = {
    "CSK-DC": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-55-CSK-vs-DC-768x360.jpg",
    "CSK-KKR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-1-CSK-vs-KKR.jpg",
    "CSK-MI": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-59-CSK-vs-MI-768x360.jpg",
    "CSK-PBKS": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-11-CSK-vs-PK-768x360.jpg",
    "CSK-SRH": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-17-CSK-vs-SH-768x360.jpg",
    "DC-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-55-CSK-vs-DC-768x360.jpg",
    "DC-KKR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-41-DC-vs-KKR-768x360.jpg",
    "DC-MI": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-2-DC-vs-MI.jpg",
    "DC-PBKS": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-32-DC-vs-PK-768x360.jpg",
    "DC-RCB": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-27-DC-vs-RCB-768x360.jpg",
    "DC-SRH": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-50-DC-vs-SH-768x360.jpg",
    "GT-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-29-GT-vs-CSK-768x360.jpg",
    "GT-DC": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-10-GT-vs-DC-768x360.jpg",
    "GT-LSG": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-4-GT-vs-LSG-768x360.jpg",
    "GT-MI": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-51-GT-vs-MI-768x360.jpg",
    "GT-SRH": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-40-GT-vs-SH-768x360.jpg",
    "KKR-GT": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-35-KKR-vs-GT-768x360.jpg",
    "KKR-LSG": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-66-KKR-vs-LSG-768x360.jpg",
    "KKR-PBKS": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-8-KKR-vs-PK-768x360.jpg",
    "KKR-RR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-47-KKR-vs-RR-768x360.jpg",
    "KKR-SRH": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-61-KKR-vs-SH-768x360.jpg",
    "LSG-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-7-LSG-vs-CSK-768x360.jpg",
    "LSG-DC": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-15-LSG-vs-DC-768x360.jpg",
    "LSG-GT": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-57-LSG-vs-GT-768x360.jpg",
    "LSG-MI": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-37-LSG-vs-MI-768x360.jpg",
    "LSG-RCB": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-31-LSG-vs-RCB-768x360.jpg",
    "MI-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-33-MI-vs-CSK-768x360.jpg",
    "MI-KKR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-56-MI-vs-KKR-768x360.jpg",
    "MI-PBKS": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-23-MI-vs-PK-768x360.jpg",
    "MI-RR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-9-MI-vs-RR-768x360.jpg",
    "MI-SRH": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-65-MI-vs-SH-768x360.jpg",
    "PBKS-DC": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-64-PK-vs-DC-768x360.jpg",
    "PBKS-GT": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-16-PK-vs-GT-768x360.jpg",
    "PBKS-LSG": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-42-PK-vs-LSG-768x360.jpg",
    "PBKS-RCB": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-3-PK-vs-RCB-768x360.jpg",
    "PBKS-RR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-52-PK-vs-RR-768x360.jpg",
    "RCB-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-49-RCB-vs-CSK-768x360.jpg",
    "RCB-GT": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-67-RCB-vs-GT-768x360.jpg",
    "RCB-KKR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-6-RCB-vs-KKR-768x360.jpg",
    "RCB-MI": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-18-RCB-vs-MI-768x360.jpg",
    "RCB-RR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-39-RCB-vs-RR-768x360.jpg",
    "RR-CSK": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-68-RR-vs-CSK-768x360.jpg",
    "RR-DC": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-58-RR-vs-DC-768x360.jpg",
    "RR-GT": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-24-RR-vs-GT-768x360.jpg",
    "RR-LSG": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-20-RR-vs-LSG-768x360.jpg",
    "RR-RCB": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-13-RR-vs-RCB-768x360.jpg",
    "SRH-KKR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-25-SH-vs-KKR-768x360.jpg",
    "SRH-LSG": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-12-SH-vs-LSG-768x360.jpg",
    "SRH-PBKS": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-70-SH-vs-PK-768x360.jpg",
    "SRH-RCB": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-54-SH-vs-RCB-768x360.jpg",
    "SRH-RR": "https://cdorg.b-cdn.net/wp-content/uploads/2022/03/IPL-Match-5-SH-vs-RR-768x360.jpg"
};

const getFormattedMatch = (match) => {
    const abbr1 = getTeamAbbr(match.HomeTeam);
    const abbr2 = getTeamAbbr(match.AwayTeam);
    const key1 = `${abbr1}-${abbr2}`;
    const key2 = `${abbr2}-${abbr1}`;
    const poster = matchPostersMapping[key1] || matchPostersMapping[key2] || "";

    const formattedMatch = {
        date: moment(match.DateUtc).format("YYYY-MM-DD"),
        dateTimeGMT: match.DateUtc.split(" ").join("T"),
        id: moment(match.DateUtc).format("YYYY_MM_DD_hh:mm"),
        matchEnded: false,
        matchStarted: false,
        matchType: "t20",
        name: `${match.HomeTeam} vs ${match.AwayTeam}, ${match.MatchNumber}th Match`,
        poster: poster,
        status: "Match not started",
        team1: match.HomeTeam,
        team1Abbreviation: abbr1,
        team2: match.AwayTeam,
        team2Abbreviation: abbr2,
        teamInfo: [{
            img: getImg(abbr1),
            name: match.HomeTeam,
            shortName: abbr1
        }, {
            img: getImg(abbr2),
            name: match.AwayTeam,
            shortName: abbr2
        }],
        teams: [match.HomeTeam, match.AwayTeam],
        venue: match.Location
    }

    return formattedMatch;
}

const syncMatches = async (req, res) => {
    try {
        const matches = [
            {
                "MatchNumber": 22,
                "RoundNumber": 3,
                "DateUtc": "2024-04-08 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "Chennai Super Kings",
                "AwayTeam": "Kolkata Knight Riders",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 23,
                "RoundNumber": 3,
                "DateUtc": "2024-04-09 14:00:00Z",
                "Location": "PCA New Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Sunrisers Hyderabad",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 24,
                "RoundNumber": 3,
                "DateUtc": "2024-04-10 14:00:00Z",
                "Location": "Sawai Mansingh Stadium",
                "HomeTeam": "Rajasthan Royals",
                "AwayTeam": "Gujarat Titans",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 25,
                "RoundNumber": 3,
                "DateUtc": "2024-04-11 14:00:00Z",
                "Location": "Wankhede Stadium",
                "HomeTeam": "Mumbai Indians",
                "AwayTeam": "Royal Challengers Bengaluru",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 26,
                "RoundNumber": 3,
                "DateUtc": "2024-04-12 14:00:00Z",
                "Location": "BRSABV Ekana Cricket Stadium",
                "HomeTeam": "Lucknow Super Giants",
                "AwayTeam": "Delhi Capitals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 27,
                "RoundNumber": 3,
                "DateUtc": "2024-04-13 14:00:00Z",
                "Location": "PCA New Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 28,
                "RoundNumber": 3,
                "DateUtc": "2024-04-14 10:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Lucknow Super Giants",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 29,
                "RoundNumber": 3,
                "DateUtc": "2024-04-14 14:00:00Z",
                "Location": "Wankhede Stadium",
                "HomeTeam": "Mumbai Indians",
                "AwayTeam": "Chennai Super Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 30,
                "RoundNumber": 4,
                "DateUtc": "2024-04-15 14:00:00Z",
                "Location": "M Chinnaswamy Stadium",
                "HomeTeam": "Royal Challengers Bengaluru",
                "AwayTeam": "Sunrisers Hyderabad",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 31,
                "RoundNumber": 4,
                "DateUtc": "2024-04-16 14:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "Gujarat Titans",
                "AwayTeam": "Delhi Capitals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 32,
                "RoundNumber": 4,
                "DateUtc": "2024-04-17 14:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 33,
                "RoundNumber": 4,
                "DateUtc": "2024-04-18 14:00:00Z",
                "Location": "PCA New Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Mumbai Indians",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 34,
                "RoundNumber": 4,
                "DateUtc": "2024-04-19 14:00:00Z",
                "Location": "BRSABV Ekana Cricket Stadium",
                "HomeTeam": "Lucknow Super Giants",
                "AwayTeam": "Chennai Super Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 35,
                "RoundNumber": 4,
                "DateUtc": "2024-04-20 14:00:00Z",
                "Location": "Arun Jaitley Stadium",
                "HomeTeam": "Delhi Capitals",
                "AwayTeam": "Sunrisers Hyderabad",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 36,
                "RoundNumber": 4,
                "DateUtc": "2024-04-21 10:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Royal Challengers Bengaluru",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 37,
                "RoundNumber": 4,
                "DateUtc": "2024-04-21 13:45:00Z",
                "Location": "PCA New Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Gujarat Titans",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 38,
                "RoundNumber": 5,
                "DateUtc": "2024-04-22 14:00:00Z",
                "Location": "Sawai Mansingh Stadium",
                "HomeTeam": "Rajasthan Royals",
                "AwayTeam": "Mumbai Indians",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 39,
                "RoundNumber": 5,
                "DateUtc": "2024-04-23 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "Chennai Super Kings",
                "AwayTeam": "Lucknow Super Giants",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 40,
                "RoundNumber": 5,
                "DateUtc": "2024-04-24 14:00:00Z",
                "Location": "Arun Jaitley Stadium",
                "HomeTeam": "Delhi Capitals",
                "AwayTeam": "Gujarat Titans",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 41,
                "RoundNumber": 5,
                "DateUtc": "2024-04-25 14:00:00Z",
                "Location": "Rajiv Gandhi International Stadium",
                "HomeTeam": "Sunrisers Hyderabad",
                "AwayTeam": "Royal Challengers Bengaluru",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 42,
                "RoundNumber": 5,
                "DateUtc": "2024-04-26 14:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Punjab Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 43,
                "RoundNumber": 5,
                "DateUtc": "2024-04-27 10:00:00Z",
                "Location": "Arun Jaitley Stadium",
                "HomeTeam": "Delhi Capitals",
                "AwayTeam": "Mumbai Indians",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 44,
                "RoundNumber": 5,
                "DateUtc": "2024-04-27 14:00:00Z",
                "Location": "BRSABV Ekana Cricket Stadium",
                "HomeTeam": "Lucknow Super Giants",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 45,
                "RoundNumber": 5,
                "DateUtc": "2024-04-28 10:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "Gujarat Titans",
                "AwayTeam": "Royal Challengers Bengaluru",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 46,
                "RoundNumber": 5,
                "DateUtc": "2024-04-28 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "Chennai Super Kings",
                "AwayTeam": "Sunrisers Hyderabad",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 47,
                "RoundNumber": 6,
                "DateUtc": "2024-04-29 14:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Delhi Capitals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 48,
                "RoundNumber": 6,
                "DateUtc": "2024-04-30 14:00:00Z",
                "Location": "BRSABV Ekana Cricket Stadium",
                "HomeTeam": "Lucknow Super Giants",
                "AwayTeam": "Mumbai Indians",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 49,
                "RoundNumber": 6,
                "DateUtc": "2024-05-01 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "Chennai Super Kings",
                "AwayTeam": "Punjab Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 50,
                "RoundNumber": 6,
                "DateUtc": "2024-05-02 14:00:00Z",
                "Location": "Rajiv Gandhi International Stadium",
                "HomeTeam": "Sunrisers Hyderabad",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 51,
                "RoundNumber": 6,
                "DateUtc": "2024-05-03 14:00:00Z",
                "Location": "Wankhede Stadium",
                "HomeTeam": "Mumbai Indians",
                "AwayTeam": "Kolkata Knight Riders",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 52,
                "RoundNumber": 6,
                "DateUtc": "2024-05-04 14:00:00Z",
                "Location": "M Chinnaswamy Stadium",
                "HomeTeam": "Royal Challengers Bengaluru",
                "AwayTeam": "Gujarat Titans",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 53,
                "RoundNumber": 6,
                "DateUtc": "2024-05-05 10:00:00Z",
                "Location": "Himachal Pradesh Cricket Association Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Chennai Super Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 54,
                "RoundNumber": 6,
                "DateUtc": "2024-05-05 14:00:00Z",
                "Location": "BRSABV Ekana Cricket Stadium",
                "HomeTeam": "Lucknow Super Giants",
                "AwayTeam": "Kolkata Knight Riders",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 55,
                "RoundNumber": 7,
                "DateUtc": "2024-05-06 14:00:00Z",
                "Location": "Wankhede Stadium",
                "HomeTeam": "Mumbai Indians",
                "AwayTeam": "Sunrisers Hyderabad",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 56,
                "RoundNumber": 7,
                "DateUtc": "2024-05-07 14:00:00Z",
                "Location": "Arun Jaitley Stadium",
                "HomeTeam": "Delhi Capitals",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 57,
                "RoundNumber": 7,
                "DateUtc": "2024-05-08 14:00:00Z",
                "Location": "Rajiv Gandhi International Stadium",
                "HomeTeam": "Sunrisers Hyderabad",
                "AwayTeam": "Lucknow Super Giants",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 58,
                "RoundNumber": 7,
                "DateUtc": "2024-05-09 14:00:00Z",
                "Location": "Himachal Pradesh Cricket Association Stadium",
                "HomeTeam": "Punjab Kings",
                "AwayTeam": "Royal Challengers Bengaluru",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 59,
                "RoundNumber": 7,
                "DateUtc": "2024-05-10 14:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "Gujarat Titans",
                "AwayTeam": "Chennai Super Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 60,
                "RoundNumber": 7,
                "DateUtc": "2024-05-11 14:00:00Z",
                "Location": "Eden Gardens",
                "HomeTeam": "Kolkata Knight Riders",
                "AwayTeam": "Mumbai Indians",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 61,
                "RoundNumber": 7,
                "DateUtc": "2024-05-12 10:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "Chennai Super Kings",
                "AwayTeam": "Rajasthan Royals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 62,
                "RoundNumber": 7,
                "DateUtc": "2024-05-12 14:00:00Z",
                "Location": "M Chinnaswamy Stadium",
                "HomeTeam": "Royal Challengers Bengaluru",
                "AwayTeam": "Delhi Capitals",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 63,
                "RoundNumber": 8,
                "DateUtc": "2024-05-13 14:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "Gujarat Titans",
                "AwayTeam": "Kolkata Knight Riders",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 64,
                "RoundNumber": 8,
                "DateUtc": "2024-05-14 14:00:00Z",
                "Location": "Arun Jaitley Stadium",
                "HomeTeam": "Delhi Capitals",
                "AwayTeam": "Lucknow Super Giants",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 65,
                "RoundNumber": 8,
                "DateUtc": "2024-05-15 14:00:00Z",
                "Location": "Barsapara Cricket Stadium",
                "HomeTeam": "Rajasthan Royals",
                "AwayTeam": "Punjab Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 66,
                "RoundNumber": 8,
                "DateUtc": "2024-05-16 14:00:00Z",
                "Location": "Rajiv Gandhi International Stadium",
                "HomeTeam": "Sunrisers Hyderabad",
                "AwayTeam": "Gujarat Titans",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 67,
                "RoundNumber": 8,
                "DateUtc": "2024-05-17 14:00:00Z",
                "Location": "Wankhede Stadium",
                "HomeTeam": "Mumbai Indians",
                "AwayTeam": "Lucknow Super Giants",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 68,
                "RoundNumber": 8,
                "DateUtc": "2024-05-18 14:00:00Z",
                "Location": "M Chinnaswamy Stadium",
                "HomeTeam": "Royal Challengers Bengaluru",
                "AwayTeam": "Chennai Super Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 69,
                "RoundNumber": 8,
                "DateUtc": "2024-05-19 10:00:00Z",
                "Location": "Rajiv Gandhi International Stadium",
                "HomeTeam": "Sunrisers Hyderabad",
                "AwayTeam": "Punjab Kings",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 70,
                "RoundNumber": 8,
                "DateUtc": "2024-05-19 14:00:00Z",
                "Location": "Barsapara Cricket Stadium",
                "HomeTeam": "Rajasthan Royals",
                "AwayTeam": "Kolkata Knight Riders",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 71,
                "RoundNumber": 9,
                "DateUtc": "2024-05-21 14:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "To be announced",
                "AwayTeam": "To be announced",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 72,
                "RoundNumber": 9,
                "DateUtc": "2024-05-22 14:00:00Z",
                "Location": "Narendra Modi Stadium",
                "HomeTeam": "To be announced",
                "AwayTeam": "To be announced",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 73,
                "RoundNumber": 10,
                "DateUtc": "2024-05-24 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "To be announced",
                "AwayTeam": "To be announced",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            },
            {
                "MatchNumber": 74,
                "RoundNumber": 11,
                "DateUtc": "2024-05-26 14:00:00Z",
                "Location": "MA Chidambaram Stadium",
                "HomeTeam": "To be announced",
                "AwayTeam": "To be announced",
                "Group": null,
                "HomeTeamScore": null,
                "AwayTeamScore": null
            }
        ];

        const { db } = await global.cricFunnBackend;
        // const resp = [];

        for(const match of matches) {
            console.log("synced match no ", match.MatchNumber);
            const formattedMatch = getFormattedMatch(match);

            await db.collection("ipl_matches").doc(formattedMatch.id).set(formattedMatch);
            // resp.push(formattedMatch);
        }

        // const docsSnap = await db.collection("ipl_matches").where("id", ">=", "2024_").where("id", "<", "2025_").get();
        // docsSnap.forEach(doc => {
        //     doc.ref.delete().then(d => console.log("data deleted"));
        // });

        res.json({ msg: 'matches synced successfully'});
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Failed to sync matches",
            error: e
        });
    }
}

module.exports = {
    updateOddsForIpl,
    syncMatches
}
