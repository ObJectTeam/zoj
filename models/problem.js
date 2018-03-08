/*
 *  Package  : models
 *  Filename : problem.js
 *  Create   : 2018-02-05
 */

'use strict';

let statisticsStatements = {
	fastest:
		'\
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `total_time` ASC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			`total_time` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `total_time` ASC \
    LIMIT 1 \
	) AS `total_time` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `total_time` ASC \
',
	slowest:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `total_time` DESC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			`total_time` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `total_time` DESC \
    LIMIT 1 \
	) AS `total_time` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `total_time` DESC \
',
	shortest:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY LENGTH(`code`) ASC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			LENGTH(`code`) \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY LENGTH(`code`) ASC \
    LIMIT 1 \
	) AS `code_length` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `code_length` ASC \
',
	longest:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY LENGTH(`code`) DESC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			LENGTH(`code`) \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY LENGTH(`code`) DESC \
    LIMIT 1 \
	) AS `code_length` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `code_length` DESC \
',
	earliest:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `submit_time` ASC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			`submit_time` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `submit_time` ASC \
    LIMIT 1 \
	) AS `submit_time` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `submit_time` ASC \
',
	min:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `max_memory` ASC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			`max_memory` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `max_memory` ASC \
    LIMIT 1 \
	) AS `max_memory` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `max_memory` ASC \
',
	max:
		' \
SELECT \
	DISTINCT(`user_id`) AS `user_id`,  \
	( \
		SELECT \
			`id` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `max_memory` ASC \
    LIMIT 1 \
	) AS `id`, \
	( \
		SELECT \
			`max_memory` \
		FROM `judge_state` `inner_table` \
		WHERE `problem_id` = `outer_table`.`problem_id` AND `user_id` = `outer_table`.`user_id` AND `status` = "Accepted" AND `type` = 0 \
		ORDER BY `max_memory` ASC \
    LIMIT 1 \
	) AS `max_memory` \
FROM `judge_state` `outer_table` \
WHERE  \
	`problem_id` = __PROBLEM_ID__ AND `status` = "Accepted" AND `type` = 0 \
ORDER BY `max_memory` DESC \
'
};

let Sequelize = require('sequelize');
let db = zoj.db;

let User = zoj.model('user');
let File = zoj.model('file');

let model = db.define('problem', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

	title: { type: Sequelize.STRING(80) },
	user_id: {
		type: Sequelize.INTEGER,
		references: {
			model: 'user',
			key: 'id'
		}
	},
	publicizer_id: {
		type: Sequelize.INTEGER,
		references: {
			model: 'user',
			key: 'id'
		}
	},
	is_anonymous: { type: Sequelize.BOOLEAN },

	description: { type: Sequelize.TEXT },
	input_format: { type: Sequelize.TEXT },
	output_format: { type: Sequelize.TEXT },
	example: { type: Sequelize.TEXT },
	limit_and_hint: { type: Sequelize.TEXT },

	time_limit: { type: Sequelize.INTEGER },
	memory_limit: { type: Sequelize.INTEGER },

	additional_file_id: { type: Sequelize.INTEGER },
	testdata_hash: {type: Sequelize.STRING(120) },

	ac_num: { type: Sequelize.INTEGER },
	submit_num: { type: Sequelize.INTEGER },
	is_public: { type: Sequelize.BOOLEAN },
	is_protected: { type: Sequelize.BOOLEAN },

	file_io: { type: Sequelize.BOOLEAN },
	// Whether use file IO
	file_io_input_name: { type: Sequelize.TEXT },
	file_io_output_name: { type: Sequelize.TEXT },

	type: {
		type: Sequelize.ENUM,
		values: ['traditional', 'submit-answer']
	}
}, {
		timestamps: false,
		tableName: 'problem',
		indexes: [
			{
				fields: ['title'],
			},
			{
				fields: ['user_id'],
			}
		]
	});

let Model = require('./common');
class Problem extends Model {
	static async create(val) {
		return Problem.fromRecord(Problem.model.build(Object.assign({
			title: '',
			user_id: '',
			publicizer_id: '',
			is_anonymous: false,
			description: '',

			input_format: '',
			output_format: '',
			example: '',
			limit_and_hint: '',

			time_limit: zoj.config.default.problem.time_limit,
			memory_limit: zoj.config.default.problem.memory_limit,

			ac_num: 0,
			submit_num: 0,
			is_public: false,
			is_protected: true,

			file_io: false,
			file_io_input_name: '',
			file_io_output_name: '',

			type: 'traditional',
			testdata_hash: ''
		}, val)));
	}

