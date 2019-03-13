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
    multipleStatements: true ,//允许查询多条语句，结果只返回最后一条 。这里简单起见不使用事务
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



const  userloginsql="select * from user_eamil where email=? and pwd=? "
const  userregsql="INSERT INTO user_eamil(email,pwd) VALUES(?,?) ; select * from user_eamil where email=? "
const  userupdatesql="UPDATE user_eamil SET usetime =usetime+1 WHERE email =? ; select * from user_eamil where  email =? "

const  nachineloginsql="select * from user_mac where mac=? "
const  nachineregsql="INSERT INTO user_mac(mac) VALUES(?); select * from user_mac where  mac=?"
const  nachineupdatetimesql="UPDATE user_mac SET usetime =usetime+1 WHERE mac =? ; select * from user_mac where  mac =? "

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
                data:JSON.stringify(result),// 这个如果没有则result是空字符串
            };
            res.end(JSON.stringify(response));
        });
    })

    app.get('/userreg', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.username;
        let pwd=params.pwd;         
        console.log("User name = "+params.username+", password is "+params.pwd);
        if(!ismail(username)){
            var response = {
                "responsecode":1,
                "msg":"not correct email address"
            };
            res.end(JSON.stringify(response));
            return;
        }
        let userregparams=[username,pwd];
        connection.query(userloginsql,userregparams,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("user login sql res:"+result);
            if(result!=null || result.length==0){
                let userinsertparams=[username,pwd,username];
                connection.query(userregsql,userinsertparams,function (err, result) {
                    if(err){
                        var response = {
                            "responsecode":2,
                            "msg":"sqlerror"+err.message
                        };
                        res.end(JSON.stringify(response));
                        return;
                    }
                    var response = {
                        "responsecode":200,
                        "msg":"success",
                        data:JSON.stringify(result),//
                    };//
                    res.end(JSON.stringify(response));
                });
            }else{
                var response = {
                    "responsecode":433,
                    "msg":"failed already exist",
                    error:JSON.stringify(result),// 这个如果没有则result
                };
                res.end(JSON.stringify(response));
            }
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
                let machineregparams=[username,username];
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
                    //只要插入成功就行，不需要返回结果
                    //var tempuser ={};
                    //tempuser.mac=username;
                    var response = {
                        "responsecode":200,
                        "msg":"success",
                        data:JSON.stringify(result),//
                    };//
                    res.end(JSON.stringify(result));
                });
            }else{//存在直接返回
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
        console.log("update machine use time  = "+params.username);
        let machineparams=[username,username];
        connection.query(nachineupdatetimesql,machineparams,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            // 插入返回值是影响行数，所以这里执行2条语句 返回的是插入之后的对象
            console.log("machine update sql res:"+result);
            var response = {
                "responsecode":200,
                "msg":"success",
                data:JSON.stringify(result),// 这个如果没有则result
            };
            res.end(JSON.stringify(response));
        });
    })

    app.get('/usertimeupdate', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.username;
        //let pwd=params.pwd;
        //parse将字符串转成对象,req.url="/?url=123&name=321"，true表示params解析成json对象{url:"123",name:"321"}，false表示params还是字符串url=123&name=321
        console.log("update user  use time  = "+params.username);
        let userparams=[username,username];
        connection.query(userupdatesql,userparams,function (err, result) {
            if(err){
                var response = {
                    "responsecode":2,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            // 插入返回值是影响行数，所以这里执行2条语句 返回的是插入之后的对象
            console.log("user update time  sql res:"+result);
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