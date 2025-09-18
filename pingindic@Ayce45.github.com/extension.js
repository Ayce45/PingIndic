'use strict';

const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Gettext = imports.gettext.domain('PingIndic');
const _ = Gettext.gettext;

const UPDTEDLY = "update-interval";
const ADRESS = 'adress';
const LIMITFORGOOD = "limitforgood";
const LIMITFORBAD = "limitforbad";
const COLORGOOD = "color-good";
const COLORNOGOOD = "color-nogood";
const COLORBAD = "color-bad";
const REMOVEDECIMALS = "remove-decimals";

let mpingindic;
let settings;
let feedsArray;
let label;
let tagWatchOUT;
let tagWatchERR;
let timeout;

const Extension = GObject.registerClass(
    class Extension extends PanelMenu.Button {
        _init() {
            super._init(0);

            label = new St.Label({ style_class: 'pingindic-label', y_align: Clutter.ActorAlign.CENTER, text: _("0ms") });
            let topBox = new St.BoxLayout();
            topBox.add_actor(label);

            this.add_actor(topBox);
            this.buildmenu();
        }

        buildmenu() {
            if (this.mainBox != null)
                this.mainBox.destroy();

            this.mainBox = new St.BoxLayout();

            let customButtonBox = new St.BoxLayout({
                style_class: 'pingindic-button-box ',
                vertical: false,
                clip_to_allocation: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                reactive: true,
                x_expand: true,
                pack_start: false
            });

            let preflabBtn = new St.Button({ y_align: Clutter.ActorAlign.CENTER, label: _('Settings') });
            preflabBtn.connect('clicked', () => {
                this.menu.actor.hide();
                ExtensionUtils.openPrefs();
            });
            customButtonBox.add_actor(preflabBtn);

            this.mainBox.add_actor(customButtonBox);
            this.menu.box.add(this.mainBox);
        }

        loadData() {
            let success;
            this.command = ["ping", "-c 1", settings.get_string(ADRESS)];
            [success, this.child_pid, this.std_in, this.std_out, this.std_err] = GLib.spawn_async_with_pipes(
                null,
                this.command,
                null,
                GLib.SpawnFlags.SEARCH_PATH,
                null);

            if (!success) {
                log('launching ping fail');
                return;
            }

            this.IOchannelOUT = GLib.IOChannel.unix_new(this.std_out);
            this.IOchannelERR = GLib.IOChannel.unix_new(this.std_err);

            tagWatchOUT = GLib.io_add_watch(this.IOchannelOUT, GLib.PRIORITY_DEFAULT,
                GLib.IOCondition.IN | GLib.IOCondition.HUP, this.loadPipeOUT);

            tagWatchERR = GLib.io_add_watch(this.IOchannelERR, GLib.PRIORITY_DEFAULT,
                GLib.IOCondition.IN | GLib.IOCondition.HUP, this.loadPipeERR);
        }

        loadPipeOUT(channel, condition, data) {
            if (condition != GLib.IOCondition.HUP) {
                let out = channel.read_line(); //dummy
                out = channel.read_line();
                const result = out[1].split('=');
                if (result[3] != null) {
                    let pingTime = result[3];
                    if (settings.get_boolean(REMOVEDECIMALS)) {
                        let timeValue = parseFloat(pingTime);
                        pingTime = Math.round(timeValue).toString() + 'ms';
                    }
                    label.set_text(pingTime);
                    setlabelstyle(result[3]);
                }
            }
            else {
                label.set_text(_("Error"));
                label.set_style_class_name('pingindic-label');
                let color = getColorValue(COLORBAD);
                label.set_style(`color: ${color}; font-weight: bold; font-size: 12pt;`);
            }
            GLib.source_remove(tagWatchOUT);
            channel.shutdown(true);
        }

        loadPipeERR(channel, condition, data) {
            if (condition != GLib.IOCondition.HUP) {
                label.set_text(_("Error"));
                label.set_style_class_name('pingindic-label');
                let color = getColorValue(COLORBAD);
                label.set_style(`color: ${color}; font-weight: bold; font-size: 12pt;`);
            }
            GLib.source_remove(tagWatchERR);
            channel.shutdown(false);
        }
    });

function setlabelstyle(str) {
    let time = parseFloat(str);
    if (time < settings.get_int(LIMITFORGOOD)) {
        label.set_style_class_name('pingindic-label');
        let color = getColorValue(COLORGOOD);
        label.set_style(`color: ${color};`);
    } else {
        if (time < settings.get_int(LIMITFORBAD)) {
            label.set_style_class_name('pingindic-label');
            let color = getColorValue(COLORNOGOOD);
            label.set_style(`color: ${color};`);
        } else {
            label.set_style_class_name('pingindic-label');
            let color = getColorValue(COLORBAD);
            label.set_style(`color: ${color};`);
        }
    }
}

function getColorValue(colorKey) {
    try {
        return settings.get_string(colorKey);
    } catch (e) {
        switch (colorKey) {
            case COLORGOOD: return '#00FF00';
            case COLORNOGOOD: return '#FFFF00';
            case COLORBAD: return '#FF0000';
            default: return '#FFFFFF';
        }
    }
}

function update() {
    mpingindic.loadData();
    return GLib.SOURCE_CONTINUE;;
}

function init() {
}

function enable() {
    settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.pingindic');
    mpingindic = new Extension();
    Main.panel.addToStatusArea('mpingindic', mpingindic, 0, 'right');
    timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, settings.get_int(UPDTEDLY) * 1000, update);
}

function disable() {
    GLib.source_remove(timeout);
    mpingindic.destroy();
    mpingindic = null;
    settings = null;
    timeout = null;
    label = null;
    tagWatchOUT = null;
    tagWatchERR = null;
}

