const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get } = require('lodash');

const updateOddsForIpl = async (req, res) => {
    try {
        const { db } = await global.cricFunnBackend;
        console.log(`Inside updateOddsForIpl: start - ${new Date()}`);
        const tomorrowStartDate = moment().add(1,"day").startOf("day").toISOString();
        const tomorrowEndDate = moment().add(1,"day").endOf("day").toISOString();
        console.log(`startdate: ${tomorrowStartDate}, enddate: ${tomorrowEndDate}`);

        console.log(`fetching matches`);
        const resp = await db.collection('ipl_matches').where("dateTimeGMT", ">=", tomorrowStartDate).where("dateTimeGMT", "<=", tomorrowEndDate).get();
        const matches = resp.docs.map(doc => doc.data());
        console.log(`${matches.length} matches found`);

        console.log('fetching odds');
        const upcomingOdds = await getUpcomingOdds();
        console.log('fetching odds completed');
        
        for(const match of matches) {
            const matchOddsVal = upcomingOdds.filter(uo => uo.commence_time == match.dateTimeGMT) || {};
            const outcomes = get(matchOddsVal, '[0].bookmakers[0].markets[0].outcomes', []);
            console.log(match.name, outcomes);

            await db.collection('ipl_matches').doc(match.id).update({
                odds: outcomes
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
        url: 'https://api.the-odds-api.com/v4/sports/cricket_ipl/odds/?apiKey=f8330878dd0337f2838d2493f69bff14&regions=uk&dateFormat=iso',
        headers: { }
    };

    const resp = await axios(config);
    const oddsResp = get(resp, 'data', []);

    return oddsResp;
}

module.exports = {
    updateOddsForIpl
}
