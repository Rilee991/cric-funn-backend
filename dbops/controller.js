const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
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

        const docRef = db.collection(TABLES.CONFIGURATION_COLLECTION).doc(`${now.format("YYYY-MM-DD")}`);
        const docSnapshot = await docRef.get();
        const currData = docSnapshot.data();

        if(!docSnapshot.exists) {
            const record = {
                "backupUrl": signedUrl,
                "createdAt": getFirebaseCurrentTime(),
                "createdBy": "backupBetsData",
                "updatedAt": getFirebaseCurrentTime(),
                "updatedBy": "backupBetsData",
                "backupCreatedAt": getFirebaseCurrentTime()
            };

            docRef.set(record);
        } else {
            const record = {
                ...currData,
                "backupUrl": signedUrl,
                "updatedAt": getFirebaseCurrentTime(),
                "updatedBy": "backupBetsData",
                "backupCreatedAt": getFirebaseCurrentTime()
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

const backupYearData = async (req, res) => {
    try {
        const { db, bucket } = await global.cricFunnBackend;
        // console.log(`Fetching users data from db`);
        // const resp = await db.collection(TABLES.USER_COLLECTION).get();
        // const userDocs = await resp.docs;
        // console.log(`Users data fetched successfully!`);


        // THIS IS FOR STORING DATA FROM EXCEL SHEET

        // let workbook = new Excel.Workbook();
        // const fileName = '01_06_2023.xlsx';
        // const userDocs = [];

        // workbook.xlsx.readFile(fileName)
        // .then(function() {
        //     let worksheets = workbook.worksheets;

        //     worksheets.forEach(worksheet => {
        //         const user = {};

        //         worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
        //             if(rowNumber === 1) {
        //                 row.values.forEach((col, idx) => user[idx] = col);
        //             } else {
        //                 row.values.forEach((val, idx) => {
        //                     const col = user[idx];
        //                     user[col] = ["bets", "updatedAt"].includes(col) ? JSON.parse(val) : val;

        //                     delete user[idx];
        //                 });
        //             }
        //         });

        //         userDocs.push(user);
        //     });

        //     userDocs.forEach(async (user, idx) => {
        //         await db.collection("users_2023_ipl_dump").doc(user.username).set(user);
        //         console.log(idx);
        //     });
        // });

        // THIS IS FOR STORING DATA FROM ANOTHER TABLE IN FIREBASE

        // userDocs.forEach(async (user, idx) => {
        //     await db.collection("users_2024_ipl_dump").doc(user.id).set(user.data());
        //     console.log(idx);
        // });

        
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
        const now = moment();
        const { db } = await global.cricFunnBackend;

        const resp = await db.collection(TABLES.CONFIGURATION_COLLECTION).orderBy("backupCreatedAt", "desc").limit(1).get();
        const [configDetails] = resp.docs.map(doc => doc.data());

        if(!configDetails.backupUrl)    return res.status(200).json({ message: "No backup url found" });

        console.log(`Backup url found for ${new Date(configDetails.backupCreatedAt._seconds*1000)}`)

        const excelBuff = await axios({ url: configDetails.backupUrl, method: "get", responseType: 'arraybuffer' });
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
        return res.status(500).json({ message: `Failed to restore data for ${username}`, error: e });
    }
}

const getFirebaseCurrentTime = () => {
    return admin.firestore.Timestamp.fromDate(new Date());
}

module.exports = {
    backupBetsData,
    backupYearData,
    restoreDataForUsername
}
