"use strict";
var interval_id, is_ticking = false;
function ticker() {
    self.postMessage('tick');
}
self.onmessage = function (event) {
    switch (event.data) {
    case 'start':
        if (!is_ticking) {
            interval_id = setInterval(ticker, 1000 / 60);
            is_ticking = true;
        }
        break;
    case 'stop':
        if (is_ticking) {
            clearInterval(interval_id);
            is_ticking = false;
        }
        break;
    }
};
