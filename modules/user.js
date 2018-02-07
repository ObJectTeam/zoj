'use strict';

let User = zoj.model('user');
const RatingCalculation = zoj.model('rating_calculation');
const RatingHistory = zoj.model('rating_history');
const Contest = zoj.model('contest');
const ContestPlayer = zoj.model('contest_player');

// Ranklist
app.get('/ranklist', async (req, res) => {
	try {
		const sort = req.query.sort || zoj.config.sorting.ranklist.field;
		const order = req.query.order || zoj.config.sorting.ranklist.order;
		if (!['ac_num', 'rating', 'id', 'username', 'admin'].includes(sort) || !['asc', 'desc'].includes(order)) {
			throw new ErrorMessage('错误的排序参数。');
		}
		let paginate = zoj.utils.paginate(await User.count({ is_show: true }), req.query.page, zoj.config.page.ranklist);
		let ranklist = await User.query(paginate, { is_show: true }, [[sort, order]]);

		res.render('ranklist', {
			privilege: res.locals.user && res.locals.user.admin >= 4,
			ranklist: ranklist,
			paginate: paginate,
			curSort: sort,
			curOrder: order === 'asc'
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/find_user', async (req, res) => {
	try {
		let user = await User.fromName(req.query.nickname);
		if (!user) throw new ErrorMessage('无此用户。');
		res.redirect(zoj.utils.makeUrl(['user', user.id]));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

// Login
app.get('/login', async (req, res) => {
	if (res.locals.user) {
		res.render('error', {
			err: new ErrorMessage('您已经登录了，请先注销。', { '注销': zoj.utils.makeUrl(['logout'], { 'url': req.originalUrl }) })
		});
	} else {
		res.render('login');
	}
});

// Sign up
app.get('/sign_up', async (req, res) => {
	if (res.locals.user) {
		res.render('error', {
			err: new ErrorMessage('您已经登录了，请先注销。', { '注销': zoj.utils.makeUrl(['logout'], { 'url': req.originalUrl }) })
		});
	} else {
		res.render('sign_up');
	}
});

// Logout
app.post('/logout', async (req, res) => {
	req.session.user_id = null;
	res.clearCookie('login');
	res.redirect(req.query.url || '/');
});

// User page
app.get('/user/:id', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let user = await User.fromID(id);
		if (!user) throw new ErrorMessage('无此用户。');
		user.ac_problems = await user.getACProblems();
		user.articles = await user.getArticles();
		user.allowedEdit = await user.isAllowedEditBy(res.locals.user);

		let statistics = await user.getStatistics();
		user.emailVisible = user.public_email || user.allowedEdit;

		const ratingHistoryValues = await RatingHistory.query(null, { user_id: user.id }, [['rating_calculation_id', 'asc']]);
		const ratingHistories = [{
			contestName: "初始积分",
			value: zoj.config.default.user.rating,
			delta: null,
			rank: null
		}];

		for (const history of ratingHistoryValues) {
			const contest = await Contest.fromID((await RatingCalculation.fromID(history.rating_calculation_id)).contest_id);
			ratingHistories.push({
				contestName: contest.title,
				value: history.rating_after,
				delta: history.rating_after - ratingHistories[ratingHistories.length - 1].value,
				rank: history.rank,
				participants: await ContestPlayer.count({ contest_id: contest.id })
			});
		}
		ratingHistories.reverse();

		res.render('user', {
			show_user: user,
			statistics: statistics,
			ratingHistories: ratingHistories
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/user/:id/edit', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let user = await User.fromID(id);
		if (!user) throw new ErrorMessage('无此用户。');

		let allowedEdit = await user.isAllowedEditBy(res.locals.user);
		if (!allowedEdit) {
			throw new ErrorMessage('您没有权限进行此操作。');
		}

		res.locals.user.allowedManage = await res.locals.user.admin >= 3;

		res.render('user_edit', {
			edited_user: user,
			error_info: null
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/user/:id/edit', async (req, res) => {
	let user;
	try {
		let id = parseInt(req.params.id);
		user = await User.fromID(id);
		if (!user) throw new ErrorMessage('无此用户。');

		let allowedEdit = await user.isAllowedEditBy(res.locals.user);
		if (!allowedEdit) throw new ErrorMessage('您没有权限进行此操作。');

		if (req.body.admin && res.locals.user.id == user.id)
			throw new ErrorMessage('You cannot change your privilege.');
		
		let is_show = req.body.is_show ? 0 : 1;

		if(is_show != user.is_show  && res.locals.user.id == user.id)
			throw new ErrorMessage('You cannot ban yourself.');

		if (req.body.admin && (await res.locals.user.admin < 3 || res.locals.user.admin <= user.admin))
			throw new ErrorMessage('您没有权限进行此操作。');

		if (req.body.old_password && req.body.new_password) {
			if (user.password !== req.body.old_password && !await res.locals.user.admin >= 3) throw new ErrorMessage('旧密码错误。');
			user.password = req.body.new_password;
		}

		if (res.locals.user && await res.locals.user.admin >= 3) {
			if (!zoj.utils.isValidUsername(req.body.username)) throw new ErrorMessage('无效的用户名。');
			user.username = req.body.username;
			user.email = req.body.email;
		}

		if(await res.locals.user.admin >= 3 && res.locals.user.admin > user.admin){
			if(req.body.admin)user.admin = req.body.admin;
			user.is_show = is_show;
		}

		user.information = req.body.information;
		user.sex = req.body.sex;
		user.public_email = (req.body.public_email === 'on');

		await user.save();

		if (user.id === res.locals.user.id) res.locals.user = user;

		res.locals.user.allowedManage = await res.locals.user.admin >= 3;

		res.render('user_edit', {
			edited_user: user,
			error_info: ''
		});
	} catch (e) {
		res.locals.user.allowedManage = await res.locals.user.admin >= 3;

		res.render('user_edit', {
			edited_user: user,
			error_info: e.message
		});
	}
});
