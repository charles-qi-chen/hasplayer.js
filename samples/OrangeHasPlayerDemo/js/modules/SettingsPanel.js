var SettingsPanel = function() {
    this.menuContainer = null;

    // Quick settings
    this.audioListCombobox = null;
    this.enableSubtitlesCheckbox = null;
    this.subtitleListCombobox = null;
    this.audioTracks = [];
    this.subtitleTracks = [];
    this.currentaudioTrack = null;
    this.currentsubtitleTrack = null;

    // Settings
    this.settingsMenuButton = null;
    this.startTime = null;
    this.enableMetricsCheckbox = null;
    this.enableOptimzedZappingCheckbox = null;
    this.metricsAgentCombobox = null;
    this.defaultAudioLangCombobox = null;
    this.defaultSubtitleLangCombobox = null;
    this.optimizedZappingEnabled = true;
    this.metricsConfig = null;
    this.videoBufferLength = null;
    this.audioBufferLength = null;
    this.TrickModeSpeed = null;
};

SettingsPanel.prototype.init = function() {
    this.menuContainer = document.getElementById('menu-container');
    this.audioListCombobox = document.getElementById('audioCombo');
    this.enableSubtitlesCheckbox = document.getElementById('enable-subtitles');
    this.subtitleListCombobox = document.getElementById('subtitleCombo');
    this.settingsMenuButton = document.getElementById('settingsMenuButton');
    this.startTime = document.getElementById('start_time');
    this.metricsAgentCombobox = document.getElementById('metrics-agent-options');
    this.enableMetricsCheckbox = document.getElementById('enable-metrics-agent');
    this.defaultAudioLangCombobox = document.getElementById('default_audio_language');
    this.defaultSubtitleLangCombobox = document.getElementById('default_subtitle_language');
    this.enableOptimzedZappingCheckbox = document.getElementById('enable-optimized-zapping');
    this.videoBufferLength = document.getElementById('video_buffer_Length');
    this.audioBufferLength = document.getElementById('audio_buffer_Length');
    this.TrickModeSpeed = document.getElementById('TrickModeSpeed');

    this.setupEventListeners();
    this.initMetricsAgentOptions();
};

SettingsPanel.prototype.setupEventListeners = function() {
    this.audioListCombobox.addEventListener('change', this.audioChanged.bind(this));
    this.enableSubtitlesCheckbox.addEventListener('click', this.onEnableSubtitles.bind(this));
    this.subtitleListCombobox.addEventListener('change', this.subtitleChanged.bind(this));
    this.settingsMenuButton.addEventListener('click', this.onSettingsMenuButtonClicked.bind(this));
    this.enableMetricsCheckbox.addEventListener('click', this.onEnableMetrics.bind(this));
    this.metricsAgentCombobox.addEventListener('change', this.onSelectMetricsAgent.bind(this));
    this.defaultAudioLangCombobox.addEventListener('change', this.onChangeDefaultAudioLang.bind(this));
    this.defaultSubtitleLangCombobox.addEventListener('change', this.onChangeDefaultSubtitleLang.bind(this));
    this.enableOptimzedZappingCheckbox.addEventListener('click', this.onEnableOptimizedZapping.bind(this));
    this.TrickModeSpeed.addEventListener('change', this.onTrickModeSpeedChange.bind(this));

    minivents.on('language-radio-clicked', this.onLanguageChangedFromPlayer.bind(this));
    minivents.on('subtitle-radio-clicked', this.onSubtitleChangedFromPlayer.bind(this));
};

SettingsPanel.prototype.getStartTime = function() {
    if (this.startTime) {
        return this.startTime.value;
    }
};

SettingsPanel.prototype.initMetricsAgentOptions = function() {
    var reqMA = new XMLHttpRequest(),
        i = 0,
        len = 0,
        self = this;

    reqMA.onload = function() {
        if (reqMA.status === 200) {
            self.metricsConfig = JSON.parse(reqMA.responseText);

            self.metricsAgentCombobox.innerHTML = '';

            for (i = 0, len = self.metricsConfig.items.length; i < len; i++) {
                self.metricsAgentCombobox.innerHTML += '<option value="' + i + '">' + self.metricsConfig.items[i].name + '</option>';
            }
            self.metricsAgentCombobox.selectedIndex = -1;
        }
    };
    reqMA.open('GET', './json/metricsagent_config.json', true);
    reqMA.setRequestHeader('Content-type', 'application/json');
    reqMA.send();
};

