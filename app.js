const cron = require('node-cron');
const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get } = require('lodash');
require('dotenv').config();


const { firebaseConfig } = require('./config');

const updateOddsForIpl = async () => {
    try {
        console.log(`Inside updateOddsForIpl: start - ${new Date()}`);
        const db = admin.firestore();
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
    } catch (e) {
        console.log(e);
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

const start = async () => {
    console.log(`Job started at ${new Date()}`);
    admin.initializeApp({ credential: admin.credential.cert(firebaseConfig) });
    console.log(`Env Vars: ${process.env.NODE_ENV}`);
    cron.schedule("0 5 * * *", updateOddsForIpl);
    console.log(`Job ended at ${new Date()}`);
}

start();
