/*
 *  Package  : models
 *  Filename : blog_post.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let User = zoj.model('user');

let model = db.define('blog_post', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

    title: { type: Sequelize.STRING(80) },
    blog_post_id: { type: Sequelize.INTEGER },
	user_id: {
		type: Sequelize.INTEGER,
		references: {
			model: 'user',
			key: 'id'
		}
	},
	content: { type: Sequelize.TEXT },
	is_public: { type: Sequelize.BOOLEAN }
}, {
		timestamps: false,
		tableName: 'blog_post',
		indexes: [
			{
				fields: ['blog_post_id'],
			},
			{
				fields: ['user_id'],
			}
		]
	});

let Model = require('./common');
class BlogPost extends Model {
	static async create(val) {
		return blog_post.fromRecord(blog_post.model.build(Object.assign({
			title: '',
			user_id: '',
			publicizer_id: '',
			is_anonymous: false,
			description: '',

			input_format: '',
			output_format: '',
			example: '',
			limit_and_hint: '',

			time_limit: zoj.config.default.blog_post.time_limit,
			memory_limit: zoj.config.default.blog_post.memory_limit,

			ac_num: 0,
			submit_num: 0,
			is_public: false,
			is_protected: true,

			file_io: false,
			file_io_input_name: '',
			file_io_output_name: '',

			type: 'traditional'
		}, val)));
	}

	async loadRelationships() {
		this.user = await User.fromID(this.user_id);
	}

	async isAllowedEditBy(user) {
		if (!user) return false;
		if (await user.admin >= 3) return true;
		return this.user_id === user.id;
	}

	async isAllowedManageBy(user) {
		if (!user) return false;
		return user.admin >= 3;
	}

	async getTags() {
		let blog_postTagMap = zoj.model('blog_post_tag_map');
		let maps = await blog_postTagMap.query(null, {
			blog_post_id: this.id
		});

		let blog_postTag = zoj.model('blog_post_tag');
		let res = await maps.mapAsync(async map => {
			return blog_postTag.fromID(map.tag_id);
		});

		res.sort((a, b) => {
			return a.color > b.color ? 1 : -1;
		});

		return res;
	}

	async setTags(newTagIDs) {
		let blog_postTagMap = zoj.model('blog_post_tag_map');

		let oldTagIDs = (await this.getTags()).map(x => x.id);

		let delTagIDs = oldTagIDs.filter(x => !newTagIDs.includes(x));
		let addTagIDs = newTagIDs.filter(x => !oldTagIDs.includes(x));

		for (let tagID of delTagIDs) {
			let map = await blog_postTagMap.findOne({
				where: {
					blog_post_id: this.id,
					tag_id: tagID
				}
			});

			await map.destroy();
		}

		for (let tagID of addTagIDs) {
			let map = await blog_postTagMap.create({
				blog_post_id: this.id,
				tag_id: tagID
			});

			await map.save();
		}
	}

	async changeID(id) {
		id = parseInt(id);
		await db.query('UPDATE `blog_post`         SET `id`         = ' + id + ' WHERE `id`         = ' + this.id);
		await db.query('UPDATE `judge_state`     SET `blog_post_id` = ' + id + ' WHERE `blog_post_id` = ' + this.id);
		await db.query('UPDATE `blog_post_tag_map` SET `blog_post_id` = ' + id + ' WHERE `blog_post_id` = ' + this.id);
		await db.query('UPDATE `article`         SET `blog_post_id` = ' + id + ' WHERE `blog_post_id` = ' + this.id);

		let Contest = zoj.model('contest');
		let contests = await Contest.all();
		for (let contest of contests) {
			let blog_postIDs = await contest.getblog_posts();

			let flag = false;
			for (let i in blog_postIDs) {
				if (blog_postIDs[i] === this.id) {
					blog_postIDs[i] = id;
					flag = true;
				}
			}

			if (flag) {
				await contest.setblog_postsNoCheck(blog_postIDs);
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
		let submissions = await JudgeState.query(null, { blog_post_id: this.id }), submitCnt = {}, acUsers = new Set();
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

		await db.query('DELETE FROM `blog_post`         WHERE `id`         = ' + this.id);
		await db.query('DELETE FROM `judge_state`     WHERE `blog_post_id` = ' + this.id);
		await db.query('DELETE FROM `blog_post_tag_map` WHERE `blog_post_id` = ' + this.id);
		await db.query('DELETE FROM `article`         WHERE `blog_post_id` = ' + this.id);
	}

	getModel() { return model; }
}

blog_post.model = model;

module.exports = blog_post;
