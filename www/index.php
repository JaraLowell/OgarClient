<?php
header('Last-Modified: '. gmdate("D, d M Y H:i:s").' GMT');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Content-Type: text/html;charset=utf-8');
date_default_timezone_set('America/Los_Angeles');
error_reporting(0);
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Eat cells smaller than you and don't get eaten by the bigger ones, as an MMO">
    <meta name="keywords" content="agario, agar, io, cell, cells, virus, bacteria, blob, game, games, web game, html5, fun, flash">
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="minimal-ui, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">

    <title>OgarServ</title>

    <link href='https://fonts.googleapis.com/css?family=Ubuntu:700' rel='stylesheet' type='text/css'>
    <link href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css' rel='stylesheet'>
    <link href='css/default.css' rel='stylesheet' type='text/css'>

    <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>
    <script src="js/log.js"></script>
    <script src="js/reader.js"></script>
    <script src="js/writer.js"></script>
    <script src="js/vtr.js"></script>
    <script src="js/quad.js"></script>
    <script src="js/gameclient.js?v70215"></script>
    <script src="js/shw14.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>
</head>

<body>
    <div class="modal fade" id="inPageModal" role="dialog">
        <div class="modal-dialog" style="width:650px">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 id="inPageModalTitle" class="modal-title">Failed to Load</h4>
                </div>
                <div id="inPageModalBody" class="modal-body">
                    <p>Failed to load. Please check your connection!</p>
                    <div class="center">
                        <div class="loader"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    <div id="overlays">
        <div id="helloDialog">
            <form role="form">
                <div class="form-group" style="text-align: center;">
                    <h2 id="title">OgarServ 1.7 Client</h2>
                </div>

                <div class="form-group">
                    <input id="nick" class="form-control save" data-box-id="0" placeholder="Nick" maxlength="15" />
                    <input id="myskin" class="form-control save" data-box-id="50" type="hidden" />
                    <select id="gamemode" class="form-control" onchange="setserver($(this).val());" required>
                        <option selected disabled>Gamemode:</option>
