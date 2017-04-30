var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');

var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

// socket connection between server and client
var socket = io();

socket.on('newPositions',function(data){
  // clear canvas
  ctx.clearRect(0,0,500,500);
  for(var i = 0; i<data.player.length; ++i)
    // write letter p with x and y data
    ctx.fillText(data.player[i].number, data.player[i].x, data.player[i].y);
  for(var i = 0; i<data.bullet.length; ++i)
    // write letter p with x and y data
    ctx.fillRect(data.bullet[i].x-5, data.bullet[i].y-5, 10, 10);
});

socket.on('addToChat', function(data){
  chatText.innerHTML += '<div>' + data + '</div>';
});
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
