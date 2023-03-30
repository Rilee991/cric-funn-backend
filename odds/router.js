const Router = require('express-promise-router');

const controller = require('./controller');

module.exports = () => {
    const router = Router({ mergeParams: true });

    router.route('/updateOddsForIpl').post(controller.updateOddsForIpl);

    return router;
};
