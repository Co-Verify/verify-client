chmod +x ./startFabric.sh
./startFabric.sh
npm install
node enrollAdmin.js
node registerUser.js
if hash nodemon 2>/dev/null; then
    nodemon app.js
else
    node app.js
fi
