var nodeimu = require('nodeimu');
var IMU = new nodeimu.IMU();
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.text({type:"*/*"}));

var robotData = {};
robotData.counter = 0;
robotData.timestamp = Date.now();
var networkInterfaces = require('os').networkInterfaces();
robotData.address = networkInterfaces.wlan0[0].address;
robotData.port = robotData.address.split('.')[3] + '000';
robotData.mac = networkInterfaces.wlan0[0].mac;
robotData.odometer = 0;

var irobot = require('./irobot');
var robot = new irobot.Robot('/dev/ttyUSB0');

robot.on('sensordata', function(data) {
    console.log("Data: ", data);
    robotData.odometer += data.state.distance.millimeters;
    if (data.state.mode.passive == true) robotData.mode = "passive";
    if (data.state.mode.safe == true) robotData.mode = "safe";
    if (data.state.mode.full == true) robotData.mode = "full";
    robotData.battery = data.battery.voltage.volts;
    robotData.bumper_left = data.bumpers.left.activated;
    robotData.bumper_right = data.bumpers.right.activated;
    robotData.cliff_left = data.cliff_sensors.left.signal.raw;
    robotData.cliff_front_left = data.cliff_sensors.front_left.signal.raw;
    robotData.cliff_front_right = data.cliff_sensors.front_right.signal.raw;
    robotData.cliff_right = data.cliff_sensors.right.signal.raw;
    robotData.vL = data.state.requested_right_velocity;
    robotData.vR = data.state.requested_right_velocity;
    //Stop a bot that has not been reached for 5 seconds.
    if ((Date.now() - robotData.timestamp) > 5000)
        robot.drive({ left: '0', right: '0' });
    //console.log(JSON.stringify(robotData.vR, null, 4));
});

function getRobotSensors() {
    robotData.counter++;
    robotData.timestamp = Date.now();
    return JSON.stringify(robotData);
}

app.all('/robotsensors', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(getRobotSensors());
});

app.all('/drive', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    //console.log(req.body);
    //console.log(JSON.parse(req.body));
    //robot.drive(JSON.parse(req.body));
    res.send();
   // console.log(JSON.stringify(sensors, null, 4));

});

app.all('/song', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    console.log(req.body);
    robot.sing(JSON.parse(req.body).sound);
    res.send();
});

app.all('/sing', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(sensors));
    tempo = 750;
    singleNote = 0.250;
    mysong = [
        [220, tempo * singleNote],
        [220, tempo * singleNote],
        [247, tempo * singleNote],
        //85
        [null, 50]
    ];
    robot.sing(mysong);
});

var sing = true;

app.all('/singUp', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    tempo = 2000;
    singleNote = .25;
    mysong = [
        [261, tempo * singleNote/4],
        [330, tempo * singleNote/4],
        [392, tempo * singleNote/4],
        [523, tempo * singleNote/4],
        [null, 50]
    ]
    //console.log(req.body);
    //console.log(JSON.parse(req.body));
    if(sing){
        robot.sing(mysong);
    }
    sing = false;
    res.send();
   // console.log(JSON.stringify(sensors, null, 4));

});
app.all('/singDown', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    tempo = 2000;
    singleNote = .25;
    mysong = [
        [523, tempo * singleNote/4],
        [392, tempo * singleNote/4],
        [330, tempo * singleNote/4],
        [261, tempo * singleNote/4],
        [null, 50]
    ]
    //console.log(req.body);
    //console.log(JSON.parse(req.body));
    if(sing){
        robot.sing(mysong);
    }
    sing = false;
    res.send();
   // console.log(JSON.stringify(sensors, null, 4));

});

app.all('/stopSing', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    sing = true;
    res.send();
   // console.log(JSON.stringify(sensors, null, 4));

});

port = 2026;
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
        sensors.counter = counter++;
        getRobotSensors();
        sensors.battery = robotData.battery;
        sensors.odometer = robotData.odometer
        sensors.vL = robotData.vL
        sensors.vR = robotData.vR
        sensors.cliff_left = robotData.cliff_left
        sensors.cliff_front_left = robotData.cliff_front_left
        sensors.cliff_front_right = robotData.cliff_front_right
        sensors.cliff_right = robotData.cliff_right

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
