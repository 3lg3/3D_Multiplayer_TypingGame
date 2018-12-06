

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var number_of_players = 0;
var thief_ready = 0;
var thief_in = 0;
var police_ready = 0;
var police_in = 0;
var game_in_progress = 0;
var dc = 0;

console.log('Server started.');

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(8000);

var SOCKET_LIST = {};


var police = {
     		x: -10,
			y: 0,
			z : 0,
			turncount: 0,
			distance: 0,
	}

var thief = {
     		x: -10,
			y: 0,
			z : 300,
			turncount: 0,
			distance: 0,
	}

var separation = 300;

function initialize() {
	police.x = -10;
	police.y = 0;
	police.z = 0;
	police.turncount = 0;
	police.distance = 0;
	thief.x = -10;
	thief.y = 0;
	thief.z = 300;
	thief.turncount = 0;
	thief.distance = 0;
	separation = 300;
}


function collision_detection(police, thief) {
        if (Math.abs(police.x - thief.x) < 10)
                if (Math.abs(police.z - thief.z )< 10) {
              //  alert("Game over.");
                police.x = -10;
                police.z = 0;
                thief.x = -10;
                thief.z = 300;
                police.y = 0;
                thief.y = 0;   

                police.distance = 0;
                thief.distance = 0;

for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		if (socket.role < 2)  
		{	
			socket.emit('collide');
		}
		}

            }    
}


function distance_detection(police, thief) {
if ((7600 + 1090 * Math.sqrt(2)  - separation - (thief.distance - police.distance)) < 300)

         {
               console.log(7600 + 1090 * Math.sqrt(2)  - separation - (thief.distance - police.distance));
                separation = 7600 + 1090 * Math.sqrt(2) - separation - (thief.distance - police.distance);
                if (police.turncount != 0)
                police.turncount = - police.turncount;
            	if (thief.turncount != 0)
                thief.turncount = - thief.turncount;
                police.y += Math.PI;
                if (police.y >= Math.PI * 2)
                police.y -= 2 * Math.PI;
         	     thief.y += Math.PI;
                if (thief.y >= Math.PI * 2)
                thief.y -= 2 * Math.PI;

        


        for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		if (socket.role < 2)  
		{	 
			socket.emit('turn_around',
				{px:police.x, py:police.y, pz:police.z,pt:police.turncount,
					tx:thief.x, ty:thief.y, tz:thief.z, tt:thief.turncount,
					sp: separation});      
		} 
		}

	}

}


var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {

	socket.id = Math.random();
	socket.distance = 0;
	if (thief_in == 0) {
	socket.role = 0;  // thief
	number_of_players ++ ;
	thief_in = 1;
	}
	else if (police_in == 0) {
		socket.role = 1; // police 
		number_of_players ++ ;
		police_in = 1;
	}
	else {
		socket.role = 2; // spectator 
	}
	
	SOCKET_LIST[socket.id] = socket;

         if (socket.role == 0)  // thief
		{
			socket.on('toserver', function(data){
				thief.x = data.x;
				thief.y = data.y;
				thief.z = data.z;
				thief.distance = data.distance;
			});

		socket.on('status_update', function(){
				
				thief_ready = 1;
			});

			}

			else if (socket.role == 1)  // police
		{
			socket.on('toserver', function(data){
				police.x = data.x;
				police.y = data.y;
				police.z = data.z;
				police.distance = data.distance;
			});

			socket.on('status_update', function(){
				
				police_ready = 1;
			});

			}  // end else 

	socket.on('disconnect', function(){

if (socket.role == 0 ) {
			number_of_players --;
			    if (thief_ready)
				game_in_progress -= 1;
			thief_ready = 0;
			thief_in = 0;
		
		}
		else if (socket.role == 1 ) {
			number_of_players --;
				if (police_ready)
				game_in_progress -= 1;
			police_ready = 0;
			police_in = 0;
		
		}
		
		delete SOCKET_LIST[socket.id];


		for (var i in SOCKET_LIST) {
			var si = SOCKET_LIST[i];
			if (si.role == 0 || si.role == 1)  {  // notify other player when dc occurs

			     si.emit('dc');
			     initialize();

			}

		}
		
});
		

	console.log('socket connection');

}); 



setInterval ( function() {

		for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		if (socket.role == 0)  // thief
		{	
			if (thief_ready && police_ready && game_in_progress != 2) {
				game_in_progress = 1;
				socket.emit('start',{role: 0});
			}
			socket.emit('toclient',police);
		}
		else if (socket.role == 1) // police 
		{	
			if (thief_ready && police_ready && game_in_progress != 2) {
				game_in_progress = 2;
				socket.emit('start',{role: 1});
			}
			socket.emit('toclient',thief);
		}

	}	


	if (game_in_progress == 2) {
	collision_detection(police,thief);
	distance_detection(police,thief);
}


},1000/60);

