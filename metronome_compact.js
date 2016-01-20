/*
    Copyright 2016 Jaycliff Arcilla
    
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        
        http://www.apache.org/licenses/LICENSE-2.0
        
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/*jshint bitwise: false*/
/*global window, console, Worker*/

var Metronome;
if (typeof Array.prototype.removeAt !== "function") {
    Array.prototype.removeAt = function (pos) {
        "use strict";
        var O,
            len,
            item,
            k;
        // Start internal toObject simulation
        if (this === null || this === undefined) {
            throw new TypeError('Array.prototype.removeAt called on null or undefined');
        }
        O = Object(this);
        // End internal toObject simulation
        len = O.length >>> 0; // Converts to Uint32
        if (len === 0) {
            O.length = 0;
            return undefined;
        }
        //pos = Number.toInteger(pos);
        // Start ToInteger conversion
        pos = Number(pos);
        pos = (pos !== pos) ? 0 : (pos === 0 || pos === Infinity || pos === -Infinity) ? pos : (pos > 0) ? Math.floor(pos) : Math.ceil(pos);
        // End ToInteger conversion
        if (pos < 0) {
            k = Math.max(len + pos, 0);
        } else {
            k = Math.min(pos, len - 1);
        }
        item = O[k];
        k += 1;
        while (k < len) {
            if (k in O) {
                O[k - 1] = O[k];
            } else {
                delete O[k - 1];
            }
            k += 1;
        }
        len -= 1;
        delete O[len];
        O.length = len;
        return item;
    };
}
if (typeof Metronome !== "function") {
    (function (global, undef) {
        "use strict";
        var worker_object_url;
        if (typeof Blob === "function" && typeof URL === "function" && typeof Worker === "function") {
            worker_object_url = URL.createObjectURL(new Blob([
                [
                    '/*global self*/',
                    '(function metronomeWorkerSetup() {',
                    '    "use strict";',
                    '    var interval_id, is_ticking = false, adjusted_tempo = 60, update_interval = false;',
                    '    function ticker() {',
                    '        self.postMessage("tick");',
                    '        if (update_interval) {',
                    '            clearInterval(interval_id);',
                    '            interval_id = setInterval(ticker, 60000 / adjusted_tempo);',
                    '            update_interval = false;',
                    '        }',
                    '    }',
                    '    self.onmessage = function (event) {',
                    '        var data = event.data;',
                    '        switch (data) {',
                    '        case "start":',
                    '            if (!is_ticking) {',
                    '                interval_id = setInterval(ticker, 60000 / adjusted_tempo);',
                    '                is_ticking = true;',
                    '            }',
                    '            break;',
                    '        case "stop":',
                    '            if (is_ticking) {',
                    '                clearInterval(interval_id);',
                    '                is_ticking = false;',
                    '                update_interval = false;',
                    '            }',
                    '            break;',
                    '        default:',
                    '            if (typeof data === "number") {',
                    '                adjusted_tempo = data;',
                    '                if (is_ticking) {',
                    '                    update_interval = true;',
                    '                }',
                    '            }',
                    '        }',
                    '    };',
                    '}());'
                ].join('\n')
            ], { type: 'application/javascript' }));
        }
        Metronome = function Metronome(user_param) {
            var metronome = this,
                ticks = 0,
                bpm = 0, // beats per minute
                st = 0, // subticks, the number of ticks per beat
                ticker = (worker_object_url !== undef) ? new Worker(worker_object_url) : (function PunyWorkerSetup() {
                    var puny_worker = {}, onmessage = null, interval_id, is_ticking = false, adjusted_tempo = 60, update_interval = false;
                    function ticker() {
                        if (typeof onmessage === "function") {
                            onmessage.call(puny_worker);
                            if (update_interval) {
                                clearInterval(interval_id);
                                interval_id = setInterval(ticker, 60000 / adjusted_tempo);
                                update_interval = false;
                            }
                        }
                    }
                    Object.defineProperty(puny_worker, 'onmessage', {
                        get: function () {
                            return onmessage;
                        },
                        set: function (handler) {
                            if (typeof handler === "function") {
                                onmessage = handler;
                            }
                            return handler;
                        }
                    });
                    puny_worker.postMessage = function postMessage(message) {
                        switch (message) {
                        case 'start':
                            if (!is_ticking) {
                                interval_id = setInterval(ticker, 60000 / adjusted_tempo);
                                is_ticking = true;
                            }
                            break;
                        case 'stop':
                            if (is_ticking) {
                                clearInterval(interval_id);
                                is_ticking = false;
                                update_interval = false;
                            }
                            break;
                        default:
                            if (typeof message === "number") {
                                adjusted_tempo = message;
                                if (is_ticking) {
                                    update_interval = true;
                                }
                            }
                        }
                    };
                    return puny_worker;
                }),
                list_of_callbacks = [],
                loopage,
                metro_param = {
                    tempo: 60,
                    subticks: 1,
                    debug: false
                },
                key = '',
                is_ticking = false,
                debug = false,
                debugCallback = function debugCallback() {
                    if (console !== undef) {
                        console.log('ticks: ' + ticks + ', adjusted tempo (60000ms / (' + bpm + 'bpm * ' + st + 'st)): ' + (60000 / (bpm * st)) + 'abpm');
                    }
                };
            // metro_param must contain all the necessary properties (along with the default values of course) that the Metronome script uses
            // Start setup settings
            if (typeof user_param === 'object') {
                for (key in user_param) {
                    if (user_param.hasOwnProperty(key)) {
                        metro_param[key] = user_param[key];
                    }
                }
            }
            bpm = metro_param.tempo;
            st = metro_param.subticks;
            debug = metro_param.debug;
            if (debug) {
                list_of_callbacks.push(debugCallback);
            }
            if (metro_param.callback !== undef && typeof metro_param.callback === 'function') {
                list_of_callbacks.push(metro_param.callback);
            }
            // End setup settings
            // Below is the heart of the metronome script
            loopage = function loopage() {
                var i, length, callback;
                for (i = 0, length = list_of_callbacks.length; i < length; i += 1) {
                    callback = list_of_callbacks[i];
                    callback.call(metronome);
                }
                ticks += 1;
            };
            ticker.onmessage = loopage;
            ticker.postMessage(bpm * st);
            this.start = function start() {
                if (!is_ticking) {
                    ticker.postMessage('start');
                    loopage();
                    is_ticking = true;
                }
                return metronome;
            };
            this.stop = function stop() {
                if (is_ticking) {
                    is_ticking = false;
                    ticker.postMessage('stop');
                    ticks = 0;
                }
                return metronome;
            };
            this.pause = function pause() {
                if (is_ticking) {
                    is_ticking = false;
                    ticker.postMessage('stop');
                }
                return metronome;
            };
            this.addCallback = function addCallback(user_callback) {
                if (user_callback !== undef && typeof user_callback === 'function') {
                    if (list_of_callbacks.indexOf(user_callback) < 0) {
                        list_of_callbacks.push(user_callback);
                    }
                    return metronome;
                }
                throw new TypeError('user_callback must be a function');
            };
            this.removeCallback = function removeCallback(user_callback) {
                var index;
                if (user_callback !== undef && typeof user_callback === 'function') {
                    index = list_of_callbacks.indexOf(user_callback);
                    if (index >= 0) {
                        list_of_callbacks.removeAt(index);
                    }
                    return metronome;
                }
                throw new TypeError('user_callback must be a function');
            };
            this.tempo = function tempo(user_tempo) {
                if (arguments.length > 0) {
                    if (user_tempo !== undef && typeof user_tempo === 'number') {
                        bpm = user_tempo;
                        ticker.postMessage(bpm * st);
                        return metronome;
                    }
                    throw new TypeError('user_tempo must be a number');
                }
                return bpm;
            };
            this.subticks = function subticks(user_subticks) {
                if (arguments.length > 0) {
                    if (user_subticks !== undef && typeof user_subticks === 'number') {
                        st = user_subticks;
                        ticker.postMessage(bpm * st);
                        return metronome;
                    }
                    throw new TypeError('user_subticks must be a number');
                }
                return st;
            };
            this.getCurrentTicks = function getCurrentTicks() {
                return ticks;
            };
            if (debug) {
                this.endDebug = function endDebug() {
                    list_of_callbacks.shift();
                    debug = false;
                    delete metronome.endDebug;
                    return metronome;
                };
            }
        };
    }(window));
}