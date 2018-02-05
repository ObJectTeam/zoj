/*
 *  This file is part of ZOJ.
 *
 *  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
 *
 *  ZOJ is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  ZOJ is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public
 *  License along with ZOJ. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

let User = zoj.model('user');

// Ranklist
app.get('/ranklist', async (req, res) => {
	try {
		let paginate = zoj.utils.paginate(await User.count({ is_show: true }), req.query.page, zoj.config.page.ranklist);
		let ranklist = await User.query(paginate, { is_show: true }, [['ac_num', 'desc']]);
		await ranklist.forEachAsync(async x => x.renderInformation());

		res.render('ranklist', {
			ranklist: ranklist,
			paginate: paginate
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
		await user.renderInformation();
		user.emailVisible = user.public_email || user.allowedEdit;

		res.render('user', {
			show_user: user,
			statistics: statistics
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

		if (req.body.old_password && req.body.new_password) {
			if (user.password !== req.body.old_password && !await res.locals.user.admin >= 3) throw new ErrorMessage('旧密码错误。');
			user.password = req.body.new_password;
		}

		if (res.locals.user && await res.locals.user.admin >= 3) {
			if (!zoj.utils.isValidUsername(req.body.username)) throw new ErrorMessage('无效的用户名。');
			user.username = req.body.username;
			user.email = req.body.email;
		}

		if(req.body.admin && await res.locals.user.admin >= 3){
			user.admin = req.body.admin;
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
