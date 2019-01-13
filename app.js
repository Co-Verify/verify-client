/* =================================================== */
/* ===== Section 1: Require all the dependencies ===== */
/* =================================================== */

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({
    dest: './files/'
});
const hbs = require('hbs');
const logger = require('morgan');
var Timeout = require('smart-timeout')
var crypto = require("crypto");
var fs = require("fs");
var http = require("http")
var path = require("path")
var ursa = require("ursa");
var ledgerAPI = require('./ledgerAPI')
var move = require('./fileMovement')

// const fileUpload = require('express-fileupload');
const cookieParser = require("cookie-parser");

// Define port for app to listen on
const port = process.env.PORT || 3000;

/* ==================================================== */
/* ===== Section 2: Configure express middlewares ===== */
/* ==================================================== */

const app = express();
app.use(bodyParser()); // to use bodyParser (for text/number data transfer between clientg and server)
app.set('view engine', 'hbs'); // setting hbs as the view engine

app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

var router = express.Router();
app.use(express.static(__dirname + '/web')); // making ./public as the static directory
app.use(express.static(__dirname + '/files')); // making ./public as the static directory
app.use('/', router);
app.set('views', __dirname + '/web'); // making ./views as the views directory
app.use(logger('dev')); // Creating a logger (using morgan)
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
// app.use(fileUpload());
// app.use(express.static(__dirname + '/web'));

const server = http.createServer(app);

///////////////////////////
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

//
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
var peer = fabric_client.newPeer('grpc://localhost:7051');
channel.addPeer(peer);
var order = fabric_client.newOrderer('grpc://localhost:7050')
channel.addOrderer(order);

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:' + store_path);
var tx_id = null;


// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({
        path: store_path
    });
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    // get the enrolled user from persistence, this user will sign all requests
    return fabric_client.getUserContext('user1', true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded user1 from persistence');
        member_user = user_from_store;
    } else {
        throw new Error('Failed to get user1.... run registerUser.js');
    }
});
////////////////////////////




// var users =[{id:1,name:'anam',email:'anamibnaharun@gmail.com',password:'anam'}];

app.get('/', (req, res) => {
    if (req.cookies.token == null) res.render('home.html');
    else res.redirect('/dashBoard');
    // res.sendFile(path.join(__dirname + '/web/loginnew.html'));
    //res.send(users);
})

app.get('/register', (req, res) => {
    if (req.cookies.token == null) res.sendFile(path.join(__dirname + '/web/registernew.html'));
    else res.redirect('/dashBoard');
    //res.send(users);
})

app.get('/login', (req, res) => {
    if (req.cookies.token == null) res.sendFile(path.join(__dirname + '/web/loginnew.html'));
    else res.redirect('/dashBoard'); // res.sendFile(path.join(__dirname + '/web/dashBoard.html'));
    //res.send(users);
})

app.get('/dashBoard', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/dashBoard.html'));
})

app.get('/logout', (req, res) => {
    //res.sendFile(path.join(__dirname + '/web/logoutnew.html'));
    //res.send(users);
    //edited
    var token = req.cookies.token;
    res.clearCookie('token');

    var redirect = function () {
        res.redirect('/');
    }

    Timeout.set(redirect, 3000)

    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
    // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
    // must send the proposal to endorsing peers
    var request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'fabcar',
        fcn: 'logout',
        args: [token],
        chainId: 'mychannel',
        txId: tx_id
    };

    // send the transaction proposal to the peers
    ledgerAPI.invoke(channel, request, peer).then((results) => {
        console.log('Send transaction promise and event listener promise have completed');
        // check the results in the order the promises were added to the promise all list
        if (results && results[0] && results[0].status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
        } else {
            console.error('Failed to order the transaction. Error code: ' + results[0].status);
        }

        if (results && results[1] && results[1].event_status === 'VALID') {
            console.log('Successfully committed the change to the ledger by the peer');
            // res.send("Logout Successful");
            if (Timeout.pending(redirect)) {
                Timeout.clear(redirect)
                redirect();
            }
            // console.log("Response is ", results[0].toString());

        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });
})

app.get('/uploadDocument', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.render('uploadDocument.html', {
        userToken: req.cookies.token
    });
    //  res.sendFile(path.join(__dirname + '/web/uploadDocument.html'));
})

app.get('/RequestForSignature', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/RequestForSignature.html'));
})

app.get('/signDoc', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/signDoc.html'));
})

app.get('/checkSignature', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/checkSignature.html'));
})

app.get('/listRequest', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/listRequest.html'));
})

app.get('/listOfRequest', (req, res) => {
    if (req.cookies.token == null) res.redirect('/login');
    else res.sendFile(path.join(__dirname + '/web/listOfRequest.html'));
})

/**
 * Generate a new private key object (aka a keypair).
 */
function getEncryptKey(data, encryptKey) {
    var algorithm = 'aes256';
    var inputEncoding = 'utf8';
    var outputEncoding = 'hex';

    var encryptKey = crypto.createHash('md5').update(encryptKey).digest("base64");
    var cipher = crypto.createCipher(algorithm, encryptKey);
    var ciphered = cipher.update(data, inputEncoding, outputEncoding);
    ciphered += cipher.final(outputEncoding);
    return ciphered;
}

