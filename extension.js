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
            this._onAccelerator(action)
        });
    }

    listenFor(accelerator, callback) {
        log('Trying to listen for hot key ', accelerator);
        let action = global.display.grab_accelerator(accelerator, 0);

        if (action == Meta.KeyBindingAction.NONE) {
            log('Unable to grab accelerator ', accelerator);
            return;
        }

        log('Grabbed accelerator ', action);
        let name = Meta.external_binding_name_for_action(action);
        log('Received binding name for action ',
            name, action)

        log('Requesting WM to allow binding ', name)
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
            log('No listeners ', action);
        }
    }
}

var Mover = class WindowMover {
    moveRight() {
        let focusedWindow = global.display.focus_window;
        if (focusedWindow == null) {
            log('Unable to find focused window.');
            return;
        }
        let focusedWindowMonitor = focusedWindow.get_monitor();
        let nextMonitor = global.display.get_monitor_neighbor_index(focusedWindowMonitor, Meta.DisplayDirection.RIGHT);
        let isOnLastMonitor = nextMonitor < 0;
        var targetMonitor = (isOnLastMonitor) ? 0 : nextMonitor;
        focusedWindow.move_to_monitor(targetMonitor);
    }
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        // Enable keyboard shortcut.
        var windowMover = new Mover();

        this.nextMonitorHotkey = new KeyboardShortcuts(this.settings);
        this.nextMonitorHotkey.listenFor("<super>KP_0", () => {
            log("Caught hotkey activation for next monitor.");
            windowMover.moveRight();
        });
    }

    disable() {
        log('Disabling move to next window');
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
