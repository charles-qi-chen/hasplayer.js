/*
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.DownloadRatioRule = function() {
    "use strict";

    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,

        name: "DownloadRatioRule",

        checkIndex: function(current, metrics, data) {
            var self = this,
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                requests = self.metricsExt.getHttpRequests(metrics),
                downloadTime,
                totalTime,
                calculatedBandwidth,
                currentBandwidth,
                latencyInBandwidth,
                switchUpRatioSafetyFactor,
                currentRepresentation,
                count,
                bandwidths = [],
                i,
                q = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                totalBytesLength = 0,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

            if (data && data.hasOwnProperty('type')) {
                latencyInBandwidth = self.config.getParamFor(data.type, "ABR.latencyInBandwidth", "boolean", true);
                switchUpRatioSafetyFactor = self.config.getParamFor(data.type, "ABR.switchUpRatioSafetyFactor", "number", 1.5);
                //self.debug.log("Checking download ratio rule...");
                self.debug.log("[DownloadRatioRule][" + data.type + "] Checking download ratio rule... (current = " + current + ")");

                if (!metrics) {
                    self.debug.log("[DownloadRatioRule][" + data.type + "] No metrics, bailing.");
                    return new MediaPlayer.rules.SwitchRequest();
                }

                if (lastRequest === null) {
                    self.debug.log("[DownloadRatioRule][" + data.type + "] No requests made for this stream yet, bailing.");
                    return new MediaPlayer.rules.SwitchRequest();
                }

                totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
                downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

                if (totalTime <= 0) {
                    self.debug.log("[DownloadRatioRule][" + data.type + "] Don't know how long the download of the last fragment took, bailing.");
                    return new MediaPlayer.rules.SwitchRequest();
                }

                if (lastRequest.mediaduration === null ||
                    lastRequest.mediaduration === undefined ||
                    lastRequest.mediaduration <= 0 ||
                    isNaN(lastRequest.mediaduration)) {
                    self.debug.log("[DownloadRatioRule][" + data.type + "] Don't know the duration of the last media fragment, bailing.");
                    return new MediaPlayer.rules.SwitchRequest();
                }

                self.debug.info("[DownloadRatioRule][" + data.type + "] DL: " + Number(downloadTime.toFixed(3)) + "s, Total: " + Number(totalTime.toFixed(3)) + "s");

                totalBytesLength = lastRequest.bytesLength;

                // Take average bandwidth over 3 requests
                count = 1;
                i = requests.length - 2;
                while (i >= 0 && count < 3) {
                    if (requests[i].tfinish && requests[i].trequest && requests[i].tresponse && requests[i].bytesLength > 0) {
                        self.debug.info("[DownloadRatioRule][" + data.type + "] length: " + requests[i].bytesLength + ", time: " + ((requests[i].tfinish.getTime() - requests[i].trequest.getTime()) / 1000));
                        totalBytesLength += requests[i].bytesLength;
                        totalTime += (requests[i].tfinish.getTime() - requests[i].trequest.getTime()) / 1000;
                        downloadTime += (requests[i].tfinish.getTime() - requests[i].tresponse.getTime()) / 1000;
                        count += 1;
                    }
                    i--;
                }

                // Set length in bits
                totalBytesLength *= 8;

                calculatedBandwidth = latencyInBandwidth ? (totalBytesLength / totalTime) : (totalBytesLength / downloadTime);

                self.debug.info("[DownloadRatioRule][" + data.type + "] BW = " + Math.round(calculatedBandwidth / 1000) + " kb/s");

                if (isNaN(calculatedBandwidth)) {
                    return new MediaPlayer.rules.SwitchRequest();
                }

                count = self.manifestExt.getRepresentationCount(data);
                currentRepresentation = self.manifestExt.getRepresentationFor(current, data);
                currentBandwidth = self.manifestExt.getBandwidth(currentRepresentation);
                for (i = 0; i < count; i += 1) {
                    bandwidths.push(self.manifestExt.getRepresentationBandwidth(data, i));
                }
                if (calculatedBandwidth <= currentBandwidth) {
                    for (i = current - 1; i > 0; i -= 1) {
                        if (bandwidths[i] <= calculatedBandwidth) {
                            break;
                        }
                    }
                    q = i;
                    p = MediaPlayer.rules.SwitchRequest.prototype.WEAK;

                    self.debug.info("[DownloadRatioRule][" + data.type + "] SwitchRequest: q=" + q + "/" + (count - 1) + " (" + bandwidths[q] + "), p=" + p);
                    return new MediaPlayer.rules.SwitchRequest(q, p);
                } else {
                    for (i = count - 1; i > current; i -= 1) {
                        if (calculatedBandwidth > (bandwidths[i] * switchUpRatioSafetyFactor)) {
                            //self.debug.log("[DownloadRatioRule][" + data.type + "] bw = " + calculatedBandwidth + " results[i] * switchUpRatioSafetyFactor =" + (bandwidths[i] * switchUpRatioSafetyFactor) + " with i=" + i);
                            break;
                        }
                    }

                    q = i;
                    p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;

                    self.debug.info("[DownloadRatioRule][" + data.type + "] SwitchRequest: q=" + q + "/" + (count - 1) + " (" + bandwidths[q] + "), p=" + p);
                    return new MediaPlayer.rules.SwitchRequest(q, p);
                }
            } else {
                return new MediaPlayer.rules.SwitchRequest();
            }
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};