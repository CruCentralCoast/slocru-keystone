var async = require('async'),
	keystone = require('keystone'),
    restUtils = require('./restUtils'),
	express = require('express'),
	router = express.Router();

var CommunityGroup = keystone.list("CommunityGroup");
var MinistryQuestionAnswer = keystone.list('MinistryQuestionAnswer').model;
var model = CommunityGroup.model;

router.route('/')
	.get(function(req, res, next) {
		restUtils.list(model, req, res);
	})
	.post(function(req, res, next) {
		restUtils.create(model, req, res);
	});

router.route('/:id')
	.get(function(req, res, next) {
		restUtils.get(model, req, res);
	})
	.patch(function(req, res, next) {
		restUtils.update(model, req, res);
	});

router.route('/search')
	.post(function(req, res, next) {
		restUtils.search(model, req, res);
	});

router.route('/enumValues/:key')
	.get(function(req, res, next) {
		restUtils.enumValues(model, req, res);
	});

router.route('/find')
	.post(function(req, res, next) {
		restUtils.find(model, req, res);
	});

router.route('/:id/answers')
	.get(function(req, res, next) {
		MinistryQuestionAnswer.find({communityGroup : req.params.id}).exec(function(err, answers) {
			if (err) return res.send(err);
			return res.json(answers);
		});
	});

module.exports = router;
