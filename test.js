Promise.defeered = () => {
  const dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

const { log } = require("console");
const fs = require("fs");
function readFile(filePath) {
  const dfd = Promise.defeered();
  log(dfd);
  fs.readFile(filePath, "utf8", function (err, data) {
    if (err) return dfd.reject(err);
    dfd.resolve(data);
  });
  return dfd.promise;
}
readFile("./a.js").then(console.log);