	async loadRelationships() {
		this.user = await User.fromID(this.user_id);
		this.publicizer = await User.fromID(this.publicizer_id);
		this.additional_file = await File.fromID(this.additional_file_id);
	}

	async isAllowedEditBy(user) {
		if (!user) return false;
		if (await user.admin >= 3) return true;
		return this.user_id === user.id;
		// 1. The user is teacher/system admin
		// 2. The user is the creator of this problem
	}

	async isAllowedUseBy(user) {
		if (this.is_public && !this.is_protected) return true;
		if (!user) return false;
		if (this.user_id === user.id) return true;
		if (this.is_public && this.is_protected) return user.admin >= 1;
		if (await user.admin >= 3) return true;
		return false;
		// 1. The problem is publid and not protected
		// 2. The user is the creator of the problem
		// 3. The problem is public and the user the indoor student/student admin
		// 4. The user is teacher/system admin
	}

	async isAllowedManageBy(user) {
		if (!user) return false;
		return user.admin >= 3;
		// The user is teacher/system admin
	}

	getTestdataPath() {
		return zoj.utils.resolvePath(zoj.config.upload_dir, 'testdata', this.id.toString());
	}

	async updateTestdataHash(){
		if (!await zoj.utils.isFile(this.getTestdataPath() + '.zip')) {
			await this.makeTestdataZip();
		}
		let fs = Promise.promisifyAll(require('fs-extra'));
		let buffer = fs.readFileSync(this.getTestdataPath() + '.zip');
		let md5 = zoj.utils.md5(buffer);
		this.testdata_hash = md5;
		await this.save();
	}

	async updateTestdata(path, noLimit) {
		await zoj.utils.lock(['Problem::Testdata', this.id], async () => {
			let p7zip = new (require('node-7z'));

			let unzipSize = 0, unzipCount;
			await p7zip.list(path).progress(files => {
				unzipCount = files.length;
				for (let file of files) unzipSize += file.size;
			});
			if (!noLimit && unzipCount > zoj.config.limit.testdata_filecount) throw new ErrorMessage('Too many files in the data package.');
			if (!noLimit && unzipSize > zoj.config.limit.testdata) throw new ErrorMessage('The data package is too large.');

			let dir = this.getTestdataPath();
			let fs = Promise.promisifyAll(require('fs-extra'));
			await fs.removeAsync(dir);
			await fs.ensureDirAsync(dir);

			await p7zip.extract(path, dir);
			await fs.moveAsync(path, dir + '.zip', { overwrite: true });
		});
		await this.updateTestdataHash();
	}

	async uploadTestdataSingleFile(filename, filepath, size, noLimit) {
		await zoj.utils.lock(['Promise::Testdata', this.id], async () => {
			let dir = this.getTestdataPath();
			let fs = Promise.promisifyAll(require('fs-extra')), path = require('path');
			await fs.ensureDirAsync(dir);

			let oldSize = 0, list = await this.listTestdata(), replace = false, oldCount = 0;
			if (list) {
				oldCount = list.files.length;
				for (let file of list.files) {
					if (file.filename !== filename) oldSize += file.size;
					else replace = true;
				}
			}

			if (!noLimit && oldSize + size > zoj.config.limit.testdata) throw new ErrorMessage('The data package is too large.');
			if (!noLimit && oldCount + !replace > zoj.config.limit.testdata_filecount) throw new ErrorMessage('Too many files in the data package.');

			await fs.moveAsync(filepath, path.join(dir, filename), { overwrite: true });
			await fs.removeAsync(dir + '.zip');
		});
		await this.updateTestdataHash();
	}

	async deleteTestdataSingleFile(filename) {
		await zoj.utils.lock(['Promise::Testdata', this.id], async () => {
			let dir = this.getTestdataPath();
			let fs = Promise.promisifyAll(require('fs-extra')), path = require('path');
			await fs.removeAsync(path.join(dir, filename));
			await fs.removeAsync(dir + '.zip');
		});
		await this.updateTestdataHash();
	}

	async makeTestdataZip() {
		await zoj.utils.lock(['Promise::Testdata', this.id], async () => {
			let dir = this.getTestdataPath();
			if (await zoj.utils.isFile(dir + '.zip')) return;
			if (!await zoj.utils.isDir(dir)) throw new ErrorMessage('No testdata.');

			let p7zip = new (require('node-7z'));

			let list = await this.listTestdata(), path = require('path'), pathlist = list.files.map(file => path.join(dir, file.filename));
			if (!pathlist.length) throw new ErrorMessage('No testdata.');
			await p7zip.add(dir + '.zip', pathlist);
		});
	}

