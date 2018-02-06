/*
 *  Package  : modules
 *  Filename : admin.js
 *  Create   : 2018-02-05
 */

let Problem = zoj.model('problem');
let JudgeState = zoj.model('judge_state');
let Article = zoj.model('article');
let Contest = zoj.model('contest');
let User = zoj.model('user');
const RatingCalculation = zoj.model('rating_calculation');
const RatingHistory = zoj.model('rating_history');
const calcRating = require('../libs/rating');


let db = zoj.db;

app.get('/admin/rating', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');
		const contests = await Contest.query(null, {}, [['start_time', 'desc']]);
		const calcs = await RatingCalculation.query(null, {}, [['id', 'desc']]);
		const util = require('util');
		for (const calc of calcs) await calc.loadRelationships();

		res.render('admin_rating', {
			contests: contests,
			calcs: calcs
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.post('/admin/rating/add', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');
		const contest = await Contest.fromID(req.body.contest);
		if (!contest) throw new ErrorMessage('无此比赛');

		await contest.loadRelationships();
		const newcalc = await RatingCalculation.create(contest.id);
		await newcalc.save();

		if (!contest.ranklist || contest.ranklist.ranklist.player_num <= 1) {
			throw new ErrorMessage("比赛人数太少。");
		}

		const players = [];
		for (let i = 1; i <= contest.ranklist.ranklist.player_num; i++) {
			const user = await User.fromID((await ContestPlayer.fromID(contest.ranklist.ranklist[i])).user_id);
			players.push({
				user: user,
				rank: i,
				currentRating: user.rating
			});
		}
		const newRating = calcRating(players);
		for (let i = 0; i < newRating.length; i++) {
			const user = newRating[i].user;
			user.rating = newRating[i].currentRating;
			await user.save();
			const newHistory = await RatingHistory.create(newcalc.id, user.id, newRating[i].currentRating, newRating[i].rank);
			await newHistory.save();
		}

		res.redirect(zoj.utils.makeUrl(['admin', 'rating']));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/admin/rating/delete', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');
		const calcList = await RatingCalculation.query(null, { id: { $gte: req.body.calc_id } }, [['id', 'desc']]);
		if (calcList.length === 0) throw new ErrorMessage('ID 不正确');

		for (let i = 0; i < calcList.length; i++) {
			await calcList[i].delete();
		}

		res.redirect(zoj.utils.makeUrl(['admin', 'rating']));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/admin/info', async (req, res) => {
	try {
		if (!res.locals.user || await res.locals.user.admin < 4) throw new ErrorMessage('您没有权限进行此操作。');

		let allSubmissionsCount = await JudgeState.count();
		let todaySubmissionsCount = await JudgeState.count({ submit_time: { $gte: zoj.utils.getCurrentDate(true) } });
		let problemsCount = await Problem.count();
		let articlesCount = await Article.count();
		let contestsCount = await Contest.count();
		let usersCount = await User.count();

		res.render('admin_info', {
			allSubmissionsCount: allSubmissionsCount,
			todaySubmissionsCount: todaySubmissionsCount,
			problemsCount: problemsCount,
			articlesCount: articlesCount,
			contestsCount: contestsCount,
			usersCount: usersCount
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

let configItems = {
	'title': { name: '站点标题', type: String },
	'邮箱验证': null,
	'register_mail.enabled': { name: '启用', type: Boolean },
	'register_mail.address': { name: '发件人地址', type: String },
	'register_mail.key': { name: '密钥', type: String },
	'默认参数': null,
	'default.problem.time_limit': { name: '时间限制（单位：ms）', type: Number },
	'default.problem.memory_limit': { name: '空间限制（单位：MiB）', type: Number },
	'限制': null,
	'limit.time_limit': { name: '最大时间限制（单位：ms）', type: Number },
	'limit.memory_limit': { name: '最大空间限制（单位：MiB）', type: Number },
	'limit.data_size': { name: '所有数据包大小（单位：byte）', type: Number },
	'limit.testdata': { name: '测试数据大小（单位：byte）', type: Number },
	'limit.submit_code': { name: '代码长度（单位：byte）', type: Number },
	'limit.submit_answer': { name: '提交答案题目答案大小（单位：byte）', type: Number },
	'limit.testdata_filecount': { name: '测试数据文件数量（单位：byte）', type: Number },
	'每页显示数量': null,
	'page.problem': { name: '题库', type: Number },
	'page.judge_state': { name: '提交记录', type: Number },
	'page.problem_statistics': { name: '题目统计', type: Number },
	'page.ranklist': { name: '排行榜', type: Number },
	'page.discussion': { name: '讨论', type: Number },
	'page.article_comment': { name: '评论', type: Number },
	'page.contest': { name: '比赛', type: Number },
	'编译器版本': null,
	'languages.cpp.version': { name: 'C++', type: String },
	'languages.cpp11.version': { name: 'C++11', type: String },
	'languages.c.version': { name: 'C', type: String },
	'languages.java.version': { name: 'Java', type: String },
	'languages.python3.version': { name: 'Python 3', type: String }
};

app.get('/admin/config', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		for (let i in configItems) {
			if (!configItems[i]) continue;
			configItems[i].val = eval(`zoj.config.${i}`);
		}

		res.render('admin_config', {
			items: configItems
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.post('/admin/config', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		for (let i in configItems) {
			if (!configItems[i]) continue;
			if (req.body[i]) {
				let val;
				if (configItems[i].type === Boolean) {
					val = req.body[i] === 'on';
				} else if (configItems[i].type === Number) {
					val = Number(req.body[i]);
				} else {
					val = req.body[i];
				}

				let f = new Function('val', `zoj.config.${i} = val`);
				f(val);
			}
		}

		await zoj.utils.saveConfig();

		res.redirect(zoj.utils.makeUrl(['admin', 'config']));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});


app.get('/admin/rejudge', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		res.render('admin_rejudge', {
			form: {},
			count: null
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.post('/admin/rejudge', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		let user = await User.fromName(req.body.submitter || '');
		let where = {};
		if (user) where.user_id = user.id;
		else if (req.body.submitter) where.user_id = -1;

		let minID = parseInt(req.body.min_id);
		if (isNaN(minID)) minID = 0;
		let maxID = parseInt(req.body.max_id);
		if (isNaN(maxID)) maxID = 2147483647;

		where.id = {
			$and: {
				$gte: parseInt(minID),
				$lte: parseInt(maxID)
			}
		};

		let minScore = parseInt(req.body.min_score);
		if (isNaN(minScore)) minScore = 0;
		let maxScore = parseInt(req.body.max_score);
		if (isNaN(maxScore)) maxScore = 100;

		where.score = {
			$and: {
				$gte: parseInt(minScore),
				$lte: parseInt(maxScore)
			}
		};

		let minTime = zoj.utils.parseDate(req.body.min_time);
		if (isNaN(minTime)) minTime = 0;
		let maxTime = zoj.utils.parseDate(req.body.max_time);
		if (isNaN(maxTime)) maxTime = 2147483647;

		where.submit_time = {
			$and: {
				$gte: parseInt(minTime),
				$lte: parseInt(maxTime)
			}
		};

		if (req.body.language) {
			if (req.body.language === 'submit-answer') where.language = '';
			else where.language = req.body.language;
		}
		if (req.body.status) where.status = { $like: req.body.status + '%' };
		if (req.body.problem_id) where.problem_id = parseInt(req.body.problem_id) || -1;

		let count = await JudgeState.count(where);
		if (req.body.type === 'rejudge') {
			let submissions = await JudgeState.query(null, where);
			for (let submission of submissions) {
				await submission.rejudge();
			}
		}

		res.render('admin_rejudge', {
			form: req.body,
			count: count
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.get('/admin/links', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		res.render('admin_links', {
			links: zoj.config.links || []
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.post('/admin/links', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		zoj.config.links = JSON.parse(req.body.data);
		await zoj.utils.saveConfig();

		res.redirect(zoj.utils.makeUrl(['admin', 'links']));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.get('/admin/raw', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		res.render('admin_raw', {
			data: JSON.stringify(zoj.config, null, 2)
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});

app.post('/admin/raw', async (req, res) => {
	try {
		if (!res.locals.user || !res.locals.user.admin >= 4) throw new ErrorMessage('您没有权限进行此操作。');

		zoj.config = JSON.parse(req.body.data);
		await zoj.utils.saveConfig();

		res.redirect(zoj.utils.makeUrl(['admin', 'raw']));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		})
	}
});
