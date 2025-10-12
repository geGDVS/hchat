const channelSelect = document.getElementById('channel-select');
channelSelect.addEventListener('change', handleChannelChange);

const textField = document.getElementById('text');
let selectedChannel = '';
let channelStatus = 'out'; // "in" or "out"
let myName = '';

const main = document.getElementById('main');

var ws = new WebSocket("wss://hack.chat/chat-ws");
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
function ws_send(data) {
    if (ws && ws.readyState == ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function handleChannelChange() {
    selectedChannel = channelSelect.value;
    textField.label = `Enter Name#Password to join ${selectedChannel}`;
    textField.readonly = false;
    textField.value = '';
}

textField.onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// Submit message
		if (textField.value != '') {
			var text = textField.value;
			textField.value = '';

			if (channelStatus != "in"){
                myName = text.split('#')[0];
				ws_send({cmd: 'join', nick: text, channel: selectedChannel});
				channelStatus = "in";
				textField.label = "Enter Text to chat";
			} else {
				ws_send({ cmd: 'chat', text: text });
			}
		}
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

function pushMessage(args) {
    console.log(args);
    if (args.nick == "*") {
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="filled" class="message">
            <div class="mdui-prose">
                ${args.text}
            </div>
        </mdui-card><br>
        `);
    } else if (args.nick == "!") {
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="outlined" class="message">
            <div class="mdui-prose">
                ${args.text}
            </div>
        </mdui-card><br>
        `);
    } else if (args.nick == myName) { 
        main.insertAdjacentHTML('beforeend', `
        <div class="message-row">
            <mdui-card variant="elevated" class="message message-right">
                <div class="mdui-prose" style="text-align: right;">
                    ${args.text}
                </div>
            </mdui-card>
        </div><br>
        `);
    } else {
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="elevated" class="message">
            <mdui-chip>${args.nick}</mdui-chip>
            <div class="mdui-prose">
                ${args.text}
            </div>
        </mdui-card><br>
        `);
    }
    // 窗口划至底部（更可靠的实现）
    // 优先尝试滚动到最后一个消息元素，避免 innerHTML 重建带来的问题
    scrollMainToBottom();
}

/**
 * 将消息容器滚动到底部的可靠实现。
 * 优先将可滚动容器滚动到底部；如果容器不可滚动，则回退到 window。
 */
function scrollMainToBottom() {
    try {
        // 在下一帧再滚动，确保 DOM 更新完成（双帧更可靠）
        const doScroll = () => {
            if (main && main.scrollHeight > main.clientHeight) {
                // 立即跳到底部（使用 scrollTop 保证立即生效）
                main.scrollTop = main.scrollHeight;
                // 同步调用 scrollTo 作为补充（behavior: 'auto' 立即跳转）
                if (typeof main.scrollTo === 'function') {
                    try { main.scrollTo({ top: main.scrollHeight, behavior: 'auto' }); } catch (e) { /* ignore */ }
                }
                // 再尝试把最后一条消息元素滚进视口（处理 web component / 渲染延迟情况）
                try {
                    const nodes = main.querySelectorAll('.message, .message-row');
                    if (nodes && nodes.length) {
                        const last = nodes[nodes.length - 1];
                        try { last.scrollIntoView({ behavior: 'auto', block: 'end' }); } catch (e) { /* ignore */ }
                    }
                } catch (e) { /* ignore */ }
            } else {
                // 回退到 document body 的底部
                window.scrollTo(0, document.body.scrollHeight);
            }
        };

        // requestAnimationFrame 双帧确保渲染完成
        requestAnimationFrame(() => requestAnimationFrame(doScroll));

    // 回退：如果 rAF 在某些环境不可靠，使用短延时确保执行（0ms, 50ms, 100ms）
    setTimeout(doScroll, 0);
    setTimeout(doScroll, 50);
    setTimeout(doScroll, 100);
    } catch (e) {
        // 最后兜底直接跳转（旧浏览器兼容）
        window.scrollTo(0, document.body.scrollHeight);
    }
}