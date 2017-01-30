(function(wHandle, wjQuery) {
    if (navigator.appVersion.indexOf("MSIE") != -1)
        alert("You're using a pretty old browser, some parts of the website might not work properly.");

    Date.now || (Date.now = function() {
        return (+new Date).getTime();
    });
    Array.prototype.peek = function() {
        return this[this.length - 1];
    };
    $(document).ready(function() {
        $('body').append('<canvas id="nodes"></canvas>');
        $('#nodes').css({
            'background': 'rgba(0,0,0,.5) url("img/map-bg.png")',
            'border-radius': '7px',
            'border': '1px solid rgba(0,0,0,0.2)',
            'padding': '0',
            'margin': '0',
            'width': '200px',
            'height': '200px',
            'position': 'absolute',
            'right': '15px',
            'bottom': '15px',
            'display': 'none'
        });
    });
    var CONNECT_TO
      , SKIN_URL = "http://ogar.mivabe.nl/skins/"
      , USE_HTTPS = "https:" == wHandle.location.protocol
      , BORDER_DEFAULT = {top: -2E3, left: -2E3, right: 2E3, bottom: 2E3}
      , PI_2 = Math.PI * 2
      , SEND_104 = new Uint8Array([104, 1, 0, 0, 0])
      , SEND_254 = new Uint8Array([254, 6, 0, 0, 0])
      , SEND_255 = new Uint8Array([255, 1, 0, 0, 0])
      , FPS_MAXIMUM = 1000
      , ws = null
      , touches = []
      , touchStartX = 0
      , touchStartY = 0
      , touchMove = false
      , disconnectDelay = 1
      , UINT8_CACHE = {
            1:  new Uint8Array([1]),
            17: new Uint8Array([17]),
            21: new Uint8Array([21]),
            18: new Uint8Array([18]),
            19: new Uint8Array([19]),
            22: new Uint8Array([22]),
            23: new Uint8Array([23]),
            24: new Uint8Array([24]),
            25: new Uint8Array([25]),
            254:new Uint8Array([254]) };

    function Disconnect() {
        if (!ws) return;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        if (serverStatID) {
            clearInterval(serverStatID);
            serverStatID = null;
        }
        ws = null;
        resetGameVariables();
    };
    function resetGameVariables() {
        nodesID = { };
        nodes = [];
        myNodes = [];
        deadNodes = [];
        qTree = null;
        leaderboard = [];
        leaderboardType = "none";
        userScore = 0;
        centerX = 0;
        centerY = 0;
        lastMessageTime = -1;
        latency = -1;
        _cX = 0;
        _cY = 0;
        _cZoom = 1;
        mapCenterSet = false;
        border = BORDER_DEFAULT;
        loadedSkins = [];
        viewZoom = 1;
        userName = "";
        chatText = "";
        gameType = -1;
        serverVersion = "Unknown";
        serverStats = null;
        leaderboardCanvas = null;
        serverStatCanvas = null;
        stats = {virus: 0, pellet: 0, cells: 0, players: 0, score: 0 };
        gamestart = null;
    };
    function Connect(to) {
        if (ws) Disconnect();
        wjQuery("#connecting").show();
        ws = new WebSocket((USE_HTTPS ? "wss://" : "ws://") + (CONNECT_TO = to));
        ws.binaryType = "arraybuffer";
        ws.onopen = WsOpen;
        ws.onmessage = WsMessage;
        ws.onerror = WsError;
        ws.onclose = WsClose;
        log.debug("Connecting to " + to);
    };
    function WsOpen() {
        disconnectDelay = 1;
        wjQuery("#connecting").hide();
        WsSend(SEND_254);
        WsSend(SEND_255);
        serverVersion = "Unknown";
        log.debug("Connected to " + CONNECT_TO);
        log.debug("HTTPS: " + USE_HTTPS);
        chatMessages.push({
            server: false,
            admin: false,
            mod: false,
            nameColor: "#33BB33",
            name: "info",
            message: "Connected to " + CONNECT_TO,
            time: Date.now()
        });
        lastMessageTime = Date.now();
        drawChat();
        if(!settings.mobile) {
            $('#nodes').show();
            WsSend(SEND_104);
        }
    };
    function WsMessage(data) {
        var reader = new Reader(new DataView(data.data), 0, true),
            i, count,
            packet = reader.getUint8();
        switch (packet) {
            case 0x20:
                // New cell of mine
                myNodes.push(reader.getUint32());
                break;
            case 0x63:
                // Chat message
                var flags = reader.getUint8(),
                    name, message, nameColor;

                var r = reader.getUint8(),
                    g = reader.getUint8(),
                    b = reader.getUint8(),
                    nameColor = (r << 16 | g << 8 | b).toString(16);
                while (nameColor.length < 6) nameColor = '0' + nameColor;
                nameColor = '#' + nameColor;
                name = reader.getStringUCS();
                message = reader.getStringUCS();
                chatAlphaWait += Math.max(5000, 1000 + message.length * 100);
                chatMessages.push({
                    server: !!(flags & 0x80),
                    admin: !!(flags & 0x40),
                    mod: !!(flags & 0x20),
                    nameColor: nameColor,
                    name: name,
                    message: message,
                    time: Date.now()
                });
                drawChat();
                break;
            case 0x12:
                // Clear all
                for (var i in nodesID) nodesID[i].destroy(Date.now());
            case 0x14:
                // Clear nodes (case 0x12 slips here too)
                myNodes = [];
                break;
            case 0x15:
                // Draw line
                // Unimplemented
                break;
            case 0xFE:
                // Server stat
                serverStats = JSON.parse(reader.getStringUTF8());
                latency = Date.now() - lastMessageTime;
                drawServerStat();
                break;
            case 0x40:
                // Set border
                border.left = reader.getFloat64();
                border.top = reader.getFloat64();
                border.right = reader.getFloat64();
                border.bottom = reader.getFloat64();
                if (data.data.byteLength !== 33) {
                    // Game type and server name is given
                    gameType = reader.getUint32();
                    serverVersion = reader.getStringUTF8();
                    serverStatID = setInterval(function() {
                        // Server stat
                        lastMessageTime = Date.now();
                        WsSend(UINT8_CACHE[254]);
                    }, 2000);
                }
                if (0 === myNodes.length && !mapCenterSet) {
                    mapCenterSet = true;
                    _cX = (border.right + border.left) / 2;
                    _cY = (border.bottom + border.top) / 2;
                    centerX = _cX;
                    centerY = _cY;
                }
                break;
            // Leaderboard update packets
            case 0x30:
                // Text list, somewhat deprecated
                leaderboard = [];
                if (leaderboardType != 0x30) {
                    leaderboardType = 0x30;
                    log.info("Got somewhat deprecated leaderboard type 48 (0x30). Server-side is possibly Ogar")
                }

                count = reader.getUint32();
                for (i = 0; i < count; ++i)
                    leaderboard.push(reader.getStringUTF8());
                drawLeaderboard();
                break;
            case 0x31:
                // FFA list
                leaderboard = [];
                leaderboardType = 0x31;
                count = reader.getUint32();
                for (i = 0; i < count; ++i) {
                    leaderboard.push({
                        me: reader.getUint32(),
                        name: reader.getStringUTF8() || "An unnamed cell"
                    });
                }
                drawLeaderboard();
                break;
            case 0x32:
                // Pie chart
                leaderboard = [];
                leaderboardType = 0x32;
                count = reader.getUint32();
                for (i = 0; i < count; ++i)
                    leaderboard.push(reader.getFloat32());
                drawLeaderboard();
                break;
            case 0x10:
                // Update nodes
                var killer, killed, id, node, x, y, size, flags,
                    updColor, updName, updSkin, // Flags
                    time = Date.now();

                // Consume records
                count = reader.getUint16();
                for (var i = 0; i < count; i++) {
                    killer = reader.getUint32();
                    killed = reader.getUint32();
                    if (!nodesID.hasOwnProperty(killer) || !nodesID.hasOwnProperty(killed)) continue;
                    OnCellEaten(killer, killed);
                    nodesID[killed].killer = nodesID[killer];
                    nodesID[killed].destroy();
                }

                // Node update records
                while (1) {
                    id = reader.getUint32();
                    if (0 === id) break;

                    x = reader.getInt32();
                    y = reader.getInt32();
                    size = reader.getUint16();

                    flags = reader.getUint8();
                    updColor = !!(flags & 0x02);
                    updName = !!(flags & 0x08);
                    updSkin = !!(flags & 0x04);
                    var color = null,
                        name = null,
                        skin = null,
                        tmp = "";

                    if (updColor) {
                        color = "";
                        for (var r = reader.getUint8(), g = reader.getUint8(), b = reader.getUint8(),
                            color = (r << 16 | g << 8 | b).toString(16); 6 > color.length;) color = "0" + color;
                        color = "#" + color;
                    }

                    if (updSkin) skin = reader.getStringUTF8();
                    if (updName) name = reader.getStringUTF8();
                    if (name != null && skin == null) skin = '%default';
                    if (nodesID.hasOwnProperty(id)) {
                        node = nodesID[id];
                        node.nx = x;
                        node.ny = y;
                        node.nSize = size;
                        updColor && (node.setColor(color));
                        updName && name && (node.setName(name));
                        updSkin && skin && (node.setSkin(skin));
                        node.updateStamp = time;
                    } else {
                        node = new Cell(id, x, y, size, name || "", color || "#FFFFFF", skin || "", time, flags);
                        nodesID[id] = node;
                        nodes.push(node);
                    }

                    if (-1 != myNodes.indexOf(id))
                    {
                        myposx = border.right + x;
                        myposy = border.bottom + y;
                    }
                }

                // Dissapear records
                count = reader.getUint16();
                for (i = 0; i < count; i++) {
                    killed = reader.getUint32();
                    if (nodesID.hasOwnProperty(killed)) nodesID[killed].destroy(time);
                }

                // List through cells and if it wasn't updated mark it as pellet
                count = nodes.length;
                for (i = 0; i < count; i++) {
                    node = nodes[i];

                    if (node.isPellet || node.notPellet || node.isVirus || node.isAgitated || node.isEjected) continue;
                    if (node.updateStamp !== time && node.birthStamp !== time) {
                        // Node is a pellet - draw cache
                        var _nCache = document.createElement('canvas');
                        var pCtx = _nCache.getContext('2d'),
                            lW = this.nSize > 20 ? Math.max(this.nSize * .01, 10) : 0, sz;
                        _nCache.width = (sz = node.nSize + lW) * 2;
                        _nCache.height = sz * 2;
                        pCtx.lineWidth = lW;
                        pCtx.lineCap = pCtx.lineJoin = "round";
                        pCtx.fillStyle = node.color;
                        pCtx.strokeStyle = node.strokeColor;

                        pCtx.beginPath();
                        pCtx.arc(sz, sz, node.nSize - lW, 0, 2 * Math.PI, false);
                        pCtx.fill();
                        pCtx.stroke();
                        pCtx.closePath();
                        node._meCache = _nCache;
                        node._meW = _nCache.width / 2;
                        node._meH = _nCache.height / 2;
                        node.isPellet = true;
                    } else if (node.updateStamp === time && node.birthStamp !== time)
                        // Not a pellet
                        node.notPellet = true;
                }
                break;
            case 0x11:
                // Update position (spectate packet)
                _cX = reader.getFloat32();
                _cY = reader.getFloat32();
                _cZoom = reader.getFloat32();
                break;
            case 0x68:
                var temp = setTimeout(function () {
                    // Minimap Draw
                    var k = border.right * 2;
                    var j = border.bottom * 2;
                    var a = document.getElementById("nodes");
                    a.width = 200;
                    a.height = 200;
                    var mCtx = a.getContext("2d");
                    mCtx.clearRect(0, 0, 200, 200);
                    mCtx.globalAlpha = 1;
                    while (1) {
                        var id = reader.getUint32();
                        if (0 === id) break;
                        var posx = 200 * ( border.right + reader.getInt32() ) / k;
                        var posy = 200 * ( border.bottom + reader.getInt32() ) / j;
                        var size = reader.getUint16() / (k / 200);
                        var color = "";
                        for (var r = reader.getUint8(), g = reader.getUint8(), b = reader.getUint8(), color = (r << 16 | g << 8 | b).toString(16); 6 > color.length;) color = "0" + color;
                        color = "#" + color;
                        var tossaway = reader.getUint8();
                        tossaway = reader.getUint16();
                        if(size < 1.8) size = 1.8;
                        mCtx.beginPath();
                        mCtx.arc(posx, posy, size, 0, PI_2, false);
                        mCtx.strokeStyle = "#000000";
                        mCtx.fillStyle = color;
                        mCtx.fill()
                        mCtx.lineWidth = 0.75;
                        mCtx.stroke();
                    }
                }.bind(this), 0);
                break;
            default:
                log.err("Got unexpected packet ID " + packet)
                Disconnect();
        }
    };
    function WsError(e) {
        log.warn("Connection error");
        log.debug(e);
    };
    function WsClose() {
        log.debug("Disconnected");
        Disconnect();
        setTimeout(function() {
            if (ws) if (ws.readyState === 1) return;
            Connect(CONNECT_TO);
        }, (disconnectDelay *= 1.5) * 1000);
    };
    function WsSend(data) {
        if (!ws) return;
        if (ws.readyState !== 1) return; // Still connecting
        if (data.build) ws.send(data.build());
        else ws.send(data);
    };
    function Play(name) {
        // check if skin field is filled!
        stats = {virus: 0, pellet: 0, cells: 0, players: 0, score: 0 };
        var skin = $('#myskin').val();
        userName = name;
        if(skin != "") name = '<' + skin + '>' + name;
        log.debug("Playing");
        var writer = new Writer(true);
        writer.setUint8(0x00);
        writer.setStringUTF8(name);
        WsSend(writer);
        if (null != wHandle.localStorage) {
            // Lets store the skin value on sign in if it not same as stored value
            var value = wHandle.localStorage.getItem("checkbox-50");
            if( value != skin ) wHandle.localStorage.setItem("checkbox-50", skin);
        }
        gamestart = Date.now();
    };
    function onTouchStart(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if ((leftTouchID < 0) && (touch.clientX < mainCanvas.width / 2)) {
                leftTouchID = touch.identifier;
                leftTouchStartPos.reset(touch.clientX, touch.clientY);
                leftTouchPos.copyFrom(leftTouchStartPos);
                leftVector.reset(0, 0);
            }
            var size = ~~(mainCanvas.width / 7);
            if ((touch.clientX > mainCanvas.width - size) && (touch.clientY > mainCanvas.height - size)) {
                // Send Press Space
                WsSend(UINT8_CACHE[17]);
            }
            if ((touch.clientX > mainCanvas.width - size) && (touch.clientY > mainCanvas.height - 2 * size - 10) && (touch.clientY < mainCanvas.height - size - 10)) {
                // Send Press W
                WsSend(UINT8_CACHE[21]);
            }
        }
        touches = e.touches;
    };
    function onTouchMove(e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if (leftTouchID == touch.identifier) {
                leftTouchPos.reset(touch.clientX, touch.clientY);
                leftVector.copyFrom(leftTouchPos);
                leftVector.minusEq(leftTouchStartPos);
                rawMouseX = leftVector.x * 3 + mainCanvas.width / 2;
                rawMouseY = leftVector.y * 3 + mainCanvas.height / 2;
            }
        }
        touches = e.touches;
    };
    function onTouchEnd(e) {
        touches = e.touches;
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if (leftTouchID == touch.identifier) {
                leftTouchID = -1;
                leftVector.reset(0, 0);
                break;
            }
        }
    };
    function OnCellEaten(predator, prey) {
        if (-1 != myNodes.indexOf(predator)) {
            // var eatsize = nodesID[prey].size;
            if(nodesID[prey].isPellet) 
                stats.pellet++;
            else if(nodesID[prey].isVirus)
                stats.virus++;
            else if(nodesID[prey].name == 0)
                stats.cells++;
            else
                stats.players++;
        }
    }
    function SendChat(a) {
        if (a.length > 200) {
            chatMessages.push({
                server: false,
                admin: false,
                mod: false,
                nameColor: "#FF0000",
                name: "info",
                message: "Too large message!",
                time: Date.now()
            });
            drawChat();
            return;
        }
        if (log.VERBOSITY === 3) {
            var s = a.split(' '),
                v = s[0].toLowerCase();
            if (v[0] === "/") {
                if (v === "/dev") {
                    chatMessages.push({
                        server: false,
                        admin: false,
                        mod: false,
                        nameColor: "#1671CC",
                        name: "info",
                        message: "Dev commands",
                        time: Date.now()
                    }, {
                        server: false,
                        admin: false,
                        mod: false,
                        nameColor: "#1671CC",
                        name: "info",
                        message: "/connect - connect to some other IP",
                        time: Date.now()
                    }, {
                        server: false,
                        admin: false,
                        mod: false,
                        nameColor: "#1671CC",
                        name: "info",
                        message: "/setsetting - Set a graphics option",
                        time: Date.now()
                    });
                    chatAlphaWait += 10000;
                    drawChat();
                    return;
                } else if (v === "/connect") {
                    Connect(s[1]);
                    drawChat();
                    return;
                } else if (v === "/setsetting") {
                    settings[s[2]] = s[3];
                    drawChat();
                    return;
                }
            }
        }
        var writer = new Writer();
        writer.setUint8(0x63);
        writer.setUint8(0);
        writer.setStringUTF8(a);
        WsSend(writer);
    };
    function SendMouseMove(x, y) {
        var writer = new Writer(true);
        writer.setUint8(0x10);
        writer.setUint32(x);
        writer.setUint32(y);
        writer._b.push(0, 0, 0, 0);
        WsSend(writer);
    };

    // Game variables
    var nodesID = { },
        nodes = [],
        deadNodes = [],
        myNodes = [],
        qTree = null,
        leaderboard = [],
        leaderboardType = -1, // -1 - Not set, 48 - Text list, 49 - FFA list, 50 - Pie chart
        leaderboardCanvas = null,
        userScore = 0,
        centerX = 0,
        centerY = 0,
        _cX = 0, _cY = 0, _cZoom = 1, // Spectate packet X, Y & zoom
        mapCenterSet = false,
        rawMouseX = 0,
        rawMouseY = 0,
        myposx = null,
        myposy = null,
        border = BORDER_DEFAULT,
        knownSkins = [],
        loadedSkins = [],
        drawZoom = 1,  // Scale when drawing
        viewZoom = 1,  // Scale without scroll scaling
        mouseZoom = 1, // Scroll scale
        lastMessageTime = -1,
        latency = -1,
        drawing = false,
        userName = "",
        // Red Green Blue Yellow Cyan Magenta Orange
        teamColors = ["#FF3333", "#33FF33", "#3333FF", "#FFFF33", "#33FFFF", "#FF33FF", "#FF8833"],
        gameType = -1; // Given at SetBorder packet
        serverVersion = "Unknown", // Given at SetBorder packet
        chatText = "",
        chatMessages = [],
        chatAlphaWait = 0,
        chatCanvas = null,
        isTyping = false,
        isWindowFocused = true,
        mainCanvas = null,
        mainCtx = null,
        chatBox = null,
        lastDrawTime = Date.now(),
        escOverlay = false,
        fps = 0,
        serverStatID = null,
        serverStats = null,
        serverStatCanvas = null,
        _viewMult = 1,
        leftTouchID = -1,
        leftTouchPos = new Vector2(0, 0),
        leftTouchStartPos = new Vector2(0, 0),
        leftVector = new Vector2(0, 0),
        splitIcon = new Image,
        ejectIcon = new Image,
        gamestart = null,
        stats = {virus: 0, pellet: 0, cells: 0, players: 0, score: 0},
        pressed = {space: false, w: false, e: false, r: false, t: false, p: false, q: false, esc: false};

    splitIcon.src = "img/split.png";
    ejectIcon.src = "img/feed.png";

    // Render quality settings
    var qualitySettings = {
        'retina': {
            getTextLineWidth: function(a) {
                return a * .1;
            },
            cellOutline: true,
            smoothRender: .3,
            overrideGrid: false,
            overrideSkins: false,
            drawStat: true,
            drawMassSpectate: true
        },
        'high': {
            getTextLineWidth: function(a) {
                return a * .1;
            },
            cellOutline: true,
            smoothRender: .4,
            overrideGrid: false,
            overrideSkins: false,
            drawStat: true,
            drawMassSpectate: true
        },
        'medium': {
            getTextLineWidth: function(a) {
                return a * .1;
            },
            cellOutline: false,
            smoothRender: .7,
            overrideGrid: false,
            overrideSkins: false,
            drawStat: true,
            drawMassSpectate: true
        },
        'low': {
            getTextLineWidth: function(a) {
                return 3.1;
            },
            cellOutline: false,
            smoothRender: 1.3,
            overrideGrid: true,
            overrideSkins: false,
            drawStat: false,
            drawMassSpectate: false
        },
        'mobile': {
            getTextLineWidth: function(a) {
                return 0;
            },
            cellOutline: false,
            smoothRender: Infinity,
            overrideGrid: true,
            overrideSkins: true,
            drawStat: false,
            drawMassSpectate: false
        },
    };

    // Client variables
    var settings = {
        mobile: 'createTouch' in document && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        showMass: false,
        showNames: true,
        showLeaderboard: true,
        showChat: true,
        showGrid: false,
        showTextOutline: true,
        showColor: true,
        showSkins: true,
        showMapGrid: true,
        showBorder: true,
        darkTheme: true,
        fastRenderMax: 0.4,
        quality: 'high',
        qualityRef: qualitySettings['high'],
        allowGETipSet: false // Whether index.html?ip=abc is accepted (not implemented)
    };

    // Load local storage
    if (null != wHandle.localStorage) {
        wjQuery(window).load(function() {
            wjQuery(".save").each(function() {
                var id = $(this).data("box-id");
                var value = wHandle.localStorage.getItem("checkbox-" + id);
                if (value && value == "true" && (0 != id || 50 != id)) {
                    $(this).prop("checked", "true");
                    $(this).trigger("change");
                } else if ((id == 0 || id == 50) && value != null) {
                    $(this).val(value);
                }
                log.debug("Setting " + id + " set to " + value);
            });
            wjQuery(".save").change(function() {
                var id = $(this).data('box-id');
                var value = (id == 0 || id == 50) ? $(this).val() : $(this).prop('checked');
                wHandle.localStorage.setItem("checkbox-" + id, value);
            });
        });
    }