app.post('/register', (req, res) => {
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    };

    var keyPair = ursa.generatePrivateKey(1024, 65537);
    var privkeypem = keyPair.toPrivatePem();
    var pubkeypem = keyPair.toPublicPem();

    var privkeystr = privkeypem.toString('utf8');
    var pubkeystr = pubkeypem.toString('utf8');
    console.log(privkeystr);
    console.log(pubkeystr);

    encryptedPrivKey = getEncryptKey(privkeystr, user.password);
    console.log(encryptedPrivKey);

    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    console.log(user.password)
    user.password = crypto.createHash('sha256').update(user.password).digest("base64");
    console.log(user.password)

    var request = {
        chaincodeId: 'fabcar',
        fcn: 'register',
        args: [user.name, user.email, user.password, encryptedPrivKey, pubkeystr],
        chainId: 'mychannel',
        txId: tx_id
    };

    // send the transaction proposal to the peers
    ledgerAPI.invoke(channel, request, peer).then((results) => {
        console.log('Send transaction promise and event listener promise have completed');
        // check the results in the order the promises were added to the promise all list
        if (results && results[0] && results[0].status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
        } else {
            console.error('Failed to order the transaction. Error code: ' + results[0].status);
        }

        if (results && results[1] && results[1].event_status === 'VALID') {
            console.log('Successfully committed the change to the ledger by the peer');
            //res.send("Account Created");
            res.redirect('/login');

        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });
});



app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    console.log(user.password)
    user.password = crypto.createHash('sha256').update(user.password).digest("base64");
    console.log(user.password)

    // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
    // queryAllCars chaincode function - requires no arguments , ex: args: [''],
    const request = {
        //targets : --- letting this default to the peers assigned to the channel
        chaincodeId: 'fabcar',
        fcn: 'login',
        args: [user.email, user.password]
    };

    // send the query proposal to the peer
    ledgerAPI.query(channel, request).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
            } else {

                console.log("Response is ", query_responses[0].toString());
                var result = JSON.parse(query_responses[0].toString());
                //edited 
                console.log(result);

                if ((!result.hasOwnProperty('token')) || (typeof result.token === "undefined")) {
                    //res.sendFile(path.join(__dirname + '/web/loginnew.html'));  
                    res.redirect('/login');
                } else {
                    res.cookie('token', result.token);

                    //res.sendFile(path.join(__dirname + '/web/dashBoard.html'));
                    res.redirect('/dashBoard');
                }
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        console.error('Failed to query successfully :: ' + err);
    });

});

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};

function hashDocument(filePath, algorithm) {
    var hashPromise = new Promise(function (resolve, reject) {
        shasum = crypto.createHash(algorithm)

        // Updating shasum with file content
        s = fs.ReadStream(filePath)

        s.on('data', function (data) {
            shasum.update(data)
        })

        // making digest
        s.on('end', function () {
            var hash = shasum.digest('base64')
            resolve(hash)
        })
    });
    return hashPromise;
}

app.post('/uploadDocument', upload.single('myfile'), (req, res) => {
    var token = req.cookies.token;

    if (!req.file) {
        console.log('No File Uploaded');
        var filename = 'FILE NOT UPLOADED';
        var uploadStatus = 'File Upload Failed';

        res.render('uploadDocument.html', {
            status: uploadStatus,
            filename: filename,
            userToken: req.cookies.token
        });
        return
    }

    console.log('Uploading file...');
    var filename = req.file.originalname;
    var uploadStatus = 'File Uploaded Successfully';

    console.log("token: ", token)
    console.log(req.file)

    ////////////////////////////////////////
    var algorithm = 'sha256';
    var oldfilepath = __dirname + "/" + req.file.path;
    hashDocument(oldfilepath, algorithm).then((fileHash) => {
        newPath = __dirname + "/files/" + Date.now() + "/" + filename;
        move(oldfilepath, newPath).then(() => {
            //////////////////////////////////////////////////
            // get a transaction id object based on the current user assigned to fabric client
            tx_id = fabric_client.newTransactionID();
            console.log("Assigning transaction_id: ", tx_id._transaction_id);

            // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
            // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
            // must send the proposal to endorsing peers
            var request = {
                //targets: let default to the peer assigned to the client
                chaincodeId: 'fabcar',
                fcn: 'uploadDocument',
                args: [token, filename, fileHash, newPath],
                chainId: 'mychannel',
                txId: tx_id
            };

            // ledgerAPI.invoke(channel, request, peer).then((results) => {
            //     console.log('Send transaction promise and event listener promise have completed');
            //     // check the results in the order the promises were added to the promise all list
            //     if (results && results[0] && results[0].status === 'SUCCESS') {
            //         console.log('Successfully sent transaction to the orderer.');
            //     } else {
            //         console.error('Failed to order the transaction. Error code: ' + results[0].status);
            //     }

            //     if (results && results[1] && results[1].event_status === 'VALID') {
            //         console.log('Successfully committed the change to the ledger by the peer');
            //         //res.send("Account Created");
            //         res.render('uploadDocument.html', {
            //             status: uploadStatus,
            //             filename: filename,
            //             userToken: req.cookies.token
            //         });

            //     } else {
            //         console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
            //     }
            // }).catch((err) => {
            //     console.error('Failed to invoke successfully :: ' + err);
            // });

            // send the transaction proposal to the peers
            ledgerAPI.slimInvoke(channel, request, peer).then(() => {
            res.render('uploadDocument.html', {
                status: uploadStatus,
                filename: filename,
                userToken: req.cookies.token
            });
            }).catch((err) => {
                console.error('Failed to invoke successfully :: ' + err);
            });
            /////////////////////////////////////////////////
        });
    });
});


server.listen(port, err => {
    if (err) {
        throw err
    }
    console.log('server started at 127.0.0.1:3000');
})