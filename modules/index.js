/*
 *  This file is part of ZOJ.
 *
 *  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
 *
 *  ZOJ is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  ZOJ is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public
 *  License along with ZOJ. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

let User = zoj.model('user');
let Article = zoj.model('article');
let Contest = zoj.model('contest');

app.get('/', async (req, res) => {
	try {
		let ranklist = await User.query([1, 10], { is_show: true }, [['ac_num', 'desc']]);
		await ranklist.forEachAsync(async x => x.renderInformation());

		let notices = (await Article.query(null, { is_notice: true }, [['public_time', 'desc']])).map(article => ({
			title: article.title,
			url: zoj.utils.makeUrl(['article', article.id]),
			date: zoj.utils.formatDate(article.public_time, 'L')
		}));

		let where;
		if (res.locals.user && res.locals.user.admin >= 3) where = {}
		else if (res.locals.user && res.locals.user.admin >= 1) where = { is_public: true };
		else where = { $and: { is_public: true, is_protected: false } };

		let contests = await Contest.query([1, 5], where, [['start_time', 'desc']]);

		res.render('index', {
			ranklist: ranklist,
			notices: notices,
			contests: contests,
			links: zoj.config.links
		});
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});

app.get('/help', async (req, res) => {
	try {
		res.render('help');
	} catch (e) {
		zoj.log(e);
		res.render('error', {
			err: e
		});
	}
});
