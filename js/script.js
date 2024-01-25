// 打开一个 web socket  这里端口号和上面监听的需一致
var ws = new WebSocket('ws://pnode1.danbot.host:7445/');
var messageDiv = document.getElementById("m");
var input = document.getElementById("text");

// Web Socket 已连接上，使用 send() 方法发送数据
ws.onopen = function() {
	ws.send('Client joiend.');
}
// 这里接受服务器端发过来的消息
ws.onmessage = function(e, isBinary) {
	messageDiv.innerHTML += `<p>${e.data}</p>`;
}

function send(){
	ws.send(input.value);
}