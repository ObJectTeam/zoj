/*
 *  Package  : models
 *  Filename : contest_player.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let User = zoj.model('user');
let Problem = zoj.model('problem');
let ContestPlayer = zoj.model('contest_player');

let model = db.define('contest_ranklist', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	ranklist: { type: Sequelize.TEXT, json: true }
}, {
		timestamps: false,
		tableName: 'contest_ranklist'
	});

let Model = require('./common');
class ContestRanklist extends Model {
	static async create(val) {
		return ContestRanklist.fromRecord(ContestRanklist.model.build(Object.assign({
			ranklist: '{}'
		}, val)));
	}

	async getPlayers() {
		let a = [];
		for (let i = 1; i <= this.ranklist.player_num; i++) {
			a.push(await ContestPlayer.fromID(this.ranklist[i]));
		}
		return a;
	}

	async updatePlayer(contest, player) {
		let players = await this.getPlayers(), newPlayer = true;
		for (let x of players) {
			if (x.user_id === player.user_id) {
				newPlayer = false;
				break;
			}
		}

		if (newPlayer) {
			players.push(player);
		}

		let JudgeState = zoj.model('judge_state');

		if (contest.type === 'noi' || contest.type === 'ioi') {
			for (let player of players) {
				player.latest = 0;
				for (let i in player.score_details) {
					let judge_state = await JudgeState.fromID(player.score_details[i].judge_id);
					player.latest = Math.max(player.latest, judge_state.submit_time);
				}
			}

			players.sort((a, b) => {
				if (a.score > b.score) return -1;
				if (b.score > a.score) return 1;
				if (a.latest < b.latest) return -1;
				if (a.latest > b.latest) return 1;
				return 0;
			});
		} else {
			for (let player of players) {
				player.timeSum = 0;
				for (let i in player.score_details) {
					if (player.score_details[i].accepted) {
						player.timeSum += (player.score_details[i].acceptedTime - contest.start_time) + (player.score_details[i].unacceptedCount * 20 * 60);
					}
				}
			}

			players.sort((a, b) => {
				if (a.score > b.score) return -1;
				if (b.score > a.score) return 1;
				if (a.timeSum < b.timeSum) return -1;
				if (a.timeSum > b.timeSum) return 1;
				return 0;
			});
		}

		this.ranklist = { player_num: players.length };
		for (let i = 0; i < players.length; i++) this.ranklist[i + 1] = players[i].id;
	}

	getModel() { return model; }
}

ContestRanklist.model = model;

module.exports = ContestRanklist;
