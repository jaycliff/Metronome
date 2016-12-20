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
        Metronome = function Metronome(user_param) {
            var instance = this,
                counter = 0,
                additive = 0,
                ticks = 0,
                sps = 60, // steps per second
                bpm = 0, // beats per minute
                st = 0, // subticks, the number of ticks per beat
                ticker = (typeof Worker === "function") ? new Worker('metronome-worker.js') : (function PunyWorkerSetup() {
                    var instance = {}, interval_id, is_ticking = false, sps = 60;
                    function ticker() {
                        if (typeof instance.onmessage === "function") {
                            instance.onmessage();
                        }
                    }
                    instance.postMessage = function postMessage(message) {
                        switch (message) {
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
                            if (typeof message === "number") {
                                sps = message;
                            }
                        }
                    };
                    return instance;
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
                    if (console !== undef) { // Who knows? Console can either be a plain object or a function in some hosts...
                        console.log(ticks + '   counter => ' + counter + '    (bpm / sps) * st => ' + additive);
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
            additive = (bpm / sps) * st;
            debug = metro_param.debug;
            if (debug) {
                list_of_callbacks.push(debugCallback);
            }
            if (typeof metro_param.callback === 'function') {
                list_of_callbacks.push(metro_param.callback);
            }
            // End setup settings
            // Below is the heart of the metronome script
            loopage = function loopage() {
                var i, length, callback;
                counter += additive;
                // while() is used for instances where the counter is twice more than 60 (due to very high tempo values) and needs to be decremented back repeatedly to something that's under 60 on the same cycle
                // 60 refers to the number of seconds per minute. This will serve as our constant / anchor
                while (counter >= 60) {
                    counter -= 60;
                    ticks += 1;
                    for (i = 0, length = list_of_callbacks.length; i < length; i += 1) {
                        callback = list_of_callbacks[i];
                        callback.call(instance);
                    }
                }
            };
            ticker.onmessage = loopage;
            ticker.postMessage(sps);
            this.start = function start() {
                if (!is_ticking) {
                    is_ticking = true;
                    ticker.postMessage('start');
                    loopage();
                }
                return instance;
            };
            this.stop = function stop() {
                if (is_ticking) {
                    is_ticking = false;
                    ticker.postMessage('stop');
                    counter = 0;
                    ticks = 0;
                }
                return instance;
            };
            this.pause = function pause() {
                if (is_ticking) {
                    is_ticking = false;
                    ticker.postMessage('stop');
                }
                return instance;
            };
            this.addCallback = function addCallback(user_callback) {
                if (typeof user_callback === 'function') {
                    if (list_of_callbacks.indexOf(user_callback) < 0) {
                        list_of_callbacks.push(user_callback);
                    }
                    return instance;
                }
                throw new TypeError('user_callback must be a function');
            };
            this.removeCallback = function removeCallback(user_callback) {
                var index;
                if (typeof user_callback === 'function') {
                    index = list_of_callbacks.indexOf(user_callback);
                    if (index > -1) {
                        list_of_callbacks.removeAt(index);
                    }
                    return instance;
                }
                throw new TypeError('user_callback must be a function');
            };
			this.removeCallbacks = function removeCallbacks() {
				list_of_callbacks.length = 0;
				return instance;
			};
            this.tempo = function tempo(user_tempo) {
                if (arguments.length > 0) {
                    if (typeof user_tempo === 'number') {
                        bpm = user_tempo;
                        additive = (bpm / sps) * st;
                        return instance;
                    }
                    throw new TypeError('user_tempo must be a number');
                }
                return bpm;
            };
            this.subticks = function subticks(user_subticks) {
                if (arguments.length > 0) {
                    if (typeof user_subticks === 'number') {
                        st = user_subticks;
                        additive = (bpm / sps) * st;
                        return instance;
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
                    delete instance.endDebug;
                    return instance;
                };
            }
        };
    }(window));
}