// Promise 是一个类 无需考虑兼容问题
// 当使用promise时 有一个执行器 executor 会立即执行

const PEDDING = "PEDDING";
const REJECTED = "REJECTED";
const FULFILLED = "FULFILLED";
/**
 * promise解析方法
 * promise解析过程： 是一个以promise和一个值作为参数的抽象过程， 可以表示为[[Resolve]](promise,x)
 * 1. 如果promise和x的值指向同一个值， 使用TypeError作为原因将promise拒绝
 * 2. 如果x是一个promise 则采用其状态
 *    1. 如果x是pendding状态，promise必须保持pendding走到x fulfilled或者rejected
 *    2. 如果x是fulfilled状态，将x的值用于fulfilled promise
 *    3. 如果x是rejected状态，将x的值用于reject promise
 * 3. 如果x是一个对象或者一个函数
 *    1. 将then赋值x.then
 *    2. 如果在取x.then值时抛出了异常， 则以这个异常为原因将promise拒绝
 *    3. 如果then是一个函数，以x为this调用then函数， 且第一个参数是resolvePromise，第二个参数是rejectPromise
 *        1. 当resolvePromise被以y为参数调用，执行[[Resolve]](promise,y)
 *        2. 当rejectPromise被以r为参数调用，则以r为原因将promise拒绝
 *        3. 控制其resolvePromise，rejectPromise只调用一次
 *        4. 如果在调用then时抛出了异常
 *            1. 如果resolvePromise或rejectPromise已经被调用，则忽略它
 *            2. 否则，以e为reason将其promise拒绝
 *    4. 如果then不是一个函数， 则以x为值fulfill promise
 * @param {*} promise2
 * @param {*} x
 * @param {*} resolve
 * @param {*} reject
 * @returns
 */
