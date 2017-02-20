<?php
$config = [
    // MySQL Config host, usualy localhost, name is the database, example agario. user and password from mysql
    'db' => [
        'host' => '',
        'name' => 'mysql_database',
        'user' => 'mysql_user',
        'pass' => 'mysql_password',
    ],
    // GeoIP info, if you want flags in front the user name. Also get a folder with flag textures to go with it.
    // geoippath = is the folder where the geoipcity.inc and geoipregionvars.php file is. example /usr/local/www
    // goipdat = location of the GeoLiteCity.dat file example /usr/local/www/GeoLiteCity.dat
    'geoippath' => '',
    'goipdat' => ''
];

if($config['db']['host'] == '') {
    echo "Edit your hihhscores.php file<br>";
    echo "and set the MySQL config information";
    exit();
}

$db = new PDO("mysql:host={$config['db']['host']};dbname={$config['db']['name']}", $config['db']['user'], $config['db']['pass'], [PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ]);
$db->query("SET NAMES 'utf8mb4'");
$scolors = ['#FF5656','#EC6856','#D97B56','#C68E56','#B3A156','#A1B356','#8EC656','#7BD956','#68EC56','#56FF56','#66FF66','#77FF77','#88FF88','#99FF99','#AAFFAA','#BBFFBB','#CCFFCC','#DDFFDD','#EEFFEE','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF'];

$gi = '';
if ($config['geoippath'] != '' && file_exists($config['geoippath'].'/geoipcity.inc')) {
    include($config['geoippath']."/geoipcity.inc");
    include($config['geoippath']."/geoipregionvars.php");
    $gi = geoip_open($config['goipdat'],GEOIP_MEMORY_CACHE);
}

echo '
<div class="form-group">
    <script type="text/javascript">
        $(document).ready(function(){
            $("#rank_today").click(function() {
                $("#scorealltime").css("display","none");
                $("#scoretoday").css("display","block");
            });
            $("#rank_all").click(function(){
                $("#scorealltime").css("display","block");.
                $("#scoretoday").css("display","none");.
            });
            getStatus();
        });

        function getStatus() {
            var d = new Date();
            var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
            var currentTime = new Date(utc + (3600000*-8));
            var currentHours = currentTime.getHours ( );
            var currentMinutes = currentTime.getMinutes ( );
            currentMinutes = ( currentMinutes < 10 ? "0" : "" ) + currentMinutes;
            var timeOfDay = ( currentHours < 12 ) ? "AM" : "PM";
            currentHours = ( currentHours > 12 ) ? currentHours - 12 : currentHours;
            currentHours = ( currentHours == 0 ) ? 12 : currentHours;
            var currentTimeString = currentHours + ":" + currentMinutes + " " + timeOfDay + " PST";

            $("#clock").html(currentTimeString);
            setTimeout("getStatus()",10000);
        };
    </script>

    <div style="text-align:center;">
        <a href="javascript:;" id="rank_today" class="scorelist_btn btn btn-xs btn-primary" style="padding: 1px 5px;font-size: 12px;line-height: 1.5;border-radius: 3px;">Today</a>
        <a href="javascript:;" id="rank_all" class="scorelist_btn btn btn-xs btn-danger" style="padding: 1px 5px;font-size: 12px;line-height: 1.5;border-radius: 3px;">All Times</a>
    </div>

    <span class="scoretable" id="scoretoday" style="display: block">
        <center><h3 id="title">'.date("l").'s Top 20</h3>
        <span id="clock"></span></center>
';

$score = $db->query('SELECT *, TIMESTAMPDIFF( MINUTE , CURRENT_TIMESTAMP( ) , `lastseen` ) AS online FROM score WHERE `ip`!="BOT" AND DATE(`lastseen`) = CURDATE() ORDER BY `score` DESC LIMIT 0,20')->fetchAll();
$count = 0;

echo '        <table style="width:100%;opacity: 0.6;border:0px solid black;border-collapse:collapse;padding: 0px; font-size: 12px; color: #D1C39C;">
            <tr><th style="width:20px;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">#</th><th style="width:60%;text-align:left;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">Name</th><th style="width:20%px;text-align:right;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">Score</th></tr>
';
foreach($score as $region):
    if ( $region->name != "" )
    {
        $mycolor = $scolors[$count];
        $count++;

        echo "            <tr style=\"background-color: #000; color: ".$mycolor.";\"><td style=\"border-bottom: 1px solid rgba(36, 51, 66, 0.9);\">".$count."</td><td style=\"text-align:left;border-bottom: 1px solid rgba(36, 51, 66, 0.9);\">";

        if( $gi != '' ) {
            if( filter_var( $region->ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE ))
            {
                $record = geoip_record_by_addr($gi,$region->ip);
                if ( file_exists('flags/'.strtoupper($record->country_code).'.png') )
                {
                    $city = "Unknown";
                    if ( $record->country_name != "" )
                    {
                        $city = $record->country_name;
                        if ( $record->city != "" ) $city = $city." ".$record->city;
                    }
                    $flag = "<img src=\"flags/".strtoupper($record->country_code).".png\" style=\"vertical-align: text-top;\" width=\"16px\" border=\"0px\" alt=\"".$city."\"> ";
                }
                else $flag = "<img src=\"flags/_unknown.png\" width=\"16px\" border=\"0px\" alt=\"Unknown\"> ";
            } else $flag = "<img src=\"flags/_unknown.png\" width=\"16px\" border=\"0px\" alt=\"Unknown\"> ";
            echo $flag;
        }

        $utf8 = mb_convert_encoding($region->name, 'UTF-8', mb_detect_encoding($region->name));
        $utf8 = htmlspecialchars($utf8, ENT_NOQUOTES, 'UTF-8');
        echo $utf8;
        echo "</td><td style=\"text-align:right;border-bottom: 1px solid rgba(36, 51, 66, 0.9);\">".number_format($region->score,0,",",",");
        echo "</td></tr>\n";
    }
