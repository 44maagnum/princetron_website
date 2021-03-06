/* Princetron Game Logic, Networking, and Display */


/*********** Message handling functions ***********/
function lobby(message) {
    showElement($("#lobby"));
    users = new Array();

    for (var i = 0; i < message.lobby.users.length; i++) {
	var username = message.lobby.users[i];
	users[username] = i;
	if (username == $('#username_input').val())
	    $("#lobby_menu").append("<div class=\"lobby_item\" id=\"me\">" + username + "</div>");
	else
	    $("#lobby_menu").append("<div class=\"lobby_item\" id=\"player" + i + "\">" + username + "</div>");
    }
    user_count += message.lobby.users.length;
}

function loginResult(message) {
    if (message.loginResult.result == "duplicate") {
	$("#login_msg").html("Username Currently Taken.</br>Try Another!");
    }
    else if (message.loginResult.result == "invalid") {
	$("#login_msg").html("Invalid username.</br>Use only numbers, letters, dots, and underscores.");
    }
}

function chatHear(message) {
    $("#chat_room").append("<div>" + message.chatHear.user + ": " + message.chatHear.message + "</div>");
    $("#chat_room").scrollTop($("#chat_room")[0].scrollHeight);
}

function invitation(message) {
    //ignore if inviation comes during game                                                                                                                                     
    if (players && players[my_id].active)
	return;

    if (confirm("Would you like to play with " + message.invitation.user + "?")) {
	socket.send(JSON.stringify({"acceptInvitation" : true}));
    }
}

function invitationRejected(message) {
    alert("No one accepted your invitation!");
    showElement($('#lobby'));
}

function lobbyUpdate(message) {
    var user = message.lobbyUpdate.user;
    var entered = message.lobbyUpdate.entered;
    if (entered) {
	users[user] = user_count;
	$("#lobby_menu").append("<div class=\"lobby_item\" id=\"player" + user_count + "\">" + user + "</div>");
	user_count++;
    }
    else {
	var user_id = users[user];
	$(".lobby_item#player" + user_id).remove();
    }
}

function enterArena(message) {
    if (blinker) {
	for (var i = 0; i < intervals_count; i++) {
	    clearInterval(blinker[i]);
	}
    }

    var player_specs = message.enterArena.players;
    players = new Array(player_specs.length);
    player_turns = new Array(player_specs.length);
    for (var i = 0; i < player_specs.length; i++) {
	players[i] = { username : player_specs[i].user,
		       x : player_specs[i].xStart,
		       y : player_specs[i].yStart,
		       dir : player_specs[i].dirStart,
		       active : true,
		       pos_legal : true };
	player_turns[i] = new Array();
    }
    my_id = message.enterArena.playerId;
    $("#game").addClass("highlighted");
    $("#game").css("border-color", COLORS[my_id]);
}

function startGame(message) {
    showElement($("#game"));
    game_state = "playing";
    $('#billboard').html("");
    $('#user_info').html("");
    $('#leaders').html("");
    timestep = 0;
    initBoard();
    drawBoard();

    goal_time = new Date().getTime() + TIMING_INTERVAL;
    game_timer = window.setInterval(function(i) {
	    current_time_millis = new Date().getTime();
	    var difference = current_time_millis - goal_time;

	    while(difference >= 0) {
		advance();
		goal_time += TIMING_INTERVAL;
		difference -= TIMING_INTERVAL;
	    }
	}, REFRESH_INTERVAL);
}

function opponentTurn(message) {
    currentTime = timestep;
    
    for (var i = 0; i < currentTime + 1 - message.opponentTurn.timestamp; i++) {
	stepBack(currentTime - i);
    }
    
    player_turns[message.opponentTurn.playerId][message.opponentTurn.timestamp] = message.opponentTurn.isLeft;
    players[message.opponentTurn.playerId].pos_legal = true;
    
    for (var i = 0; i < currentTime + 1 - message.opponentTurn.timestamp; i++) {
	stepForward(message.opponentTurn.timestamp + i);
    }
    
    drawBoard();
}

