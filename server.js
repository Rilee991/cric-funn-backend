const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const apiRoutes = require('./routes');
const { firebaseConfig } = require('./config');

firebaseConfig.private_key = JSON.parse(firebaseConfig.private_key).privateKey;
admin.initializeApp({ credential: admin.credential.cert(firebaseConfig), storageBucket: 'cric-funn.appspot.com' });
const db = admin.firestore();
const bucket = admin.storage().bucket();

global.cricFunnBackend = {};
global.cricFunnBackend["db"] = db;
global.cricFunnBackend["bucket"] = bucket;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '10mb'}));

const port = 3000;

app.use('/cfb/', apiRoutes());

app.listen(port, () => {
  console.log(`Server listening at ${port}`);
});
