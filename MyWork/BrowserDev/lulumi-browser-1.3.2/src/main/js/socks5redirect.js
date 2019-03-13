/* eslint-disable no-underscore-dangle,consistent-return */
const net = require('net');
const thought2 = require('through2');
const http = require('http');
const urlParseLax = require('url-parse-lax');


class socks5Redirect {
  downloadConfig() {
    const _this = this;
    console.log(_this);
    const opt = {
      host: '134.175.38.75', // 注意:不用协议部分(http://)
      port: '8081',
      path: '/getpwd', // 斜杠开头
      method: 'GET',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, // 设置content-type 头部
    };
    let body = '';
    const req = http.request(opt, (res) => {
      // console.log('requesttttttttttttt');
      if (res.statusCode === 200) {
        // console.log('REQUEST OK..');
        res.setEncoding('utf8');// res为ClientResponse的实例，是readableStream, 设置字符编码
        res.on('data', (chunk) => {
          body += chunk;
        }).on('end', () => {
          const configObj = JSON.parse(body);
          console.log('Got data: ', configObj);// end事件中 打印全部响应数据
          const remoteUrlObj = urlParseLax(configObj.listen);
          // console.log('Got data: ', configObj);// end事件中 打印全部响应数据
          const remoteport = parseInt(remoteUrlObj.port, 0);
          // console.log('Got data: ', configObj);// end事件中 打印全部响应数据
          _this.listenAddr = {
            host: '127.0.0.1',
            port: '1080',
          };
          // console.log('Got data: ', configObj);// end事件中 打印全部响应数据
          _this.remoteAddr = {
            host: opt.host,
            port: remoteport,
          };
          _this.stop();
          // _this.listenAddr = listenAddr;
          // _this.remoteAddr = remoteAddr;
          _this.createCipher(configObj.password);
          // _this.socks5RedirectServer = new LSLocal(configObj.password, listenAddr, remoteAddr);
          // _this.socks5RedirectServer.listen();
          _this.listen();
          console.log(`start socks5:${_this.listenAddr}`);
          console.log(`start socks5 remote :${_this.remoteAddr} ${_this.remoteAddr.host}`);
          console.log(_this);
        });
      } else {
        console.log(`Error ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.log('error: ', err.message);
    });
    req.end();// 结束请求
  }
  refreshSocks5() {
    this.downloadConfig();
  }

  // 各种莫名其妙错误，没办法只有写到一个文件内部
  handleConnection(localConnection) {
    const _this = this;
    // console.log(_this);
    // console.log(_this.remoteAddr);
    const host = '134.175.38.75';
    const port = 443;
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
    // _this.server.listenAddr = _this.listenAddr;
    // _this.server.remoteAddr = _this.remoteAddr;
    _this.server.listen(this.listenAddr.port, () => {
      console.info(`本地服务器启动，监听端口：${_this.listenAddr.port}...`);
    });
    if (didListen) {
      // todo:
      didListen();
    }
    _this.server.on('error', (err) => {
      console.error(`本地服务器发生错误，错误信息：${err.message}`);
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

export default socks5Redirect;
