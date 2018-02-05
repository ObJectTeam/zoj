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
let Problem = zoj.model('problem');
let File = zoj.model('file');

function setLoginCookie(username, password, res) {
  res.cookie('login', JSON.stringify([username, password]));
}

// Login
app.post('/api/login', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    let user = await User.fromName(req.body.username);

    if (!user) res.send({ error_code: 1001 });
    else if (user.password !== req.body.password) res.send({ error_code: 1002 });
    else {
      req.session.user_id = user.id;
      setLoginCookie(user.username, user.password, res);
      res.send({ error_code: 1 });
    }
  } catch (e) {
    zoj.log(e);
    res.send({ error_code: e });
  }
});

// Sign up
app.post('/api/sign_up', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    let user = await User.fromName(req.body.username);
    if (user) throw 2008;
    user = await User.findOne({ where: { email: req.body.email } });
    if (user) throw 2009;


    // Because the salt is "syzoj2_xxx" and the "syzoj2_xxx" 's md5 is"59cb..."
    // the empty password 's md5 will equal "59cb.."
    let syzoj2_xxx_md5 = '59cb65ba6f9ad18de0dcd12d5ae11bd2';
    if (req.body.password === syzoj2_xxx_md5) throw 2007;
    if (!(req.body.email = req.body.email.trim())) throw 2006;
    if (!zoj.utils.isValidUsername(req.body.username)) throw 2002;

    if (zoj.config.register_mail.enabled) {
      let sendmail = Promise.promisify(require('sendmail')());
      let sendObj = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        prevUrl: req.body.prevUrl,
        r: Math.random()
      };
      let encrypted = encodeURIComponent(zoj.utils.encrypt(JSON.stringify(sendObj), zoj.config.register_mail.key).toString('base64'));
      let url = req.protocol + '://' + req.get('host') + zoj.utils.makeUrl(['api', 'sign_up', encrypted]);
      try {
        await sendmail({
          from: `${zoj.config.title} <${zoj.config.register_mail.address}>`,
          to: req.body.email,
          type: 'text/html',
          subject: `${req.body.username} 的 ${zoj.config.title} 注册验证邮件`,
          html: `<p>请点击该链接完成您在 ${zoj.config.title} 的注册：</p><p><a href="${url}">${url}</a></p><p>如果您不是 ${req.body.username}，请忽略此邮件。</p>`
        });
      } catch (e) {
        return res.send({
          error_code: 2010,
          message: require('util').inspect(e)
        });
      }

      res.send(JSON.stringify({ error_code: 2 }));
    } else {
      user = await User.create({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        public_email: true
      });
      await user.save();

      req.session.user_id = user.id;
      setLoginCookie(user.username, user.password, res);

      res.send(JSON.stringify({ error_code: 1 }));
    }
  } catch (e) {
    zoj.log(e);
    res.send(JSON.stringify({ error_code: e }));
  }
});

app.get('/api/sign_up/:token', async (req, res) => {
  try {
    let obj;
    try {
      let decrypted = zoj.utils.decrypt(Buffer.from(req.params.token, 'base64'), zoj.config.register_mail.key).toString();
      obj = JSON.parse(decrypted);
    } catch (e) {
      throw new ErrorMessage('无效的注册验证链接。');
    }

    let user = await User.fromName(obj.username);
    if (user) throw new ErrorMessage('用户名已被占用。');
    user = await User.findOne({ where: { email: obj.email } });
    if (user) throw new ErrorMessage('邮件地址已被占用。');

    // Because the salt is "syzoj2_xxx" and the "syzoj2_xxx" 's md5 is"59cb..."
    // the empty password 's md5 will equal "59cb.."
    let syzoj2_xxx_md5 = '59cb65ba6f9ad18de0dcd12d5ae11bd2';
    if (obj.password === syzoj2_xxx_md5) throw new ErrorMessage('密码不能为空。');
    if (!(obj.email = obj.email.trim())) throw new ErrorMessage('邮件地址不能为空。');
    if (!zoj.utils.isValidUsername(obj.username)) throw new ErrorMessage('用户名不合法。');

    user = await User.create({
      username: obj.username,
      password: obj.password,
      email: obj.email,
      public_email: true
    });
    await user.save();

    req.session.user_id = user.id;
    setLoginCookie(user.username, user.password, res);

    res.redirect(obj.prevUrl || '/');
  } catch (e) {
    zoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

// Markdown
app.post('/api/markdown', async (req, res) => {
  try {
    let s = await zoj.utils.markdown(req.body.s.toString());
    res.send(s);
  } catch (e) {
    zoj.log(e);
    res.send(e);
  }
});

app.get('/static/uploads/answer/:md5', async (req, res) => {
  try {
    res.sendFile(File.resolvePath('answer', req.params.md5));
  } catch (e) {
    res.status(500).send(e);
  }
});
