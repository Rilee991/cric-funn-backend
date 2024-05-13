const Router = require('express-promise-router');

const controller = require('./controller');

module.exports = () => {
    const router = Router({ mergeParams: true });

    router.route('/updateOddsForIpl').post(controller.updateOddsForIpl);
    router.route('/syncMatches').post(controller.syncMatches);

    return router;
};