function gameResult(message) {
    if (message.gameResult.result == "loss") {
	$('#billboard').append("<p>Player " + players[message.gameResult.playerId].username + " loses</p>");
	players[message.gameResult.playerId].active = false;
    }
    if (message.gameResult.result == "win") {
	$('#billboard').append("<p>Player " + players[message.gameResult.playerId].username + " wins</p>");
	players[message.gameResult.playerId].active = false;

    }
}

function endGame(message) {
    console.log("ENDING GAME");
    game_state = "resting";
    my_name = $("#username_input").val();
    $.getJSON("u/" + my_name, function(data) {
	    $('#user_info').append(my_name + ", " + "Your record is " + data.wins + "-" + data.losses + ". Your ranking is " + data.rank + ".");
	});

    $.getJSON("leaderboard_detailed/", function(data) {
	    leaders = new Array();
	    console.log("Setting leaders");
	    for (var i = 0; i < data.users.length; i++) {
		leaders[i] = data.users[i].user;
		$('#leaders').append("<div id=\"leader" + i + "\"><a href=\"JavaScript:flipDisplay(&quot;" + data.users[i].user +
				     "&quot;);\">" + (i+1) + ". " + data.users[i].user +
                                         "</a></div><div id=\"leader_specs" + i + "\" class=\"leaderboard_details\"> Record: " + data.users[i].wins + "-" + data.users[i].losses +
				     "</br> User since: " + data.users[i].joined_month + "/" + data.users[i].joined_day + "/" + data.users[i].joined_year +  "</div></div>");

	    }

	    for (var i = 0; i < data.users.length; i++) {
		for (var j = 0; j < players.length; j++) {
		    if (players[j].username == data.users[i].user) {
			$('#leader' + i).each(blink);
		    }
		}
	    }
	});

    $('#billboard').each(blink);
    showElement($("#leaderboard"));
    window.clearInterval(game_timer);
}

function register(socket) {
    socket.onmessage = function(m) {
	console.log("Message Recieved");
	var message = JSON.parse(m.data);

	if ("lobby" in message) lobby(message);
	if ("loginResult" in message) loginResult(message);
	if ("chatHear" in message) chatHear(message);
	if ("invitation" in message) invitation(message);
	if ("inviteRejected" in message) inviteRejected(message);
	if ("lobbyUpdate" in message) lobbyUpdate(message);
	if ("enterArena" in message) enterArena(message);
	if ("startGame" in message) startGame(message);
	if ("opponentTurn" in message) opponentTurn(message);
	if ("gameResult" in message) gameResult(message);
	if ("endGame" in message) endGame(message);
    };

    socket.onclose = function (evt) {
	showElement($("#login"));
	$("#lobby_menu").html("");
	$("#login_msg").html("Connection lost. Please login again.");
    };
}

function blink() {
    var elem = $(this);
    blinker[intervals_count++] = setInterval(function() {
	    if (elem.css('visibility') == 'hidden') {
		elem.css('visibility', 'visible');
	    } else {
		elem.css('visibility', 'hidden');
	    }
	}
	, 500);
}


/******* UI Handling and Button Pressing **********/
$("#login_button").click(login);
$("#invite_button").click(invitePress);
$("div.lobby_item").live("click", selectUser);
$(document).keydown(keyPressed);

function login() {
    socket = new WebSocket('ws://ec2-107-22-122-48.compute-1.amazonaws.com:8080');
    socket.onopen = initSocket;
}

function initSocket() {
    register(socket);
    var msg = { "logIn" : { "user" : $('#username_input').val() }};
    socket.send(JSON.stringify(msg));
}

function invitePress() {
    var msg = { "readyToPlay" : { "invitations" : []}};
    var count = 0;

    $("div.lobby_item.selected").each(function(i, e) {
	    if ($(e).text() != $('#username_input').val()) {
		msg.readyToPlay.invitations.push($(e).text());
		count++;
	    }
	});

    if (count == 0)
	return;

    socket.send(JSON.stringify(msg));
    showElement($("#wait"));
}

function chatSpeak() {
    var msg = { "chatSpeak" : {"message" : $("#chat_input").val()}};
    socket.send(JSON.stringify(msg));
    $("#chat_input").val("");
}

function selectUser() {
    if($(this).hasClass("selected"))
	$(this).removeClass("selected");
    else
	$(this).addClass("selected");
}

