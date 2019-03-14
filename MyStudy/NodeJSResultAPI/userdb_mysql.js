const Sequelize = require('sequelize');
const sequelize = new Sequelize('xiaoyubrowser', 'root', '1988qwerTYUI@', {
    host: '134.175.38.75',
    dialect: 'mysql',
    operatorsAliases: false,
    pool: {
        max: 50,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

//测试数据库连接，非必须
sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

const db_mysql={}
db_mysql.init= async function () {
    await user_email.sync({force: true}).then(() => {
        console.log("create new table  user_emails")
    });
    await user_mac.sync({force: true}).then(() => {
        console.log("create new table  user_macs")
    });
}

const user_email = sequelize.define('user_email', {
        email: {
            type: Sequelize.STRING,
            unique: true
        },
        pwd: {
            type: Sequelize.STRING
        },
        usetime: {
            type: Sequelize.INTEGER
        },
    },
);

const user_mac = sequelize.define('user_mac', {
        mac: {
            type: Sequelize.STRING,
            unique: true
        },
        pwd: {
            type: Sequelize.STRING
        },
        usetime: {
            type: Sequelize.INTEGER
        },
    },
);

db_mysql.emaillogin= function(email,pwd){
    user_email.findOne({where:{email:email ,pwd:pwd}}).then( user=>{
        console.log(user)
    } )
}

db_mysql.emailreg= function(email,pwd){
    user_email.findOne({where:{email:email ,pwd:pwd}}).then( user=>{
        if(user!=null){
            user_email.create({email:email ,pwd:pwd})
        }else{
            console.log(user);
        }
    } )
}



exports.db_mysql=db_mysql;

