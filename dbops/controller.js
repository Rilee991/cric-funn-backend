const admin = require('firebase-admin');
const moment = require('moment');
const axios = require('axios');
const { get, orderBy } = require('lodash');
const Excel = require("exceljs");

const backupBetsData = async (req, res) => {
    try {
        const { db, bucket } = await global.cricFunnBackend;
        const resp = await db.collection("users").where("username", "in", ["ashu", "kelly", "desmond", "Broly", "SD", "Cypher33"]).get();
        const userDocs = await resp.docs;

        const excelSheet = createExcel(userDocs);

        const buffer = await excelSheet.xlsx.writeBuffer();
        const fileName = `${moment().format("DD_MM_YYYY")}`;
        const file = bucket.file(fileName);

        await file.save(buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: "03-17-2030",
        });

        await db.collection("backup_ipl_2023").doc(moment().format("YYYY_MM_DD_hh_mm_ss")).set({ url: signedUrl });

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
    const { username } = req.body;

    try {
        const { db } = await global.cricFunnBackend;

        const resp = await db.collection("backup_ipl_2023").get();
        const [latestDoc] = orderBy(resp.docs.map(doc => ({ ...doc.data(), id: doc.id })), ["id"],["desc"]);
        
        const excelBuff = await axios({ url: latestDoc.url, method: "get", responseType: 'arraybuffer' });
        const excelSheet = new Excel.Workbook();
        
        await excelSheet.xlsx.load(excelBuff.data);
        const userData = excelSheet.getWorksheet("Broly");
        const rows = userData.getRow();

        rows.forEach(row => {
            const bets = row.bets;
            const points = row.points;

            console.log(points);
        })

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
