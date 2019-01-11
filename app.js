var express = require("express")
var http = require("http")
var path = require("path")
var ledgerAPI = require('./ledgerAPI')

var bodyParser = require("body-parser");
const fileUpload = require('express-fileupload');
const cookieParser = require("cookie-parser");
var app = express()

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(__dirname + '/web'));

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

app.get('/',(req,res) =>{
    res.sendFile(path.join(__dirname+'/web/loginnew.html'));
    //res.send(users);
})

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/registernew.html'));
    //res.send(users);
})



app.get('/login', (req, res) => {
   if(req.cookies.token==null) res.sendFile(path.join(__dirname + '/web/loginnew.html'));
   else res.sendFile(path.join(__dirname + '/web/dashBoard.html'));
    //res.send(users);
})

app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/logoutnew.html'));
    //res.send(users);
})

app.get('/uploadDocument', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/uploadDocument.html'));
})

app.get('/RequestForSignature', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/RequestForSignature.html'));
})

app.get('/signDoc', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/signDoc.html'));
})

app.get('/checkSignature', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/checkSignature.html'));
})

app.get('/listRequest', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/listRequest.html'));
})

app.get('/listOfRequest', (req, res) => {
    res.sendFile(path.join(__dirname + '/web/listOfRequest.html'));
})




app.post('/register', (req, res) => {
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    };

    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    var request = {
        chaincodeId: 'fabcar',
        fcn: 'register',
        args: [user.name, user.email, user.password],
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
            res.send("Account Created");

        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });
});

app.post('/logout', (req, res) => {

    const user = {
        key: req.body.key,
    };

    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
    // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
    // must send the proposal to endorsing peers
    var request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'fabcar',
        fcn: 'logout',
        args: [user.key],
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
            res.send("Logout Successful");
            // console.log("Response is ", results[0].toString());

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

    //res.cookie(token , '${}')
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
                var result= JSON.parse(query_responses[0]);
                //edited 
                console.log(result);
                res.cookie(token , '${result.token}');

                res.send("Token, Key: " + query_responses[0].toString())
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

app.post('/uploadDocument', (req, res) => {

    token = req.body.token;

    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }


    fileName = req.files.myfile.name;
    fileHash = makeid();

    req.files.myfile.mv(__dirname + "/files/" + fileHash + "/" + fileName);

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
        args: [token, fileName, fileHash],
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
            res.send("Upload Successful");
            // console.log("Response is ", results[0].toString());

        } else {
            console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
        }
    }).catch((err) => {
        console.error('Failed to invoke successfully :: ' + err);
    });
});


server.listen(3000, err => {
    if (err) {
        throw err
    }
    console.log('server started at 127.0.0.1:3000');
})