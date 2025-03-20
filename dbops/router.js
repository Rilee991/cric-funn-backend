const Router = require('express-promise-router');

const controller = require('./controller');

module.exports = () => {
    const router = Router({ mergeParams: true });

    router.route('/backupBetsData').post(controller.backupBetsData);
    router.route('/backupYearData').post(controller.backupYearData);
    router.route('/restoreDataForUsername').post(controller.restoreDataForUsername);
    router.route('/generateCareerData').post(controller.generateCareerData);

    return router;
};
