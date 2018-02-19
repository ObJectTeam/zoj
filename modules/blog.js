/*
 *  Package  : modules
 *  Filename : blog.js
 *  Create   : 2018-02-05
 */

'use strict';

let BlogPost = zoj.model('blog_post');
let BlogPostTag = zoj.model('blog_post_tag');

app.get('/blogs', async (req, res) => {
	try {
		let where = {};
		if (!res.locals.user) {
			where = {
				$and: {
					is_public: 1,
					is_protected: 0
				}
			};
		} else if (res.locals.user.admin < 1) {
			where = {
				$or: {
					$and: {
						is_public: 1,
						is_protected: 0
					},
					user_id: res.locals.user.id
				}
			};
		} else if (res.locals.user.admin < 3) {
			where = {
				$or: {
					is_public: 1,
					user_id: res.locals.user.id
				}
			};
		}

		let paginate = zoj.utils.paginate(await Problem.count(where), req.query.page, zoj.config.page.problem);
		let problems = await Problem.query(paginate, where);

		await problems.forEachAsync(async problem => {
			problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
			problem.judge_state = await problem.getJudgeState(res.locals.user, true);
			problem.tags = await problem.getTags();
		});

		res.render('problems', {
			allowedManageTag: res.locals.user && await res.locals.user.admin >= 2,
			problems: problems,
			paginate: paginate
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/blogs/search', async (req, res) => {
	try {
		let id = parseInt(req.query.keyword) || 0;

		let where = {
			$or: {
				title: { like: `%${req.query.keyword}%` },
				id: id
			}
		};

		if (!res.locals.user) {
			where = {
				$and: [
					where,
					{
						$and: {
							is_public: 1,
							is_protected: 0
						}
					}
				]
			};
		} else if (res.locals.user.admin < 1) {
			where = {
				$and: [
					where,
					{
						$or: {
							$and: {
								is_public: 1,
								is_protected: 0
							},
							user_id: res.locals.user.id
						}
					}
				]
			};
		} else if (res.locals.user.admin < 3) {
			where = {
				$and: [
					where,
					{
						$or: {
							is_public: 1,
							user_id: res.locals.user.id
						}
					}
				]
			};
		}

		let order = [zoj.db.literal('`id` = ' + id + ' DESC'), ['id', 'ASC']];

		let paginate = zoj.utils.paginate(await Problem.count(where), req.query.page, zoj.config.page.problem);
		let problems = await Problem.query(paginate, where, order);

		await problems.forEachAsync(async problem => {
			problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
			problem.judge_state = await problem.getJudgeState(res.locals.user, true);
			problem.tags = await problem.getTags();
		});

		res.render('problems', {
			allowedManageTag: res.locals.user && await res.locals.user.admin >= 2,
			problems: problems,
			paginate: paginate
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/blogs/tag/:tagIDs', async (req, res) => {
	try {
		let tagIDs = Array.from(new Set(req.params.tagIDs.split(',').map(x => parseInt(x))));
		let tags = await tagIDs.mapAsync(async tagID => ProblemTag.fromID(tagID));

		// Validate the tagIDs
		for (let tag of tags) {
			if (!tag) {
				return res.redirect(zoj.utils.makeUrl(['problems']));
			}
		}

		let sql = 'SELECT * FROM `problem` WHERE\n';
		for (let tagID of tagIDs) {
			if (tagID !== tagIDs[0]) {
				sql += 'AND\n';
			}

			sql += '`problem`.`id` IN (SELECT `problem_id` FROM `problem_tag_map` WHERE `tag_id` = ' + tagID + ')';
		}

		if (!res.locals.user || !await res.locals.user.admin >= 2) {
			if (res.locals.user) {
				sql += 'AND (`problem`.`is_public` = 1 OR `problem`.`user_id` = ' + res.locals.user.id + ')';
			} else {
				sql += 'AND (`problem`.`is_public` = 1)';
			}
		}

		let paginate = zoj.utils.paginate(await Problem.count(sql), req.query.page, zoj.config.page.problem);
		let problems = await Problem.query(sql + paginate.toSQL());

		await problems.forEachAsync(async problem => {
			problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
			problem.judge_state = await problem.getJudgeState(res.locals.user, true);
			problem.tags = await problem.getTags();
		});

		res.render('problems', {
			allowedManageTag: res.locals.user && await res.locals.user.admin >= 2,
			problems: problems,
			tags: tags,
			paginate: paginate
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/post/:id', async (req, res) => {
	try {
		let id = parseInt(req.params.id);
		let problem = await Problem.fromID(id);
		if (!problem) throw new ErrorMessage('无此题目。');

		if (!await problem.isAllowedUseBy(res.locals.user)) {
			throw new ErrorMessage('您没有权限进行此操作。');
		}

		problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
		problem.allowedManage = await problem.isAllowedManageBy(res.locals.user);

		if (problem.is_public || problem.allowedEdit) {
			await zoj.utils.markdown(problem, ['description', 'input_format', 'output_format', 'example', 'limit_and_hint']);
		} else {
			throw new ErrorMessage('您没有权限进行此操作。');
		}

		let state = await problem.getJudgeState(res.locals.user, false);

		problem.tags = await problem.getTags();
		await problem.loadRelationships();

		let testcases = await zoj.utils.parseTestdata(problem.getTestdataPath(), problem.type === 'submit-answer');

		let discussionCount = await Article.count({ problem_id: id });

		res.render('problem', {
			problem: problem,
			state: state,
			lastLanguage: res.locals.user ? await res.locals.user.getLastSubmitLanguage() : null,
			testcases: testcases,
			discussionCount: discussionCount
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/post/:id/edit', async (req, res) => {
	try {
		let id = parseInt(req.params.id) || 0;
		let post = await BlogPost.fromID(id);

		if (!post) {
			if (!res.locals.user) throw new ErrorMessage('请登录后继续。', { '登录': zoj.utils.makeUrl(['login'], { 'url': req.originalUrl }) });
			post = await BlogPost.create();
			post.id = id;
			post.allowedEdit = true;
			post.tags = [];
			post.new = true;
		} else {
			if (!await post.isAllowedSeeBy(res.locals.user)) throw new ErrorMessage('您没有权限进行此操作。');
			post.allowedEdit = await post.isAllowedEditBy(res.locals.user);
			post.tags = await post.getTags();
		}

		res.render('post_edit', {
			post: post
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.post('/post/:id/edit', async (req, res) => {
	try {
		let id = parseInt(req.params.id) || 0;
		let post = await BlogPost.fromID(id);
		if (!post) {
			if (!res.locals.user) throw new ErrorMessage('请登录后继续。', { '登录': zoj.utils.makeUrl(['login'], { 'url': req.originalUrl }) });

			post = await BlogPost.create();
			post.user_id = res.locals.user.id;
		} else {
			if (!await post.isAllowedSeeBy(res.locals.user)) throw new ErrorMessage('您没有权限进行此操作。');
			if (!await post.isAllowedEditBy(res.locals.user)) throw new ErrorMessage('您没有权限进行此操作。');
		}

		if (!req.body.title.trim()) throw new ErrorMessage('博客名不能为空。');
		post.title = req.body.title;
		post.content = req.body.content;

		// Save the post first, to have the `id` allocated
		await post.save();

		if (!req.body.tags) {
			req.body.tags = [];
		} else if (!Array.isArray(req.body.tags)) {
			req.body.tags = [req.body.tags];
		}

		let newTagIDs = await req.body.tags.map(x => parseInt(x)).filterAsync(async x => BlogPostTag.fromID(x));
		await post.setTags(newTagIDs);

		res.redirect(zoj.utils.makeUrl(['post', post.id]));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});


// Set post public
async function setPublic(req, res, is_public) {
	try {
		let id = parseInt(req.params.id);
		let post = await BlogPost.fromID(id);
		if (!post) throw new ErrorMessage('无此博客。');

		let allowedEdit = await post.isAllowedEditBy(res.locals.user);
		if (!allowedEdit) throw new ErrorMessage('您没有权限进行此操作。');

		post.is_public = is_public;
		await post.save();

		res.redirect(zoj.utils.makeUrl(['post', id]));
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
}

app.post('/post/:id/public', async (req, res) => {
	await setPublic(req, res, true);
});

app.post('/post/:id/dis_public', async (req, res) => {
	await setPublic(req, res, false);
});