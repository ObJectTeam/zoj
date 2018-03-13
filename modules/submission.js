/*
 *  Package  : modules
 *  Filename : submission.js
 *  Create   : 2018-02-05
 */

'use strict';

let JudgeState = zoj.model('judge_state');
let User = zoj.model('user');
let Contest = zoj.model('contest');

app.get('/submissions', async (req, res) => {
	try {
		let user = await User.fromName(req.query.submitter || '');
		let where = {};
		if (user) where.user_id = user.id;
		else if (req.query.submitter) where.user_id = -1;

		let minScore = parseInt(req.query.min_score);
		if (isNaN(minScore)) minScore = 0;
		let maxScore = parseInt(req.query.max_score);
		if (isNaN(maxScore)) maxScore = 100;

		where.score = {
			$and: {
				$gte: parseInt(minScore),
				$lte: parseInt(maxScore)
			}
		};

		if (req.query.language) {
			if (req.query.language === 'submit-answer') where.language = '';
			else where.language = req.query.language;
		}
		if (req.query.status) where.status = { $like: req.query.status + '%' };

		where.type = { $ne: 1 };

		if (!res.locals.user || !await res.locals.user.admin >= 3) {
			if (req.query.problem_id) {
				where.problem_id = {
					$and: [
						{ $in: zoj.db.literal('(SELECT `id` FROM `problem` WHERE `is_public` = 1' + (res.locals.user ? (' OR `user_id` = ' + res.locals.user.id) : '') + ')') },
						{ $eq: where.problem_id = parseInt(req.query.problem_id) || -1 }
					]
				};
			} else {
				where.problem_id = {
					$in: zoj.db.literal('(SELECT `id` FROM `problem` WHERE `is_public` = 1' + (res.locals.user ? (' OR `user_id` = ' + res.locals.user.id) : '') + ')'),
				};
			}
		} else {
			if (req.query.problem_id) where.problem_id = parseInt(req.query.problem_id) || -1;
		}

		let paginate = zoj.utils.paginate(await JudgeState.count(where), req.query.page, zoj.config.page.judge_state);
		let judge_state = await JudgeState.query(paginate, where, [['submit_time', 'desc']]);

		await judge_state.forEachAsync(async obj => obj.loadRelationships());
		await judge_state.forEachAsync(async obj => obj.allowedSeeCode = await obj.isAllowedSeeCodeBy(res.locals.user));
		await judge_state.forEachAsync(async obj => obj.allowedSeeData = await obj.isAllowedSeeDataBy(res.locals.user));
		await judge_state.forEachAsync(async obj => obj.allowedSee = await obj.isAllowedVisitBy(res.locals.user));

		res.render('submissions', {
			judge_state: judge_state,
			paginate: paginate,
			form: req.query
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/submissions/:ids/ajax', async (req, res) => {
	try {
		let ids = req.params.ids.split(','), rendered = {};

		for (let id of ids) {
			let judge_state = await JudgeState.fromID(id);
			if (!judge_state) throw new ErrorMessage('No such a submission.');

			await judge_state.loadRelationships();

			judge_state.allowedSeeCode = await judge_state.isAllowedSeeCodeBy(res.locals.user);
			judge_state.allowedSeeData = await judge_state.isAllowedSeeDataBy(res.locals.user);

			let contest;
			if (judge_state.type === 1) {
				contest = await Contest.fromID(judge_state.type_info);
				contest.ended = await contest.isEnded();

				let problems_id = await contest.getProblems();
				judge_state.problem_id = problems_id.indexOf(judge_state.problem_id) + 1;
				judge_state.problem.title = zoj.utils.removeTitleTag(judge_state.problem.title);

				if (contest.type === 'noi' && !contest.ended && !await judge_state.problem.isAllowedEditBy(res.locals.user)) {
					if (!['Compile Error', 'Waiting', 'Compiling'].includes(judge_state.status)) {
						judge_state.status = 'Submitted';
					}
				}
			}

			let o = { pending: judge_state.pending, html: null, status: judge_state.status };

			o.html = await require('util').promisify(app.render).bind(app)('submissions_item', {
				contest: contest,
				judge: judge_state
			});

			rendered[id] = o;
		}

		res.send(rendered);
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/submission/:id', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let judge = await JudgeState.fromID(id);
		if (!judge || !await judge.isAllowedVisitBy(res.locals.user)) throw new ErrorMessage('You do not have permission to do this.');

		let contest;
		if (judge.type === 1) {
			contest = await Contest.fromID(judge.type_info);
			contest.ended = await contest.isEnded();
		}

		await judge.loadRelationships();

		judge.allowedSeeCode = await judge.isAllowedSeeCodeBy(res.locals.user);
		judge.allowedSeeCase = await judge.isAllowedSeeCaseBy(res.locals.user);
		judge.allowedSeeData = await judge.isAllowedSeeDataBy(res.locals.user);
		judge.allowedRejudge = await judge.problem.isAllowedEditBy(res.locals.user);
		judge.allowedManage = await judge.problem.isAllowedManageBy(res.locals.user);

		if (judge.problem.type !== 'submit-answer') {
			judge.codeLength = judge.code.length;
			judge.code = await zoj.utils.highlight(judge.code, zoj.config.languages[judge.language].highlight);
		}
		// judge.allowedSeeCode |= judge.problem.judge_state.result.status == 'Accepted';

		let hideScore = false;
		if (contest) {
			let problems_id = await contest.getProblems();
			judge.problem_id = problems_id.indexOf(judge.problem_id) + 1;
			judge.problem.title = zoj.utils.removeTitleTag(judge.problem.title);

			if (contest.type === 'noi' && !contest.ended && !await judge.problem.isAllowedEditBy(res.locals.user)) {
				if (!['Compile Error', 'Waiting', 'Compiling'].includes(judge.status)) {
					judge.status = 'Submitted';
				}

				hideScore = true;
			}
		}
		res.render('submission', {
			hideScore, hideScore,
			contest: contest,
			judge: judge
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/submission/:id/ajax', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let judge = await JudgeState.fromID(id);
		if (!judge || !await judge.isAllowedVisitBy(res.locals.user)) throw new ErrorMessage('You do not have permission to do this.');

		let contest;
		if (judge.type === 1) {
			contest = await Contest.fromID(judge.type_info);
			contest.ended = await contest.isEnded();
		}

		await judge.loadRelationships();

		if (judge.problem.type !== 'submit-answer') {
			judge.codeLength = judge.code.length;
			judge.code = await zoj.utils.highlight(judge.code, zoj.config.languages[judge.language].highlight);
		}
		judge.allowedSeeCode = await judge.isAllowedSeeCodeBy(res.locals.user);
		judge.allowedSeeCase = await judge.isAllowedSeeCaseBy(res.locals.user);
		judge.allowedSeeData = await judge.isAllowedSeeDataBy(res.locals.user);
		judge.allowedRejudge = await judge.problem.isAllowedEditBy(res.locals.user);
		judge.allowedManage = await judge.problem.isAllowedManageBy(res.locals.user);

		let hideScore = false;
		if (contest) {
			let problems_id = await contest.getProblems();
			judge.problem_id = problems_id.indexOf(judge.problem_id) + 1;
			judge.problem.title = zoj.utils.removeTitleTag(judge.problem.title);

			if (contest.type === 'noi' && !contest.ended && !await judge.problem.isAllowedEditBy(res.locals.user)) {
				if (!['Compile Error', 'Waiting', 'Compiling'].includes(judge.status)) {
					judge.status = 'Submitted';
				}

				hideScore = true;
			}
		}

		res.render('submission_content', {
			hideScore, hideScore,
			contest: contest,
			judge: judge
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/submission/:id/rejudge', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let judge = await JudgeState.fromID(id);

		if (judge.pending && !(res.locals.user && await res.locals.user.admin >= 3)) throw new ErrorMessage('无法重新评测一个评测中的提交。');

		await judge.loadRelationships();

		let allowedRejudge = await judge.problem.isAllowedEditBy(res.locals.user);
		if (!allowedRejudge) throw new ErrorMessage('You do not have permission to do this.');

		await judge.rejudge();

		res.redirect(zoj.utils.makeUrl(['submission', id]));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});
