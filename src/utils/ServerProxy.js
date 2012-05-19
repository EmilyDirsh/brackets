/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, FileError, brackets, unescape, window, WebSocket */


define(function (require, exports, module) {
    'use strict';

    var messageCount = 0;
    var callbacks = {};
    var ws = new WebSocket("ws://localhost:3000");
    var isOpen = false;
    var pendingCmds;

    ws.onopen = function () {
        isOpen = true;
        if (pendingCmds) {
            pendingCmds.forEach(function (cmd) {
                sendCommand(cmd);
            });
        }
    }

    ws.onmessage = function (message) {
        var m = JSON.parse(message.data);
        console.log("received: " + m.id);
        if (callbacks.hasOwnProperty(m.id)) {
            callbacks[m.id].apply(window, m.result);
            delete callbacks[m.id];
        }
    };

    function callCommand(namespace, command, args, isAsync, callback) {
        var id = messageCount++;
        callbacks[id] = callback;
        var cmd = JSON.stringify({id: id, namespace: namespace, command: command, args: args, isAsync: isAsync});
        if (!isOpen) {
            if (!pendingCmds) {
                pendingCmds = [];
            }
            pendingCmds.push(cmd);
            return;
        }
        sendCommand(cmd);
    }

    function sendCommand(cmd) {
        console.log("sending: " + cmd);
        ws.send(cmd);
    }

    var fs = {};

    /**
     * @constant No error.
     * TODO: (JRB) node returns 'null' for no error, not 0. So, right now, I've changed NativeFileSystem to check for both
     * but doing this is hacky.
     */
    fs.NO_ERROR                    = 0;

    
    /**
     * @constant Unknown error occurred.
     */
    fs.ERR_UNKNOWN                 = 1;
    
    /**
     * @constant Invalid parameters passed to function.
     */
    fs.ERR_INVALID_PARAMS          = 2;
    
    /**
     * @constant File or directory was not found.
     */
    fs.ERR_NOT_FOUND               = 3;
    
    /**
     * @constant File or directory could not be read.
     */
    fs.ERR_CANT_READ               = 4;
    
    /**
     * @constant An unsupported encoding value was specified.
     */
    fs.ERR_UNSUPPORTED_ENCODING    = 5;
    
    /**
     * @constant File could not be written.
     */
    fs.ERR_CANT_WRITE              = 6;
    
    /**
     * @constant Target directory is out of space. File could not be written.
     */
    fs.ERR_OUT_OF_SPACE            = 7;
    
    /**
     * @constant Specified path does not point to a file.
     */
    fs.ERR_NOT_FILE                = 8;
    
    /**
     * @constant Specified path does not point to a directory.
     */
    fs.ERR_NOT_DIRECTORY           = 9;
    
    /**
     * Display the OS File Open dialog, allowing the user to select
     * files or directories.
     *
     * @param {boolean} allowMultipleSelection If true, multiple files/directories can be selected.
     * @param {boolean} chooseDirectory If true, only directories can be selected. If false, only 
     *        files can be selected.
     * @param {string} title Tile of the open dialog.
     * @param {string} initialPath Initial path to display in the dialog. Pass NULL or "" to 
     *        display the last path chosen.
     * @param {Array.<string>} fileTypes Array of strings specifying the selectable file extensions. 
     *        These strings should not contain '.'. This parameter is ignored when 
     *        chooseDirectory=true.
     * @param {function(err, selection)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, selection) where selection is an array of the names of the selected files.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_INVALID_PARAMS
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.showOpenDialog = function (allowMultipleSelection, chooseDirectory, title, initialPath, fileTypes, callback) {
        console.log("Error: showOpenDialog not implemented yet");
    };
    
    /**
     * Reads the contents of a directory. 
     *
     * @param {string} path The path of the directory to read.
     * @param {function(err, files)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, files) where files is an array of the names of the files
     *        in the directory excluding '.' and '..'.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_CANT_READ
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.readdir = function (path, callback) {
        callCommand("fs", "readdir", [path], true, callback);
    };
    
    /**
     * Get information for the selected file or directory.
     *
     * @param {string} path The path of the file or directory to read.
     * @param {function(err, stats)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, stats) where stats is an object with isFile() and isDirectory() functions.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.stat = function (path, callback) {
        callCommand("fs", "statBrackets", [path], true, function (err, stats) {
            if (err) {
                callback(err, null);
            } else {
                callback(err, {
                    isFile: function () {
                        return stats.isFile;
                    },
                    isDirectory: function () {
                        return stats.isDirectory;
                    },
                    mtime: new Date(Date.parse(stats.mtime)),
                    filesize: stats.filesize
                });
            }
        });
    };
 
    /**
     * Reads the entire contents of a file. 
     *
     * @param {string} path The path of the file to read.
     * @param {string} encoding The encoding for the file. The only supported encoding is 'utf8'.
     * @param {function(err, data)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, data) where data is the contents of the file.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_CANT_READ
     *          ERR_UNSUPPORTED_ENCODING
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.readFile = function (path, encoding, callback) {
        callCommand("fs", "readFile", [path, encoding], true, callback);
    };
    
    /**
     * Write data to a file, replacing the file if it already exists. 
     *
     * @param {string} path The path of the file to write.
     * @param {string} data The data to write to the file.
     * @param {string} encoding The encoding for the file. The only supported encoding is 'utf8'.
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_UNSUPPORTED_ENCODING
     *          ERR_CANT_WRITE
     *          ERR_OUT_OF_SPACE
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.writeFile = function (path, data, encoding, callback) {
        callCommand("fs", "writeFile", [path, data, encoding], true, callback);
    };
    
    /**
     * Set permissions for a file or directory.
     *
     * @param {string} path The path of the file or directory
     * @param {number} mode The permissions for the file or directory, in numeric format (ie 0777)
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_CANT_WRITE
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.chmod = function (path, mode, callback) {
        console.log("Error: chmod not implemented yet");
    };
    
    /**
     * Delete a file.
     *
     * @param {string} path The path of the file to delete
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_NOT_FILE
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    fs.unlink = function (path, callback) {
        console.log("Error: unlink not implemented yet");
    };

    function getFileSystem() {
        return fs;
    }

    var app = {};

    /**
     * Quits native shell application
     */
    app.quit = function () {
        console.log("Error: app.quit not implemented yet");
    };

    /**
     * Invokes developer tools application
     */
    app.showDeveloperTools = function () {
        console.log("Error: app.showDeveloperTools not implemented yet");
    };

    app.getElapsedMilliseconds = function () {
        return 0;
    };

    function getAppProxy() {
        return app;
    }

    exports.getFileSystem = getFileSystem;
    exports.getAppProxy = getAppProxy;
});