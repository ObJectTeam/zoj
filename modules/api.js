/*
 *  Package  : modules
 *  Filename : api.js
 *  Create   : 2018-02-05
 */

'use strict';

let User = zoj.model('user');
let Problem = zoj.model('problem');
let File = zoj.model('file');
const Email = require('../libs/email');
const WebToken = require('jsonwebtoken');

function setLoginCookie(username, password, res) {
	res.cookie('login', JSON.stringify([username, password]));
}

// Login
app.post('/api/login', async (req, res) => {
	try {
		res.setHeader('Content-Type', 'application/json');
		let user = await User.fromName(req.body.username);

		if (!user) res.send({ error_code: 1001 });
		else if (!await user.is_show) res.send({ error_code: 1003 });
		else if (user.password !== req.body.password) res.send({ error_code: 1002 });
		else {
			req.session.user_id = user.id;
			setLoginCookie(user.username, user.password, res);
			res.send({ error_code: 1 });
		}
	} catch (e) {
		zoj.log(e);
		res.send({ error_code: e });
	}
});

app.post('/api/forget', async (req, res) => {
	try {
		res.setHeader('Content-Type', 'application/json');
		let user = await User.fromEmail(req.body.email);
		if (!user) throw 1001;
		let sendObj = {
			userId: user.id,
		};

		const token = WebToken.sign(sendObj, zoj.config.session_secret, {
			subject: 'forget',
			expiresIn: '1h'
		});

		const vurl = zoj.config.hostname + zoj.utils.makeUrl(['api', 'forget_confirm'], { token: token });
		try {
			await Email.send(user.email,
				`${user.username} 的 ${zoj.config.title} 密码重置邮件`,
				`<p>请于1小时内点击该链接来重置密码：</p><p><a href="${vurl}">${vurl}</a></p><p>链接有效期为 12h。如果您不是 ${user.username}，请忽略此邮件。</p>`
			);
		} catch (e) {
			return res.send({
				error_code: 2010,
				message: require('util').inspect(e)
			});
			return null;
		}

		res.send({ error_code: 1 });
	} catch (e) {
		zoj.log(e);
		res.send(JSON.stringify({ error_code: e }));
	}
});

// Sign up
app.post('/api/sign_up', async (req, res) => {
	try {
		res.setHeader('Content-Type', 'application/json');
		let user = await User.fromName(req.body.username);
		if (user) throw 2008;
		user = await User.findOne({ where: { email: req.body.email } });
		if (user) throw 2009;


		if (!(req.body.email = req.body.email.trim())) throw 2006;
		if (!zoj.utils.isValidUsername(req.body.username)) throw 2002;

		if (zoj.config.register_mail.enabled) {
			let sendObj = {
				username: req.body.username,
				password: req.body.password,
				email: req.body.email,
			};

			const token = WebToken.sign(sendObj, zoj.config.session_secret, {
				subject: 'register',
				expiresIn: '1h'
			});

			const vurl = zoj.config.hostname + zoj.utils.makeUrl(['api', 'sign_up_confirm'], { token: token });
			try {
				await Email.send(req.body.email,
					`${req.body.username} 的 ${zoj.config.title} 注册验证邮件`,
					`<p>请于1小时内点击该链接完成您在 ${zoj.config.title} 的注册：</p><p><a href="${vurl}">${vurl}</a></p><p>如果您不是 ${req.body.username}，请忽略此邮件。</p>`
				);
			} catch (e) {
				return res.send({
					error_code: 2010,
					message: require('util').inspect(e)
				});
			}

			res.send(JSON.stringify({ error_code: 2 }));
		} else {
			user = await User.create({
				username: req.body.username,
				password: req.body.password,
				email: req.body.email,
				public_email: true
			});
			await user.save();

			res.send(JSON.stringify({ error_code: 1 }));
		}
	} catch (e) {
		zoj.log(e);
		res.send(JSON.stringify({ error_code: e }));
	}
});

app.get('/api/forget_confirm', async (req, res) => {
	try {
		try {
			WebToken.verify(req.query.token, zoj.config.session_secret, { subject: 'forget' });
		} catch (e) {
			throw new ErrorMessage("Token 不正确。");
		}
		res.render('forget_confirm', {
			token: req.query.token
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/api/reset_password', async (req, res) => {
	try {
		res.setHeader('Content-Type', 'application/json');
		let obj;
		try {
			obj = WebToken.verify(req.body.token, zoj.config.session_secret, { subject: 'forget' });
		} catch (e) {
			throw 3001;
		}

		const user = await User.fromID(obj.userId);
		user.password = req.body.password;
		await user.save();

		res.send(JSON.stringify({ error_code: 1 }));
	} catch (e) {
		zoj.log(e);
		if (typeof e === 'number') {
			res.send(JSON.stringify({ error_code: e }));
		} else {
			res.send(JSON.stringify({ error_code: 1000 }));
		}
	}
});

app.get('/api/sign_up_confirm', async (req, res) => {
	try {
		let obj;
		try {
			obj = WebToken.verify(req.query.token, zoj.config.session_secret, { subject: 'register' });
		} catch (e) {
			throw new ErrorMessage('无效的注册验证链接: ' + e.toString());
		}

		let user = await User.fromName(obj.username);
		if (user) throw new ErrorMessage('用户名已被占用。');
		user = await User.findOne({ where: { email: obj.email } });
		if (user) throw new ErrorMessage('邮件地址已被占用。');

		if (!(obj.email = obj.email.trim())) throw new ErrorMessage('邮件地址不能为空。');
		if (!zoj.utils.isValidUsername(obj.username)) throw new ErrorMessage('用户名不合法。');

		user = await User.create({
			username: obj.username,
			password: obj.password,
			email: obj.email,
			public_email: true
		});
		await user.save();

		req.session.user_id = user.id;
		setLoginCookie(user.username, user.password, res);

		res.redirect(obj.prevUrl || '/');
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

// Markdown
app.post('/api/markdown', async (req, res) => {
	try {
		let s = await zoj.utils.markdown(req.body.s.toString());
		res.send(s);
	} catch (e) {
		zoj.log(e);
		res.send(e);
	}
});

app.get('/static/uploads/answer/:md5', async (req, res) => {
	try {
		res.sendFile(File.resolvePath('answer', req.params.md5));
	} catch (e) {
		res.status(500).send(e);
	}
});