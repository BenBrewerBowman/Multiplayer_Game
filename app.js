
var express = require('express');
var app = express();
var serv = require('http').Server(app);

// display default index
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};
// loads file and initializes it. Returns io obj with all the functionalities of io socket library
var io = require('socket.io') (serv,{});
// when connection present, this function is called, display msg
io.sockets.on('connection', function(socket){
  // generate random player connect ID
  socket.id = Math.random();
  socket.number = "" + Math.floor(10 * Math.random());
  // init player coords
  socket.x = 0;
  socket.y = 0;
  // add player to list of online sockets
  SOCKET_LIST[socket.id] = socket;

  socket.on('disconnect',function(){
    delete SOCKET_LIST[socket.id];
  });
});

// function called every .025 ms
setInterval(function(){
  var pack = [];
  // loop through every socket in list
  for(var i in SOCKET_LIST){
    // increase the location of each socket by 1 x&y
    var socket = SOCKET_LIST[i];
    socket.x++;
    socket.y++;
    pack.push({
      x: socket.x,
      y: socket.y,
      number: socket.number
    });
  }
  for(i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    // send package to user containing new pos
    socket.emit('newPositions',pack);
  }

},1000/25);
