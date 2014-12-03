(function () {
    "use strict";
    
    WinJS.Namespace.define("App", {
        configurePlatformSharing: function () { },
        share: share        
    });

    function share() {
        //Button should be disabled if there's no capture
        if (!App.lastCapture) {
            return;
        }

        var txtLocation = document.getElementById("txtLocation").value;
        plugins.socialsharing.share("At " + txtLocation, "Here My Am!", App.lastCapture);
    }
})();
