// mongo db
var mongojs = require("mongojs");
var db = mongojs('localhost:27017/myGame', ['account','progress']);

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
  // gets distance between a point and the self position
  self.getDistance = function(pt){
    return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
  }
  return self;
}

var Player = function(id){
  var self = Entity();
  self.id            = id;
  self.number        = "" + Math.floor(10 * Math.random());
  self.maxSpd        = 10;
  self.hp            = 10;
  self.hpMAX         = 10;
  self.score         = 0;
  self.pressingRight = false;
  self.pressingLeft  = false;
  self.pressingUp    = false;
  self.pressingDown  = false;
  self.pressingShoot = false;
  self.mouseAngle    = 0;

  var super_update = self.update;

  self.update = function(){
    self.updateSpd();
    super_update();
    if(self.pressingShoot)
      self.shootBullet(self.mouseAngle);
  }
  self.shootBullet = function(angle) {
    // between 0 and 360 (bullet in random direction)
    var b = Bullet(self.id,angle);
    b.x = self.x;
    b.y = self.y;
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
  // return initial player package
  self.getInitPack = function(){
    return {
      id      : self.id,
      number  : self.number,
      x       : self.x,
      y       : self.y,
      hp      : self.hp,
      hpMAX   : self.hpMAX,
      score   : self.score,
    };
  }
  // return update player package
  self.getUpdatePack = function(){
    return {
      id      : self.id,
      x       : self.x,
      y       : self.y,
      hp      : self.hp,
      score   : self.score,
    };
  }
  // add player to list
  Player.list[id] = self;
  // add player to package
  initPack.player.push(self.getInitPack());
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
    // shoot button pressed
    else if(data.inputId === 'shoot')
      player.pressingShoot = data.state;
    // mouse moved
    else if(data.inputId === 'mouseAngle')
      player.mouseAngle = data.state;
  });
  socket.emit('init',{
    player     : Player.getAllInitPack(),
    bullet     : Bullet.getAllInitPack(),
  })
}

Player.onDisconnect = function(socket){
  // delete player from player list
  delete Player.list[socket.id];
  removePack.player.push(socket.id);
}
Player.update = function(){
  var pack = [];
  // loop through every socket in list
  for(var i in Player.list){
    // increase the location of each socket by 1 x&y
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePack());
  }
  return pack;
}
Player.getAllInitPack = function(){
  var players = [];
  for(var i in Player.list){
    players.push(Player.list[i].getInitPack());
  }
  return players;
}

var Bullet = function(parent,angle){
  var self = Entity();
  self.id = Math.random();
  self.spdX = Math.cos(angle/180*Math.PI) * 10;
  self.spdY = Math.sin(angle/180*Math.PI) * 10;
  self.parent = parent;
  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function(){
    if(self.timer++ > 100)
      self.toRemove = true;
    super_update();

    // loop through each player
    for(var i in Player.list){
      // this player
      var p = Player.list[i];
      // foreign bullet hits player
      if( (self.getDistance(p) < 32) && (self.parent != p.id) ) {
        // decrease players hp
        p.hp -= 1;
        // if hp drops to or below 0,
        if(p.hp <= 0) {
          // get shooter
          var shooter = Player.list[self.parent];
          // if the shooter is still alive, increment score by 1
          if(shooter)
            shooter.score += 1;
          // player recovers hp and spawns in new location
          p.hp = p.hpMAX;
          p.x  = Math.random() * 500;
          p.y  = Math.random() * 500;
        }
        // remove bullet
        self.toRemove = true;
      }
    }
  }
  // return initial player package
  self.getInitPack = function(){
    return {
      id      : self.id,
      x       : self.x,
      y       : self.y,
    };
  }
  // return update player package
  self.getUpdatePack = function(){
    return {
      id      : self.id,
      x       : self.x,
      y       : self.y,
    };
  }
  Bullet.list[self.id] = self;
  initPack.bullet.push(self.getInitPack());
  return self;
}

Bullet.list = {};
Bullet.update = function(){
  var pack = [];
  // loop through every socket in list
  for(var i in Bullet.list){
    // increase the location of each socket by 1 x&y
    var bullet = Bullet.list[i];
    bullet.update();
    if(bullet.toRemove){
      delete Bullet.list[i];
      removePack.bullet.push(bullet.id);
    }
    else
      pack.push(bullet.getUpdatePack());
  }
  return pack;
}
Bullet.getAllInitPack = function(){
  var bullets = [];
  for(var i in Bullet.list){
    bullets.push(Bullet.list[i].getInitPack());
  }
  return bullets;
}

// set true if debugging
var DEBUG = true;

// checks to see if password is valid
var isValidPassword = function(data,cb){
  db.account.find({username:data.username,password:data.password},function(err,res){
    if(res.length > 0)
      cb(true);
    else
      cb(false);
  });
}
// checks to see if username is taken
var isUsernameTaken = function(data,cb){
  db.account.find({username:data.username},function(err,res){
    if(res.length > 0)
      cb(true);
    else
      cb(false);
  });
}
// adds user to USERS list
var addUser = function(data,cb){
  db.account.insert({username:data.username,password:data.password},function(err){
    cb();
  });
}

// loads file and initializes it. Returns io obj with all the functionalities of io socket library
var io = require('socket.io') (serv,{});
// when connection present, this function is called, display msg
io.sockets.on('connection', function(socket){
  // generate random player connect ID
  socket.id = Math.random();
  // add player to list of online sockets
  SOCKET_LIST[socket.id] = socket;

  // sign in clicked
  socket.on('signIn',function(data){
    // check to see if password is valid
    isValidPassword(data,function(res){
      // credentials entered correctly
      if(res) {
        // player connected
        Player.onConnect(socket);
        // return true success
        socket.emit('signInResponse',{success:true});
      }
      //credentials not correct
      else {
        // return false success
        socket.emit('signInResponse',{success:false});
      }
    });
  });
  // sign up clicked
  socket.on('signUp',function(data){
    // username is already taken
    isUsernameTaken(data,function(res){
      if(res)
        // return sign up fail
        socket.emit('signUpResponse',{success:false});
        // username not taken
      else {
        addUser(data,function(){
          // player connected
          Player.onConnect(socket);
          // return sign up success
          socket.emit('signUpResponse',{success:true});
        });
      }
    });
  });
  // when socket disconnect
  socket.on('disconnect',function(){
    // delete from socket connection list
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });
  // send chat message
  socket.on('sendMsgToServer',function(data){
    var playerName = ("" + socket.id).slice(2,7);
    for(var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
    }
  });
  //evaluate the server command for debugging
  socket.on('evalServer',function(data){
    if(DEBUG){
      var res = eval(data);
      socket.emit('evalAnswer', res);
    }
  });
});

// new players added to initPack
var initPack = {player:[],bullet:[]};
// "to remove" players added to removePack
var removePack = {player:[],bullet:[]};


// function called every .025 ms
setInterval(function(){
  // package to send user
  var pack = {
    player : Player.update(),
    bullet : Bullet.update(),
  }
  // loop through every socket
  for(i in SOCKET_LIST){
    // this socket
    var socket = SOCKET_LIST[i];
    // send package to user containing initialize, update, and remove packs
    socket.emit('init',initPack);
    socket.emit('update',pack);
    socket.emit('remove',removePack);
  }
  // clear init and remove packs every frame
  initPack.player = [];
  initPack.bullet = [];
  removePack.player = [];
  removePack.bullet = [];
  // 40 ms call function
},40);
