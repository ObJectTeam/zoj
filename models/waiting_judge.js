/*
 *  Package  : models
 *  Filename : waiting_judge.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let JudgeState = zoj.model('judge_state');

let model = db.define('waiting_judge', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	judge_id: { type: Sequelize.INTEGER },

	// Smaller is higher
	priority: { type: Sequelize.INTEGER },

	type: {
		type: Sequelize.ENUM,
		values: ['submission', 'custom-test']
	}
}, {
		timestamps: false,
		tableName: 'waiting_judge',
		indexes: [
			{
				fields: ['judge_id'],
			}
		]
	});

let Model = require('./common');
class WaitingJudge extends Model {
	static async create(val) {
		return WaitingJudge.fromRecord(WaitingJudge.model.build(Object.assign({
			judge_id: 0,
			priority: 0
		}, val)));
	}

	async getJudgeState() {
		return JudgeState.fromID(this.judge_id);
	}

	getModel() { return model; }
}

WaitingJudge.model = model;

module.exports = WaitingJudge;
