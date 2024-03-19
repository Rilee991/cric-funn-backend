const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get } = require('lodash');
const { TABLES } = require('../enums');

const updateOddsForIpl = async (req, res) => {
    try {
        const { db } = await global.cricFunnBackend;
        console.log(`Inside updateOddsForIpl: start - ${new Date()}`);
        const tomorrowStartDate = moment().add(1,"day").startOf("day").toISOString();
        const tomorrowEndDate = moment().add(1,"day").endOf("day").toISOString();
        console.log(`startdate: ${tomorrowStartDate}, enddate: ${tomorrowEndDate}`);

        console.log(`fetching matches`);
        const resp = await db.collection(TABLES.MATCH_COLLECTION).where("dateTimeGMT", ">=", tomorrowStartDate).where("dateTimeGMT", "<=", tomorrowEndDate).get();
        const matches = resp.docs.map(doc => doc.data());
        console.log(`${matches.length} matches found`);

        console.log('fetching odds');
        const upcomingOdds = await getUpcomingOdds();
        console.log('fetching odds completed');
        
        for(const match of matches) {
            const matchOddsVal = upcomingOdds.filter(uo => uo.commence_time == match.dateTimeGMT) || {};
            const defaultOdds = [{ name: match.teamInfo[0].name, price: 1 }, { name: match.teamInfo[1].name, price: 1 }];
            const odds = get(matchOddsVal, '[0].bookmakers[0].markets[0].outcomes', defaultOdds);
            
            if(odds && odds[0].name != match.team1) {
                const temp = odds[0];
                odds[0] = odds[1];
                odds[1] = temp;
            }
            console.log(match.name, odds);

            await db.collection(TABLES.MATCH_COLLECTION).doc(match.id).update({
                odds: odds
            });
        }
        console.log(`Updation completed for ${new Date()}`);

        res.json({ msg: 'odds updated successfully'});
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Failed to update odds",
            error: e
        });
    }
}

const getUpcomingOdds = async () => {
    const config = {
        method: 'get',
        url: 'https://api.the-odds-api.com/v4/sports/cricket_ipl/odds/?apiKey=f8330878dd0337f2838d2493f69bff14&regions=uk&dateFormat=iso',//'https://api.the-odds-api.com/v4/sports/cricket_international_t20/odds/?apiKey=f8330878dd0337f2838d2493f69bff14&regions=uk&dateFormat=iso',
        headers: { }
    };

    const resp = await axios(config);
    const oddsResp = get(resp, 'data', []);

    return oddsResp;
}

module.exports = {
    updateOddsForIpl
}
