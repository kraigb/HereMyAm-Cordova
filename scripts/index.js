// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console. Note that doing so will not reload
// any changes you've made to source files. To apply changes it's necessary to stop the emulator and rebuild.

(function () {
    "use strict";
    
    //Set up WinJS.logging
    WinJS.Utilities.startLog("app");

    //WinJS namespaces are a convenient way to keep code modularized and
    //related variables scoped together.
    WinJS.Namespace.define("App", {
        hasInitialized: false,
        domLoaded: false,
        deviceReady: false,
        lastCapture: null,
        lastPosition: null,
    });

    //deviceready is Cordova's event that tells us when we're up and running, typically after DOMContentLoaded.
    //When debugging remotely over a network, however, it's possible the DOMContentLoaded fires after
    //deviceready, meaning that getElementById calls will inside deviceready. The code below works around this
    //by separating initialization code to a separate function and calling it from whichever event fires last.
    
    document.addEventListener('deviceready', onDeviceReady.bind(this), false);
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded.bind(this), false);

    function onDOMContentLoaded() {
        App.domLoaded = true;

        if (App.deviceReady) {
            initialize();
        }
    }

    function onDeviceReady() {
        App.deviceReady = true;

        if (App.domLoaded) {
            initialize();
        }
    }

    function initialize() {
        if (App.hasInitialized) {
            return;
        }

        App.hasInitialized = true;

        //If the viewport changes size, reset the captured photo to preserve aspect ratio
        window.addEventListener("resize", scalePhoto);

        //Create the initial message to display in the photo area, and wire up to camera capture
        setPlaceholderImage();
        document.getElementById("photo").addEventListener("click", capturePhoto.bind(photo));
        
        //Initialize the location field and wire up the locate button
        locate();
        document.getElementById("btnLocate").addEventListener("click", locate);
        
        lockOrientationToPortrait();

        //We want to use the Share charm on Windows, which takes different wiring. We could do this
        //within the plugin, but because Windows has a native JS host it's very simple to just
        //implement the platform-specific behavior in merges/windows/scripts/share.js. In that case,
        //App.configrePlatformSharing isn't just an empty function.    
        
        App.configurePlatformSharing();
        document.getElementById("btnShare").addEventListener("click", App.share);
        

        //Note: if we persisted app state, check App.lastPosition here and update from that information.
        //As it is, this version of the app doesn't manage state.        
    };
    

    function lockOrientationToPortrait() {
        //For Android, the setting in config.xml works by itself.
        //
        //For iOS, we're using the net.yoik.cordova.plugins.screenorientation plugin, which gives us
        //the screen.lockOrientation method, the same as HTML5, and the plugin defers to HTML5 if available.
        //
        //On Windows 8 there is an ms-prefixed variant, so we'll check for that and use it if available.
        //We could encapsulate this logic in the plugin if we wanted.
        if (screen.msLockOrientation) {
            screen.msLockOrientation("portrait");
        } else {
            screen.lockOrientation && screen.lockOrientation("portrait");  
        }        
    }

    
    function locate() {
        //This is a synchronous call--will the UI remain responsive if it times out?        
        //Make it a promise?
        navigator.geolocation.getCurrentPosition(function (position) {
            //Save for share; the default address string just has the coordinates if we can't get a text address
            //from the Bing Maps web API.
            App.lastPosition = {
                latitude: position.coords.latitude, longitude: position.coords.longitude,
                address: "(" + position.coords.latitude + ", " + position.coords.longitude + ")"
            };

            //Go translate the coordinates into an address using the Bing Map web API
            updatePosition();
        }, function (error) {
            WinJS.log && WinJS.log("Unable to get location: " + error.message, "app");
        }, {
            maximumAge: 3000, timeout: 10000, enableHighAccuracy: true
        });
    }


    function updatePosition() {
        //Attempt to get a formatted address from Bing Maps.
        //NOTE: visit <TODO: site> to obtain your own Bing Maps API key.
        var apiKey = "AhTTNOioICXvPRPUdr0_NAYWj64MuGK2msfRendz_fL9B1U6LGDymy2OhbGj7vhA";
        var url = "http://dev.virtualearth.net/REST/v1/Locations/" + App.lastPosition.latitude + ","
            + App.lastPosition.longitude + "?o=json&key=" + apiKey;

        var locationOutput = document.getElementById("txtLocation");

        //Invoke the web API--WinJS.xhr wraps XMLHttpRequest into a promise. If this call fails,
        //App.lastPosition.address has the default location string already containing just the coordinates.
        WinJS.xhr({
            url: url,            
        }).done(function (result) {
            if (result.responseText) {
                var response = JSON.parse(result.responseText);
                var address = null;

                //Dig down into the JSON response for the address, checking that there's data
                //every step of the way.
                address = response && response.resourceSets && response.resourceSets[0]
                    && response.resourceSets[0].resources && response.resourceSets[0].resources[0]
                    && response.resourceSets[0].resources[0].address.formattedAddress;

                if (address != null && App.lastPosition != null) {
                    App.lastPosition.address = address;
                }
            }
                        
            locationOutput.value = App.lastPosition.address;
        }, function (e) {
            WinJS.log && WinJS.log("Request to Bing Maps failed, using coordinates directly", "app");
            if (App.lastPosition != null) {
                locationOutput.value = App.lastPosition.address;
            }
        });
    }


    function capturePhoto() {
        var photoDiv = this; 
        
        //Capture camera image into a file        
        navigator.camera.getPicture(cameraSuccess, cameraError, {
            quality: 50,
            destinationType: Camera.DestinationType.FILE_URL,
            encodingType: Camera.EncodingType.JPEG,
            mediaType: Camera.MediaType.PICTURE,
            allowEdit: true,
            correctOrientation: true  //Corrects Android orientation quirks
        });

        function cameraSuccess(imageFile) {            
            //Save for share and enable Share button
            App.lastCapture = imageFile;
            document.getElementById("btnShare").disabled = false;

            //Do letterboxing and assign to img.src
            scaleImageToFit(photoDiv.querySelector("img"), photoDiv, App.lastCapture);
        };

        function cameraError(error) {
            WinJS.log && WinJS.log("Unable to obtain picture: " + error, "app");
        };
    }


    function setPlaceholderImage() {
        //Ignore if we have an image (as when rehydrating)
        if (App.lastCapture != null) {
            return;
        }
        
        var photo = document.getElementById("photo");
        var canvas = document.createElement("canvas");
        canvas.width = photo.clientWidth;

        var height = photoHeight();
        canvas.height = height;
        photo.style.height = height + "px";
        
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#7f7f7f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";

        //Use the height of the photoSection heading for the font
        var fontSize = document.getElementById("photoSection").querySelector("h3").clientHeight;
        ctx.font = "normal " + fontSize + "px 'Arial'";
        ctx.textAlign = "center";
        ctx.fillText("Tap to capture photo", canvas.width / 2, canvas.height / 2);

        var img = photo.querySelector("img");        
        img.src = canvas.toDataURL();
    }


    function scaleImageToFit(imgElement, parentDiv, imageUri) {
        //To handle size differences between the image size and the display area, set the scaling
        //to 100% width if the aspect ratio of the image is greater than that of the element, or to
        //100% height if the opposite is true. The captured image size is in captureInfo.
        
        //Create an intermediary so we can determine the image's size.
        var imgHolder = new Image();
        imgHolder.src = imageUri;

        //We rely on flexbox packing characteristics to center the image within parentDiv
        var ratio;

        //Different platforms (Android, seemingly) may or may not get the Image object initialized without
        //yielding to the UI thread, so we do that yield here.
        setTimeout(function () {
            var scaleToWidth = (imgHolder.naturalWidth / imgHolder.naturalHeight > parentDiv.clientWidth / parentDiv.clientHeight);

            if (scaleToWidth) {
                imgElement.style.width = "100%";
                ratio = parentDiv.clientWidth / imgHolder.naturalWidth;
                imgElement.style.height = Math.round(imgHolder.naturalHeight * ratio) + "px";
            } else {
                imgElement.style.height = "100%";
                ratio = parentDiv.clientHeight / imgHolder.naturalHeight;
                imgElement.style.width = Math.round(imgHolder.naturalWidth * ratio) + "px";
            }

            //On Windows we'd use StorageFile.getScaledImageAsThumbnailAsync for more efficient
            //memory usage. Generically, we just have to set the imgElement.src directly with the URI
            //and call it good. If we found serious memory issues on a particular platform, it might
            //be an instance where we'd use platform-specific code.
            imgElement.src = imageUri;
        }, 0);
    }


    //window.onresize event handler
    function scalePhoto() {
        //Reset photo element height
        var photo = document.getElementById("photo");
        photo.style.height = photoHeight() + "px"
        
        var photoImg = document.getElementById("photoImg");

        //Make sure we have an img element
        if (photoImg == null) {
            return;
        }

        //If we have an image, scale it, otherwise regenerate the placeholder
        if (App.lastCapture != null) {
            scaleImageToFit(photoImg, document.getElementById("photo"), App.lastCapture);
        } else {
            setPlaceholderImage();
        }
    }

    function photoHeight() {
        //Determining the height of the photo element is iffy across platforms, so we'll calculate it if it comes back zero.        
        var photo = document.getElementById("photo");

        if (photo.clientHeight == 0) {
            return photo.parentElement.clientHeight - document.getElementById("photoHeading").clientHeight - 16;
        } else {
            return photo.clientHeight;
        }        
    }
} )();