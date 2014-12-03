(function () {
    "use strict";
    
    WinJS.Namespace.define("App", {
        configurePlatformSharing: configurePlatformSharing,
        share: share
    });
    
    function configurePlatformSharing() {    
        //Hook up Share charm handler -- WinRT specific
        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener("datarequested", provideData);
    }

    function share() {
        Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
    }

    function provideData(e) {
        var request = e.request;
        var data = request.data;

        if (!App.lastPosition || !App.lastCapture) {
            //Nothing to share, so exit
            return;
        }

        data.properties.title = "Here My Am!";

        var txtLocation = document.getElementById("txtLocation").value;
        data.properties.description = "At " + txtLocation;

        //Doing async, so need to ask for the deferral
        var deferral = request.getDeferral();

        var uri = new Windows.Foundation.Uri(App.lastCapture);
        var storageFile = Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri)
            .done(function (file) {
                //When sharing an image, include a thumbnail 
                var streamReference = Windows.Storage.Streams.RandomAccessStreamReference.createFromFile(file);
                data.properties.thumbnail = streamReference;

                //It's recommended to always use both setBitmap and setStorageItems for sharing a single image 
                //since the target app may only support one or the other.

                //Put the image file in an array and pass it to setStorageItems
                data.setStorageItems([file]);

                //The setBitmap method requires a RandomAccessStream.
                data.setBitmap(streamReference);
                deferral.complete();
            }, function (err) {
                request.failWithDisplayText("Sorry, I'm unable to share the image right now.");
            }
        );    
    }

})();

