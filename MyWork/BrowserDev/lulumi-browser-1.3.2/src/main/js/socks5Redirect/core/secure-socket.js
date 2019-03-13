/* eslint-disable no-underscore-dangle,consistent-return */
class SecureSocket {
  // constructor(cipher) {
  //   this.cipher = cipher;
  // }

  // constructor() {
  //   // this.cipher = cipher;
  // }
  encodeBuffer(chunk) {
    // if (Buffer.isBuffer(chunk)) {
    //     chunk = [...chunk];
    // }
    if (!chunk) {
      return;
    }
    const encode = this.cipher.encode(chunk);
    return encode;
  }

  decodeBuffer(chunk) {
    // if (Buffer.isBuffer(chunk)) {
    //     chunk = [...chunk];
    // }
    if (!chunk) {
      return;
    }
    const decode = this.cipher.decode(chunk);
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
}

export default SecureSocket;
