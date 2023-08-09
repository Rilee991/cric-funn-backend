const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get, orderBy } = require('lodash');
const Excel = require("exceljs");
const { TABLES } = require('../enums');

const backupBetsData = async (req, res) => {
    try {
        const { db, bucket } = await global.cricFunnBackend;
        console.log(`Fetching users data from db`);
        const resp = await db.collection(TABLES.USER_COLLECTION).where("username", "in", ["ashu", "kelly", "desmond", "Broly", "SD", "Cypher33"]).get();
        const userDocs = await resp.docs;
        console.log(`Users data fetched successfully!`);

        console.log(`Preparing excel sheet`);
        const excelSheet = createExcel(userDocs);
        console.log(`Excel sheet completed`);

        console.log(`Writing data into buffer`);
        const buffer = await excelSheet.xlsx.writeBuffer();
        console.log(`Buffer completed`);
        const now = moment();
        const fileName = `${now.format("YYYY_MM_DD")}`;
        const file = bucket.file(`backups/${fileName}`);

        console.log(`Saving file and generating signed url`);
        await file.save(buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: "03-22-2099",
        });
        console.log(`File saved. Accessible URL: ${signedUrl}`);

        const docName = moment().format("YYYY_MM_DD_hh_mm_ss");
        console.log(`Saving url into db with doc: ${docName}`);

        const docRef = db.collection(TABLES.CONFIGURATION_COLLECTION).doc("BACKUPS");
        const docSnapshot = await docRef.get();
        const currData = docSnapshot.data();

        if(!docSnapshot.exists) {
            const record = {
                [`${now.format("YYYY")}-${now.format("MM")}`]: { [`${now.format("DD")}`]: signedUrl }
            }

            ref.set(record);
        } else {
            const record = {
                ...currData,
                [`${now.format("YYYY")}-${now.format("MM")}`]: { [`${now.format("DD")}`]: signedUrl }
            }

            docRef.update(record);
        }
        console.log(`URL Saved!`);
        console.log(`Operation completed. Backup successfull...`);

        res.json({ msg: 'backup uploaded successfully'});
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: `Failed to take backup on ${new Date()}`, error: e });
    }
}

const createExcel = (docs) => {
    const workbook = new Excel.Workbook();

    docs.forEach(doc => {
        const data = doc.data();
        const tab = workbook.addWorksheet(data.username);

        const keys = Object.keys(data);

        tab.columns = keys.map(key => ({ header: key, key: key }));
        data.bets = JSON.stringify(data.bets);
        tab.addRows([data]);
    });

    return workbook;
}

const restoreDataForUsername = async (req, res) => {
    const { username = "batman" } = req.body;

    try {
        const { db } = await global.cricFunnBackend;

        const resp = await db.collection(TABLES.CONFIGURATION_COLLECTION).doc("BACKUPS").get();
        const backups = resp.data();
        const latestMonthYearDoc = backups[Object.keys(backups).sort().reverse()[0]];
        const latestDayDoc = latestMonthYearDoc[Object.keys(latestMonthYearDoc).sort().reverse()[0]];
        
        const excelBuff = await axios({ url: latestDayDoc, method: "get", responseType: 'arraybuffer' });
        const excelSheet = new Excel.Workbook();
        
        await excelSheet.xlsx.load(excelBuff.data);
        const userData = excelSheet.getWorksheet(username);
        const keys = userData.getRow(1).values;
        const vals = userData.getRow(2).values;
        const toBeSaved = ['points','bets'];
        const userObj = {};

        keys.forEach((key,idx) => {
            if(toBeSaved.includes(key)) {
                if(key == "bets") {
                    const bets = JSON.parse(vals[idx]);

                    bets.forEach(bet => {
                        bet.betTime = admin.firestore.Timestamp.fromDate(new Date(bet.betTime._seconds*1000));
                    });

                    userObj[key] = bets;
                } else {
                    userObj[key] = vals[idx]
                }
            }
        });

        await db.collection(TABLES.USER_COLLECTION).doc(username).update(userObj);

        return res.status(200).json({ message: "Backup restored for user:", username});
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: `Failed to restore data for ${username}`, error: e });
    }
}

module.exports = {
    backupBetsData,
    restoreDataForUsername
}
