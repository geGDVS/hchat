const channelSelect = document.getElementById('channel-select');
channelSelect.addEventListener('change', handleChannelChange);

const textField = document.getElementById('text');
let selectedChannel = '';
let channelStatus = 'out'; // "in" or "out"
let myName = '';
let unreadCount = 0; // 未读消息计数
let isWindowFocused = true; // 窗口焦点状态
const originalTitle = document.title; // 保存原始标题

const main = document.getElementById('main');

// 使用事件委托处理消息交互
main.addEventListener('click', handleMessageClick);
main.addEventListener('contextmenu', handleMessageRightClick);

var ws = new WebSocket("wss://hcproxy.onrender.com/");
COMMANDS = {
    "info": function (args) {
        args.nick = "*";
        pushMessage(args);
    },
    "emote": function (args) {
        args.nick = "*";
        pushMessage(args);
    },
    "chat": function (args) {
        pushMessage(args);
    },
    "onlineAdd": function (args) {
        args.text = args.nick + " joined";
        args.nick = "*";
        pushMessage(args);
    },
    "onlineRemove": function (args) {
        args.text = args.nick + " left";
        args.nick = "*";
        pushMessage(args);
    },
    "onlineSet": function (args) {
        args.nick = "*";
        args.text = "Users online: " + args.nicks.join(", ");
        pushMessage(args);
    },
    "warn": function (args) {
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

            if (channelStatus != "in") {
                myName = text.split('#')[0];
                ws_send({ cmd: 'join', nick: text, channel: selectedChannel });
                channelStatus = "in";
                textField.label = "Enter Text to chat";
            } else {
                ws_send({ cmd: 'chat', text: text });
            }
        }
    }
}

ws.onmessage = function (message) {
    var result = JSON.parse(message.data);
    var cmd = result.cmd;
    var command = COMMANDS[cmd];
    if (command) {
        command.call(null, result);
    }
}

function pushMessage(args) {
    console.log(args);
    // 只在窗口失焦时增加未读消息计数（自己的消息不计入未读）
    if (args.nick !== myName && !isWindowFocused) {
        unreadCount++;
        updateTitle();
    }
    // 使用 marked 处理 markdown，启用 breaks 选项使换行符直接转换为 <br>
    const htmlContent = marked.parse(args.text, { breaks: true });

    if (args.nick == "*") {
        // 如果文本符合 "xxx joined" 模式，则将 xxx 做为用户名标签
        let displayHtml = htmlContent;
        // 尝试识别 joined 或 left 事件并把用户名变成标签
        const joinedMatch = args.text.match(/^(.+) joined$/);
        const leftMatch = args.text.match(/^(.+) left$/);
        if (joinedMatch) {
            const name = joinedMatch[1];
            displayHtml = `<mdui-chip class=\"user-chip\" data-nick="${name}">${name}</mdui-chip> joined`;
        } else if (leftMatch) {
            const name = leftMatch[1];
            displayHtml = `<mdui-chip class=\"user-chip\" data-nick="${name}">${name}</mdui-chip> left`;
        }
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="filled" class="message">
            <div class="mdui-prose">
                ${displayHtml}
            </div>
        </mdui-card><br>
        `);
    } else if (args.nick == "!") {
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="outlined" class="message">
            <div class="mdui-prose">
                ${htmlContent}
            </div>
        </mdui-card><br>
        `);
    } else if (args.nick == myName) {
        main.insertAdjacentHTML('beforeend', `
        <div class="message-row">
            <mdui-card variant="elevated" class="message" data-nick="${myName}" data-text="${args.text.replace(/"/g, '&quot;')}">
                <div class="mdui-prose" style="text-align: left;">
                    ${htmlContent}
                </div>
            </mdui-card>
        </div><br>
        `);
    } else {
        main.insertAdjacentHTML('beforeend', `
        <mdui-card variant="elevated" class="message" data-nick="${args.nick}" data-text="${args.text.replace(/"/g, '&quot;')}">
            <mdui-chip class="user-chip" data-nick="${args.nick}">${args.nick}</mdui-chip>
            <div class="mdui-prose">
                ${htmlContent}
            </div>
        </mdui-card><br>
        `);
    }
    // 窗口划至底部（更可靠的实现）
    // 优先尝试滚动到最后一个消息元素，避免 innerHTML 重建带来的问题
    scrollMainToBottom();
}

// 更新标题显示未读消息数
function updateTitle() {
    if (unreadCount > 0) {
        document.title = `${originalTitle} (${unreadCount})`;
    } else {
        document.title = originalTitle;
    }
}

// 处理用户名标签点击事件
function handleMessageClick(e) {
    // 检查是否点击了用户名chip
    if (e.target.classList.contains('user-chip')) {
        const nick = e.target.getAttribute('data-nick');
        if (nick) {
            // 在文本框插入@用户名
            const currentValue = textField.value;
            textField.value = currentValue + (currentValue ? ' ' : '') + `@${nick} `;
            textField.focus();
        }
    }
}

function reply(nick, originalText) {
    let replyText = '';
    let overlongText = false;
    if (originalText.length > 350) {
        replyText = originalText.slice(0, 350);
        overlongText = true;
    }
    replyText = '>' + nick + '：\n';
    originalText = originalText.split('\n');
    if (originalText.length >= 8) {
        originalText = originalText.slice(0, 8);
        overlongText = true;
    }
    for (let replyLine of originalText) {
        if (!replyLine.startsWith('>>')) replyText += '>' + replyLine + '\n';
    }
    if (overlongText) replyText += '>……\n';
    replyText += `\n@${nick} `;
    return replyText;
}

// 处理消息右键菜单
function handleMessageRightClick(e) {
    e.preventDefault();
    
    // 查找点击的消息卡片
    let messageCard = e.target.closest('mdui-card.message');
    if (!messageCard) return;
    
    const nick = messageCard.getAttribute('data-nick');
    const text = messageCard.getAttribute('data-text');
    
    if (nick && text) {
        // 在文本框插入引用
        const quote = reply(nick, text);
        const currentValue = textField.value;
        textField.value = currentValue + (currentValue ? '\n' : '') + quote;
        textField.focus();
        
        // 获取文本框并滚动到底部
        textField.scrollTop = textField.scrollHeight;
    }
}

// 监听窗口失焦事件，开始计数
window.addEventListener('blur', function () {
    isWindowFocused = false;
});

// 监听窗口获得焦点事件，重置未读计数
window.addEventListener('focus', function () {
    isWindowFocused = true;
    unreadCount = 0;
    updateTitle();
});

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