/*
 *  Package  : modules
 *  Filename : problem_tag.js
 *  Create   : 2018-02-05
 */

'use strict';

let ProblemTag = zoj.model('problem_tag');

app.get('/problems/tag/:id/edit', async (req, res) => {
	try {
		if (!res.locals.user || !await res.locals.user.admin >= 2) throw new ErrorMessage('您没有权限进行此操作。');

		let id = parseInt(req.params.id) || 0;
		let tag = await ProblemTag.fromID(id);

		if (!tag) {
			tag = await ProblemTag.create();
			tag.id = id;
		}

		res.render('problem_tag_edit', {
			tag: tag
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/problems/tag/:id/edit', async (req, res) => {
	try {
		if (!res.locals.user || !await res.locals.user.admin >= 2) throw new ErrorMessage('您没有权限进行此操作。');

		let id = parseInt(req.params.id) || 0;
		let tag = await ProblemTag.fromID(id);

		if (!tag) {
			tag = await ProblemTag.create();
			tag.id = id;
		}

		req.body.name = req.body.name.trim();
		if (tag.name !== req.body.name) {
			if (await ProblemTag.findOne({ where: { name: req.body.name } })) {
				throw new ErrorMessage('标签名称已被使用。');
			}
		}

		tag.name = req.body.name;
		tag.color = req.body.color;

		await tag.save();

		res.redirect(zoj.utils.makeUrl(['problems', 'tag', tag.id]));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});
