/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'move-window-to-next-monitor';

const { GObject, Meta, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const _ = ExtensionUtils.gettext;

const Me = ExtensionUtils.getCurrentExtension();

var KeyboardShortcuts = class KeyboardShortcuts {
    constructor(settings) {
        this._grabbers = {};


        global.display.connect('accelerator-activated', (display, action, deviceId, timestamp) => {
            log("Accelerator Activated: [display=%s, action=%s, deviceId=%s, timestamp=%s]",
                display, action, deviceId, timestamp)
            this._onAccelerator(action)
        });
    }

    listenFor(accelerator, callback) {
        log('Trying to listen for hot key [accelerator=%s]', accelerator);
        let action = global.display.grab_accelerator(accelerator, 0);

        if (action == Meta.KeyBindingAction.NONE) {
            this.logger.error('Unable to grab accelerator [%s]', accelerator);
            return;
        }

        log('Grabbed accelerator [action={}]', action);
        let name = Meta.external_binding_name_for_action(action);
        log('Received binding name for action [name=%s, action=%s]',
            name, action)

        log('Requesting WM to allow binding [name=%s]', name)
        Main.wm.allowKeybinding(name, Shell.ActionMode.ALL)

        this._grabbers[action] = {
            name: name,
            accelerator: accelerator,
            callback: callback
        };
    }

    _onAccelerator(action) {
        let grabber = this._grabbers[action];

        if (grabber) {
            grabber.callback();
        } else {
            log('No listeners [action=%s]', action);
        }
    }
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('My Shiny Indicator'));

            this.add_child(new St.Icon({
                icon_name: 'face-smile-symbolic',
                style_class: 'system-status-icon',
            }));

            let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
            item.connect('activate', () => {
                Main.notify(_('Whatʼs up, folks?'));
            });
            this.menu.addMenuItem(item);
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {

        this.accel = new KeyboardShortcuts(this.settings);
        this.accel.listenFor("<super>KP_0", () => {
            log("Caught hotkey activation for next monitor.");
        });

        log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
        let numberOfMonitors = global.display.get_n_monitors();
        log(`Number of monitors: ${numberOfMonitors}`);
        let focusedWindow = global.display.focus_window;
        if (focusedWindow != null) {
            log(`Focused window: ${focusedWindow.get_title()}`);
            let focusedWindowMonitor = focusedWindow.get_monitor();
            log(`Focused window monitor: ${focusedWindowMonitor}`);
            let nextMonitor = global.display.get_monitor_neighbor_index(focusedWindowMonitor, Meta.DisplayDirection.RIGHT);
            log(`nextMonitor: ${nextMonitor}`);
            let isOnLastMonitor = nextMonitor < 0;
            log(`isOnLastMonitor: ${isOnLastMonitor}`);
        }
        // let display = Meta.Display;
        // log(`Is wayland compositor: ${Meta.is_wayland_compositor()}`);
        // log(`focus app?: ${Shell.WindowTracker.get_default().focus_app.get_name()}`);
        // let windowActors = global.get_window_actors().forEach(function (w) {
        //     let window = w.get_meta_window();
        //     log(`Found a window: ${window.get_id()}`);
        // });
        // log(`Monitor: ${windowActors}`);
        // let focusedWindow = global.display.get_focus_window();
        // log(`focusedWindow: ${focusedWindow}`);

        // let focusedWindowMonitor = focusedWindow.get_monitor();
        // log(`Active window monitor: ${focusedWindowMonitor}`);
        // focusedWindow.lower();
        // focusedWindow.
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
