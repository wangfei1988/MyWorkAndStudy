const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const app = express();
const mysql=require('mysql')
const url=require('url')

const connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '1988qwerTYUI@',
    port: '3306',
    database: 'xiaoyubrowser',
    multipleStatements: true ，
});


function mysqladd(){

}




function ismail(obj){
    if(obj.toString().indexOf("@")>0 && obj.toString().indexOf(".com")>0)
        return true;
    else
        return false;

    var reg=/[a-zA-Z0-9]{1,10}@[a-zA-Z0-9]{1,5}\.[a-zA-Z0-9]{1,5}/;
    if(!reg.test(obj.value)){
       return false;
    }
    return true;
}



const  userloginsql="select * from user_eamil where email=? and pwd=? limit 1"


const  nachineloginsql="select * from user_mac where mac=? limit 1"
const  nachineregsql="INSERT INTO user_mac(mac) VALUES(?)"
const  nachineupdatetimesql="UPDATE user_mac SET usetime =usetime+1 WHERE mac =?  "

function init(){
    connection.connect();

    //用get方便测试，真新破解你也没办法
    app.get('/userlogin', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.username;
        let pwd=params.pwd;
        //parse将字符串转成对象,req.url="/?url=123&name=321"，true表示params解析成json对象{url:"123",name:"321"}，false表示params还是字符串url=123&name=321
        console.log("User name = "+params.username+", password is "+params.pwd);
        if(!ismail(username)){
            var response = {
                "responsecode":1,
                "msg":"not correct email address"
            };
            res.end(JSON.stringify(response));
            return;
        }
        let userloginparaas=[username,pwd];
        connection.query(userloginsql,userloginparaas,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("user login sql res:"+result);
            var response = {
                "responsecode":200,
                "msg":"success",
                data:JSON.stringify(result),// 这个如果没有则result
            };
            res.end(JSON.stringify(response));
        });
    })

    app.get('/machinelogin', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.username;
        //let pwd=params.pwd;
        //parse将字符串转成对象,req.url="/?url=123&name=321"，true表示params解析成json对象{url:"123",name:"321"}，false表示params还是字符串url=123&name=321
        console.log("User name = "+params.username);
        let machineloginparams=[username];
        connection.query(nachineloginsql,machineloginparams,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("machine login sql res:"+ result); //result是数组对象，没有则是空数组 数组每个成员是一个json对象
            if(result.length==0){//不存在用户
                let machineregparams=[username];
                connection.query(nachineregsql,machineregparams,function (err, result) {
                    if(err){
                        var response = {
                            "responsecode":2,
                            "msg":"sqlerror"+err.message
                        };
                        res.end(JSON.stringify(response));
                        return;
                    }
                    //插入返回值是   影响行数 在这里我们除了mac其他的信息都不重要 手动生成一个对象
                    var tempuser ={};
                    tempuser.mac=username;
                    var response = {
                        "responsecode":200,
                        "msg":"success",
                        data:JSON.stringify(tempuser),//
                    };//
                    res.end(JSON.stringify(response));
                });
            }else{
                var response = {
                    "responsecode":200,
                    "msg":"success",
                    data:JSON.stringify(result),
                };
                res.end(JSON.stringify(response));
            }
        });
    })


    app.get('/machinetimeupdate', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.username;
        //let pwd=params.pwd;
        //parse将字符串转成对象,req.url="/?url=123&name=321"，true表示params解析成json对象{url:"123",name:"321"}，false表示params还是字符串url=123&name=321
        console.log("update machine = "+params.username);
        let machineparams=[username];
        connection.query(nachineupdatetimesql,machineparams,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            // 这个返回的也是影响函数
            console.log("machine update sql res:"+result);
            var response = {
                "responsecode":200,
                "msg":"success",
                data:JSON.stringify(result),// 这个如果没有则result
            };
            res.end(JSON.stringify(response));
        });
    })

    var userServer = app.listen(8082,'0.0.0.0', function () {
        console.log("应用实例，访问地址为134.175.38.75:8082")
    })

}

init();