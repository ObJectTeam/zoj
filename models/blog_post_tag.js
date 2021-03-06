/*
 *  Package  : models
 *  Filename : blog_post_tag.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let model = db.define('blog_post_tag', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: Sequelize.STRING },
	color: { type: Sequelize.STRING },
}, {
		timestamps: false,
		tableName: 'blog_post_tag',
		indexes: [
			{
				unique: true,
				fields: ['name'],
			}
		]
	});

let Model = require('./common');
class ProblemTag extends Model {
	static async create(val) {
		return ProblemTag.fromRecord(ProblemTag.model.build(Object.assign({
			name: '',
			color: ''
		}, val)));
	}

	getModel() { return model; }
}

ProblemTag.model = model;

module.exports = ProblemTag;