	async hasSpecialJudge() {
		try {
			let fs = Promise.promisifyAll(require('fs-extra'));
			let dir = this.getTestdataPath();
			let list = await fs.readdirAsync(dir);
			return list.includes('spj.js') || list.find(x => x.startsWith('spj_')) !== undefined;
		} catch (e) {
			return false;
		}
	}

	async listTestdata() {
		try {
			let fs = Promise.promisifyAll(require('fs-extra')), path = require('path');
			let dir = this.getTestdataPath();
			let list = await fs.readdirAsync(dir);
			list = await list.mapAsync(async x => {
				let stat = await fs.statAsync(path.join(dir, x));
				if (!stat.isFile()) return undefined;
				return {
					filename: x,
					size: stat.size
				};
			});

			list = list.filter(x => x);

			let res = {
				files: list,
				zip: null
			};

			try {
				let stat = await fs.statAsync(this.getTestdataPath() + '.zip');
				if (stat.isFile()) {
					res.zip = {
						size: stat.size
					};
				}
			} catch (e) {
				if (list) {
					res.zip = {
						size: null
					};
				}
			}

			return res;
		} catch (e) {
			return null;
		}
	}

	async updateFile(path, type, noLimit) {
		let file = await File.upload(path, type, noLimit);

		if (type === 'additional_file') {
			this.additional_file_id = file.id;
		}

		await this.save();
		await this.updateTestdataHash();
	}

	async validate() {
		if (this.time_limit <= 0) return 'Invalid time limit';
		if (this.time_limit > zoj.config.limit.time_limit) this.time_limit = zoj.config.limit.time_limit;
		if (this.memory_limit <= 0) return 'Invalid memory limit';
		if (this.memory_limit > zoj.config.limit.memory_limit) this.memory_limit = zoj.config.limit.memory_limit;

		if (this.type === 'traditional') {
			let filenameRE = /^[\w \-\+\.]*$/;
			if (this.file_io_input_name && !filenameRE.test(this.file_io_input_name)) return 'Invalid input file name';
			if (this.file_io_output_name && !filenameRE.test(this.file_io_output_name)) return 'Invalid output file name';

			if (this.file_io) {
				if (!this.file_io_input_name) return 'No input file name';
				if (!this.file_io_output_name) return 'No output file name';
			}
		}

		return null;
	}

	async getJudgeState(user, acFirst) {
		if (!user) return null;

		let JudgeState = zoj.model('judge_state');

		let where = {
			user_id: user.id,
			problem_id: this.id
		};

		if (acFirst) {
			where.status = 'Accepted';

			let state = await JudgeState.findOne({
				where: where,
				order: [['submit_time', 'desc']]
			});

			if (state) return state;
		}

		if (where.status) delete where.status;

		return await JudgeState.findOne({
			where: where,
			order: [['submit_time', 'desc']]
		});
	}

	// type: fastest / slowest / shortest / longest / earliest
	async countStatistics(type) {
		let statement = statisticsStatements[type];
		if (!statement) return null;

		statement = statement.replace('__PROBLEM_ID__', this.id);
		return await db.countQuery(statement);
	}

	// type: fastest / slowest / shortest / longest / earliest
	async getStatistics(type, paginate) {
		let statistics = {
			type: type,
			judge_state: null,
			scoreDistribution: null,
			prefixSum: null,
			suffixSum: null
		};

		let statement = statisticsStatements[type];
		if (!statement) return null;

		statement = statement.replace('__PROBLEM_ID__', this.id);

		let a;
		if (!paginate.pageCnt) a = [];
		else a = (await db.query(statement + `LIMIT ${paginate.perPage} OFFSET ${(paginate.currPage - 1) * paginate.perPage}`))[0];

		let JudgeState = zoj.model('judge_state');
		statistics.judge_state = await a.mapAsync(async x => JudgeState.fromID(x.id));

		a = (await db.query('SELECT `score`, COUNT(*) AS `count` FROM `judge_state` WHERE `problem_id` = __PROBLEM_ID__ AND `type` = 0 AND `pending` = 0 GROUP BY `score`'.replace('__PROBLEM_ID__', this.id)))[0];

		let scoreCount = [];
		for (let score of a) {
			score.score = Math.min(Math.round(score.score), 100);
			scoreCount[score.score] = score.count;
		}
		if (scoreCount[0] === undefined) scoreCount[0] = 0;
		if (scoreCount[100] === undefined) scoreCount[100] = 0;

		statistics.scoreDistribution = [];
		for (let i = 0; i < scoreCount.length; i++) {
			if (scoreCount[i] !== undefined) statistics.scoreDistribution.push({ score: i, count: scoreCount[i] });
		}

		statistics.prefixSum = JSON.parse(JSON.stringify(statistics.scoreDistribution));
		statistics.suffixSum = JSON.parse(JSON.stringify(statistics.scoreDistribution));

		for (let i = 1; i < statistics.prefixSum.length; i++) {
			statistics.prefixSum[i].count += statistics.prefixSum[i - 1].count;
		}

		for (let i = statistics.prefixSum.length - 1; i >= 1; i--) {
			statistics.suffixSum[i - 1].count += statistics.suffixSum[i].count;
		}

		return statistics;
	}

