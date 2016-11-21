var nodeimu = require('nodeimu');
var IMU = new nodeimu.IMU();
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var app = express();

port = 2022;
var sensors = {};
counter = 0;
app.use(express.static(__dirname + '/public'));

var server = http.createServer(app);
server.listen(port);
console.log('listening on port', port)

function getData() {
    IMU.getValue(function(err, data) {
        if (err) throw err;
        sensors = data;
        sensors.counter = counter++
    });
}
getData();
setInterval(getData, 25); //less that 25ms is erratic

app.all('/all', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(sensors));
});

app.all('/heading', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    heading = ((sensors.tiltHeading + Math.PI / 2) * 180 / Math.PI).toFixed(0);
    res.send(heading.toString());
});

app.all('/counter', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(sensors.counter.toString());
});

var wss = new WebSocketServer({ server: server });
wss.on('connection', function(ws) {
    var id = setInterval(function() {
        ws.send(JSON.stringify(sensors), function() { /* ignore errors */ });
    }, 25);
    console.log('connection to client');
    ws.on('close', function() {
        console.log('closing client');
        clearInterval(id);
    });
});
