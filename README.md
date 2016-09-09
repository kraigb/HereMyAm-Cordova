HereMyAm-Cordova
================

Here My Am! is an app originally written for Windows and the book *Programming Windows Store Apps with HTML, CSS, and JavaScript (Second Edition)* by Kraig Brockschmidt, Microsoft Press, 2014 (free at http://aka.ms/BrockschmidtBook2). This version is  the initial app from that book migrated to Apache Cordova and functional on Windows 8.1, Windows Phone 8.1, Android, and iOS. It accompanies an article in the January 2015 issue of MSDN Magazine.

> Note: this project has been updated for Visual Studio 2015 and current version of the Cordova tools, following the instructions on [Migrate a Cordova project to Visual Studio 2015](http://taco.visualstudio.com/en-us/docs/migrate-to-vs2015/). It was also necessary to remove the original Social Sharing plugin and install the newer version from https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin. The net.yoik.cordova.plugins.screenorientation plugin has also been adopted by Cordova directly, so the project now uses cordova-plugin-screen-orientation from https://github.com/apache/cordova-plugin-screen-orientation. 
> The original Visual Studio 2013 version is in the HereMyAm_VS2013.zip file in this repository.

The article neglects to note how we handle locking to portrait orientation on iOS, because the config.xml setting works only for Android and not Windows or iOS. The article explains a solution for Windows by using custom manifests. For iOS, and this would likely work on Windows as well, we're using the net.yoik.cordova.plugins.screenorientation plugin, which just needs one line of code to make it work:

    screen.lockOrientation && screen.lockOrientation("portrait"); 

This is contained within a function called lockOrientationToPortrait that is called on app startup. The function also checked is screen.msLockOrientation is available and calls that instead.
