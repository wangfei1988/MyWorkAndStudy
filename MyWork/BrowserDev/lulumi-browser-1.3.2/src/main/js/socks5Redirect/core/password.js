const PASSWORD_LENGTH = 256;

function validatePassword(pwd) {
  let pwdbuf;
  if (typeof (pwd) === 'string') {
    pwdbuf = Buffer.from(pwd, 'base64');
  } else if (Buffer.isBuffer(pwd)) {
    pwdbuf = pwd;
  }
  if (pwdbuf.length !== PASSWORD_LENGTH
        && (new Set(pwdbuf)).size !== PASSWORD_LENGTH) {
    // throw new Error(`It's not a valid password`);
    return false;
  }
  return true;
}

function generateRandomPassword() {
  let tempArray = new Array(PASSWORD_LENGTH);
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    tempArray[i] = i;
  }
  const shuffle = (array) => {
    let tmp;
    let current;
    let top = array.length - 1;
    if (top) {
      while (top) {
        current = Math.floor(Math.random() * (top + 1));
        if (array[current] !== top) {
          tmp = array[current];
          array[current] = array[top];
          array[top] = tmp;
          top -= 1;
        }
      }
    }
    return array;
  };
  const generateRandom = (array) => {
    do {
      array = shuffle(array);
    } while (array[0] === 0);
    return array;
  };
  tempArray = generateRandom(tempArray);

  // for(let i = 0,num=0;i<PASSWORD_LENGTH;i++){
  //     do{
  //         let indexArray = tempArray.map((value,index)=>{
  //             if(value!== null){
  //                 return index;
  //             }
  //         });
  //         let index = Math.floor(Math.random() * (indexArray.length + 1) );
  //         num = tempArray[indexArray[index]];
  //     }while (tempArray[num] === null);
  //     if(tempArray[num] !== i && tempArray[num] !== null){
  //         password[i] = tempArray[num];
  //         tempArray[num] = null;
  //     }
  // }
  const passwordArray = Buffer.from(tempArray);
  return passwordArray.toString('base64');
}

exports.generateRandomPassword = generateRandomPassword;
exports.validatePassword = validatePassword;
