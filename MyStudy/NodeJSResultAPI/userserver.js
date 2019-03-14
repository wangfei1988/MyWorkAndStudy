const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const app = express();
const mysql=require('mysql')
const url=require('url')

const connection = mysql.createConnection({
   // host     : '127.0.0.1',
    host     : '134.175.38.75',
    user     : 'root',
    password : '1988qwerTYUI@',
    port: '3306',
    database: 'xiaoyubrowser',
    multipleStatements: true ,//允许查询多条语句，结果只返回最后一条 。这里简单起见不使用事务
});

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



const  userloginsql="select * from user_email where email=? and pwd=? "
const  userfindsql="select * from user_email where email=? "
const  userregsql="INSERT INTO user_email(email,pwd) VALUES(?,?)" 
const  userupdatesql="UPDATE user_email SET usetime =usetime+1 , lastcontacttime =NOW()   WHERE email =? "

const  macfindsql="select * from user_mac where mac=? "
const  macregsql="INSERT INTO user_mac(mac) VALUES(?)"
const  macupdatesql="UPDATE user_mac SET usetime =usetime+1 ,lastcontacttime =NOW() WHERE mac =?"
const  SQLERROR=201
const  YICUNZAIYONGHU=202
const  EMAILERROR=203



function init(){
    connection.connect();

    //用get方便测试，真新破解你也没办法
    // 不存在的用户 返回也是200 不会报错，只是data是空数组
    //这些错误是指服务器层面错误
    app.get('/userlogin', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.email;
        let pwd=params.pwd;
        console.log("User login  name = "+username+", password is "+params.pwd);
        if(!ismail(username)){
            var response = {
                "code":EMAILERROR,
                "msg":"not correct email address"
            };
            res.end(JSON.stringify(response));
            return;
        }
        let userloginparams=[username,pwd];
        connection.query(userloginsql,userloginparams,function (err, result) {
            if(err){
                var response = {
                    "code":SQLERROR,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("user login sql res:"+result);
            var response = {
                "code":200,
                "msg":"success",
                data:JSON.stringify(result),// 这个如果没有则result是空字符串
            };
            res.end(JSON.stringify(response));
        });
    })

    //这里会出现用户已存在错误
    app.get('/userreg', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.email;
        let pwd=params.pwd;         
        console.log("User name = "+username+", password is "+params.pwd);
        if(!ismail(username)){
            var response = {
                "code":1,
                "msg":"not correct email address"
            };
            res.end(JSON.stringify(response));
            return;
        }
        let userfindparams=[username];
        connection.query(userfindsql,userfindparams,function (err, result) { //1 查询
            if(err){
                var response = {
                    "code":SQLERROR,
                    "msg":"user reg find sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("user find  sql res:"+result);
            if(result!=null || result.length==0){
                let userinsertparams=[username,pwd];
                connection.query(userregsql,userinsertparams,function (err, result) { //2查询不到 则创建
                    if(err){
                        var response = {
                            "code":SQLERROR,
                            "msg":"sqlerror"+err.message
                        };
                        res.end(JSON.stringify(response));
                        return;
                    }
                    //插入没报错就行，不需要继续查询
                    var tempuser ={};
                    tempuser.email=username;
                    var response = {
                        "code":200,
                        "msg":"success",
                        data:JSON.stringify(tempuser),//
                    };//
                    res.end(JSON.stringify(response));
                });
            }else{
                var response = {
                    "code":YICUNZAIYONGHU,
                    "msg":"failed already exist user",
                    error:JSON.stringify(result),// 这个如果没有则result
                };
                res.end(JSON.stringify(response));
            }
        });
    })

    //不存在的用户也不会update出错，只是后续返回时空数组
    app.get('/userupdate', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.email;
        console.log("update user  use time  = "+username);
        let userparams=[username];
        connection.query(userupdatesql,userparams,function (err, result) {
            if(err){
                var response = {
                    "code":SQLERROR,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("user update  sql res:"+result);
            // 插入返回值是影响行数 所以这里还得查询
            connection.query(userfindsql,userparams,function (err, result) {
                if(err){
                    var response = {
                        "code":SQLERROR,
                        "msg":"user find  sqlerror"+err.message
                    };
                    res.end(JSON.stringify(response));
                    return;
                }
                console.log("user update then find  sql res:"+result);
                var response = {
                        "code":200,
                        "msg":"success",
                        data:JSON.stringify(result),// 这个如果没有则result
                 };
                res.end(JSON.stringify(response));
                })
            });
        }
    )

    app.get('/maclogin', function (req, res) {
        //这里不验证邮箱
        let params = url.parse(req.url, true).query;
        let username=params.mac;

        console.log("mac login  name = "+username);
        let machineloginparams=[username];
        connection.query(macfindsql,machineloginparams,function (err, result) {
            if(err){
                var response = {
                    "code":SQLERROR,
                    "msg":"sqlerror"+err.message
                };
                res.end(JSON.stringify(response));
                return;
            }
            console.log("machine login sql res:"+ result); //result是数组对象，没有则是空数组 数组每个成员是一个json对象
            if(result.length==0){//不存在用户 继续插入
                let machineregparams=[username];
                connection.query(macregsql,machineregparams,function (err, result) {
                    if(err){
                        var response = {
                            "code":SQLERROR,
                            "msg":"sqlerror"+err.message
                        };
                        res.end(JSON.stringify(response));
                        return;
                    }
                    //插入返回值是   影响行数 在这里我们除了mac其他的信息都不重要 手动生成一个对象
                    //只要插入成功就行，不需要返回结果
                    var tempuser ={};
                    tempuser.mac=username;
                    var response = {
                        "code":200,
                        "msg":"success",
                        data:JSON.stringify(tempuser),//
                    };//
                    res.end(JSON.stringify(response));
                });
            }else{//存在直接返回
                var response = {
                    "code":200,
                    "msg":"success",
                    data:JSON.stringify(result),
                };
                res.end(JSON.stringify(response));
            }
        });
    })


    app.get('/macupdate', function (req, res) {
            //这里不验证邮箱
            let params = url.parse(req.url, true).query;
            let username=params.mac;
            console.log("update user  use time  = "+username);
            let userparams=[username];
            connection.query(macupdatesql,userparams,function (err, result) {
                if(err){
                    var response = {
                        "code":SQLERROR,
                        "msg":"mac update sqlerror"+err.message
                    };
                    res.end(JSON.stringify(response));
                    return;
                }
                console.log("mac  update  sql res:"+result);
                // 插入返回值是影响行数 所以这里还得查询
                connection.query(macfindsql,userparams,function (err, result) {
                    if(err){
                        var response = {
                            "code":SQLERROR,
                            "msg":"mac find sqlerror"+err.message
                        };
                        res.end(JSON.stringify(response));
                        return;
                    }
                    console.log("mac update then find  sql res:"+result);
                    var response = {
                        "code":200,
                        "msg":"success",
                        data:JSON.stringify(result),// 这个如果没有这个用户update 不一定会报错，select也不一定会报错，但是select一定会空白
                    };
                    res.end(JSON.stringify(response));
                })
            });
        }
    )

    //其实这个登录注册压力很小，访问压力其实和这个无关，和ssr有关


    var userServer = app.listen(8082,'0.0.0.0', function () {
        console.log("应用实例，访问地址为134.175.38.75:8082")
    })

}

init();