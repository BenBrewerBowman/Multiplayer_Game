
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

// list of socket connections
var SOCKET_LIST = {};
// player list
var PLAYER_LIST = {};
var Player = function(id){
  var self = {
    x      : 250,
    y      : 250,
    id     : id,
    number : "" + Math.floor(10 * Math.random()),
    maxSpd : 10,
    pressingRight : false,
    pressingLeft  : false,
    pressingUp    : false,
    pressingDown  : false
  }
  self.updatePosition = function() {
    if(self.pressingRight)
      self.x += self.maxSpd;
    if(self.pressingLeft)
      self.x -= self.maxSpd;
    if(self.pressingUp)
      self.y -= self.maxSpd;
    if(self.pressingDown)
      self.y += self.maxSpd;
  }
  return self;
}

// loads file and initializes it. Returns io obj with all the functionalities of io socket library
var io = require('socket.io') (serv,{});
// when connection present, this function is called, display msg
io.sockets.on('connection', function(socket){
  // generate random player connect ID
  socket.id = Math.random();
  // add player to list of online sockets
  SOCKET_LIST[socket.id] = socket;

  var player = Player(socket.id);
  PLAYER_LIST[socket.id] = player;

  // when socket disconnect
  socket.on('disconnect',function(){
    // delete from socket connection list
    delete SOCKET_LIST[socket.id];
    // delete player from player list
    delete PLAYER_LIST[socket.id];
  });
});

// function called every .025 ms
setInterval(function(){
  var pack = [];
  // loop through every socket in list
  for(var i in PLAYER_LIST){
    // increase the location of each socket by 1 x&y
    var player = PLAYER_LIST[i];
    player.x++;
    player.y++;
    pack.push({
      x      : player.x,
      y      : player.y,
      number : player.number
    });
  }
  for(i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    // send package to user containing new pos
    socket.emit('newPositions',pack);
  }

},1000/25);
