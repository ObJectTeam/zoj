/*
 *  Package  : models
 *  Filename : article-comment.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let User = zoj.model('user');
let Article = zoj.model('article');

let model = db.define('comment', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

	content: { type: Sequelize.TEXT },

	article_id: { type: Sequelize.INTEGER },

	user_id: { type: Sequelize.INTEGER },

	public_time: { type: Sequelize.INTEGER }
}, {
		timestamps: false,
		tableName: 'comment',
		indexes: [
			{
				fields: ['article_id']
			},
			{
				fields: ['user_id']
			}
		]
	});

let Model = require('./common');
class ArticleComment extends Model {
	static async create(val) {
		return ArticleComment.fromRecord(ArticleComment.model.build(Object.assign({
			content: '',
			article_id: 0,
			user_id: 0,
			public_time: 0,
		}, val)));
	}

	async loadRelationships() {
		this.user = await User.fromID(this.user_id);
		this.article = await Article.fromID(this.article_id);
	}

	async isAllowedEditBy(user) {
		await this.loadRelationships();
		return user && (user.admin >= 2 || this.user_id === user.id || user.id === this.article.user_id);
	}

	getModel() { return model; }
};

ArticleComment.model = model;

module.exports = ArticleComment;
