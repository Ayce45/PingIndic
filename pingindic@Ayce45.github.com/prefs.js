'use strict';
const { Gio, Gtk, Gdk, GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain('moonphases');
const _ = Gettext.gettext;

const UPDTEDLY = "update-interval";
const ADRESS = 'adress';
const LIMITFORGOOD = "limitforgood";
const LIMITFORBAD = "limitforbad";
const COLORGOOD = "color-good";
const COLORNOGOOD = "color-nogood";
const COLORBAD = "color-bad";
const REMOVEDECIMALS = "remove-decimals";

function init() {
    ExtensionUtils.initTranslations('moonphases');
}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.pingindic');
    let builder = new Gtk.Builder();
    builder.set_translation_domain('PingIndic');
    builder.add_from_file(Me.path + '/prefs.ui');

    // update interval
    let widjet0 = builder.get_object("spbtnDly");
    settings.bind(UPDTEDLY, widjet0, 'value', Gio.SettingsBindFlags.DEFAULT);

    // indic style good
    let widjet1 = builder.get_object('spIndicGood');
    settings.bind(LIMITFORGOOD, widjet1, 'value', Gio.SettingsBindFlags.DEFAULT);

    // indic style bad
    let widjet3 = builder.get_object('spIndicBad');
    settings.bind(LIMITFORBAD, widjet3, 'value', Gio.SettingsBindFlags.DEFAULT);

    // Adress
    let widget2 = builder.get_object('eAdress');
    settings.bind(ADRESS, widget2, 'text', Gio.SettingsBindFlags.DEFAULT);

    // Remove decimals checkbox
    let widgetRemoveDecimals = builder.get_object('chkRemoveDecimals');
    settings.bind(REMOVEDECIMALS, widgetRemoveDecimals, 'active', Gio.SettingsBindFlags.DEFAULT);

    // Color pickers 
    let colorGoodButton = builder.get_object('colorGood');
    let colorNogoodButton = builder.get_object('colorNogood');
    let colorBadButton = builder.get_object('colorBad');

    // Create custom color bindings
    setupColorBinding(settings, colorGoodButton, COLORGOOD);
    setupColorBinding(settings, colorNogoodButton, COLORNOGOOD);
    setupColorBinding(settings, colorBadButton, COLORBAD);

    return builder.get_object('prefs-container');
}

function setupColorBinding(settings, colorButton, settingKey) {
    let initialColor;

    try {
        initialColor = settings.get_string(settingKey);
    } catch (e) {
        log('Error reading color from settings for ' + settingKey + ', using default');
        initialColor = getDefaultColor(settingKey);
    }

    try {
        let color = new Gdk.RGBA();
        if (color.parse(initialColor)) {
            colorButton.set_rgba(color);
        }
    } catch (e) {
        log('Error parsing color for ' + settingKey + ': ' + e);
        let defaultColor = new Gdk.RGBA();
        defaultColor.parse(getDefaultColor(settingKey));
        colorButton.set_rgba(defaultColor);
    }

    colorButton.connect('color-set', (button) => {
        let rgba = button.get_rgba();
        let hexColor = rgbaToHex(rgba);
        try {
            settings.set_string(settingKey, hexColor);
            log('Successfully set ' + settingKey + ' to ' + hexColor);
        } catch (e) {
            log('Error saving color to settings: ' + e);
        }
    });
}

function getDefaultColor(settingKey) {
    switch (settingKey) {
        case COLORGOOD: return '#00FF00';
        case COLORNOGOOD: return '#FFFF00';
        case COLORBAD: return '#FF0000';
        default: return '#FFFFFF';
    }
}

function rgbaToHex(rgba) {
    let r = Math.round(rgba.red * 255);
    let g = Math.round(rgba.green * 255);
    let b = Math.round(rgba.blue * 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
