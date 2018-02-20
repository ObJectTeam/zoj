/*
 *  Package  : modules
 *  Filename : blog.js
 *  Create   : 2018-02-19
 */

'use strict';

let BlogPost = zoj.model('blog_post');
let BlogPostTag = zoj.model('blog_post_tag');
let User = zoj.model('user');

app.get('/blogs', async (req, res) => {
    try {
        let where = {};
        if (!res.locals.user) {
            where = {
                is_public: 1
            };
        } else if (res.locals.user.admin < 3) {
            where = {
                $or: {
                    is_public: 1,
                    user_id: res.locals.user.id
                }
            };
        }

        let paginate = zoj.utils.paginate(await BlogPost.count(where), req.query.page, zoj.config.page.post);
        let posts = await BlogPost.query(paginate, where, [["id", "desc"]]);

        await posts.forEachAsync(async post => {
            await post.loadRelationships();
            post.allowedEdit = await post.isAllowedEditBy(res.locals.user);
            post.tags = await post.getTags();
        });

        res.render('blog', {
            allowedManageTag: res.locals.user && res.locals.user.admin >= 2,
            posts: posts,
            paginate: paginate
        });
    } catch (e) {
        zoj.log(e);
        res.render('error', {
            err: e
        });
    }
});

app.get('/blogs/:id', async (req, res) => {
    try {
        let id = parseInt(req.params.id);
        let user = await User.fromID(id);
        if (!user) throw new ErrorMessage('无此用户。');
        let where = {};
        if (!res.locals.user) {
            where = {
                $and: {
                    user_id: id,
                    is_public: 1
                }
            };
        } else if (res.locals.user.admin < 3) {
            where = {
                $and: {
                    user_id: id,
                    $or: {
                        is_public: 1,
                        user_id: res.locals.user.id
                    }
                }
            };
        } else {
            where = { user_id: id };
        }

        let paginate = zoj.utils.paginate(await BlogPost.count(where), req.query.page, zoj.config.page.post);
        let posts = await BlogPost.query(paginate, where, [["id", "desc"]]);

        await posts.forEachAsync(async post => {
            await post.loadRelationships();
            post.allowedEdit = await post.isAllowedEditBy(res.locals.user);
            post.tags = await post.getTags();
        });

        res.render('blog', {
            allowedManageTag: res.locals.user && res.locals.user.admin >= 2,
            posts: posts,
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
                        is_public: 1,
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

        let order = [zoj.db.literal('`id` = ' + id + ' DESC'), ['id', 'DESC']];

        let paginate = zoj.utils.paginate(await BlogPost.count(where), req.query.page, zoj.config.page.post);
        let posts = await BlogPost.query(paginate, where, order);

        await posts.forEachAsync(async post => {
            post.allowedEdit = await post.isAllowedEditBy(res.locals.user);
            post.tags = await post.getTags();
            await post.loadRelationships();
        });

        res.render('blog', {
            allowedManageTag: res.locals.user && res.locals.user.admin >= 2,
            posts: posts,
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
        let tags = await tagIDs.mapAsync(async tagID => BlogPostTag.fromID(tagID));

        // Validate the tagIDs
        for (let tag of tags) {
            if (!tag) {
                return res.redirect(zoj.utils.makeUrl(['blogs']));
            }
        }

        let sql = 'SELECT * FROM `blog_post` WHERE\n';
        for (let tagID of tagIDs) {
            if (tagID !== tagIDs[0]) {
                sql += 'AND\n';
            }

            sql += '`blog_post`.`id` IN (SELECT `post_id` FROM `blog_post_tag_map` WHERE `tag_id` = ' + tagID + ')';
        }

        if (!res.locals.user || !await res.locals.user.admin >= 3) {
            if (res.locals.user) {
                sql += 'AND (`post`.`is_public` = 1 OR `post`.`user_id` = ' + res.locals.user.id + ')';
            } else {
                sql += 'AND (`post`.`is_public` = 1)';
            }
        }

        let paginate = zoj.utils.paginate(await BlogPost.count(sql), req.query.page, zoj.config.page.post);
        let posts = await BlogPost.query(sql + paginate.toSQL(), {}, [["id", "desc"]]);

        await posts.forEachAsync(async post => {
            await post.loadRelationships();
            post.allowedEdit = await post.isAllowedEditBy(res.locals.user);
            post.tags = await post.getTags();
        });

        res.render('blog', {
            allowedManageTag: res.locals.user && res.locals.user.admin >= 2,
            posts: posts,
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

app.get('/blog/:id', async (req, res) => {
    try {
        let id = parseInt(req.params.id);
        let post = await BlogPost.fromID(id);
        if (!post) throw new ErrorMessage('无此博客。');

        if (!await post.isAllowedSeeBy(res.locals.user)) {
            throw new ErrorMessage('您没有权限进行此操作。');
        }

        post.allowedEdit = await post.isAllowedEditBy(res.locals.user);

        if (post.is_public || post.allowedEdit) {
            post.content = await zoj.utils.markdown(post.content);
        } else {
            throw new ErrorMessage('您没有权限进行此操作。');
        }

        post.tags = await post.getTags();
        await post.loadRelationships();

        res.render('post', {
            post: post
        });
    } catch (e) {
        zoj.log(e);
        res.render('error', {
            err: e
        });
    }
});

app.get('/blog/:id/edit', async (req, res) => {
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

app.post('/blog/:id/edit', async (req, res) => {
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
        post.problem_id = parseInt(req.body.problem_id);
        post.from = req.body.from;
        if (isNaN(post.problem_id)) post.problem_id = 0;

        // Save the post first, to have the `id` allocated
        await post.save();

        if (!req.body.tags) {
            req.body.tags = [];
        } else if (!Array.isArray(req.body.tags)) {
            req.body.tags = [req.body.tags];
        }

        let newTagIDs = await req.body.tags.map(x => parseInt(x)).filterAsync(async x => BlogPostTag.fromID(x));
        await post.setTags(newTagIDs);

        res.redirect(zoj.utils.makeUrl(['blog', post.id]));
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

        res.redirect(zoj.utils.makeUrl(['blog', id]));
    } catch (e) {
        zoj.log(e);
        res.render('error', {
            err: e
        });
    }
}

app.post('/blog/:id/public', async (req, res) => {
    await setPublic(req, res, true);
});

app.post('/blog/:id/dis_public', async (req, res) => {
    await setPublic(req, res, false);
});

app.post('/blog/:id/delete', async (req, res) => {
    try {
        let id = parseInt(req.params.id);
        let post = await BlogPost.fromID(id);
        if (!post) throw new ErrorMessage('无此博客。');

        if (!post.isAllowedEditBy(res.locals.user)) throw new ErrorMessage('您没有权限进行此操作。');

        await post.delete();

        res.redirect(zoj.utils.makeUrl(['blogs']));
    } catch (e) {
        zoj.log(e);
        res.render('error', {
            err: e
        });
    }
});