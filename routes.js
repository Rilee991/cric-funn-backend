const express = require('express');

const oddsRouter = require('./odds/router');
const dbOpsRouter = require('./dbops/router');

const expressRouter = express.Router();

module.exports = () => {
    return expressRouter.use("/odds", oddsRouter())
    .use("/dbops", dbOpsRouter())
    .get('/healthcheck', (req, res) => {
        res.send('cric-funn-backend is up and running');
    })
    .all('*', () => {
        throw new Error("Api doesn't exists");
    });
};
