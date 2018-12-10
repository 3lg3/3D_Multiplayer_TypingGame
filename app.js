
var mysql = require('mysql');

var pool =mysql.createPool({
    connectionLimit : 10, // default = 10
  	host: "localhost",
  	user: "root",
  	password: "password",
    database: "game"
});




var express = require('express');
var app = express();
var serv = require('http').Server(app);
var number_of_players = 0;
var thief_ready = 0;
var thief_in = 0;
var police_ready = 0;
var police_in = 0;
var dc = 0;

	var flag = 0;


   var eof = 0;

console.log('Server started.');

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(80);

var SOCKET_LIST = {};


var police = {
     		x: -10,
			y: 0,
			z : 0,
			turncount: 0,
			distance: 0,
			name: null,
	}

var thief = {
     		x: -10,
			y: 0,
			z : 300,
			turncount: 0,
			distance: 0,
			name: null,
	}

var separation = 300;

/*
setInterval ( function() {
	
},1000);
*/


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
	eof = 0;
}


function end_of_game_detection(police, thief) {
        if (Math.abs(police.x - thief.x) < 10)   
                if (Math.abs(police.z - thief.z )< 10) {

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
			socket.emit('end_of_game',{type: 0});
		}
		}

            }    
            if (eof == 1)  {
            	initialize();
            	for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		if (socket.role < 2)  
		{	
			socket.emit('end_of_game',{type: 1});
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
		number_of_players ++ ;
	}
	
	SOCKET_LIST[socket.id] = socket;

         if (socket.role == 0)  // thief
		{


			socket.on('eof', function(){
					eof = 1;
			});


			socket.on('toserver', function(data){
				thief.x = data.x;
				thief.y = data.y;
				thief.z = data.z;
				thief.distance = data.distance;
			});

		socket.on('status_update', function(data){
				
				thief_ready = 1;
				thief.name = data.name;
				console.log("thief name: ",data.name);
			});

		socket.on('score', function(data){


// mysql
if (  data.score != null) {

					console.log(thief.name,": ",data.score);

				pool.getConnection(function(err, connection) {
  if (err) throw err;
  console.log("Connected!");
  var sql = "INSERT INTO leaderboard (name, score) VALUES ('"+ thief.name+ 
  "', '"+ data.score + "')";
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");
          	connection.release();
  });
});



				pool.getConnection(function(err, connection) {
  if (err) throw err;
  console.log("Connected!");
  var sql = " SELECT * FROM leaderboard order by score desc limit 10";
  connection.query(sql, function (err, rows) {
    if (err) throw err;
    console.log("1 record retrieved");
       		console.log(rows);
          	connection.release();
          	socket.emit('leaderboard',rows);
  });
});


}

			});

			}

			else if (socket.role == 1)  // police
		{


				socket.on('eof', function(){
					eof = 1;

			});
			socket.on('toserver', function(data){
				police.x = data.x;
				police.y = data.y;
				police.z = data.z;
				police.distance = data.distance;
			});

			socket.on('status_update', function(data){
				
				police_ready = 1;
				police.name = data.name;
				console.log("police name: ",data.name);
			});

			socket.on('score', function(data){



if (  data.score != null) {

				console.log(police.name,": ",data.score);

				pool.getConnection(function(err,connection) {
  if (err) throw err;
  console.log("Connected!");

    var sql = "INSERT INTO leaderboard (name, score) VALUES ('"+ police.name+ 
  "', '"+ data.score + "')";

  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");
      	connection.release();
  });
});



				pool.getConnection(function(err, connection) {
  if (err) throw err;
  console.log("Connected!");
  var sql = " SELECT * FROM leaderboard order by score desc limit 10";
  connection.query(sql, function (err, rows) {
    if (err) throw err;
    console.log("1 record retrieved");

          	connection.release();
          	socket.emit('leaderboard',rows);
  });
});

}


			});

			}  // end else 
			else {   //spectator 

			}
	socket.on('disconnect', function(){
			number_of_players --;

if (socket.role == 0 ) {
			eof = 0;
			flag = 0;
			thief_ready = 0;
			thief_in = 0;
			console.log('thief disconnected.');		
			
		}
		else if (socket.role == 1 ) {
			eof = 0;
			flag = 0;
					police_ready = 0;
			police_in = 0; 
			console.log('police disconnected.');		
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
			if (thief_ready && police_ready && flag != 2) {
				socket.emit('start',{role: 0});
				flag += 1;
			}
			socket.emit('toclient',police);
		}
		else if (socket.role == 1) // police 
		{	
			if (thief_ready && police_ready && flag != 2) {
				flag += 1;
				socket.emit('start',{role: 1});
			}
			socket.emit('toclient',thief);
		}

		else{ //spectator message

			if (thief_in && police_in )
			socket.emit('spectator',{signal: 0});
		else
			socket.emit('spectator',{signal : 1})
		}

	}	


	
	end_of_game_detection(police,thief);
	distance_detection(police,thief);
	//console.log('number of connections: ', number_of_players);

},1000/60);




