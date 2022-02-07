const PEDDING = "PEDDING";
const REJECTED = "REJECTED";
const FULFILLED = "FULFILLED";

class Promise {
  constructor(executor) {
    this.value = undefined;
    this.reason = undefined;
    const resolve = (value) => {
      // 如果是pendding状态 则promise 可以转换到fulfilled或者rejected状态
      if (this.status === PEDDING) {
        this.value = value;
        this.status = FULFILLED; // 把状态置成 FULFILLED
      }
    };

    const reject = (reason) => {
      // 如果是pendding状态 则promise 可以转换到fulfilled或者rejected状态
      if (this.status === PEDDING) {
        this.reason = reason;
        this.status = REJECTED; // 把状态置成 REJECTED
      }
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    // 判断onFulfilled 和onRejected 的类型
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v) => v;
    onRejected = typeof onRejected === "function" ? onRejected : (v) => v;
  }
}