/*
    // Load known skin list
    wjQuery.ajax({
        type: "POST",
        dataType: "json",
        url: "checkdir.php",
        data: {
            "action": "getSkins"
        },
        success: function(data) {
            response = JSON.parse(data.names);
            for (var i = 0; i < response.length; i++) {
                if (-1 === knownSkins.indexOf(response[i])) {
                    knownSkins.push(response[i]);
                }
            }
        }
    });
*/
    function hideESCOverlay() {
        escOverlay = false;
        wjQuery("#overlays").hide();
    };
    function showESCOverlay(arg) {
        escOverlay = true;
        userNickName = null;
        wjQuery("#overlays").fadeIn(350);
    };

    function loadInit() {
        mainCanvas = document.getElementById('canvas');
        mainCtx = mainCanvas.getContext('2d');
        chatBox = document.getElementById("chat_textbox");
        mainCanvas.focus();

        // Mobile handle
        if (settings.mobile) {
            mainCanvas.addEventListener('touchstart', onTouchStart, false);
            mainCanvas.addEventListener('touchmove', onTouchMove, false);
            mainCanvas.addEventListener('touchend', onTouchEnd, false);
        }

        // Wheel handling
        function handleWheel(event) {
            mouseZoom *= Math.pow(.9, event.wheelDelta / -120 || event.detail || 0);
            0.1 > mouseZoom && (mouseZoom = 0.1);
            mouseZoom > 4 / viewZoom && (mouseZoom = 4 / viewZoom);
        }

        // Mouse wheel
        if (/firefox/i.test(navigator.userAgent))
            document.addEventListener("DOMMouseScroll", handleWheel, false);
        else
            document.body.onmousewheel = handleWheel;

        window.onfocus = function() {
            isWindowFocused = true;
        };

        window.onblur = function() {
            isWindowFocused = false;
        };

        wHandle.onkeydown = function(event) {
            switch (event.keyCode) {
                case 13: // enter
                    if (escOverlay) break;
                    if (!settings.showChat) break;
                    if (isTyping) {
                        chatBox.blur();
                        var chattxt = chatBox.value;
                        if (chattxt.length > 0) SendChat(chattxt);
                        chatBox.value = "";
                    } else chatBox.focus();
                    break;
                case 32: // space
                    if (isTyping || escOverlay || pressed.space) break;
                    WsSend(UINT8_CACHE[17]);
                    pressed.space = true;
                    break;
                case 87: // W
                    if (isTyping || escOverlay || pressed.w) break;
                    WsSend(UINT8_CACHE[21]);
                    pressed.w = true;
                    break;
                case 81: // Q
                    if (isTyping || escOverlay || pressed.q) break;
                    WsSend(UINT8_CACHE[18]);
                    pressed.q = true;
                    break;
                case 69: // E
                    if (isTyping || escOverlay || pressed.e) break;
                    WsSend(UINT8_CACHE[22]);
                    pressed.e = true;
                    break;
                case 82: // R
                    if (isTyping || escOverlay || pressed.r) break;
                    WsSend(UINT8_CACHE[23]);
                    pressed.r = true;
                    break;
                case 84: // T
                    if (isTyping || escOverlay || pressed.t) break;
                    WsSend(UINT8_CACHE[24]);
                    pressed.t = true;
                    break;
                case 80: // P
                    if (isTyping || escOverlay || pressed.p) break;
                    WsSend(UINT8_CACHE[25]);
                    pressed.p = true;
                    break;
                case 27: // esc
                    if (pressed.esc) break;
                    pressed.esc = true;
                    if (escOverlay) hideESCOverlay();
                    else showESCOverlay();
                    break;
            }
        };

        wHandle.onkeyup = function(event) {
            switch (event.keyCode) {
                case 32: // space
                    pressed.space = false;
                    break;
                case 87: // W
                    pressed.w = false;
                    break;
                case 81: // Q
                    if (pressed.q) WsSend(UINT8_CACHE[19]);
                    pressed.q = false;
                    break;
                case 69: // E
                    pressed.e = false;
                    break;
                case 82: // R
                    pressed.r = false;
                    break;
                case 84: // T
                    pressed.t = false;
                    break;
                case 80: // P
                    pressed.p = false;
                    break;
                case 27:
                    pressed.esc = false;
                    break;
            }
        };

        chatBox.onblur = function() {
            isTyping = false;
            drawChat();
        };

        chatBox.onfocus = function() {
            isTyping = true;
            drawChat();
        };

        mainCanvas.onmousemove = function(event) {
            rawMouseX = event.clientX;
            rawMouseY = event.clientY;
        };

        setInterval(function() {
            // Mouse update
            SendMouseMove((rawMouseX - mainCanvas.width / 2) / drawZoom + centerX,
                (rawMouseY - mainCanvas.height / 2) / drawZoom + centerY);
        }, 40);

        wHandle.onresize = function() {
            window.scrollTo(0,0);
            var cW = mainCanvas.width = wHandle.innerWidth,
                cH = mainCanvas.height = wHandle.innerHeight;
            _viewMult = Math.max(cH / 1080, cW / 1920);
        };

        wHandle.onresize();
        showESCOverlay();

        log.info("Loaded, took " + (Date.now() - LOAD_START) + " ms");

        if (window.requestAnimationFrame)
            window.requestAnimationFrame(drawLoop);
        else
            setInterval(drawGame, 1E3 / FPS_MAXIMUM);
    };
    function getChatAlpha() {
        if (isTyping) return 1;
        var now = Date.now(),
            lastMsg = chatMessages.peek(),
            diff = now - lastMsg.time;

        return 1 - Math.min(Math.max((diff - chatAlphaWait) * .001, 0), 1);
    };
    function drawTouch() {
        mainCtx.save();
        for(var i=0; i<touches.length; i++) {
            var touch = touches[i];
            if(touch.identifier == leftTouchID){
                mainCtx.beginPath();
                mainCtx.strokeStyle = "#0096ff";
                mainCtx.lineWidth = 6;
                mainCtx.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40,0,Math.PI*2,true);
                mainCtx.stroke();
                mainCtx.beginPath();
                mainCtx.strokeStyle = "#0096ff";
                mainCtx.lineWidth = 2;
                mainCtx.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60,0,Math.PI*2,true);
                mainCtx.stroke();
                mainCtx.beginPath();
                mainCtx.strokeStyle = "#0096ff";
                mainCtx.arc(leftTouchPos.x, leftTouchPos.y, 40, 0,Math.PI*2, true);
                mainCtx.stroke();
            } else {
                mainCtx.beginPath();
                mainCtx.beginPath();
                mainCtx.strokeStyle = "#0096ff";
                mainCtx.lineWidth = "6";
                mainCtx.arc(touch.clientX, touch.clientY, 40, 0, Math.PI*2, true);
                mainCtx.stroke();
            }
        }
        mainCtx.restore();
    };
    function drawChat() {
        if (!settings.showChat || chatMessages.length === 0) return;
        if (!chatCanvas) chatCanvas = document.createElement('canvas');

        var ctx = chatCanvas.getContext('2d'),
            l,
            now = Date.now(),
            i = 0, msg,
            lastMsg = chatMessages.peek(),
            fW, aW = 0,
            alpha = getChatAlpha();

        if (alpha === 0) {
            chatCanvas = null;
            chatAlphaWait = 0;
            return;
        }

        while ((l = chatMessages.length) > 15) chatMessages.shift(); // Remove older messages

        for ( ; i < l; i++) {
            msg = chatMessages[i];
            ctx.font = '18px Ubuntu';
            aW = Math.max(aW, 20 + ctx.measureText(msg.name + ":").width + ctx.measureText(" " + msg.message).width);
        }

        chatCanvas.width = aW;
        chatCanvas.height = l * 20 + 20;
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.globalAlpha = alpha * .2;
        ctx.fillRect(0, 0, chatCanvas.width, chatCanvas.height);

        ctx.globalAlpha = alpha;
        for (i = 0; i < l; i++) {
            msg = chatMessages[i];

            var divider = ":";
            if(msg.server) { msg.name = "\uD83D\uDCE2"; msg.nameColor = "#770000"; divider = " "; }
            if(msg.admin) { msg.name = "\uD83D\uDD75"; msg.nameColor = "#7D7D7D"; divider = " "; }

            // Name
            ctx.fillStyle = msg.nameColor;
            ctx.font = '18px Ubuntu';
            fW = ctx.measureText(msg.name + divider).width;
            ctx.font = '18px Ubuntu';
            ctx.fillText(msg.name + divider, 10, 5 + 20 * (i + 1));

            // Message
            ctx.font = '18px Ubuntu';
            if(!msg.server) ctx.fillStyle = "#FFFFFF";
            ctx.fillText(" " + msg.message, 10 + fW, 5 + 20 * (i + 1));
        }
    };
    function drawServerStat() {
        if (!serverStats) {
            serverStatCanvas = null;
            return;
        }

        if (!serverStatCanvas) serverStatCanvas = document.createElement('canvas');
        var ctx = serverStatCanvas.getContext('2d'), a, b, c;

        ctx.font = '14px Ubuntu';
        serverStatCanvas.width = 4 + Math.max(
            ctx.measureText(serverStats.name).width,
            ctx.measureText(serverStats.mode).width,
            ctx.measureText((a = serverStats.playersTotal + " / " + serverStats.playersLimit + " players")).width,
            ctx.measureText((b = serverStats.playersAlive + " playing")).width,
            ctx.measureText((c = serverStats.playersSpect + " spectating")).width
        );
        serverStatCanvas.height = 85;

        ctx.font = '14px Ubuntu';
        ctx.fillStyle = settings.darkTheme ? "#AAAAAA" : "#000000";
        ctx.globalAlpha = 1;
        ctx.fillText(serverStats.name, 2, 16);
        ctx.fillText(serverStats.mode, 2, 32);
        ctx.fillText(a, 2, 48);
        ctx.fillText(b, 2, 64);
        ctx.fillText(c, 2, 80);
    };
    function drawLeaderboard() {
        if (leaderboardType === -1) return;

        if (leaderboard.length === 0 || !settings.showNames) {
            leaderboardCanvas = null;
            return;
        }
        if (!leaderboardCanvas) leaderboardCanvas = document.createElement('canvas');

        var ctx = leaderboardCanvas.getContext('2d'),
            l = leaderboard.length;
            width = leaderboardType !== 50 ? 60 + 24 * l : 240,
            i = 0;

        leaderboardCanvas.width = 200;
        leaderboardCanvas.height = width;

        ctx.globalAlpha = .4;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 200, width);

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "30px Ubuntu";
        ctx.fillText("Leaderboard", 100 - ctx.measureText("Leaderboard").width / 2, 40);

        if (leaderboardType === 0x32) {
            // Pie chart
            ctx.beginPath();
            var last = 0;
            for ( ; i < l; i++) {
                ctx.fillStyle = teamColors[i];
                ctx.moveTo(100, 140);
                ctx.arc(100, 140, 80, last, (last += leaderboard[i] * PI_2), false);
                ctx.fill();
            }
            ctx.closePath();
        } else {
            // Text-based
            var o, me = false, w, start,colors = ['#FF5656','#EC6856','#D97B56','#C68E56','#B3A156','#A1B356','#8EC656','#7BD956','#68EC56','#56FF56','#66FF66','#77FF77','#88FF88','#99FF99','#AAFFAA','#BBFFBB','#CCFFCC','#DDFFDD','#EEFFEE','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF'];
            ctx.font = "20px Ubuntu";
            for ( ; i < l; i++) {
                o = leaderboard[i];
                if (leaderboardType === 0x31) {
                    me = o.me;
                    o = o.name;
                }
                if ( me == 4294967295 ) {
                    ctx.fillStyle = '#428BCA';
                    var start = -20;
                    ctx.fillText(o, start, 75 + 24 * i);
                } else {
                    ctx.fillStyle = me ? "#AAFFFF" : colors[i];
                    o = (i + 1) + ". " + o;
                    var start = ((w = ctx.measureText(o).width) > 200) ? 2 : 100 - w * 0.5;
                    ctx.fillText(o, start, 70 + 24 * i);
                }
            }
        }
    };
    function drawSplitIcon() {
        if (splitIcon.width) {
            var size = ~~ (mainCanvas.width / 7);
            mainCtx.drawImage(splitIcon, mainCanvas.width - size, mainCanvas.height - size, size, size);
        }
        if (splitIcon.width) {
            var size = ~~ (mainCanvas.width / 7);
            mainCtx.drawImage(ejectIcon, mainCanvas.width - size, mainCanvas.height - 2*size-10, size, size);
        }
    };
    function drawGrid() {
        mainCtx.save();
        mainCtx.strokeStyle = settings.darkTheme ? "#AAAAAA" : "#000000";
        mainCtx.globalAlpha = .2;
        var step = 50
            cW = mainCanvas.width / drawZoom, cH = mainCanvas.height / drawZoom,
            startLeft = (-centerX + cW * .5) % step,
            startTop = (-centerY + cH * .5) % step,
            i = startLeft;

        mainCtx.scale(drawZoom, drawZoom);

        // Left -> Right
        for ( ; i < cW; i += step) {
            mainCtx.moveTo(i, -.5);
            mainCtx.lineTo(i, cH);
        }

        // Top -> Bottom
        for (i = startTop; i < cH; i += step) {
            mainCtx.moveTo(-.5, i);
            mainCtx.lineTo(cW, i);
        }
        mainCtx.stroke();
        mainCtx.restore();
    };
    function mapgrid() {
        var gridl = Math.round(border.left) + 40
          , gridt = Math.round(border.top) + 40
          , gridc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'['split']('')
          , gridr = (Math.round(border.right) - 40 - gridl) / 5
          , gridb = (Math.round(border.bottom) - 40 - gridt) / 5;

        mainCtx.save();
        mainCtx.beginPath();
        mainCtx.globalAlpha = 0.2;
        mainCtx.textAlign = 'center';
        mainCtx.textBaseline = 'middle';
        mainCtx.font = 0.6 * gridr + 'px Ubuntu';
        mainCtx.fillStyle = '#428BCA';
        for(var i = 0; 5 > i; i++) {
            for(var n = 0; 5 > n; n++) {
                mainCtx.fillText(gridc[i] + (n + 1), gridl + gridr * n + gridr / 2, gridt + gridb * i + gridb / 2)
            }
        };
        mainCtx.globalAlpha = 1.0;
        mainCtx.lineWidth = 80;
        mainCtx.strokeStyle = settings.darkTheme ? "#1A1A1A" : "#EAEAEA";
        for(i = 0; 5 > i; i++) {
            for(n = 0; 5 > n; n++) {
                mainCtx.strokeRect(gridl + gridr * n, gridt + gridb * i, gridr, gridb)
            }
        };
        mainCtx.stroke();
        mainCtx.restore();
    };
    function drawLoop() {
        drawGame(true);
        window.requestAnimationFrame(drawLoop);
    };
    function drawGame() {
        var dr = Date.now(), passed;
        fps += (1000 / (passed = dr - lastDrawTime) - fps) * .1;
        lastDrawTime = dr;
        isNaN(fps) && (fps = 0);

        var cW = mainCanvas.width = wHandle.innerWidth,
            cH = mainCanvas.height = wHandle.innerHeight,
            cW2 = cW / 2,
            cH2 = cH / 2,
            newDrawZoom = 0,
            viewMult = viewMultiplier(),
            i, l;


        var nodesCopy = nodes.concat(deadNodes);

        drawing = true;

        // Background
        mainCtx.save();
        mainCtx.fillStyle = settings.darkTheme ? "rgba(30,30,30,0.5)" : "rgba(230,230,255,0.8)";
        mainCtx.fillRect(0, 0, cW, cH);
        mainCtx.restore();

        var tx, ty, z1;

        // Grid
        if (settings.showGrid && !settings.qualityRef.overrideGrid) drawGrid();

        // Scale & translate for cell drawing
        mainCtx.translate((tx = cW2 - centerX * drawZoom), (ty = cH2 - centerY * drawZoom));
        mainCtx.scale(drawZoom, drawZoom);

        // Map Grid
        if (settings.showMapGrid) mapgrid();

        // Border
        if (settings.showBorder) {
            mainCtx.strokeStyle = '#FF0000';
            mainCtx.lineWidth = 5;
            mainCtx.lineCap = "round";
            mainCtx.lineJoin = "round";
            mainCtx.beginPath();
            mainCtx.moveTo(border.left,border.top);
            mainCtx.lineTo(border.right,border.top);
            mainCtx.lineTo(border.right,border.bottom);
            mainCtx.lineTo(border.left,border.bottom);
            mainCtx.closePath();
            mainCtx.stroke();
        }

        nodesCopy.sort(nodeSort);

        // Draw cells
        l = nodesCopy.length;
        for (i = 0; i < l; i++) {
            n = nodesCopy[i];
            n.draw(dr);
        }

        // Return back to normal
        mainCtx.scale((z1 = 1 / drawZoom), z1);
        mainCtx.translate(-tx, -ty);

        // Scale with viewMult for readability
        mainCtx.scale(viewMult, viewMult);

        // Score & FPS drawing
        var topText = ~~fps + " FPS",
            topSize = 20 * viewMult,
            PosText = "";
        if (latency !== -1) topText += ", " + latency + "ms ping";
        if (myposx != null) PosText += "X:" + myposx + " / Y:" + myposy;

        mainCtx.fillStyle = settings.darkTheme ? "#FFFFFF" : "#000000";

        if (userScore > 0) {
            var scoreSize = 32 * viewMult;
            mainCtx.font = ~~scoreSize + "px Ubuntu";
            mainCtx.fillText("Score: " + userScore, 2, 32 * viewMult);
            mainCtx.font = ~~topSize + "px Ubuntu";
            mainCtx.fillText(topText, 2, 58 * viewMult);
            mainCtx.fillText(PosText, 2, 178 * viewMult);
            settings.qualityRef.drawStat && serverStatCanvas && mainCtx.drawImage(serverStatCanvas, 2, 60 * viewMult);
        } else {
            mainCtx.font = ~~topSize + "px Ubuntu";
            mainCtx.fillText(topText, 2, 22 * viewMult);
            settings.qualityRef.drawStat && serverStatCanvas && mainCtx.drawImage(serverStatCanvas, 2, 24 * viewMult);
        }
        leaderboardCanvas && mainCtx.drawImage(leaderboardCanvas, cW / viewMult - leaderboardCanvas.width - 10, 10);

        // Chat alpha update
        if (chatMessages.length > 0) if (getChatAlpha() !== 1) drawChat();
        chatCanvas && mainCtx.drawImage(chatCanvas, 10, (cH - 50) / viewMult - chatCanvas.height);

        // Scale back to normal
        mainCtx.scale(viewMult = 1 / viewMult, viewMult);

        // Draw touches
        if(settings.mobile) {
            drawTouch();
            drawSplitIcon();
        }

        drawing = false;

        garbageCollection();
        viewUpdate();
    };
    function viewUpdate() {
        // Zoom, position & score update
        var l = myNodes.length,
            newDrawZoom,
            viewMult = viewMultiplier(),
            newScore = 0;

        if (l > 0) {
            var ncX = 0,
                ncY = 0;
            var rl = 0;
            viewZoom = 0;
            for (i = 0; i < l; i++) {
                n = nodesID[myNodes[i]];
                if (!n) continue;
                viewZoom += n.size;
                newScore += ~~(n.nSize * n.nSize * .01);
                ncX += n.x;
                ncY += n.y;
                rl++;
            }
            //console.log(rl, ncX, ncY);
            if (rl > 0) {
                userScore = Math.max(newScore, userScore);
                if(userScore > stats.score) stats.score = userScore;
                ncX /= rl;
                ncY /= rl;
                centerX += (~~ncX - centerX) * .4;
                centerY += (~~ncY - centerY) * .4;
                viewZoom = Math.pow(Math.min(64 / viewZoom, 1), .4);
                newDrawZoom = viewZoom;
            } else {
                // Cells haven't been added yet
                viewZoom = 1;
                newDrawZoom = 1;
            }
        } else {
            centerX += (_cX - centerX) * .02;
            centerY += (_cY - centerY) * .02;
            newDrawZoom = _cZoom;
        }
        drawZoom += (newDrawZoom * viewMult * mouseZoom - drawZoom) * .11;
    }

    function nodeSort(a, b) {
        return a.size === b.size ? a.id - b.id : a.size - b.size;
    }

    function viewMultiplier() {
        return _viewMult;
    }

    function Cell(id, x, y, size, name, color, skin, time, flags) {
        this.id = id;
        this.x = this.nx = x;
        this.y = this.ny = y;
        this.size = this.nSize = size;
        this.setName(name);
        this.setColor(color);
        this.skin = skin;
        if (flags) {
            this.isEjected = !!(flags & 0x20);
            this.isVirus = !!(flags & 0x01);
            this.isAgitated = !!(flags & 0x10);
            (this.isEjected || this.isVirus || this.isAgitated) && (this.notPellet = true);
        }
        this.birthStamp = this.updateStamp = time;
    };
    Cell.prototype = {
        destroyed: false,
        id: 0,
        x: 0,
        y: 0,
        size: 0,
        name: 0,
        color: "#FFFFFF",
        nameSkin: "",
        skin: "",
        updateStamp: -1,
        birthStamp: -1,
        deathStamp: -1,
        appStamp: -1,
        nx: 0,
        ny: 0,
        ban: 0,
        nSize: 0,
        killer: null,
        rigidPoints: [],
        isEjected: false,
        isPellet: false,
        notPellet: false,
        isVirus: false,
        isAgitated: false,
        strokeColor: "#AAAAAA",
        _nameSize: 0,
        _meCache: null, // If it's a pellet it'll draw from this cache
        _meW: null,
        _meH: null,
        updateAppearance: function(time, dt) {
            if (this.destroyed)
                if (time - this.deathStamp > 200 || !this.killer || this.size < 4) {
                    // Fully remove
                    var i;
                    ((i = deadNodes.indexOf(this)) > -1) && deadNodes.splice(i, 1);
                }
            if (this.killer) {
                this.nx = this.killer.x;
                this.ny = this.killer.y;
                this.nSize = 0;
            }
            this.x += (this.nx - this.x) * dt;
            this.y += (this.ny - this.y) * dt;
            this.size += (this.nSize - this.size) * dt;
            this._nameSize = ~~(Math.max(~~(.3 * this.nSize), 24) / 4) * 4;
        },
        setName: function(name) {
            var reg = /\{([\w]+)\}/.exec(name);
            if (reg) if (reg.length === 2) {
                this.nameSkin = reg[1].toLowerCase();
                this.name = name.replace(reg[0], "").trim();
                return;
            }
            this.name = name;
        },
        setSkin: function(skin) {
            this.skin = skin[0] == "%" ? skin.replace("%", "") : skin;
        },
        setColor: function(color) {
            this.color = color;
            var r = (~~(parseInt(color.substr(1, 2), 16) * 0.9)).toString(16),
                g = (~~(parseInt(color.substr(3, 2), 16) * 0.9)).toString(16),
                b = (~~(parseInt(color.substr(5, 2), 16) * 0.9)).toString(16);
            if (r.length == 1) r = "0" + r;
            if (g.length == 1) g = "0" + g;
            if (b.length == 1) b = "0" + b;
            this.strokeColor = "#" + r + g + b;
        },
        destroy: function(time) {
            delete nodesID[this.id];
            var i;
            ((i = nodes.indexOf(this)) !== -1) && nodes.splice(i, 1);
            ((i = myNodes.indexOf(this.id)) !== -1) && myNodes.splice(i, 1);
            if (i > -1 && myNodes.length === 0) {
                _cX = centerX;
                _cY = centerY;
                _cZoom = viewZoom;
                userScore = 0;
                drawmystats();
            }
            deadNodes.push(this);
            this.deathStamp = time;
            this.destroyed = true;
        },
        updatePoints: function(animated, jagged, dt) {
            // Update points
            var pointAmount = this.size,
                minPointAmount = jagged ? 90 : (this.isPellet ? 8 : 16),
                x = this.x,
                y = this.y,
                maxSizeRemove = this.size * .16,
                i = 0, sz, step, pt, px, py, temp, diff, nDiff;

            !this.isVirus && (pointAmount *= drawZoom);
            this.isEjected && (pointAmount *= .5);
            pointAmount = Math.max(~~pointAmount, minPointAmount);
            jagged && (pointAmount = ~~(pointAmount * .5) * 2);

            step = PI_2 / pointAmount;
            var newPoints = [];
            for ( ; i < pointAmount; i++) {
                var nDiff;
                if (this.rigidPoints[i] && animated) {
                    // Animate the point
                    pt = this.rigidPoints[i];
                    nDiff = pt.newDiff;
                    diff = pt.diff + (nDiff - pt.diff) * dt;
                    if (toleranceCompare(diff, nDiff, .05)) nDiff = getNextDiff(jagged, i, pointAmount, animated);
                } else if (animated) {
                    // New point
                    nDiff = getNextDiff(jagged, i, pointAmount, animated);
                    diff = 0;
                } else {
                    // Non-animated point
                    diff = nDiff = getNextDiff(jagged, i, pointAmount, animated);
                }
                sz = this.size + diff;

                // Calculate position
                var sin = Math.sin(i * step), cos = Math.cos(i * step);
                px = x + sin * sz;
                py = y + cos * sz;

                var cx = 0, cy = 0;
                // Point collision check (doesn't work)
                /*if (qTree) {
                    var id = this.id,
                        dx, dy;
                    qTree.retrieve2(cx, cy, 1, 1, function(a) {
                        if (a.refID !== id && 25 > (cx - a.x) * (cx - a.x) + (cy - a.y) * (cy - a.y)) {
                            console.log('collision')
                        }
                    });
                }*/
                px += cx;
                py += cy;

                // Border check
                if (px < border.left) cx -= sin * Math.min(border.left - px, maxSizeRemove);
                if (px > border.right) cx -= sin * Math.min(px - border.right, maxSizeRemove);
                if (py < border.top) cy -= cos * Math.min(border.top - py, maxSizeRemove);
                if (py > border.bottom) cy -= cos * Math.min(py - border.bottom, maxSizeRemove);
                px += cx;
                py += cy;

                newPoints.push({
                    refID: this.id,
                    size: sz,
                    diff: diff,
                    newDiff: nDiff,
                    x: px,
                    y: py
                });
            }

            this.rigidPoints = newPoints;
        },
        draw: function(time) {
            var dt = Math.min(Math.max((time - this.appStamp) / 120, 0), 1);
            this.updateAppearance(time, dt);
            this.appStamp = time;

            mainCtx.save();

            if(this.isAgitated && settings.qualityRef.smoothRender < 0.5)
                this.drawVirus(this.x,this.y,0.75,( time / 640 ),0);
            else
                this.drawShape(dt);

            // Text drawing
            if (this.notPellet && !this.isVirus) {
                var nameDraw = settings.showNames && this.name !== "" && !this.isVirus;
                if (nameDraw) drawText(this.x, this.y, this.name, this._nameSize, false);

                if (settings.showMass && (myNodes.indexOf(this.id) !== -1 ||
                    (myNodes.length === 0 && settings.qualityRef.drawMassSpectate)) && this.size >= 20) {

                    var text = Math.ceil(this.size * this.size * .01).toString();
                    if (nameDraw)
                        drawText(this.x, this.y + Math.max(this.size * .22, this._nameSize * .8), text, this._nameSize * .5, true);
                    else
                        drawText(this.x, this.y, text, this._nameSize * .5, true);
                }
            }
            mainCtx.restore();
        },
        drawVirus: function(x,y,s,r,k) {
            // Pretty wirly thingy for surprice cells :3 (only if quility is high or higher)
            var ban = 0;
            var a,b,c,px,py,r1,r2,han;
            han=30;
            if(k>2) {
                a=(k*5+200)%360;
                mainCtx.globalCompositeOperation = "lighter";
                mainCtx.fillStyle="hsla("+a+",60%,50%,0.1)";
                mainCtx.beginPath();
                mainCtx.arc(x,y,han*s*2,0,Math.PI*2,0);
                mainCtx.fill();
                mainCtx.globalCompositeOperation = "source-over";
                mainCtx.fillStyle="hsl("+a+",60%,30%)";
                mainCtx.beginPath();
                mainCtx.arc(x,y,han*s,0,Math.PI*2,0);
                mainCtx.fill();
            }
            ban++;
            if(s<0.3)return;
            k++;
            r1=0.87;
            r2=1-r1;
            r+=ban;
            px=Math.cos(r);
            py=Math.sin(r);
            this.drawVirus(x+px*han*r2*s,y+py*han*r2*s,s*r1,r*1.2,k);
            r+=ban;
            px=Math.cos(r);
            py=Math.sin(r);
            r1=0.82;
            this.drawVirus(x+px*han*(1+r1)*s,y+py*han*(1+r1)*s,s*r1,-r,k);
        },
        drawShape: function(dt) {
            var complex = this.wasComplexDrawing = settings.fastRenderMax <= drawZoom,
                jagged = this.isVirus,
                fill = mainCtx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size);

            settings.darkTheme ? mainCtx.globalCompositeOperation = "lighter" : mainCtx.globalCompositeOperation = "luminosity";

            mainCtx.lineWidth = settings.qualityRef.cellOutline ? (this.isEjected ? 0 : this.size > 20 ? Math.max(this.size * .05, 10) : 0) : 0;
            mainCtx.lineCap = "round";
            mainCtx.lineJoin = jagged ? "miter" : "round";

            fill.addColorStop(0, 'rgba(0,0,0,0.4)');
            if(this.isPellet)
                settings.darkTheme ? fill.addColorStop(0, 'rgba(0,0,0,0.6)') : fill.addColorStop(0, 'rgba(255,255,255,0.6)');

            fill.addColorStop(1, this.color);

            mainCtx.fillStyle = settings.showColor ? fill : "#FFFFFF";
            mainCtx.strokeStyle = settings.showColor ? this.strokeColor : "#E5E5E5";

            if (complex || jagged || this.isAgitated) {
                mainCtx.beginPath();
                this.updatePoints(complex, jagged, dt);
                var points = this.rigidPoints;

                mainCtx.moveTo(
                    points[0].x,
                    points[0].y
                );

                for (var i = 1, l = points.length; i < l; i++) {
                    mainCtx.lineTo(
                        points[i].x,
                        points[i].y
                    );
                }

                mainCtx.lineTo(
                    points[0].x,
                    points[0].y
                );
                mainCtx.fill();
                mainCtx.stroke();
                if(!this.isPellet) this.drawSkin();
                mainCtx.closePath();
            } else {
                this.rigidPoints = [];
                if (this._meCache)
                    // Cached drawing exists - use it
                    mainCtx.drawImage(this._meCache, this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
                else {
                    mainCtx.beginPath();
                    mainCtx.arc(this.x, this.y, Math.abs(this.size - mainCtx.lineWidth * 0.5) + 0.5, 0, PI_2, false);
                    mainCtx.fill();
                    settings.qualityRef.cellOutline && mainCtx.stroke();
                    if(!this.isPellet) this.drawSkin();
                    mainCtx.closePath();
                }
            }
        },
        drawSkin: function() {
            if (settings.qualityRef.overrideSkins) return;

            var skin = this.skin || this.nameSkin;

            if (settings.showSkins && skin != '') { // && -1 !== knownSkins.indexOf(skin)) {
                if (skin[0] == '%')skin = skin.substring(1);
                if (!loadedSkins.hasOwnProperty(skin)) {
                    // Download skin
                    loadedSkins[skin] = new Image;
                    loadedSkins[skin].src = SKIN_URL + skin + '.png';
                }
                // Set skin to draw
                if (0 != loadedSkins[skin].width && loadedSkins[skin].complete) {
                    loadedSkins[skin].accessTime = Date.now();
                    mainCtx.save();
                    mainCtx.globalAlpha=0.8;
                    mainCtx.clip();
                    mainCtx.drawImage(loadedSkins[skin], this.x - this.size, this.y - this.size, 2 * this.size, 2 * this.size);
                    mainCtx.restore();
                }
            }
        }
    };
    function toleranceCompare(a, b, t) {
        var d = a - b;
        (d < 0) && (d = -d);
        return d <= t;
    };
    function getNextDiff(jagged, index, pointAmount, animated) {
        if (animated) {
            var maxDiff = jagged ? 3 : 1.7 * .6;
            if (jagged) return (index % 2 === 1 ? -maxDiff : maxDiff) + Math.random() - 1.5;
            return (Math.random() - .5) * maxDiff * 2;
        }
        if (jagged) return index % 2 === 1 ? -3 : 3;
        return 0;
    };

    var textCache = { },massCache = { };

    function timeword(d) {
        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);
        return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
    };
    function drawmystats() {
        // Fill Stats
        var timenow = Date.now();
        document.getElementById('statsTextMass').innerHTML = stats.score;
        document.getElementById('statsTextTime').innerHTML = (timeword((timenow - gamestart) / 1000));
        document.getElementById('statsTextFood').innerHTML = stats.pellet;
        document.getElementById('statsTextCell').innerHTML = stats.cells;
        document.getElementById('statsTextVirus').innerHTML = stats.virus;
        document.getElementById('statsTextPlayer').innerHTML = stats.players;
        $('#advert').show();
    };
    function garbageCollection() {
        var now = Date.now();

        for (var i in textCache) {
            for (var j in textCache[i]) {
                if (now - textCache[i][j].accessTime > 3000) {
                    // Text unused for 3 seconds, delete it to restore memory
                    delete textCache[i][j];
                    if (Object.keys(textCache[i]).length === 0) delete textCache[i]; // Full removal
                }
            }
        }
        for (i in massCache) {
            if (now - massCache[i].accessTime > 3000) {
                // Mass numbers unused for 3 seconds, delete it to restore memory
                delete massCache[i];
            }
        }

        for (var i in loadedSkins) {
            if (now - loadedSkins[i].accessTime > 60000) {
                // Loaded skin image unused for 60 seconds, delete it to restore memory
                delete loadedSkins[i];
            }
        }
    };
    function newTextCache(value, size) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            lineWidth = settings.showTextOutline ? settings.qualityRef.getTextLineWidth(size) : 0;

        // Why set font twice???
        ctx.font = size + 'px Ubuntu';
        canvas.width = ctx.measureText(value).width;
        canvas.height = size * 1.2;
        ctx.font = size + 'px Ubuntu';
        ctx.fillStyle = lineWidth === 0 && !settings.showColor ? "#000000" : "#FFFFFF";
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "#000000";

        (lineWidth > 0) && ctx.strokeText(value, 0, size);
        ctx.fillText(value, 0, size);

        (!textCache[value]) && (textCache[value] = { });
        textCache[value][size] = {
            canvas: canvas,
            accessTime: Date.now()
        };
        return canvas;
    };
    function newMassCache(size) {
        var temp;
        var canvasList = [
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 0
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 1
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 2
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 3
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 4
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 5
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 6
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 7
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 8
                { c: (temp = document.createElement('canvas')), t: temp.getContext('2d'), w: NaN }, // 9
            ],
            i = 0,
            lineWidth = settings.showTextOutline ? settings.qualityRef.getTextLineWidth(size) : 0,
            ctx, canvas, height = size + lineWidth * 5 + 2;

        for ( ; i < 10; i++) {
            canvas = canvasList[i].c;
            ctx = canvasList[i].t;
            ctx.font = size + 'px Ubuntu';
            canvasList[i].w = (canvas.width = ctx.measureText(i).width + lineWidth * 3) - lineWidth * 3;
            canvas.height = height;
            ctx.font = size + 'px Ubuntu';
            ctx.fillStyle = lineWidth === 0 && !settings.showColor ? "#000000" : "#FFFFFF";
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = "#000000";

            (lineWidth > 0) && ctx.strokeText(i, lineWidth, size);
            ctx.fillText(i, lineWidth, size);
        }

        massCache[size] = {
            canvasList: canvasList,
            height: height,
            accessTime: Date.now()
        };

        return massCache[size];
    };
    function findTextMatch(value, size) {
        if (!textCache[value]) return newTextCache(value, size); // No text with equal string

        var tolerance = ~~(size * .1),
            b;

        if ((b = textCache[value][size])) {
            b.accessTime = Date.now();
            return b.canvas;
        }
        var i = 1, j, l;

        // Search with identical sized text
        for ( ; i < tolerance; i++) {
            // Larger than requested text sizes are better if no match is found
            if ((b = textCache[value][size + i])) {
                b.accessTime = Date.now();
                return b.canvas;
            }
            // In any case check for smaller size too
            if ((b = textCache[value][size - i])) {
                b.accessTime = Date.now();
                return b.canvas;
            }
        }

        // No match
        return newTextCache(value, size);
    };
    function findMassMatch(size) {
        if (massCache[size]) {
            massCache[size].accessTime = Date.now();
            return massCache[size];
        }

        var b, tolerance = ~~(size * .1), i = 0;

        // Identical search way as with text
        for ( ; i < tolerance; i++) {
            // Smaller than requested mass sizes are favored now
            if ((b = massCache[size - i])) {
                b.accessTime = Date.now();
                return b;
            }
            if ((b = massCache[size + i])) {
                b.accessTime = Date.now();
                return b;
            }
        }

        // No match
        return newMassCache(size);
    };
    function drawText(x, y, value, size, isMass) {
        if (size > 5000) return; // Integrity check

        var identical;
        if (isMass) {
            identical = findMassMatch(size);
            var str = value.toString(),
                maxW = 0, nowW = 0,
                i = 0,
                currentNumber;
            y -= identical.height * .5;

            // Measure half-width
            for ( ; i < str.length; i++)
                maxW += identical.canvasList[parseInt(str[i])].w;
            x -= maxW * .5;

            // Draw char by char
            for (i = 0; i < str.length; i++) {
                currentNumber = identical.canvasList[parseInt(str[i])];
                mainCtx.drawImage(currentNumber.c, x, y);
                x += currentNumber.w;
            }
        } else {
            identical = findTextMatch(value, size),
                w = identical.width,
                h = identical.height;

            mainCtx.drawImage(identical, x - w * .5, y - h * .5, w, h);
        }
    };
    function buildQTree() {
        if (.4 > drawZoom) qTree = null;
        else {
            var a = Number.POSITIVE_INFINITY,
                b = Number.POSITIVE_INFINITY,
                c = Number.NEGATIVE_INFINITY,
                d = Number.NEGATIVE_INFINITY,
                e = 0,
                f = nodes.length,
                added = [];

            for (var i = 0; i < f; i++) {
                var node = nodes[i];
                if (!node) continue;
                if (node.rigidPoints.length > 0) {
                    e = Math.max(node.size, e);
                    a = Math.min(node.x, a);
                    b = Math.min(node.y, b);
                    c = Math.max(node.x, c);
                    d = Math.max(node.y, d);
                    added.push(node);
                }
            }

            qTree = Quad.init({
                minX: a - (e + 100),
                minY: b - (e + 100),
                maxX: c + (e + 100),
                maxY: d + (e + 100),
                maxChildren: 64,
                maxDepth: 4
            });

            f = added.length;
            for (i = 0; i < c; i++) {
                node = added[i];
                if (!node) continue;
                b = node.rigidPoints.length;
                for (a = 0; a < b; ++a) qTree.insert(node.rigidPoints[a]);
            }
        }
    };
    wHandle.setserver = function(arg) {
        if (CONNECT_TO != arg) {
            Disconnect();
            Connect(CONNECT_TO = arg);
        }
    };
    wHandle.setDarkTheme = function(a) {
        settings.darkTheme = a;
        drawServerStat();
    };
    wHandle.setShowMass = function(a) {
        settings.showMass = a;
    };
    wHandle.setBorder = function(a) {
        settings.showBorder = a;
    };
    wHandle.setMapGrid = function(a) {
        settings.showMapGrid = a;
    };
    wHandle.setSkins = function(a) {
        settings.showSkins = a;
    };
    wHandle.setColors = function(a) {
        settings.showColor = !a;
        if (settings.qualityRef.getTextLineWidth(100) === 0) {
            // Reset caches since if setColors is false all text is black
            textCache = { };
            massCache = { };
        }
    };
    wHandle.setNames = function(a) {
        settings.showNames = a;
        drawLeaderboard();
    };
    wHandle.setSmooth = function(a) {
        settings.fastRenderMax = a ? 0.4 : settings.qualityRef.smoothRender;
    };
    wHandle.setChatHide = function(a) {
        settings.showChat = a;
        drawChat();
    };
    wHandle.setTextOutline = function(a) {
        settings.showTextOutline = !a;
        textCache = { };
        massCache = { };
    };
    wHandle.setQuality = function(a) {
        var b = 'retina';
        if (a == 0) b = 'mobile';
        if (a == 1) b = 'low';
        if (a == 2) b = 'medium';
        if (a == 3) b = 'high';
        $('#range').text(b);
        if (qualitySettings[b] && settings.quality !== b) {
            settings.quality = b;
            settings.qualityRef = qualitySettings[b];
            settings.fastRenderMax = settings.fastRenderMax < 0.3 ? 0.3 : settings.qualityRef.smoothRender;
            textCache = { };
            massCache = { };
        }
    };
    wHandle.closeStats = function (w) {
        $('#advert').hide();
        showESCOverlay();
    };
    wHandle.spectate = function(a) {
        WsSend(UINT8_CACHE[1]);
        userScore = 0;
        hideESCOverlay();
    };
    wHandle.play = function(a) {
        Play(a);
        hideESCOverlay();
    };
    wHandle.openSkinsList = function() {
        if ($('#inPageModalTitle').text() != "Skins") {
            $.get('include/gallery.php').then(function(data) {
                $('#inPageModalTitle').text("Skins");
                $('#inPageModalBody').html(data);
            });
        }
    };
    wHandle.onload = loadInit;
})(window, window.jQuery);
