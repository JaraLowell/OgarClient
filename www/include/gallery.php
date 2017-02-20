<?php
# Skin directory relative to include/gallery.php (this file) example: /usr/local/www/skins/
$skindir = "";
if($skindir == "") {
    echo "Edit your gallery.php file in the include folder and add your relative path";
    exit();
}

# Skin directory relative to index.html
$skindirhtml = "skins/";

function scan_dir($dir) {
    $ignored = array('.', '..', '.php', '.htaccess', '.html', 'bot.png');
    $files = array();
    foreach (scandir($dir) as $file) {
        if (in_array($file, $ignored)) continue;
        $files[$file] = filemtime($dir . '/' . $file);
    }
    arsort($files);
    $files = array_keys($files);

    return ($files) ? $files : false;
}

echo '<link href="css/gallery.css" rel="stylesheet">
<div class="row center">
    <ul>
';

$images = scan_dir($skindir);
foreach($images as $curimg) {
    if (strtolower(pathinfo($curimg, PATHINFO_EXTENSION)) == "png") {

?>
        <li class="skin" onclick="setSkin($(this).find('.title').text());" data-dismiss="modal">
            <div class="circular" style='background-image: url("../<?php echo $skindirhtml.$curimg ?>")'></div>
            <h4 class="title"><?php echo pathinfo($curimg, PATHINFO_FILENAME); ?></h4>
        </li>
<?php

    }
}
echo '    </ul>
</div>
';