<?php
$serverip = $_GET['ip'];
if( $serverip != '' )
{
    echo '                        <option value="'.$serverip.'">'.substr($serverip,0,strpos($serverip,":")).'</option>
';
}
?>
                        <option value="ogar.mivabe.nl:44411">Test Server</option>
                    </select>
                    <br clear="both" />
                </div>

                <div class="form-group">
                    <div class="mb-10">
                        <a data-toggle="modal" data-target="#inPageModal" onclick="openSkinsList();" class="btn-primary btn btn-info" role="button" style="width: 100%;">Skins Gallery</a>
                    </div>

                    <button type="button" id="play-btn" onclick="play(document.getElementById('nick').value); return false;" class="btn btn-play btn-primary btn-needs-server">Play</button>
                    <button onclick="$('#settings, #instructions').toggle(); return false;" class="btn btn-info btn-settings" id="settings-btn"><i class="glyphicon glyphicon-cog"></i></button>
                    <br clear="both" />
                </div>

                <div id="settings" class="checkbox" style=" display:none;">
                    <div class="form-group" id="mainform">
                        <button id="spectate-btn" onclick="spectate(); return false;" style="width: 100%" class="btn btn-warning btn-spectate btn-needs-server">Spectate
                        </button>
                        <br clear="both" />
                    </div>
                    <div style="margin: 6px; width: 95%;">
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="1" onchange="setSkins(!$(this).is(':checked'));"> No skins</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="2" onchange="setNames(!$(this).is(':checked'));"> No names</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="3" onchange="setDarkTheme($(this).is(':checked'));" checked> Dark Theme</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="4" onchange="setColors($(this).is(':checked'));"> No colors</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="5" onchange="setChatHide($(this).is(':checked'));" checked> Show Chat</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="6" onchange="setSmooth($(this).is(':checked'));" checked> Smooth FPS</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="7" onchange="setBorder($(this).is(':checked'));" checked> Border</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="8" onchange="setMapGrid($(this).is(':checked'));" checked> Map Grid</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="9" onchange="setKillsInfo($(this).is(':checked'));" checked> Kill Info</label>
                        <label style="width:45%">
                            <input type="checkbox" class="save" data-box-id="10" onchange="setDrawAlpha($(this).is(':checked'));" checked> Cells Alpha</label>
                        <label style="width:95%">
                            <br>Draw quality <span id="range">high</span><input type="range" min="0" max="4" value="3" step="1" onchange="setQuality($(this).val())"></label>
                    </div>
                </div>
            </form>

            <div id="instructions">
                <hr/>
                <center>
                    <span class="text-muted">
                        Move your mouse to control your cell<br/>
                        Press <b>Space</b> to split<br/>
                        Press <b>Q</b> to eject mass<br/>
                        Press <b>Z</b> to do a tricksplit<br/>
                        Press <b>E</b> to split your minion<br/>
                        Press <b>R</b> to make your minion eject mass<br/>
                        Press <b>T</b> to start or stop your minion eating<br/>
                        Press <b>SHIFT</b> to tricksplit with your minion<br/>
                    </span>
                </center>
            </div>
            <hr/>
            <span id="jversion" class="footer"></span>

            <!-- // Gameplay Window // -->
            <div id="about" class="form-group" style="position:absolute; top: 50%;left:550px;width:350px;">
                <div class="form-group">
                    <div class="form-group" style="text-align: center;"><h2 id="title">Gameplay</h2></div>
                    <div class="form-group">
                        <span class="text-muted"><font style="font-size:0.9em">The objective of the game is to grow a cell, a circular player-controlled object, by swallowing both pellets and smaller cells without being swallowed by bigger cells. It can be played in a deathmatch or between teams. There is no set goal; players restart when all of their cells are swallowed.<br><br>The game contains three entities: pellets, cells and viruses:<br><br><b>Pellets</b>, or food, are randomly scattered among the map. When swallowed, they slightly increase a cells mass.<br><br><b>Cells</b> are controlled by players. Only opponent cells that are smaller can be swallowed; they can be swallowed directly, or by splitting, as described below. Cells move slower with heavier mass and gradually lose mass over time.<br><br><b>Viruses</b> split larger cells into many pieces. Smaller cells can hide behind them for protection against larger cells. They can be fed to create another virus launched at a direction the player chooses.<br><br>Players can split a part of their cell, flinging one of the divided cells at the direction of the cursor. This can be used as a ranged attack to swallow other cells, to escape from a difficult situation, or to move more quickly around the map. Split cells eventually merge into one. Players can also release a small fraction of their mass to grow other cells or to feed viruses, which splits them when done several times.</font></span>
                    </div>
                </div>
                <br clear="all">
            </div>

            <!-- // News Window // -->
            <div id="news" class="form-group" style="position:absolute; top:50%;left:-192px;width:350px;">
                <div class="form-group">
                    <div class="form-group" style="text-align: center;"><h2 id="title">News</h2></div>
                    <div class="form-group">
                        <span class="text-muted"><font style="font-size:0.9em">Master Server is Live!, visit it here at <a href="http://ogar.mivabe.nl/master" target="_blank">Ogar Tracker</a><br>
                        <br><hr>
                        This client needs OgarServ version 1.7 or higher, you can get the server on <a href="https://github.com/JaraLowell/OgarServ" target="_blank">GitHub</a>
                        <br><hr>
                        We now have version 7.0215 live, we updated some things in this, when now sellecting a lower quality the skin images will also will degrade, or more we disable image smoothing this is by default on but now with slider it can be turned off for more FPS.
                        </font></span>
                    </div>
                </div>
                <br clear="all">
            </div>

        </div>
    </div>

    <div id="connecting">
        <div style="width: 350px; background-color: #FFFFFF; margin: 100px auto; border-radius: 15px; padding: 5px 15px 5px 15px;">
            <h2>Connecting</h2>
            <p> If you cannot connect to the servers, check if you have some anti virus or firewall blocking the connection.</p>
        </div>
    </div>

    <!-- // Advertizment Area when you die // -->
    <div id="advert">
        <div id="scorebox" style="height:380px">
            <div id="stats" style="width: 100%; height: 230px; padding: 0px 0px 300px; overflow: hidden;" class="agario-panel">
                <canvas height="230" width="320" id="statsGraph"></canvas>
                <div id="statsHighestMassContainer"><span id="statsTextMass" class="stats-highest-mass"></span><span id="statsSubtext" data-itr="stats_highest_mass">Highest mass</span></div>
                <div id="statsTimeAliveContainer"><span id="statsTextTime" class="stats-time-alive"></span><span id="statsSubtext" data-itr="stats_time_alive">Time alive</span></div>
                <div id="statsPelletsContainer"><span id="statsTextFood" class="stats-highest-mass"></span><span id="statsSubtext" data-itr="stats_pellets_eat">Pellets eaten</span></div>
                <div id="statsCellsEatenContainer"><span id="statsTextCell" class="stats-time-alive"></span><span id="statsSubtext" data-itr="stats_cell_eat">Cells eaten</span></div>
                <div id="statsVirusContainer"><span id="statsTextVirus" class="stats-highest-mass"></span><span id="statsSubtext" data-itr="stats_virus_eat">Virus eaten</span></div>
                <div id="statsPlayerContainer"><span id="statsTextPlayer" class="stats-time-alive"></span><span id="statsSubtext" data-itr="stats_players_eat">Players eaten</span></div>
            </div>
            <center>
                <button id="statsContinue" class="btn btn-primary" data-itr="continue" onclick="closeStats();" style="opacity: 0.85;">Continue</button>
            </center>
        </div>
    </div>

    <canvas id="canvas" width="800" height="600"></canvas>
    <div id="livekills"></div>
    <input type="text" id="chat_textbox" placeholder="Press enter to chat!" maxlength="200" />
<script>
//Hold a down and it will keep firing untill you take your finger off!
var interval;
var switchy = false;
$(document).on('keydown',function(e){
    if(e.keyCode == 81){
        if(switchy){
            return;
        }
        switchy = true;
        interval = setInterval(function() {
            $("body").trigger($.Event("keydown", { keyCode: 87}));
            $("body").trigger($.Event("keyup", { keyCode: 87}));
        }, 3);//increase this number to make it fire them out slower
    }
});

$(document).on('keyup',function(e){
    if(e.keyCode == 81){
        switchy = false;
        clearInterval(interval);
        return;
    }
});
</script>
</body>
</html>
