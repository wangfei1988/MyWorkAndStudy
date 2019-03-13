const path = require('path');
const fs = require('fs');
const http = require('http');
const password = require('./core/password.js')
const urlParseLax = require('url-parse-lax');
const Local = require('./local.js');
const getmac = require('getmac');//获取mac地址



socks5redirect={}

socks5redirect.updateConfig=function() {
    const _this = this;
    console.log(_this);
    const opt = {
        host: '134.175.38.75', // 注意:不用协议部分(http://)
        port: '8081',
        path: '/getpwd?v=1.0', // 斜杠开头 获取这个信息需要带上版本号  我们这里并没有登录过程，所以只能靠解密
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, // 设置content-type 头部
    };
    let body = '';
    const req = http.request(opt, (res) => {
        if (res.statusCode === 200) {
            res.setEncoding('utf8');// res为ClientResponse的实例，是readableStream, 设置字符编码
            res.on('data', (chunk) => {
                body += chunk;
            }).on('end', () => {
                const configObj = JSON.parse(body);
                const remoteUrlObj = urlParseLax(configObj.listen);
                const remoteport = parseInt(remoteUrlObj.port, 0);
                console.log(configObj);
                _this.listenAddr = {
                    host: '127.0.0.1',
                    port: '1080',
                };
                _this.remoteAddr = {
                    host: opt.host,
                    port: remoteport,
                };
                if(_this.socks5RedirectServer)
                    _this.socks5RedirectServer.stop();

                _this.socks5RedirectServer = new Local(configObj.password, _this.listenAddr, _this.remoteAddr);
                _this.socks5RedirectServer.listen();
            });
        } else {
            console.log(`Error ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.log('error: ', err.message);
    });
    req.end();// 结束请求
}
socks5redirect.loginuser=null;

socks5redirect.autoLogin=function(){
    let _this=this;
    //let loginuser=null;
    fs.exists(global.__app.userconfig,function(exists){
        if(exists){ //存在这个文件
            fs.readFile(global.__app.userconfig,function(error,data) {
                if (error) {
                    console.log(error);
                    _this.loginuser = _this.generateMachieUser();
                } else {
                    var b = new Buffer(data.toString(), 'base64');//base64 还原
                    var userstring = b.toString();
                    console.log(userstring);  //读取出所有行的信息  这里只需要账号+密码
                    _this.loginuser = Json.parse(userstring)
                }
            })
        }else{
            //不存在这个文件 直接
            _this.loginuser = _this.generateMachieUser();
        }

        //无论是否存在都要登录
        if(_this.loginuser==null||_this.loginuser.username==null||_this.loginuser.username.length<5)
        {
            console.log("login error ")
        }else{
            _this.login(_this.loginuser)
        }
    })
}

socks5redirect.login=function(user){
    let _this=this;
    _this.loginuser =user;
    if(_this.loginuser==null||_this.loginuser.username==null||_this.loginuser.username.length<5)
    const opt = {
        host: '134.175.38.75', // 注意:不用协议部分(http://)
        port: '8081',
        path: '/login?v=1.0&username='+_this.loginuser.username+"&pwd="+_this.loginuser.pwd+"&ismachine="+_this.loginuser.ismachien, // 斜杠开头 获取这个信息需要带上版本号  我们这里并没有登录过程，所以只能靠解密
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, // 设置content-type 头部
    };
    let body = '';
    const req = http.request(opt, (res) => {
        if (res.statusCode === 200) {
            res.setEncoding('utf8');// res为ClientResponse的实例，是readableStream, 设置字符编码
            res.on('data', (chunk) => {
                body += chunk;
            }).on('end', () => {
                const configObj = JSON.parse(body);

            });
        } else {
            console.log(`Error ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.log('error: ', err.message);
    });
    req.end();// 结束请求
}



socks5redirect.register=function(user){
    let _this=this;
}


socks5redirect.generateMachieUser=function(){
    //获取机器mac地址
    getmac.getMac(function(err,macAddress){
        if (err)  {
            throw err;
            return;
        }
        console.log(macAddress);
        user={};
        user.username=macAddress;
        user.pwd="123456";
        user.ismachien=true;
        return user
    });
    return null;
}

socks5redirect.login=function(){

}

socks5redirect.register=function(){

}


socks5redirect.writeUserInfo=function(str){
    //fs.writeFile  写入文件（会覆盖之前的内容）（文件不存在就创建）  utf8参数可以省略
    fs.writeFile(global.__app.userconfig,str,'utf8',function(error){
        if(error){
            console.log(error);
            return false;
        }
    })
}

module.exports = socks5redirect;