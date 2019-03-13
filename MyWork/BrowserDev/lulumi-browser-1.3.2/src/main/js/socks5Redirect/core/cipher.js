/* eslint-disable no-useless-constructor,no-empty-function */
class Cipher {
  constructor() {}
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

export default Cipher;
