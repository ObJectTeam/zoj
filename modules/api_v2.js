/*
 *  Package  : modules
 *  Filename : api_v2.js
 *  Create   : 2018-02-05
 */

'use strict';

app.get('/api/v2/search/problems/:keyword*?', async (req, res) => {
	try {
		let Problem = zoj.model('problem');

		let keyword = req.params.keyword || '';
		let problems = await Problem.query(null, {
			title: { like: `%${req.params.keyword}%` }
		}, [['id', 'asc']]);

		let result = [];

		let id = parseInt(keyword);
		if (id) {
			let problemById = await Problem.fromID(parseInt(keyword));
			if (problemById && await problemById.isAllowedUseBy(res.locals.user)) {
				result.push(problemById);
			}
		}
		await problems.forEachAsync(async problem => {
			if (await problem.isAllowedUseBy(res.locals.user) && result.length < zoj.config.page.edit_contest_problem_list && problem.id !== id) {
				result.push(problem);
			}
		});

		result = result.map(x => ({ name: `#${x.id}. ${x.title}`, value: x.id, url: zoj.utils.makeUrl(['problem', x.id]) }));
		res.send({ success: true, results: result });
	} catch (e) {
		zoj.log(e);
		res.send({ success: false });
	}
});

app.get('/api/v2/search/blogs/:keyword*?', async (req, res) => {
	try {
		let BlogPost = zoj.model('blog_post');

		let keyword = req.params.keyword || '';
		let posts = await BlogPost.query(null, {
			title: { like: `%${req.params.keyword}%` }
		}, [['id', 'desc']]);

		let result = [];

		let id = parseInt(keyword);
		if (id) {
			let postByID = await BlogPost.fromID(parseInt(keyword));
			if (postByID && await postByID.isAllowedSeeBy(res.locals.user)) {
				result.push(postByID);
			}
		}
		await posts.forEachAsync(async post => {
			if (await post.isAllowedSeeBy(res.locals.user) && result.length < zoj.config.page.edit_contest_problem_list && post.id !== id) {
				result.push(post);
			}
		});

		result = result.map(x => ({ name: `#${x.id}. ${x.title}`, value: x.id, url: zoj.utils.makeUrl(['blog', x.id]) }));
		res.send({ success: true, results: result });
	} catch (e) {
		zoj.log(e);
		res.send({ success: false });
	}
});

app.get('/api/v2/search/tags_problem/:keyword*?', async (req, res) => {
	try {
		let Problem = zoj.model('problem');
		let ProblemTag = zoj.model('problem_tag');

		let keyword = req.params.keyword || '';
		let tags = await ProblemTag.query(null, {
			name: { like: `%${req.params.keyword}%` }
		}, [['name', 'asc']]);

		let result = tags.slice(0, zoj.config.page.edit_problem_tag_list);

		result = result.map(x => ({ name: x.name, value: x.id }));
		res.send({ success: true, results: result });
	} catch (e) {
		zoj.log(e);
		res.send({ success: false });
	}
});


app.get('/api/v2/search/tags_blog_post/:keyword*?', async (req, res) => {
	try {
		let Problem = zoj.model('blog_post');
		let ProblemTag = zoj.model('blog_post_tag');

		let keyword = req.params.keyword || '';
		let tags = await ProblemTag.query(null, {
			name: { like: `%${req.params.keyword}%` }
		}, [['name', 'asc']]);

		let result = tags.slice(0, zoj.config.page.edit_problem_tag_list);

		result = result.map(x => ({ name: x.name, value: x.id }));
		res.send({ success: true, results: result });
	} catch (e) {
		zoj.log(e);
		res.send({ success: false });
	}
});

app.apiRouter.post('/api/v2/markdown', async (req, res) => {
	try {
		let s = await zoj.utils.markdown(req.body.s.toString(), null, req.body.noReplaceUI === 'true');
		res.send(s);
	} catch (e) {
		zoj.log(e);
		res.send(e);
	}
});

