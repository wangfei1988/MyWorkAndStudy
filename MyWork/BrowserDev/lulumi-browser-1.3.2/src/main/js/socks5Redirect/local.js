/* eslint-disable no-underscore-dangle,consistent-return */
const net = require('net');
// const Cipher = require('./core/cipher');
// const SecureSocket = require('./core/secure-socket');
const thought2 = require('through2');
const log4js = require('log4js');

class LSLocal {
  constructor(password, listenAddr, remoteAddr) {
    // super();
    // this.cipher = new Cipher();
    // console.log('sssssssss');
    this.createCipher(password);
    // super(Cipher.createCipher(password));
    this.listenAddr = listenAddr || { host: '0.0.0.0', port: 7448 };
    this.remoteAddr = remoteAddr || { host: '0.0.0.0', port: '*' };
    this.logger = log4js.getLogger('LsLocal');
    this.logger.level = process.env.NODE_ENV === 'debug' ? 'debug' : 'info';
    LSLocal.instance = this;
  }
  handleConnection(localConnection) {

    const _this = LSLocal.instance;
    const host = _this.remoteAddr.host;
    const port = _this.remoteAddr.port;
    _this.logger.info(`接受连接：${localConnection.remoteAddress}:${localConnection.remotePort}`);
    localConnection.on('error', (err) => {
      _this.logger.error(`本地连接发生错误，错误信息：${err.message}`);
      localConnection.destroy();
    });
    localConnection.on('close', () => {
      _this.logger.info(`断开连接 ${localConnection.remoteAddress}:${localConnection.remotePort}`);
    });
    const remoteConnection = net.createConnection(port, host, () => {
      localConnection.pipe(thought2((chunk, enc, callback) => {
        chunk = _this.encodeBuffer(chunk);
        callback(null, chunk);
      })).pipe(remoteConnection);
      remoteConnection.pipe(thought2((chunk, enc, callback) => {
        chunk = _this.decodeBuffer(chunk);
        callback(null, chunk);
      })).pipe(localConnection);
    });
    remoteConnection.on('error', () => {
      _this.logger.error(`连接到远程服务器 ${_this.remoteAddr.host} 失败`);
      remoteConnection.destroy();
      localConnection.destroy();
    });
  }

  listen(didListen) {
    const _this = this;
    _this.server = net.createServer(this.handleConnection);
    _this.server.listen(this.listenAddr.port, () => {
      _this.logger.info(`本地服务器启动，监听端口：${_this.listenAddr.port}...`);
    });
    if (didListen) {
      // todo:
      didListen();
    }
    _this.server.on('error', (err) => {
      _this.logger.error(`本地服务器发生错误，错误信息：${err.message}`);
      _this.server.close();
    });
  }

  stop() {
    const _this = this;
    if (_this.server != null) {
      _this.server.close();
    }
  }

  encodeBuffer(chunk) {
    // if (Buffer.isBuffer(chunk)) {
    //     chunk = [...chunk];
    // }
    if (!chunk) {
      return;
    }
    const encode = this.encode(chunk);
    return encode;
  }

  decodeBuffer(chunk) {
    // if (Buffer.isBuffer(chunk)) {
    //     chunk = [...chunk];
    // }
    if (!chunk) {
      return;
    }
    const decode = this.decode(chunk);
    return decode;
  }
  socketWrite(socket, buffer) {
    const _this = this;
    return new Promise((resolve) => {
      socket.write(_this.encodeBuffer(buffer), (err) => {
        if (err) resolve(err);
        resolve();
      });
    });
  }
  socketRead(socket) {
    const _this = this;
    return new Promise((resolve) => {
      socket.once('readable', () => {
        resolve(_this.decodeBuffer(socket.read()));
      });
    });
  }

  setup(encodePassword, decodePassword) {
    this.encodePassword = encodePassword.slice();
    this.decodePassword = decodePassword.slice();
  }
  decode(buffer) {
    return buffer.map(value => this.decodePassword[value]);
  }
  encode(buffer) {
    return buffer.map(value => this.encodePassword[value]);
  }
  createCipher(encodePassword) {
    if (typeof (encodePassword) === 'string') {
      encodePassword = Buffer.from(encodePassword, 'base64');
    }
    const decodePassword = Buffer.alloc(256);
    // encodePassword.copy(decodePassword);
    for (let i = 0; i < decodePassword.length; i++) {
      const value = encodePassword[i];
      decodePassword.writeUInt8(i, value);
    }
    this.setup(encodePassword, decodePassword);
  }
}


export default LSLocal;
