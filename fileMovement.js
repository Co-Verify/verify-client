var fs = require('fs');
var mv = require('mv');

module.exports = function move(oldPath, newPath) {
    var movePromise = new Promise(function (resolve, reject) {
        mv(oldPath, newPath, {mkdirp: true}, function(err) {
            // done. it tried fs.rename first, and then falls back to
            // piping the source file to the dest file and then unlinking
            // the source file.
            if(err != undefined) {
                reject(err)
            } else {
                resolve()
            }
        });        
    });
    return movePromise;
}