function resolvePromise(promise2, x, resolve, reject) {
  // 核心流程
  if (promise2 === x) {
    // 1. 如果promise和x的值指向同一个值， 使用TypeError作为原因将promise拒绝
    return reject(new TypeError("error"));
  }

  //自己写的Promise要与别人的promise兼容 考虑不是自己写的promise情况
  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    let called = false;
    try {
      // 别人的promise可能调用成功后 还能调用失败， 取值时可能发生异常
      let then = x.then;
      if (typeof then === "function") {
        then.call(
          x, // 3. 以x为this 调用then
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        // {}
        resolve(x);
      }
    } catch (e) {
      // 3-2. 如果在取x.then值时抛出了异常， 则以这个异常为原因将promise拒绝
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // 4 如果不是一个函数， 则以x为值 fulfilled promise
    resolve(x);
  }
}

class Promise {
  constructor(executor) {
    this.value = undefined; // 成功的原因
    this.status = PEDDING; // promise的状态
    this.reason = undefined; // 失败的原因
    this.onFulfilledCallbacks = []; // 存放成功的回调方法
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (value instanceof Promise) {
        return value.then(resolve, reject);
      }
      if (this.status === PEDDING) {
        this.value = value;
        this.status = FULFILLED;
        // 6.1 当promise fulilled 后 所有onFulfilled 必须按照其注册顺序执行
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };

    const reject = (reason) => {
      if (this.status === PEDDING) {
        this.reason = reason;
        this.status = REJECTED;
        // 发布
        // 6.2 当promise rejected后， 所有onRejected 必须按照其注册顺序执行
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }
  then(onFulfilled, onRejected) {
    // 1. then方法接受两个参数
    // 验证onFulfilled 和 onRejected 的类型
    // 5 onRejected 和 onFulfilled 必须当做函数调用
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v) => v;
    onRejected = typeof onRejected === "function" ? onRejected : (v) => v;

    // 实现链式调用

    let promise2 = new Promise((resolve, reject) => {
      // 订阅方法
      if (this.status === FULFILLED) {
        // 2 onFulfilled 必须在 promise fulilled之后调用。 且promise的value是其第一个参数
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);
            // 7.1 此时x可能是一个promise， 如果是promise 需要看一下promise是成功还是失败。 .then，  如果成功则吧
            // 成功的结果调用promise2的resolve传递进去， 失败则同理
            // 总结 x的值 决定是调用promise2的resolve还是reject， 如果是promise，则取他的状态，如果是普通值
            // 就直接调用resolve
            resolvePromise(promise2, x, resolve, reject); // 解析promise流程
          } catch (e) {
            reject(e);
          }
        }, 0);
      }

      if (this.status === REJECTED) {
        // 3 onRejected 必须 在reject之后调用 ， 且promise的reason为它的第一个参数
        // 失败调用失败的方法
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }
      // 4 onRejected 和 onFulfilled只允许在 execution context 栈 仅包含你平台代码时运行

      if (this.status === PEDDING) {
        // 6.1 把onFulfilled 缓存起来， 当resolve时 按照其添加顺序执行
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
        // 6.2 把onRejected 缓存起来  在调用reject时再按照其添加顺序执行
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
      }
    });
    // 7. then 必须返回一个promise
    return promise2;
    // - .如果 onFulfilled 或者 onRejected 返回了值x ， 则执行promise的解析流程。
    // - .如果onFulfilled 或者 onRejected抛出异常，则promise2应当以e为reason被拒绝
    // - .如果onFulfilled不是一个函数且promise1已经fulfilled，则promise2必须以promise1的值fulfilled
    // - .如果onRejected不是一个函数 且promise1已经rejected， 则promise2必须以相同的reason被拒绝
  }

  catch(errorFn) {
    return this.then(null, errorFn);
  }

  // 无论是成功还是失败 都会执行
  // 可以返回一个promise
  finally(cb) {
    return this.then(
      (data) => {
        return Promise.resolve(cb()).then(() => data);
      },
      (err) => {
        return Promise.resolve(cb()).then(() => {
          throw err;
        });
      }
    );
  }

  static resolve(value) {
    return new Promise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new Promise((resolve, reject) => {
      reject(reason);
    });
  }

  /**
   * 等所有的promise全部完成
   * 但当其中有一个失败了 那么这个promise就失败了
   * 多个异步 并发请求
   */
  static all(promises) {
    return new Promise((resolve, reject) => {
      let result = [];
      let times = 0;
      const processSucccess = (index, val) => {
        // 会出现某些then结果速度快些  所以采用result[index]
        result[index] = val;
        if (++times === promises.length) {
          resolve(result);
        }
      };
      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(
            (data) => processSucccess(i, data),
            // 如果有一个失败了 就执行失败
            reject
          );
        } else {
          processSucccess(i, p);
        }
      }
    });
  }

  /**
   * 其中一个完成了 但是剩下的还会继续执行
   */
  static race(promises) {
    return new Promise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(resolve, reject);
        } else {
          resolve(p);
        }
      }
    });
  }

  static deferred() {
    const dfd = {};
    dfd.promise = new Promise((resolve, reject) => {
      dfd.resolve = resolve;
      dfd.reject = reject;
    });
    return dfd;
  }

  static allSettled(promises) {
    return new Promise((resolve, reject) => {
      const result = [];
      let times = 0;
      function processPromise(index, value) {
        result[index] = value;
        if (++times === promises.length) {
          resolve(result);
        }
      }
      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(
            (value) =>
              processPromise(i, {
                status: "fulfilled",
                value,
              }),
            (error) =>
              processPromise(i, {
                status: "rejected",
                reason: error,
              })
          );
        } else {
          processPromise(i, {
            status: "fulfilled",
            value: p,
          });
        }
      }
    });
  }
}

// Promise.all([1, 2])
//   .then((res) => {
//     console.log("res", res);
//   })
//   .catch((e) => console.log("e", e));

// 模拟超时
function wrap(p1) {
  let abort;
  let p = new Promise((resolve, reject) => {
    abort = reject;
  });
  let p2 = Promise.race([p, p1]);
  p2.abort = abort; // 调用这个方法 p2 就失败了
  return p2;
}

// 加载超时问题 图片懒加载
// const p = new Promise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(199);
//   }, 2000);
// });

// const abortP = wrap(p);
// p.then(
//   (result) => {
//     console.log("result", result);
//   },
//   (e) => console.log("e", e)
// );

const resolved = Promise.resolve(100);
const rejected = Promise.reject(-100);
const allSettle = Promise.allSettled([resolved, rejected]);

allSettle.then((ret) => console.log("ret", ret), console.error);
