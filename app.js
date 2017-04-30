
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

// everything that the player and bullet share
var Entity = function() {
  var self = {
    x    : 250,
    y    : 250,
    spdX : 0,
    spdY : 0,
    id   : "",
  }
  self.update = function(){
    self.updatePosition();
  }
  self.updatePosition = function(){
    self.x += self.spdX;
    self.y += self.spdY;
  }
  return self;
}

var Player = function(id){
  var self = Entity();
  self.id            = id;
  self.number        = "" + Math.floor(10 * Math.random());
  self.maxSpd        = 10;
  self.pressingRight = false;
  self.pressingLeft  = false;
  self.pressingUp    = false;
  self.pressingDown  = false;

  var super_update = self.update;
  self.update = function(){
    self.updateSpd();
    super_update();
  }
  self.updateSpd = function() {
    // if left or right
    if(self.pressingRight)
      self.spdX = self.maxSpd;
    else if(self.pressingLeft)
      self.spdX = -self.maxSpd;
    else
      self.spdX = 0;
    // if up or down
    if (self.pressingDown)
      self.spdY = self.maxSpd;
    else if(self.pressingUp)
      self.spdY = -self.maxSpd;
    else
      self.spdY = 0;
  }
  // add player to list
  Player.list[id] = self;
  return self;
}
// list of players
Player.list = {};
Player.onConnect = function(socket){
  var player = Player(socket.id);

  // when a key pressed down
  socket.on('keyPress',function(data){
    // left button pressed
    if(data.inputId === 'left')
      player.pressingLeft = data.state;
    // right button pressed
    else if(data.inputId === 'right')
      player.pressingRight = data.state;
    // up button pressed
    else if(data.inputId === 'up')
      player.pressingUp = data.state;
    // down button pressed
    else if(data.inputId === 'down')
      player.pressingDown = data.state;
  });
}
Player.onDisconnect = function(socket){
  // delete player from player list
  delete Player.list[socket.id];
}
Player.update = function(){
  var pack = [];
  // loop through every socket in list
  for(var i in Player.list){
    // increase the location of each socket by 1 x&y
    var player = Player.list[i];
    player.update();
    pack.push({
      x      : player.x,
      y      : player.y,
      number : player.number
    });
  }
  return pack;
}

var Bullet = function(angle){
  var self = Entity();
  self.id = Math.random();
  self.spdX = Math.cos(angle/180*Math.PI) * 10;
  self.spdX = Math.sin(angle/180*Math.PI) * 10;

  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function(){
    if(self.timer++ > 100)
      self.toRemove = true;
    super_update();
  }
  Bullet.list[self.id] = self;
  return self;
}
Bullet.list = {};
Bullet.update = function(){
  if(Math.random() < 0.1){
    // between 0 and 360 (bullet in random direction)
    Bullet(Math.random()*360);
  }

  var pack = [];
  // loop through every socket in list
  for(var i in Bullet.list){
    // increase the location of each socket by 1 x&y
    var bullet = Bullet.list[i];
    bullet.update();
    pack.push({
      x      : bullet.x,
      y      : bullet.y,
    });
  }
  return pack;
}

// loads file and initializes it. Returns io obj with all the functionalities of io socket library
var io = require('socket.io') (serv,{});
// when connection present, this function is called, display msg
io.sockets.on('connection', function(socket){
  // generate random player connect ID
  socket.id = Math.random();
  // add player to list of online sockets
  SOCKET_LIST[socket.id] = socket;

  Player.onConnect(socket);
  // when socket disconnect
  socket.on('disconnect',function(){
    // delete from socket connection list
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });
});

// function called every .025 ms
setInterval(function(){
  var pack = {
    player : Player.update(),
    bullet : Bullet.update(),
  }

  for(i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    // send package to user containing new pos
    socket.emit('newPositions',pack);
  }
},1000/25);