function flipDisplay(user) {
    var leader_index = -1;
    for (var i = 0; i < leaders.length; i++) {
        if (leaders[i] == user)
            leader_index = i;
    }

    $("#leader_specs" + leader_index).toggle();
}

function keyPressed(e) {
    if (e.which == KEY_ENTER) {
	    if ($("#username_input").is(":focus")) {
		login();
	    }    
	    else if ($("#chat_input").is(":focus")) {
		chatSpeak();
	    }
	    return;
	}
    
    if (game_state == "playing") {
	var direction;
	
	var current_dir = players[my_id].dir;
	    /*Determine Direction of turn*/
	    switch(e.which) {
	    case KEY_J: direction = true; break;
	    case KEY_K: direction = false; break;
	    case KEY_LEFT:
	    case KEY_A:
		if(current_dir == "north") direction = true;
		else if (current_dir == "south") direction = false;
		else return;
		break;
	    case KEY_RIGHT:
	    case KEY_D: 
		if(current_dir == "north") direction = false;
                else if (current_dir == "south") direction = true;
                else return;
                break;
	    case KEY_UP:
	    case KEY_W:
		if(current_dir == "east") direction = true;
                else if (current_dir == "west") direction = false;
                else return;
                break;
	    case KEY_DOWN:
	    case KEY_S:
		if(current_dir == "east") direction = false;
                else if (current_dir == "west") direction = true;
                else return;
                break;
	    default: return;
	    }
	    
	    var turn_time = timestep;
	    
	    
	    while (turn_time in player_turns[my_id]) {
		    turn_time++;
		}
	    
	    if (turn_time == timestep) {
		turnPlayer(players[my_id], direction);
	    }
	    
	    player_turns[my_id][turn_time] = direction;	    
	    socket.send(JSON.stringify({ "turn" : {
			    "timestamp" : turn_time,
				"isLeft" : direction } }));
	}
}


function showElement(element) {
    if (element == $("#login")) $("#chat_box").hide();
    else $("#chat_box").show();
    
    $("#login").hide();
    $("#lobby").hide();
    $("#wait").hide();
    $("#game").hide();
    $("#leaderboard").hide();
    
    element.show();
}

/********** Global Variables and Game Logic **********/
var socket;
var game_board;
var board_underneath;
var blinker = new Array();
var players;
var game_state = "new";
var my_id;
var timestep;
var game_timer;
var MAX_PLAYERS = 4;
var BOARD_SIZE = 100;
var BOARD_DISPLAY_SIZE = 400;
var CELL_SIZE = BOARD_DISPLAY_SIZE / BOARD_SIZE;
var COLORS = [ "#F00", "#0F0", "#00F", "#FF0", "#0FF", "#F0F"];
var player_turns;
var goal_time;
var intervals_count = 0;
var users;
var user_count = 0;
var leaders;
var leader_stats = new Array();
var ctx = $("#arena").get(0).getContext("2d");

/* Constants */
var TIMING_INTERVAL = 100;
var REFRESH_INTERVAL = 10;
var LEADERBOARD_SIZE = 10;
var KEY_J = 74;
var KEY_K = 75;
var KEY_LEFT = 37;
var KEY_A = 65;
var KEY_S = 83;
var KEY_D = 68;
var KEY_W = 87;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;
var KEY_ENTER = 13;


function turnPlayer(player, isLeft) {
    if (isLeft) {
	switch (player.dir) {
	case "north" : 
	    player.dir = "west"; break;
	case "south" : 
	    player.dir = "east"; break;
	case "east" : 
	    player.dir = "north"; break;
	case "west" : 
	    player.dir = "south"; break;
	}
    }
    else {
	switch (player.dir) {
	case "north" : 
	    player.dir = "east"; break;
	case "south" : 
	    player.dir = "west"; break;
	case "east" : 
	    player.dir = "south"; break;
	case "west" : 
	    player.dir = "north"; break;
	}
    }
}

function unturnPlayer(player, isLeft) {
    if (isLeft) {
	switch (player.dir) {
	case "north" :
	    player.dir = "east"; break;
	case "south" :
	    player.dir = "west"; break;
	case "east" :
	    player.dir = "south"; break;
	case "west" :
	    player.dir = "north"; break;
	}
    }
    else {
	switch (player.dir) {
	case "north" :
	    player.dir = "west"; break;
	case "south" :
	    player.dir = "east"; break;
	case "east" :
	    player.dir = "north"; break;
	case "west" :
	    player.dir = "south"; break;
	}
    }
    
}

