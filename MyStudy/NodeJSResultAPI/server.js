const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const app = express();
const password = require('./socks5Redirect/core/password.js')
const urlParseLax = require('url-parse-lax');
const Local = require('./socks5Redirect/local.js');
app.get('/getpwd', function (req, res) {
    res.send(configString);
})


let configString="";
let configObj = {};
function genetareRandomConfig(port){
    configObj.listen='0.0.0.0:'+port;
    configObj.remote='127.0.0.1:1080';
    let r = password.generateRandomPassword();
    let i=0;
    while(i<5){
     i++;
     if(password.validatePassword(r))
         break;
     else
         r=password.generateRandomPassword();
    }
    configObj.password=r;
    configString = JSON.stringify(configObj, null, 2);
    fs.writeFileSync('config.json', configString);
}

function readConfig(){
    let configObject = JSON.parse(fs.readFileSync('config.json'));
    if(password.validatePassword(configObject.password))
        return configObject;
    else
        console.log("Error Config");
}


var configServer = app.listen(8081,'0.0.0.0', function () {
    var host = configServer.address().address
    var port = configServer.address().port
    console.log("应用实例，访问地址为 http://%s:%s", host, port)
})


function getAddr(addr) {
    console.log(addr);
    const urlObj = urlParseLax(addr);
    const host = urlObj.hostname || '0.0.0.0';
    const port = parseInt(urlObj.port, 0);
    return {
        host,
        port,
    };
}

genetareRandomConfig(443);
console.log(readConfig())
const listenAddr = getAddr(configObj.listen);
const remoteAddr = getAddr(configObj.remote);
console.log(listenAddr +" "+remoteAddr);
const socks5RedirectServer = new Local(configObj.password, listenAddr, remoteAddr);
socks5RedirectServer.listen();