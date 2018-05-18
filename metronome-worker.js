/*global self*/
(function metronomeWorkerSetup() {
    "use strict";
    var interval_id, is_ticking = false, adjusted_tempo = 60, update_interval = false;
    function ticker() {
        self.postMessage("tick");
        if (update_interval) {
            clearInterval(interval_id);
            interval_id = setInterval(ticker, 60000 / adjusted_tempo);
            update_interval = false;
        }
    }
    self.onmessage = function (event) {
        var data = event.data;
        switch (data) {
        case "start":
            if (!is_ticking) {
                interval_id = setInterval(ticker, 60000 / adjusted_tempo);
                is_ticking = true;
            }
            break;
        case "stop":
            if (is_ticking) {
                clearInterval(interval_id);
                is_ticking = false;
                update_interval = false;
            }
            break;
        default:
            //if (typeof data === "number") {
                adjusted_tempo = Number(data);
                if (is_ticking) {
                    update_interval = true;
                }
            //}
        }
    };
}());