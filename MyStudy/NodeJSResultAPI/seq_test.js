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

async  function test(){
    //User 对象关联表user_test
    const User = sequelize.define('user_test', {
        firstName: {
            type: Sequelize.STRING
        },
        lastName: {
            type: Sequelize.STRING
        }
    },
        {
        timestamps: false
        }
    );

    // force: true  如果存在表，则先删除再创建
    // force: false 不会删除表，直接匹配。必须要求对象字段和表意义对应
    await User.sync({force: true}).then(() => {
        // Table created
        return User.create({
            firstName: 'John',
            lastName: 'Hancock'
        });
    });

    user = await User.findOne()
    console.log(user.get('firstName'));
    sequelize.query("UPDATE user_tests SET firstName ='aaa'").spread((results, metadata) => {
        console.log( "update *******");
        console.log(results);
        console.log( metadata)
    })
    sequelize.query("insert into user_tests(firstName,lastName ) values('123','456')").spread((results, metadata) => {
        console.log( "insert *******");
        console.log( results);
        console.log( metadata)
    })
    sequelize.query("select * from user_tests").spread((results, metadata) => {
        console.log( "select *******");
        console.log( results);
        console.log( metadata)
    })
    sequelize.query("select * from user_tests222").spread((results, metadata) => {
        console.log( "select *******");
        console.log( results);
        console.log( metadata)
    })
}
test()
console.log("********");