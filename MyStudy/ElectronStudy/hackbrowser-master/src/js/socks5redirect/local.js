const net = require('net');
const Cipher = require('./core/cipher');
const SecureSocket = require('./core/secure-socket');
const thought2 = require('through2');
const log4js = require('log4js');

class LSLocal extends SecureSocket {
    constructor(password, listenAddr, remoteAddr) {
        super(Cipher.createCipher(password));
        this.listenAddr = listenAddr || { host: '0.0.0.0', port: 7448 };
        this.remoteAddr = remoteAddr || { host: '0.0.0.0', port: '*' };
        this.logger = log4js.getLogger('LsLocal');
        this.logger.level = process.env.NODE_ENV === 'debug' ? 'debug' : 'info';
        LSLocal.instance = this;
        this.logger.info('listen on:'+this.listenAddr.host+":"+this.listenAddr.port +'  sendto : '+this.remoteAddr.host+":"+this.remoteAddr.port);
    }
    handleConnection(localConnection) {
        let _this = LSLocal.instance;
        let host = _this.remoteAddr.host;
        let port = _this.remoteAddr.port;
        //_this.logger.info(`Accept Connection to ：${localConnection.remoteAddress}:${localConnection.remotePort}`);
        localConnection.on('error', (err) => {
            _this.logger.error(`Connection Error：${err.message}`);
            localConnection.destroy();
        });
        localConnection.on('close', () => {
            //_this.logger.info(`DisConnect  ${localConnection.remoteAddress}:${localConnection.remotePort}`);
        });
        let remoteConnection = net.createConnection(port, host, function () {
            localConnection.pipe(thought2(function (chunk, enc, callback) {
                chunk = _this.decodeBuffer(chunk);
                callback(null, chunk);
            })).pipe(remoteConnection);
            remoteConnection.pipe(thought2(function (chunk, enc, callback) {
                chunk = _this.encodeBuffer(chunk);
                callback(null, chunk);

            })).pipe(localConnection);
        });
        remoteConnection.on('error', () => {
            _this.logger.error(`Failed to Connect to  ${_this.remoteAddr.host} `);
            remoteConnection.destroy();
            localConnection.destroy();
        });
    }
    listen(didListen) {
        let _this = this;
        _this.server = net.createServer(this.handleConnection);
        _this.server.listen(_this.listenAddr.port, function () {
            _this.logger.info('Start SocksRedirect Listen On:'+_this.listenAddr.host+":"+_this.listenAddr.port  );
        });
        if (didListen) {
            // todo:
            didListen();
        }
        _this.server.on('error', (err) => {
            _this.logger.error(`SocksRedirect Error：${err.message}`);
            _this.server.close();
        });
    }
    stop(){
        let _this = this;
        if(_this.server)
            _this.server.close();
    }
}


module.exports = LSLocal;