function initBoard() {
    game_board = new Array(BOARD_SIZE);
    board_underneath = new Array(BOARD_SIZE);
    for (var i = 0; i < BOARD_SIZE; i++) {
	game_board[i] = new Array(BOARD_SIZE);
	board_underneath[i] = new Array(BOARD_SIZE);
    }
    for (var i = 0; i < BOARD_SIZE; i++) {
	for (var j = 0; j < BOARD_SIZE; j++) {
	    game_board[i][j] = -1;
	    board_underneath[i][j] = -1;
	}
    }
}

function sendCollision() {
       socket.send(JSON.stringify({collision : { timestamp : timestep}}));
}

function advance() {
    timestep++;
    stepForward(timestep);
}


function stepForward(time) {
    //Step snake forward
    for (var i = 0; i < players.length; i++) {
	if (!players[i].active)
	    continue;

	switch (players[i].dir) {
	case "north" : players[i].y++; break;
	case "south" : players[i].y--; break;
	case "east" : players[i].x++; break;
	case "west" : players[i].x--; break;
	}
	    
	var x_val = players[i].x;
	var y_val = players[i].y;
	if (x_val < 0 || x_val >= BOARD_SIZE || y_val < 0 || y_val >= BOARD_SIZE || game_board[x_val][y_val] != -1) {
	    players[i].pos_legal = false;
	}
   
	if (time in player_turns[i]) {
	    turnPlayer(players[i], player_turns[i][time]);
	}
		
	// Check for collisions
	var x_val = players[my_id].x;
	var y_val = players[my_id].y;
	if (i == my_id) {
	    if (x_val < 0 || x_val >= BOARD_SIZE || y_val < 0 || y_val >= BOARD_SIZE || game_board[x_val][y_val] != -1) {
		players[my_id].active = false;
		players[my_id].pos_legal = false;
		sendCollision();
	    }
	}
	
	//Update Board
	if (players[i].x >= 0 && players[i].y >= 0 && players[i].x < BOARD_SIZE && players[i].y < BOARD_SIZE) {
	    //If we're clobbering another snake, leave the underneath board intact
	    if (board_underneath[players[i].x][players[i].y] == -1) {
		board_underneath[players[i].x][players[i].y] = i;
	    }
	    game_board[players[i].x][players[i].y] = i;
	    if (players[i].pos_legal)
		drawSquare(players[i].x, players[i].y, COLORS[i]);
	}
    }
}

function stepBack(time) {
    // Move everyone back one step
    for (var i = 0; i < players.length; i++) {
	if (!players[i].active)
	    continue;
	
	if (time in player_turns[i]) {
	    unturnPlayer(players[i], player_turns[i][time]);
	}
	
	
	var x_val = players[i].x;
	var y_val = players[i].y;
	
	//clear game board, resetting if it was clobbered
	if (x_val >= 0 && y_val >= 0 && x_val < BOARD_SIZE && y_val < BOARD_SIZE) {          
	    if (board_underneath[x_val][y_val] == i)
		game_board[x_val][y_val] = -1;
	    else
		game_board[x_val][y_val] = board_underneath[x_val][y_val];
	}
	
	switch (players[i].dir) {
	case "north" : players[i].y--; break;
	case "south" : players[i].y++; break;
	case "east" : players[i].x--; break;
	case "west" : players[i].x++; break;
	}
    }
}

function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*CELL_SIZE, (BOARD_SIZE-y-1)*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
}


function drawBoard() {
    for (var i = 0; i < BOARD_SIZE; i++) {
	for (var j = 0; j < BOARD_SIZE; j++) {
	    if (game_board[i][j] == -1) drawSquare(i, j, "#000");//ctx.fillStyle = "#000";
	    else drawSquare(i, j, COLORS[game_board[i][j]]);
	    //ctx.fillRect(i*CELL_SIZE, (BOARD_SIZE-j-1)*CELL_SIZE, CELL_SIZE, CELL_SIZE);
	}
    }
}


