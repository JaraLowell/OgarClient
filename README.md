# OgarClient
An Simple client compatible with https://github.com/JaraLowell/OgarServ

Created from a fork from https://github.com/Luka967/Cigar

We added a few things and support now to the minimap package
Live working demo @ http://ogar.mivabe.nl

## Project Info
![Language](https://img.shields.io/badge/language-Java-yellow.svg)
![Language](https://img.shields.io/badge/language-PHP-4F5D95.svg)
![Language](https://img.shields.io/badge/language-CSS-563d7c.svg)
![Language](https://img.shields.io/badge/language-MySQL-red.svg)
[![License](https://img.shields.io/badge/license-APACHE2-blue.svg)](https://github.com/JaraLowell/OgarServ/blob/OgarServer/LICENSE)

# The files YOU need to edit:
### index.php
You will need to remove, or use your own ad code from Google AdSense, best ad to use is the `Text/image, 320x100` you can set in My Ads on your Google AdSense Pannel, then use the code it gives you to put in the php file. There two locations you have to update it.


### highscores.php
in here you need to set the MySQL info 

if you wish to use MaxMind GeoIP2 Databases you will need to get those as well. The php files you can find at https://github.com/maxmind/geoip-api-php if i remeber correct you only need to get [geoip.inc](https://raw.githubusercontent.com/maxmind/geoip-api-php/master/src/geoip.inc), [geoipcity.inc](https://raw.githubusercontent.com/maxmind/geoip-api-php/master/src/geoipcity.inc), [geoipregionvars.php](https://raw.githubusercontent.com/maxmind/geoip-api-php/master/src/geoipregionvars.php) and [timezone.php](https://raw.githubusercontent.com/maxmind/geoip-api-php/master/src/timezone.php)

the [GeoLiteCity.dat.gz](http://geolite.maxmind.com/download/geoip/database/GeoLiteCity.dat.gz) file is located at MaxMind. you will need unpack it `gzip -d GeoLiteCity.dat.gz`

For both files it advicable to have them in there own folder not inside the root folder of the game client.

### include/gallery.php
in here you will have to set the skins directory example: /usr/local/www/skins/ so that
the gallery can scan them.

# Good Luck!
## Ask Questions and or sugestions
[Join us on Skype group by clicking this!](https://join.skype.com/bWtHKFC5DhTt)