// APIs for judge client
app.apiRouter.post('/api/v2/judge/peek', async (req, res) => {
	try {
		if (req.query.session_id !== zoj.config.judge_token) return res.status(404).send({ err: 'Permission denied' });

		let WaitingJudge = zoj.model('waiting_judge');
		let JudgeState = zoj.model('judge_state');

		let judge_state;
		await zoj.utils.lock('/api/v2/judge/peek', async () => {
			let waiting_judge = await WaitingJudge.findOne({ order: [['priority', 'ASC'], ['id', 'ASC']] });
			if (!waiting_judge) {
				return;
			}

			if (waiting_judge.type === 'submission') {
				judge_state = await waiting_judge.getJudgeState();
				await judge_state.loadRelationships();
			}
			await waiting_judge.destroy();
		});

		if (judge_state) {
			if (judge_state.problem.type === 'submit-answer') {
				res.send({
					have_task: 1,
					judge_id: judge_state.id,
					answer_file: judge_state.code,
					testdata: judge_state.problem.id,
					problem_type: judge_state.problem.type,
					type: 'submission'
				});
			} else {
				res.send({
					have_task: 1,
					judge_id: judge_state.id,
					code: judge_state.code,
					language: judge_state.language,
					testdata: judge_state.problem.id,
					time_limit: judge_state.problem.time_limit,
					memory_limit: judge_state.problem.memory_limit,
					file_io: judge_state.problem.file_io,
					file_io_input_name: judge_state.problem.file_io_input_name,
					file_io_output_name: judge_state.problem.file_io_output_name,
					problem_type: judge_state.problem.type,
					type: 'submission'
				});
			}
		} else {
			res.send({ have_task: 0 });
		}
	} catch (e) {
		res.status(500).send(e);
	}
});

app.apiRouter.post('/api/v2/judge/update/:id', async (req, res) => {
	try {
		if (req.query.session_id !== zoj.config.judge_token) return res.status(404).send({ err: 'Permission denied' });

		if (req.body.type === 'submission') {
			let JudgeState = zoj.model('judge_state');
			let judge_state = await JudgeState.fromID(req.params.id);
			await judge_state.updateResult(JSON.parse(req.body.result));
			await judge_state.save();
			await judge_state.updateRelatedInfo();
		}

		res.send({ return: 0 });
	} catch (e) {
		zoj.log(e);
		res.status(500).send(e);
	}
});

app.apiRouter.get('/api/v2/problemdata/:id/:token', async (req, res) => {
	try {
		let token = req.params.token;
		if (token !== zoj.config.judge_token) return res.status(404).send({ err: 'Permission denied' });

		let Problem = zoj.model('problem');

		let id = parseInt(req.params.id);
		let problem = await Problem.fromID(id);

		if (!problem) return res.status(404).send({ err: 'Permission denied' });

		if (!await zoj.utils.isFile(problem.getTestdataPath() + '.zip')) {
			await problem.makeTestdataZip();
		}
		let path = require('path');
		let filename = problem.getTestdataPath() + '.zip';
		if (!await zoj.utils.isFile(filename)) return res.status(404).send({ err: 'Permission denied' });
		res.download(filename, path.basename(filename));
	} catch (e) {
		res.status(500).send(e);
		zoj.log(e);
	}
});

app.apiRouter.get('/api/v2/answer/:id/:token', async (req, res) => {
	try {
		let token = req.params.token;
		if (token !== zoj.config.judge_token) return res.status(404).send({ err: 'Permission denied' });

		let id = req.params.id;
		let filename = zoj.utils.resolvePath(zoj.config.upload_dir, 'answer', id);
		if (!await zoj.utils.isFile(filename))
			return res.status(404).send({ err: 'Permission denied' });
		let path = require('path');
		res.download(filename, path.basename(filename));
	} catch (e) {
		res.status(500).send(e);
		zoj.log(e);
	}
});