endforeach;

if ( $count <= 19 ) {
    do {
        $count++;
        echo "            <tr><td style=\"border-bottom: 1px solid rgba(36, 51, 66, 0.9);\" colspan=3>&nbsp</td></tr>\n";
    } while ( $count <= 19 );
}
echo '        </table>
    </span>
    <span class="scoretable" id="scorealltime" style="display: none">
        <center><h3 id="title">All Time Top 10</h3><br>
        </center>
';

$score = $db->query('SELECT *, TIMESTAMPDIFF( MINUTE , CURRENT_TIMESTAMP( ) , `lastseen` ) AS online FROM scoreall WHERE `ip`!="BOT" AND TIMESTAMPDIFF( DAY , CURRENT_TIMESTAMP( ) , `lastseen` ) > -7 ORDER BY `score` DESC LIMIT 0,20')->fetchAll();
$count = 0;

echo '        <table style="width:100%;opacity: 0.6;border-collapse:collapse;padding: 0px; font-size:12px;color: #D1C39C;">
            <tr><th style="width:20px;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">#</th><th style="width:60%;text-align:left;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">Name</th><th style="width:20%px;text-align:right;border-bottom: 1px solid rgba(36, 51, 66, 0.9);">Score</th></tr>
';
foreach($score as $region):
    if ( $region->name != "" )
    {
        $mycolor = $scolors[$count];
        $count++;
        $ifimg = "";
        $ifimgtr = " style=\"background-color: #000; color: ".$mycolor.";\"";
        $ifimgtd = "";
        if($region->skin != "") {
            $ifimgtr = " style=\"background-image: url('../skins/".$region->skin.".png'); background-size: 100px 60px; background-repeat: no-repeat; background-position: 21px 50%;background-color: #000; color: ".$mycolor.";\"";
            $ifimgtd = "background: -webkit-linear-gradient(left, rgba(0,0,0,1.0) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 35%, rgba(0,0,0,1.0) 55% );text-shadow: 0 0 0.3em #000, 0 0 0.3em #000, 0 0 0.3em #000;";
        }

        echo "            <tr".$ifimgtr."><td style=\"border-bottom: 1px solid rgba(36, 51, 66, 0.9);\">".$count."</td><td style=\"background-color: #000;text-align:left;border-bottom: 1px solid rgba(36, 51, 66, 0.9);".$ifimgtd."\">";

        if( $gi != '' ) {
            if( filter_var( $region->ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE ))
            {
                $record = geoip_record_by_addr($gi,$region->ip);
                if ( file_exists('flags/'.strtoupper($record->country_code).'.png') )
                {
                    $city = "Unknown";
                    if ( $record->country_name != "" )
                    {
                        $city = $record->country_name;
                        if ( $record->city != "" ) $city = $city." ".$record->city;
                    }
                    $flag = "<img src=\"flags/".strtoupper($record->country_code).".png\" style=\"vertical-align: text-top;\" width=\"16px\" border=\"0px\" alt=\"".$city."\"> ";
                }
                else $flag = "<img src=\"flags/_unknown.png\" width=\"16px\" border=\"0px\" alt=\"Unknown\"> ";
            } else $flag = "<img src=\"flags/_unknown.png\" width=\"16px\" border=\"0px\" alt=\"Unknown\"> ";

            echo $flag;
        }

        $utf8 = mb_convert_encoding($region->name, 'UTF-8', mb_detect_encoding($region->name));
        $utf8 = htmlspecialchars($utf8, ENT_NOQUOTES, 'UTF-8');
        echo $utf8;
        echo "</td><td style=\"text-align:right;border-bottom: 1px solid rgba(36, 51, 66, 0.9);background-color: #000\">".number_format($region->score,0,",",",");
        echo "</td></tr>\n";
    }
endforeach;

if ( $count <= 19 ) {
    do {
        $count++;
        echo "            <tr><td style=\"border-bottom: 1px solid rgba(36, 51, 66, 0.9);\" colspan=3>&nbsp</td></tr>\n";
    } while ( $count <= 19 );
}
echo "        </table>\n";
echo "    </span>\n";
echo "    <font size=\"-2\" color=\"#777\">Top 20 Only when playing on Ogar.MivaBe.nl<br>Updates every five min</font>\n";
echo "</div>\n";

exit();
?>
