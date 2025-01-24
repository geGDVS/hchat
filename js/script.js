lounge = document.getElementById("lounge")
text = document.getElementById("text")
lounge.onclick = function() {
	lounge.active = true;
	text.label = "Enter Name#Password to join the channel";
	channel = 'lounge';
}
text.onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// Submit message
		if (e.target.value != '') {
			var text = e.target.value;
			e.target.value = '';
			
			if (channel != "in"){
				ws_send({ cmd: 'join', nick: text, channel:channel});
				channel = "in";
				text.label = "Enter Text to chat"
				text.clearable = true;
			} else {
				ws_send({ cmd: 'chat', text: text });
			}
		}
	}
}

var ws = new WebSocket("wss://hack.chat/chat-ws");
function ws_send(data) {
    if (ws && ws.readyState == ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}
ws.onmessage = function(message) {
    var result = JSON.parse(message.data);
    var cmd = result.cmd;
    var command = COMMANDS[cmd];
    if (command) {
        command.call(null, result);
    }
}
COMMANDS = {
    "info": function(args) {
        args.nick = "*";
        pushMessage(args);
    },
    "emote": function(args) {
        args.nick = "*";
        pushMessage(args);
    },
    "chat": function(args) {
        pushMessage(args);
    },
    "onlineAdd": function(args) {
        args.text = args.nick + " joined";
        args.nick = "*";
        pushMessage(args);
    },
    "onlineRemove": function(args) {
        args.text = args.nick + " left";
        args.nick = "*";
        pushMessage(args);
    },
    "onlineSet": function(args) {
        args.nick = "*";
        args.text = "Users online: " + args.nicks.join(", ");
        pushMessage(args);
    },
    "warn": function(args) {
        args.nick = "!";
        args.text = args.text;
        pushMessage(args);
    },
}
function pushMessage(args) {
    $('#main').innerHTML += `
    <mdui-card variant="outlined" style="width: 300px">
		<mdui-chip>${args.nick}</mdui-chip>
		<div class="mdui-prose">
			${args.text}
		</div>
	</mdui-card>
    `;
    window.scrollTo(0, document.body.scrollHeight);
}