SettingsPanel.prototype.audioChanged = function(e) {
    changeAudio(this.audioTracks[e.target.selectedIndex]);
    //change audio language in PlayerPanel.
    document.getElementById(this.audioTracks[e.target.selectedIndex].id ? this.audioTracks[e.target.selectedIndex].id : this.audioTracks[e.target.selectedIndex].lang ).checked = true;
};

SettingsPanel.prototype.subtitleChanged = function(e) {
    changeSubtitle(this.subtitleTracks[e.target.selectedIndex]);
    //change subtitle language in PlayerPanel.
    document.getElementById(this.subtitleTracks[e.target.selectedIndex].id ? this.subtitleTracks[e.target.selectedIndex].id : this.subtitleTracks[e.target.selectedIndex].lang ).checked = true;
};

SettingsPanel.prototype.getTrackIndex = function(tracks, id) {
    var index = -1,
        i = 0,
        len = 0;
    for (i = 0, len = tracks.length; i < len; i += 1) {
        if((tracks[i].id && tracks[i].id === id) ||
           (tracks[i].lang && tracks[i].lang === id)){
            index = i;
            break;
        }
    }

    return index;
};

SettingsPanel.prototype.onLanguageChangedFromPlayer = function(track_id) {
    var index = this.getTrackIndex(this.audioTracks, track_id);

    if (index > -1) {
        changeAudio(this.audioTracks[index]);
        this.audioListCombobox.selectedIndex = index;
    }
};

SettingsPanel.prototype.onEnableSubtitles = function() {
    this.subtitleListCombobox.disabled = !this.enableSubtitlesCheckbox.checked;
    enableSubtitles(this.enableSubtitlesCheckbox.checked);
    minivents.emit('subtitle-radio-clicked', this.enableSubtitlesCheckbox.checked)
    //if subtitles have not been activated yet, initialize the first selected track
    if (!this.currentsubtitleTrack) {
        this.currentsubtitleTrack = orangeHasPlayer.getSelectedTrack('text');
        var index = this.getTrackIndex(this.subtitleTracks, this.currentsubtitleTrack.id);
        if (index > -1) {
            this.subtitleListCombobox.selectedIndex = index;
            //init subtitle language in PlayerPanel too.
            document.getElementById(this.subtitleTracks[index].id ? this.subtitleTracks[index].id : this.subtitleTracks[index].lang ).checked = true;
        }
    }
};

SettingsPanel.prototype.onSubtitleChangedFromPlayer = function(track_id) {
    var index = this.getTrackIndex(this.subtitleTracks, track_id);

    if (index > -1) {
        changeSubtitle(this.subtitleTracks[index]);
        this.subtitleListCombobox.selectedIndex = index;
    }
};

SettingsPanel.prototype.onSettingsMenuButtonClicked = function() {
    if (hasClass(this.menuContainer, 'hidden')) {
        this.menuContainer.className = '';
    } else {
        this.menuContainer.className = 'hidden';
    }
};

SettingsPanel.prototype.onEnableMetrics = function() {
    if (this.enableMetricsCheckbox.checked) {
        this.metricsAgentCombobox.disabled = false;
        this.loadMetricsAgent();
    } else {
        this.metricsAgentCombobox.disabled = true;
        orangeHasPlayer.removePlugin('MetricsAgent');
    }
};

SettingsPanel.prototype.onSelectMetricsAgent = function() {
    if (this.enableMetricsCheckbox.checked) {
        this.loadMetricsAgent();
    }
};

