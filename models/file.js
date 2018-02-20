/*
 *  Package  : models
 *  Filename : file.js
 *  Create   : 2018-02-05
 */

'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let model = db.define('file', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	type: { type: Sequelize.STRING(80) },
	md5: { type: Sequelize.STRING(80), unique: true }
}, {
		timestamps: false,
		tableName: 'file',
		indexes: [
			{
				fields: ['type'],
			},
			{
				fields: ['md5'],
			}
		]
	});

let Model = require('./common');
class File extends Model {
	static create(val) {
		return File.fromRecord(File.model.build(Object.assign({
			type: '',
			md5: ''
		}, val)));
	}

	getPath() {
		return File.resolvePath(this.type, this.md5);
	}

	static resolvePath(type, md5) {
		return zoj.utils.resolvePath(zoj.config.upload_dir, type, md5);
	}

	// data: Array of { filename: string, data: buffer or string }
	static async zipFiles(files) {
		let tmp = require('tmp-promise');
		let dir = await tmp.dir(), path = require('path'), fs = require('fs-extra');
		let filenames = await files.mapAsync(async file => {
			let fullPath = path.join(dir.path, file.filename);
			await fs.writeFileAsync(fullPath, file.data);
			return fullPath;
		});

		let p7zip = new (require('node-7z')), zipFile = await tmp.tmpName() + '.zip';
		await p7zip.add(zipFile, filenames);

		await fs.removeAsync(dir.path);

		return zipFile;
	}

	static async upload(path, type, noLimit) {
		let fs = Promise.promisifyAll(require('fs-extra'));

		let buf = await fs.readFileAsync(path);

		if (!noLimit && buf.length > zoj.config.limit.data_size) throw new ErrorMessage('The testdata package is too large.');

		try {
			let p7zip = new (require('node-7z'));
			this.unzipSize = 0;
			await p7zip.list(path).progress(files => {
				for (let file of files) this.unzipSize += file.size;
			});
		} catch (e) {
			this.unzipSize = null;
		}

		let key = zoj.utils.md5(buf);
		await fs.moveAsync(path, File.resolvePath(type, key), { overwrite: true });

		let file = await File.findOne({ where: { md5: key } });
		if (!file) {
			file = await File.create({
				type: type,
				md5: key
			});
			await file.save();
		}

		return file;
	}

	async getUnzipSize() {
		if (this.unzipSize === undefined) {
			try {
				let p7zip = new (require('node-7z'));
				this.unzipSize = 0;
				await p7zip.list(this.getPath()).progress(files => {
					for (let file of files) this.unzipSize += file.size;
				});
			} catch (e) {
				this.unzipSize = null;
			}
		}

		if (this.unzipSize === null) throw new ErrorMessage('Invalid ZIP file.');
		else return this.unzipSize;
	}

	getModel() { return model; }
}

File.model = model;

module.exports = File;
