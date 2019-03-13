'use strict'

const electron = require('electron')
const winston = require('winston')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')



// shared globally 定义全局变量 __app
global.__app = {
	srcPath: path.join(__dirname, 'src'), // __dirname 当前js文件main.js 所在文件夹
    pacFilePath: path.join(__dirname, 'pac.txt'), // __dirname 当前js文件main.js 所在文件夹
	dataPath: path.join(electron.app.getPath('userData'),'xiaoyubrowser'),
    userconfig: path.join(electron.app.getPath('userData'),'xiaoyubrowser\\userconfig.json'),
	//这个对应系统环境变量%APPDATA%，所有操作系统自带，路径100%存在。 C:\Users\Administrator\AppData\Roaming
	logPath: path.join(electron.app.getPath('userData'), 'xiaoyubrowser\\logs'),
	logger: null,
    socks5redirect:null
}

// Check and create log path
if (!fs.existsSync(global.__app.logPath)) {
	mkdirp(global.__app.logPath)
}
console.log("srcpath"+ global.__app.srcPath);
console.log("pacFilePath"+ global.__app.pacFilePath);
console.log("dataPath"+ global.__app.dataPath);
console.log("logPath"+ global.__app.logPath);

// Create logger
global.__app.logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({ level: 'silly' }),
		new (winston.transports.File)({
			filename: path.join(global.__app.logPath, 'app.log'),
			level: 'info'
		})
	]
})
global.__app.socks5redirect = require(path.join(global.__app.srcPath, 'js', 'socks5redirect', 'socks5redirect'));
global.__app.socks5redirect.autoLogin();
global.__app.socks5redirect.updateConfig();





const MainProcessController = require(path.join(global.__app.srcPath, 'js', 'main-process', 'MainProcessController'))

let mainController = new MainProcessController()
mainController.start()