// socket connection between server and client
var socket          = io();

// USER AUTHENTICATION
var signDiv         = document.getElementById('signDiv');
var signDivUsername = document.getElementById('signDiv-username');
var signDivSignIn   = document.getElementById('signDiv-signIn');
var signDivSignUp   = document.getElementById('signDiv-signUp');
var signDivPassword = document.getElementById('signDiv-password');

// sign in button clicked
signDivSignIn.onclick = function(){
  socket.emit('signIn', {username:signDivUsername.value,password:signDivPassword.value});
}
// sign up button clicked
signDivSignUp.onclick = function(){
  socket.emit('signUp', {username:signDivUsername.value,password:signDivPassword.value});
}
// response to sign in button clicked
socket.on('signInResponse',function(data){
  console.log("hey");
  // successful sign in
  if(data.success){
    // turn sign in off
    signDiv.style.display = 'none';
    // show game
    gameDiv.style.display = 'inline-block';
  }
  // unsuccessful sign in
  else
    // tell user that the sign in did not work
    alert("Username or password incorrect");
});
// response to sign up button clicked
socket.on('signUpResponse',function(data){
  // successful sign up
  if(data.success){
    // turn sign in off
    signDiv.style.display = 'none';
    // show game
    gameDiv.style.display = 'inline-block';
    // tell user that the sign up worked
    alert("User registration successful");
  }
  // unsuccessful sign up
  else
    // tell user that the sign in did not work
    alert("Sign up unsuccessful");
});


// GAME BOARD
var ctx             = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

// PLAYER
var Player = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.number = initPack.number;
  self.x = initPack.x;
  self.y = initPack.y;
  Player.list[self.id] = self;
  return self;
}
// all players
Player.list = {};

// Bullet
var Bullet = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.x = initPack.x;
  self.y = initPack.y;
  Bullet.list[self.id] = self;
  return self;
}
// all bullets
Bullet.list = {};

// INIT package. New stuff created, contains all the data
// initialize new bullets and players
socket.on('init',function(data){
  // loop through every player
  for(var i = 0; i<data.player.length; ++i)
    // initialize new player
    new Player(data.player[i]);
  // loop through every bullet
  for(var i = 0; i<data.bullet.length; ++i)
    // initialize new bullet
    new Bullet(data.bullet[i]);
});
// UPDATE package. Sent every frame, but only contains difference
// update bullets and players
socket.on('update',function(data){
  // loop through every player
  for(var i = 0; i<data.player.length; ++i) {
    var pack = data.player[i];
    // player that needs to be updated
    var p = Player.list[pack.id];
    if(p){
      if(pack.x !== undefined)
        p.x = pack.x;
      if(pack.y !== undefined)
        p.y = pack.y;
    }
  }
  // loop through every bullet
  for(var i = 0; i<data.bullet.length; ++i) {
    var pack = data.bullet[i];
    // bullet that needs to be updated
    var b = Bullet.list[pack.id];
    if(b){
      if(pack.x !== undefined)
        b.x = pack.x;
      if(pack.y !== undefined)
        b.y = pack.y;
    }
  }
});
// REMOVE package. Object removed (bullet or player). Sends id to remove
// remove bullets and players
socket.on('remove',function(data){
  // loop through every player
  for(var i = 0; i<data.player.length; ++i)
    // remove player
    delete Player.list[data.player[i]];
  // loop through every bullet
  for(var i = 0; i<data.bullet.length; ++i)
    // remove bullet
    delete Bullet.list[data.bullet[i]];
});
// function call every 40ms. Updates game board with players and bullets.
setInterval(function(){
  // clear canvas
  ctx.clearRect(0,0,500,500);
  // loop through players
  for(var i in Player.list)
    // write player letter with x and y data
    ctx.fillText(Player.list[i].number, Player.list[i].x, Player.list[i].y);
  for(var i in Bullet.list)
    // write bullet with x and y data
    ctx.fillRect(Bullet.list[i].x-5, Bullet.list[i].y-5, 10, 10);
  // 40 ms call function
},40);


// chat variables
var chatText        = document.getElementById('chat-text');
var chatInput       = document.getElementById('chat-input');
var chatForm        = document.getElementById('chat-form');
// send message to chat forum
socket.on('addToChat', function(data){
  chatText.innerHTML += '<div>' + data + '</div>';
});
// evaluate debugging console command
socket.on('evalAnswer', function(data){
  console.log(data);
});
// Enter on chat form
chatForm.onsubmit = function(e){
  // prevent page from refreshing
  e.preventDefault();
  if(chatInput.value[0] === '/')
    // debugging server with commands
    socket.emit('evalServer',chatInput.value.slice(1));
  else
    // sends message to server equal to chat value entered
    socket.emit('sendMsgToServer',chatInput.value);
  chatInput.value = '';
}


// keys pressed
document.onkeydown = function(event){
  if(event.keyCode === 68)          // d
    socket.emit('keyPress',{inputId:'right',state:true});
  else if(event.keyCode === 83)     // s
    socket.emit('keyPress',{inputId:'down',state:true});
  else if(event.keyCode === 65)     // a
    socket.emit('keyPress',{inputId:'left',state:true});
  else if(event.keyCode === 87)     // w
    socket.emit('keyPress',{inputId:'up',state:true});
}
// keys released
document.onkeyup = function(event){
  if(event.keyCode === 68)          // d
    socket.emit('keyPress',{inputId:'right',state:false});
  else if(event.keyCode === 83)     // s
    socket.emit('keyPress',{inputId:'down',state:false});
  else if(event.keyCode === 65)     // a
    socket.emit('keyPress',{inputId:'left',state:false});
  else if(event.keyCode === 87)     // w
    socket.emit('keyPress',{inputId:'up',state:false});
}
// mouse clicked
document.onmousedown = function(event){
  socket.emit('keyPress', {inputId:'shoot',state:true});
}
// mouse release
document.onmouseup = function(event){
  socket.emit('keyPress', {inputId:'shoot',state:false});
}
// mouse moved
document.onmousemove = function(event){
  // x and y relative to middle of screen and player position
  var x = -250 + event.clientX - 8;
  var y = -250 + event.clientY - 8;
  // angle from x and y
  var angle = Math.atan2(y,x) / Math.PI * 180;
  // shift angle
  socket.emit('keyPress', {inputId:'mouseAngle',state:angle});
}
