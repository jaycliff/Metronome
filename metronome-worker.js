"use strict";
var interval_id, is_ticking = false, sps = 60;
function ticker() {
    self.postMessage('tick');
}
self.onmessage = function (event) {
    var data = event.data;
    switch (data) {
    case 'start':
        if (!is_ticking) {
            interval_id = setInterval(ticker, 1000 / sps);
            is_ticking = true;
        }
        break;
    case 'stop':
        if (is_ticking) {
            clearInterval(interval_id);
            is_ticking = false;
        }
        break;
    default:
        if (typeof data === "number") {
            sps = data;
        }
    }
};