var keystone = require('keystone'),
    restUtils = require('./restUtils'),
    express = require('express'),
    router = express.Router();

var model = keystone.list('PrayerRequest').model;
var userModel = keystone.list('User').model;
var leaderAPIKey = process.env.LEADER_API_KEY;
var leaderFields = '-fcm_id';
var nonLeaderFields = '-genderPreference -contact -contactLeader -contacted -contactEmail -contactPhone';

router.route('/')
    .get(function (req, res) {
        var params = {};
        var isLeader = req.query.LeaderAPIKey == leaderAPIKey;
        if (!isLeader) {
            //remove leaders only prayer requests if not a leader
            params = { 'leadersOnly': { '$ne': true } };
            getAllPrayerRequests(res, nonLeaderFields, params);
        }
        else {
            //filter out gender preferred prayer requests depending on the gender of the leader
            var removeMale = { 'genderPreference': { '$ne': 1 } };
            var removeFemale = { 'genderPreference': { '$ne': 2 } };
            userModel.findById(req.query.userId).exec(function (err, item) {
                if (item) {
                    if (item.sex == 1) {
                        removeMale = {};
                    }
                    else if (item.sex == 2) {
                        removeFemale = {};
                    }
                }
                params = { $and: [removeMale, removeFemale] };
                getAllPrayerRequests(res, leaderFields, params);
            });
        }
    })
    .post(function (req, res) {
        restUtils.create(model, req, res);
    });

function getAllPrayerRequests(res, fields, params) {
    model.find(params).select(fields).populate('contactLeader', 'name').sort({ createdAt: 'descending' }).exec(function (err, items) {
        if (err) return res.send(err);
        items = formatPrayerResponses(items);
        return res.json(items);
    });
}

function formatPrayerResponses(items) {
    var length = items.length;
    for (var i = 0; i < length; i++) {
        var item = items[i].toObject();
        item.prayerResponseCount = item.prayerResponse.length;
        delete item.prayerResponse;
        delete item.fcm_id;
        items[i] = item;
    }
    return items;
}

router.route('/fcm_id')
    .get(function (req, res) {
        var params = { 'fcm_id': req.query.fcm_id };
        var isLeader = req.query.LeaderAPIKey && req.query.LeaderAPIKey == leaderAPIKey;
        model.find(params).select(isLeader ? leaderFields : nonLeaderFields).sort({ createdAt: 'descending' }).exec(function (err, items) {
            if (err) return res.send(err);
            items = formatPrayerResponses(items);
            return res.json(items);
        });
    });

router.route('/:id')
    .get(function (req, res) {
        var isLeader = req.query.LeaderAPIKey && req.query.LeaderAPIKey == leaderAPIKey;
        var populateFields = [{ path: 'prayerResponse', select: '-fcm_id' }, { path: 'contactLeader', select: 'name' }];
        model.findById(req.params.id).select(isLeader ? '' : nonLeaderFields).populate(populateFields).exec(function (err, item) {
            if (err) return res.status(400).send(err);
            if (!item) return res.status(400).send(item);
            var isAuthor = req.query.fcm_id && req.query.fcm_id == item.fcm_id;
            if (item.leadersOnly && !isLeader && !isAuthor) {
                return res.status(403).send('not authorized');
            }
            item = item.toObject();
            delete item.fcm_id;
            return res.status(200).json(item);
        });
    })
    .patch(function (req, res) {
        var isLeader = req.body.LeaderAPIKey == leaderAPIKey;
        if (isLeader) {
            model.findById(req.params.id).exec(function (err, item) {

                if (err) return res.send(err);
                if (!item) return res.send('not found');

                item.getUpdateHandler(req).process(req.body, function (err) {

                    if (err) return res.send(err);
                    var populateFields = [{ path: 'prayerResponse', select: '-fcm_id' }, { path: 'contactLeader', select: 'name' }];
                    model.populate(item, populateFields, function (err, popItem) {
                        return res.status(200).json(popItem);
                    });

                });

            });
        }
        else {
            return res.status(403).send('not authorized');
        }
    });

module.exports = router;