SettingsPanel.prototype.loadMetricsAgent = function() {
    if (typeof MetricsAgent === 'function' && this.metricsAgentCombobox.selectedIndex >= 0) {
        var metricsAgent = new MetricsAgent(this.metricsConfig.items[this.metricsAgentCombobox.selectedIndex]);
        orangeHasPlayer.addPlugin(metricsAgent);
    }
};

SettingsPanel.prototype.onChangeDefaultAudioLang = function() {
    orangeHasPlayer.setDefaultAudioLang(this.defaultAudioLangCombobox.value);
};

SettingsPanel.prototype.onChangeDefaultSubtitleLang = function() {
    orangeHasPlayer.setDefaultSubtitleLang(this.defaultSubtitleLangCombobox.value);
};

SettingsPanel.prototype.onEnableOptimizedZapping = function() {
    this.optimizedZappingEnabled = this.enableOptimzedZappingCheckbox.checked;
};

SettingsPanel.prototype.onTrickModeSpeedChange = function(e) {
    var speed;
    if (e.target.selectedOptions) {
        speed = parseInt(e.target.selectedOptions[0].value,10);
    }else{
        speed = parseInt(e.target[e.target.selectedIndex].value,10);
    }
    orangeHasPlayer.setTrickModeSpeed(speed);
};

SettingsPanel.prototype.updateAudioData = function(_audioTracks, _selectedAudioTrack) {
    this.audioTracks = _audioTracks;
    this.currentaudioTrack = _selectedAudioTrack;

    if (this.audioTracks && this.currentaudioTrack) {
        this.addCombo(this.audioTracks, this.audioListCombobox);
        this.selectCombo(this.audioTracks, this.audioListCombobox, this.currentaudioTrack);
    }
};

SettingsPanel.prototype.updateSubtitleData = function(_subtitleTracks, _selectedSubtitleTrack) {
    //init subtitles tracks
    this.subtitleTracks = _subtitleTracks;
    //if no subtitles, disabled subtitle checkbox.
    this.enableSubtitlesCheckbox.disabled = this.subtitleTracks.length > 0 ? false : true;
    this.currentsubtitleTrack = _selectedSubtitleTrack;

    if (this.subtitleTracks) {
        this.addCombo(this.subtitleTracks, this.subtitleListCombobox);
        if (this.currentsubtitleTrack) {
            this.selectCombo(this.subtitleTracks, this.subtitleListCombobox, this.currentsubtitleTrack);
        }
    }
};

SettingsPanel.prototype.addCombo = function(tracks, combo) {
    var i, option;

    for (i = 0; i < tracks.length; i += 1) {
        option = document.createElement('option');
        option.text = tracks[i].id || tracks[i].lang;
        option.value = tracks[i].lang;
        option.id = tracks[i].lang;

        try {
            combo.add(option, null); //Standard
        } catch (error) {
            combo.add(option); // IE only
        }
        if (combo.style.visibility === 'hidden') {
            combo.style.visibility = 'visible';
        }
    }
};

SettingsPanel.prototype.selectCombo = function(tracks, combo, currentTrack) {
    var i;

    for (i = 0; i < tracks.length; i += 1) {
        if (currentTrack.lang === tracks[i].lang) {
            combo.selectedIndex = i;
        }
    }
};

SettingsPanel.prototype.resetCombo = function(tracks, combo) {
    var i;

    for (i = tracks.length - 1; i >= 0; i -= 1) {
        combo.options.remove(i);
    }

    tracks = [];

    combo.style.visibility = 'hidden';
};

SettingsPanel.prototype.resetSpeedValue = function(){
    //reset trick mode value to speed = 1
    this.TrickModeSpeed.selectedIndex = 7;
};

SettingsPanel.prototype.reset = function() {
    this.resetCombo(this.audioTracks, this.audioListCombobox);
    this.resetCombo(this.subtitleTracks, this.subtitleListCombobox);
    
    this.currentaudioTrack = null;
    this.currentsubtitleTrack = null;
    this.videoBufferLength.innerHTML = "";
    this.audioBufferLength.innerHTML = "";
    this.enableSubtitlesCheckbox.checked = false;
    enableSubtitles(this.enableSubtitlesCheckbox.checked);
    this.resetSpeedValue();
};