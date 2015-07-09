var orangeHasPlayer = null,
    video = null,
    volumeButton = null,
    fullscreenButton = null,
    audioList = null,
    subtitleList = null,
    audioTracks = [],
    currentaudioTrack = null,
    subtitleTracks = [],
    currentsubtitleTrack = null;

window.onload = function() {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', document.location + '/../json/sources.json');
    xhr.onreadystatechange = function() {
        //if (xhr.readyState === 3) {
        if (xhr.readyState == 4 && xhr.status == 200) {
            buildStreamsList(xhr.responseText);
        }
    }
    xhr.send();

    getDOMElements();
    createHasPlayer();
    registerHasPlayerEvents();
    registerGUIEvents();

    var buildStreamsList = function(jsonList) {
        // Prepare stream table
        var tableNode = document.getElementById('streams-table'),
            i;

        if (tableNode) {
            while (tableNode.firstChild) {
                tableNode.removeChild(tableNode.firstChild);
            }
        } else {
            tableNode = document.createElement('table');
            tableNode.id = 'streams-table';
            document.getElementById('streams-container').appendChild(tableNode);
        }

        var streamsList = JSON.parse(jsonList);

        // Add stream elements
        for (i = 0, len = streamsList.items.length; i < len; i++) {
            var stream = streamsList.items[i];

            if (stream.protocol) {
                var streamItem = createStreamEntry(stream);
                tableNode.appendChild(streamItem);
            }
        }
    };

    var createStreamEntry = function(stream) {
        var streamItem = document.createElement('tr'),
            streamItemName = document.createElement('td'),
            streamItemProtocol = document.createElement('td'),
            streamItemType = document.createElement('td'),
            streamItemTypeIcon = document.createElement('img'),
            streamItemProtection = document.createElement('td');

        streamItem.appendChild(streamItemType);
        streamItem.appendChild(streamItemName);
        streamItem.appendChild(streamItemProtocol);
        streamItem.appendChild(streamItemProtection);

        if (stream.type.toLowerCase() === 'live') {
            streamItemTypeIcon.src = 'res/live_icon.png';
        } else if (stream.type.toLowerCase() === 'vod') {
            streamItemTypeIcon.src = 'res/vod_icon.png';
        }

        streamItemType.appendChild(streamItemTypeIcon);
        streamItemName.innerHTML = stream.name;
        streamItemProtocol.innerHTML = stream.protocol;

        var protections = [];
        if (stream.protData) {
            var protectionsNames = Object.getOwnPropertyNames(stream.protData);
            for (var i = 0, len = protectionsNames.length; i < len; i++) {
                if (S(protectionsNames[i]).contains('playready')) {
                    protections.push("PR");
                } else if (S(protectionsNames[i]).contains('widevine')) {
                    protections.push("WV");
                }
            }
        }

        streamItemProtection.innerHTML = protections.join(',');

        streamItem.setAttribute('class', 'stream-item');

        var onStreamClicked = function(streamInfos) {
            reset();
            loadStream(streamInfos);
        }

        streamItem.addEventListener('click', function() {
            onStreamClicked(stream);
        })

        return streamItem;
    }
}

var getDOMElements = function() {
    video = document.getElementById('player');
    volumeButton = document.getElementById('button-volume');
    fullscreenButton = document.getElementById('button-fullscreen');
    audioList = document.getElementById('audioCombo');
    subtitleList = document.getElementById('subtitleCombo');
}

var registerGUIEvents = function() {
    volumeButton.addEventListener('click', onMuteClicked)
    fullscreenButton.addEventListener('click', onFullScreenClicked);
}

var audioChanged = function() {
    changeAudio();
}

var subtitleChanged = function() {
    changeSubtitle();
}

var handleAudioDatas = function(_audioTracks, _selectedAudioTrack){
    audioTracks = _audioTracks;
    currentaudioTrack = _selectedAudioTrack;

    addCombo(audioTracks, audioList);
    selectCombo(audioTracks, audioList, currentaudioTrack);
}

var handleSubtitleDatas = function(_subtitleTracks, _selectedSubtitleTrack){
    //init subtitles tracks
    subtitleTracks = _subtitleTracks;
    currentsubtitleTrack = _selectedSubtitleTrack;

    addCombo(subtitleTracks, subtitleList);
    selectCombo(subtitleTracks, subtitleList, currentsubtitleTrack);
}

var handleError = function(e){

}

var addCombo = function(tracks, combo) {
    var i, option;

    for (i = 0; i < tracks.length; i++) {
        option = document.createElement("option");
        option.text = tracks[i].id;
        option.value = tracks[i].lang;

        try {
            combo.add(option, null); //Standard 
        } catch (error) {
            combo.add(option); // IE only
        }
        if (combo.style.visibility === 'hidden') {
            combo.style.visibility = 'visible';
        }
    }
}

var selectCombo = function(tracks, combo, currentTrack) {
    var i;

    for (i = 0; i < tracks.length; i++) {
        if (currentTrack === tracks[i]) {
            combo.selectedIndex = i;
        }
    }
}

var resetCombo = function(tracks, combo) {
    var i;

    for (i = tracks.length - 1; i >= 0; i--) {
        combo.options.remove(i);
    }

    tracks = [];

    combo.style.visibility = 'hidden';
}

var reset = function() {
    resetCombo(audioTracks, audioList);
    resetCombo(subtitleTracks, subtitleList);

    currentaudioTrack = null;
    currentsubtitleTrack = null;
}

var onMuteClicked = function() {
    setPlayerMute();
    setVolumeOff(orangeHasPlayer.getMute());
}

var onFullScreenClicked = function() {
    if (!document.fullscreenElement && // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { // current working methods
        if (document.getElementById("playerVideo-container").requestFullscreen) {
            document.getElementById("playerVideo-container").requestFullscreen();
        } else if (document.getElementById("playerVideo-container").msRequestFullscreen) {
            document.getElementById("playerVideo-container").msRequestFullscreen();
        } else if (document.getElementById("playerVideo-container").mozRequestFullScreen) {
            document.getElementById("playerVideo-container").mozRequestFullScreen();
        } else if (document.getElementById("playerVideo-container").webkitRequestFullscreen) {
            document.getElementById("playerVideo-container").webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

var setVolumeOff = function(value) {
    if (value) {
        volumeButton.className = "fa fa-volume-off button button-volume left";
    } else {
        volumeButton.className = "fa fa-volume-up button button-volume left";
    }
}