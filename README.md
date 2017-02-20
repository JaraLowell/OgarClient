# OgarClient
An Simple client compatible with https://github.com/JaraLowell/OgarServ

Created from a fork from https://github.com/Luka967/Cigar

We added a few things and support now to the minimap package
Live working demo @ http://ogar.mivabe.nl/prot6/

# The files YOU need to edit:
### index.php
You will need to remove, or use your own ad code from Google AdSense, best ad to use is the `Text/image, 320x100` you can set in My Ads on your Google AdSense Pannel, then use the code it gives you to put in the php file. There two locations you have to update it.


### highscores.php
in here you need to set the MySQL info 

if you wish to use MaxMind GeoIP2 Databases you will need to get those as well. The php files you can find at https://github.com/maxmind/geoip-api-php 

the dat file is located at http://geolite.maxmind.com/download/geoip/database/GeoLiteCity.dat.gz

For both files it advicable to have them in there own folder not inside the root folder of the game client.

### include/gallery.php
in here you will have to set the skins directory example: /usr/local/www/skins/ so that
the gallery can scan them.

# Good Luck!