	async getTags() {
		let ProblemTagMap = zoj.model('problem_tag_map');
		let maps = await ProblemTagMap.query(null, {
			problem_id: this.id
		});

		let ProblemTag = zoj.model('problem_tag');
		let res = await maps.mapAsync(async map => {
			return ProblemTag.fromID(map.tag_id);
		});

		res.sort((a, b) => {
			return a.color > b.color ? 1 : -1;
		});

		return res;
	}

	async setTags(newTagIDs) {
		let ProblemTagMap = zoj.model('problem_tag_map');

		let oldTagIDs = (await this.getTags()).map(x => x.id);

		let delTagIDs = oldTagIDs.filter(x => !newTagIDs.includes(x));
		let addTagIDs = newTagIDs.filter(x => !oldTagIDs.includes(x));

		for (let tagID of delTagIDs) {
			let map = await ProblemTagMap.findOne({
				where: {
					problem_id: this.id,
					tag_id: tagID
				}
			});

			await map.destroy();
		}

		for (let tagID of addTagIDs) {
			let map = await ProblemTagMap.create({
				problem_id: this.id,
				tag_id: tagID
			});

			await map.save();
		}
	}

	async changeID(id) {
		id = parseInt(id);
		await db.query('UPDATE `problem`         SET `id`         = ' + id + ' WHERE `id`         = ' + this.id);
		await db.query('UPDATE `judge_state`     SET `problem_id` = ' + id + ' WHERE `problem_id` = ' + this.id);
		await db.query('UPDATE `problem_tag_map` SET `problem_id` = ' + id + ' WHERE `problem_id` = ' + this.id);
		await db.query('UPDATE `article`         SET `problem_id` = ' + id + ' WHERE `problem_id` = ' + this.id);

		let Contest = zoj.model('contest');
		let contests = await Contest.all();
		for (let contest of contests) {
			let problemIDs = await contest.getProblems();

			let flag = false;
			for (let i in problemIDs) {
				if (problemIDs[i] === this.id) {
					problemIDs[i] = id;
					flag = true;
				}
			}

			if (flag) {
				await contest.setProblemsNoCheck(problemIDs);
				await contest.save();
			}
		}

		let oldTestdataDir = this.getTestdataPath(), oldTestdataZip = oldTestdataDir + '.zip';

		this.id = id;

		// Move testdata
		let newTestdataDir = this.getTestdataPath(), newTestdataZip = newTestdataDir + '.zip';
		let fs = Promise.promisifyAll(require('fs-extra'));
		if (await zoj.utils.isDir(oldTestdataDir)) {
			await fs.moveAsync(oldTestdataDir, newTestdataDir);
		}

		if (await zoj.utils.isFile(oldTestdataZip)) {
			await fs.moveAsync(oldTestdataZip, newTestdataZip);
		}

		await this.save();
	}

	async delete() {
		let fs = Promise.promisifyAll(require('fs-extra'));
		let oldTestdataDir = this.getTestdataPath(), oldTestdataZip = oldTestdataDir + '.zip';
		await fs.removeAsync(oldTestdataDir);
		await fs.removeAsync(oldTestdataZip);

		let JudgeState = zoj.model('judge_state');
		let submissions = await JudgeState.query(null, { problem_id: this.id }), submitCnt = {}, acUsers = new Set();
		for (let sm of submissions) {
			if (sm.status === 'Accepted') acUsers.add(sm.user_id);
			if (!submitCnt[sm.user_id]) {
				submitCnt[sm.user_id] = 1;
			} else {
				submitCnt[sm.user_id]++;
			}
		}

		for (let u in submitCnt) {
			let user = await User.fromID(u);
			user.submit_num -= submitCnt[u];
			if (acUsers.has(parseInt(u))) user.ac_num--;
			await user.save();
		}

		await db.query('DELETE FROM `problem`         WHERE `id`         = ' + this.id);
		await db.query('DELETE FROM `judge_state`     WHERE `problem_id` = ' + this.id);
		await db.query('DELETE FROM `problem_tag_map` WHERE `problem_id` = ' + this.id);
		await db.query('DELETE FROM `article`         WHERE `problem_id` = ' + this.id);
	}

	getModel() { return model; }
}

Problem.model = model;

module.exports = Problem;
