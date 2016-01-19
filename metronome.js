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

/*global window, console, Worker*/

var Metronome;
if (typeof Metronome !== "function") {
    (function (global, undef) {
        "use strict";
        function PunyWorker() {
            var instance = this, interval_id, is_ticking = false;
            function ticker() {
                if (typeof instance.onmessage === "function") {
                    instance.onmessage();
                }
            }
            instance.postMessage = function postMessage(message) {
                switch (message) {
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
        }
        Metronome = function Metronome(user_param) {
            var instance = this,
                counter = 0,
                additive = 0,
                ticks = 0,
                sps = 60, // steps per second
                bpm = 0, // beats per minute
                st = 0, // subticks, the number of ticks per beat
                ticker = (typeof Worker === "function") ? new Worker('metronome-worker.js') : new PunyWorker(),
                tickCallback,
                loopage,
                metro_param = {
                    tempo: 60,
                    subticks: 1,
                    debug: false
                },
                key = '',
                is_playing = false,
                debug = false,
                debugCallback = function debugCallback() {
                    if (debug && console !== undef) {
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
            tickCallback = (metro_param.callback !== undef && typeof metro_param.callback === 'function') ? metro_param.callback : debugCallback;
            // End setup settings
            // Below is the heart of the metronome script
            loopage = function loopage() {
                counter += additive;
                // while() is used for instances where the counter is twice more than the sps (due to very high tempo values) and needs to be decremented back repeatedly to something that's under the sps on the same cycle
                while (counter >= sps) {
                    counter -= sps;
                    ticks += 1;
                    tickCallback();
                }
            };
            ticker.onmessage = loopage;
            this.start = function start() {
                if (!is_playing) {
                    is_playing = true;
                    loopage();
                    ticker.postMessage('start');
                }
                return instance;
            };
            this.stop = function stop() {
                if (is_playing) {
                    is_playing = false;
                    ticker.postMessage('stop');
                    counter = 0;
                    ticks = 0;
                }
                return instance;
            };
            this.pause = function pause() {
                if (is_playing) {
                    is_playing = false;
                    ticker.postMessage('stop');
                }
                return instance;
            };
            this.callback = function callback(user_callback) {
                if (arguments.length > 0) {
                    if (user_callback !== undef && typeof user_callback === 'function') {
                        tickCallback = user_callback;
                        return instance;
                    }
                    throw new TypeError('user_callback must be a function');
                }
                return tickCallback;
            };
            this.tempo = function tempo(user_tempo) {
                if (arguments.length > 0) {
                    if (user_tempo !== undef && typeof user_tempo === 'number') {
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
                    if (user_subticks !== undef && typeof user_subticks === 'number') {
                        st = user_subticks;
                        additive = (bpm / sps) * st;
                        return instance;
                    }
                    throw new TypeError('user_subticks must be a number');
                }
                return st;
            };
            this.ticks = function ticks() {
                return ticks;
            };
        };
    }(window));
}
