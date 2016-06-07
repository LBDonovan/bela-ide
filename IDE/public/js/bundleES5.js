"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function e(t, n, r) {
	function s(o, u) {
		if (!n[o]) {
			if (!t[o]) {
				var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
			}var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
				var n = t[o][1][e];return s(n ? n : e);
			}, l, l.exports, e, t, n, r);
		}return n[o].exports;
	}var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
		s(r[o]);
	}return s;
})({ 1: [function (require, module, exports) {
		// IDE controller
		module.exports = {};

		var Model = require('./Models/Model');

		// set up models
		var models = {};
		models.project = new Model();
		models.settings = new Model();
		models.status = new Model();
		models.error = new Model();
		models.debug = new Model();

		// hack to prevent first status update causing wrong notifications
		models.status.setData({ running: false, building: false });

		// set up views
		// tab view
		var tabView = require('./Views/TabView');
		tabView.on('change', function () {
			return editorView.emit('resize');
		});

		// settings view
		var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
		settingsView.on('project-settings', function (data) {
			data.currentProject = models.project.getKey('currentProject');
			//console.log('project-settings', data);
			socket.emit('project-settings', data);
		});
		settingsView.on('IDE-settings', function (data) {
			data.currentProject = models.project.getKey('currentProject');
			//console.log('IDE-settings', data);
			socket.emit('IDE-settings', data);
		});

		// project view
		var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
		projectView.on('message', function (event, data) {
			if (!data.currentProject && models.project.getKey('currentProject')) {
				data.currentProject = models.project.getKey('currentProject');
			}
			data.timestamp = performance.now();
			consoleView.emit('openNotification', data);
			socket.emit(event, data);
		});

		// file view
		var fileView = new (require('./Views/FileView'))('fileManager', [models.project]);
		fileView.on('message', function (event, data) {
			if (!data.currentProject && models.project.getKey('currentProject')) {
				data.currentProject = models.project.getKey('currentProject');
			}
			if (!data.fileName && models.project.getKey('fileName')) {
				data.fileName = models.project.getKey('fileName');
			}
			data.timestamp = performance.now();
			consoleView.emit('openNotification', data);
			socket.emit(event, data);
		});

		// editor view
		var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings, models.debug], models.settings);
		editorView.on('change', function (fileData) {
			socket.emit('process-event', {
				event: 'upload',
				currentProject: models.project.getKey('currentProject'),
				newFile: models.project.getKey('fileName'),
				fileData: fileData,
				checkSyntax: parseInt(models.settings.getKey('liveSyntaxChecking'))
			});
		});
		editorView.on('breakpoint', function (line) {
			var breakpoints = models.project.getKey('breakpoints');
			for (var i = 0; i < breakpoints.length; i++) {
				if (breakpoints[i].line === line && breakpoints[i].file === models.project.getKey('fileName')) {
					socket.emit('debugger-event', 'removeBreakpoint', breakpoints[i]);
					models.project.spliceFromKey('breakpoints', i);
					return;
				}
			}
			var newBreakpoint = {
				line: line,
				file: models.project.getKey('fileName')
			};
			socket.emit('debugger-event', 'addBreakpoint', newBreakpoint);
			models.project.pushIntoKey('breakpoints', newBreakpoint);
			//console.log('after', breakpoints);
			//models.project.setKey('breakpoints', breakpoints);
		});

		// toolbar view
		var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings, models.debug]);
		toolbarView.on('process-event', function (event) {
			var breakpoints;
			if (models.debug.getKey('debugMode')) breakpoints = models.project.getKey('breakpoints');
			socket.emit('process-event', {
				event: event,
				currentProject: models.project.getKey('currentProject'),
				debug: models.debug.getKey('debugMode'),
				breakpoints: breakpoints
			});
		});
		toolbarView.on('clear-console', function () {
			return consoleView.emit('clear');
		});

		// console view
		var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings, models.debug], models.settings);
		consoleView.on('focus', function (focus) {
			return models.project.setKey('focus', focus);
		});
		consoleView.on('open-file', function (fileName, focus) {
			var data = {
				func: 'openFile',
				fileName: fileName,
				focus: focus,
				currentProject: models.project.getKey('currentProject')
			};
			socket.emit('project-event', data);
		});
		consoleView.on('input', function (value) {
			if (value) {
				var val = value.split(' ');
				var command = val.splice(0, 1);
				if (command[0] === 'gdb' && models.debug.getKey('debugMode')) socket.emit('debugger-event', 'exec', val.join(' '));
			}
		});

		// debugger view
		var debugView = new (require('./Views/DebugView'))('debugger', [models.debug, models.settings, models.project]);
		debugView.on('debugger-event', function (func) {
			return socket.emit('debugger-event', func);
		});
		debugView.on('debug-mode', function (status) {
			return models.debug.setKey('debugMode', status);
		});

		// setup socket
		var socket = io('/IDE');

		// socket events
		socket.on('report-error', function (error) {
			return consoleView.emit('warn', error.message || error);
		});

		socket.on('init', function (data) {

			$('#console-disconnect').remove();

			//console.log(data);
			var timestamp = performance.now();
			socket.emit('project-event', { func: 'openProject', currentProject: data[2].project, timestamp: timestamp });
			consoleView.emit('openNotification', { func: 'init', timestamp: timestamp });

			models.project.setData({ projectList: data[0], exampleList: data[1], currentProject: data[2].project });
			models.settings.setData(data[2]);

			//models.project.print();
			//models.settings.print();

			socket.emit('set-time', getDateString());
		});

		// project events
		socket.on('project-data', function (data) {
			var debug;
			if (data.debug) {
				debug = data.debug;
				data.debug = undefined;
			}
			consoleView.emit('closeNotification', data);
			models.project.setData(data);
			if (debug) {
				models.debug.setData(debug);
			}
			//models.settings.setData(data.settings);
			//models.project.print();
		});
		socket.on('project-list', function (project, list) {
			if (list.indexOf(models.project.getKey('currentProject')) === -1) {
				// this project has just been deleted
				console.log('project-list', 'openProject');
				socket.emit('project-event', { func: 'openProject', currentProject: project });
			}
			models.project.setKey('projectList', list);
		});
		socket.on('file-list', function (project, list) {
			if (project === models.project.getKey('currentProject')) {
				if (list.indexOf(models.project.getKey('fileName')) === -1) {
					// this file has just been deleted
					console.log('file-list', 'openProject');
					socket.emit('project-event', { func: 'openProject', currentProject: project });
				}
				models.project.setKey('fileList', list);
			}
		});
		socket.on('file-changed', function (project, fileName) {
			if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')) {
				console.log('file changed!');
				models.project.setKey('readOnly', true);
				models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
				//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
			}
		});

		socket.on('status', function (status, project) {
			if (project === models.project.getKey('currentProject') || project === undefined) {
				models.status.setData(status);
				//console.log('status', status);
			}
		});

		socket.on('project-settings-data', function (project, settings) {
			//console.log('project-settings-data', settings);
			if (project === models.project.getKey('currentProject')) models.project.setData(settings);
		});
		socket.on('IDE-settings-data', function (settings) {
			return models.settings.setData(settings);
		});

		socket.on('cpu-usage', function (data) {
			return models.status.setKey('CPU', data);
		});

		socket.on('disconnect', function () {
			consoleView.disconnect();
			models.project.setKey('readOnly', true);
		});

		socket.on('debugger-data', function (data) {
			//console.log('b', data.debugProject, models.project.getKey('currentProject'), data.debugFile, models.project.getKey('fileName'));
			if (data.debugProject === undefined || data.debugProject === models.project.getKey('currentProject')) {
				//(data.debugFile === undefined || data.debugFile === models.project.getKey('fileName'))){
				var debugFile = data.debugFile;
				if (debugFile && debugFile !== models.project.getKey('fileName')) {
					//console.log(debugFile);
					var newData = {
						func: 'openFile',
						currentProject: models.project.getKey('currentProject'),
						fileName: models.project.getKey('fileName'),
						newFile: debugFile,
						timestamp: performance.now(),
						debug: { debugLine: data.debugLine, debugFile: debugFile }
					};
					consoleView.emit('openNotification', newData);
					socket.emit('project-event', newData);
				} else {
					//console.log(data);
					models.debug.setData(data);
				}
			}
		});
		socket.on('debugger-variables', function (project, variables) {
			if (project === models.project.getKey('currentProject')) {
				models.debug.setKey('variables', variables);
			}
		});

		// model events
		// build errors
		models.status.on('set', function (data, changedKeys) {
			if (changedKeys.indexOf('syntaxError') !== -1) {
				parseErrors(data.syntaxError);
			}
		});
		// debug mode
		models.debug.on('change', function (data, changedKeys) {
			if (changedKeys.indexOf('debugMode') !== -1) {
				//console.log(!data.debugMode, models.debug.getKey('debugRunning'));
				if (!data.debugMode && models.debug.getKey('debugRunning')) socket.emit('debugger-event', 'stop');
				var data = {
					func: 'cleanProject',
					currentProject: models.project.getKey('currentProject'),
					timestamp: performance.now()
				};
				consoleView.emit('openNotification', data);
				socket.emit('project-event', data);
			}
		});

		// history
		{
			(function () {
				var lastState = {},
				    poppingState = true;

				// file / project changed
				models.project.on('change', function (data, changedKeys) {
					if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1) {
						var state = { file: data.fileName, project: data.currentProject };
						if (state.project !== lastState.project || state.file !== lastState.file) {
							$('title').html(data.fileName + ', ' + data.currentProject);
							if (!poppingState) {
								//console.log('push', state);
								history.pushState(state, null, null);
							}
							poppingState = false;
							lastState = state;
						}
					}
				});

				// load previously open file / project when browser's back button is clicked
				window.addEventListener('popstate', function (e) {
					if (e.state) {
						console.log('opening project ' + e.state.project + ' file ' + e.state.file);
						var data = {
							currentProject: e.state.project,
							fileName: e.state.file,
							func: 'openFile',
							timestamp: performance.now()
						};
						consoleView.emit('openNotification', data);
						socket.emit('project-event', data);
						poppingState = true;
					}
				});
			})();
		}

		// local functions
		// parse errors from g++
		function parseErrors(data) {
			//console.log('parsing', data, data.split('\n'));
			data = data.split('\n');

			var errors = [];
			for (var i = 0; i < data.length; i++) {

				// ignore errors which begin with 'make'
				if (data[i].length > 1 && data[i].slice(0, 4) !== 'make') {

					var msg = data[i].split('\n');

					for (var j = 0; j < msg.length; j++) {

						var str = msg[j].split(':');
						//console.log(str);
						// str[0] -> file name + path
						// str[1] -> row number
						// str[2] -> column number
						// str[3] -> type of error
						// str[4+] > error message

						if (str[3] === ' error') {
							errors.push({
								file: str[0].split('/').pop(),
								row: str[1] - 1,
								column: str[2],
								text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
								type: "error"
							});
						} else if (str[3] == ' fatal error') {
							errors.push({
								file: str[0].split('/').pop(),
								row: str[1] - 1,
								column: str[2],
								text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
								type: "error"
							});
						} else if (str[3] == ' warning') {
							errors.push({
								file: str[0].split('/').pop(),
								row: str[1] - 1,
								column: str[2],
								text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
								type: "warning"
							});
						} else {
							//console.log('rejected error string: '+str);
							if (str[2] && str[2].indexOf('linker') !== -1) {
								console.log('linker error');
								consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
							}
						}
					}
				}
			}

			// if no gcc errors have been parsed correctly, but make still thinks there is an error
			// error will contain string 'make: *** [<path>] Error 1'
			if (!errors.length && data.indexOf('make: *** ') !== -1 && data.indexOf('Error 1') !== -1) {
				errors.push({
					text: data,
					type: 'error'
				});
			}

			var currentFileErrors = [],
			    otherFileErrors = [];
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var err = _step.value;

					if (!err.file || err.file === models.project.getKey('fileName')) {
						err.currentFile = true;
						currentFileErrors.push(err);
					} else {
						err.currentFile = false;
						err.text = 'In file ' + err.file + ': ' + err.text;
						otherFileErrors.push(err);
					}
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			models.error.setKey('allErrors', errors);
			models.error.setKey('currentFileErrors', currentFileErrors);
			models.error.setKey('otherFileErrors', otherFileErrors);

			models.error.setKey('verboseSyntaxError', data);
		}

		function getDateString() {

			var str = '';

			// get browser's system's time
			var date = new Date();

			// format into string suitable for linux date command
			var month = date.getMonth() + 1;
			if (month < 10) {
				str += '0' + month;
			} else {
				str += month;
			}

			var day = date.getDate();
			if (day < 10) {
				str += '0' + day;
			} else {
				str += day;
			}

			var hour = date.getHours();
			if (hour < 10) {
				str += '0' + hour;
			} else {
				str += hour;
			}

			var minutes = date.getMinutes();
			if (minutes < 10) {
				str += '0' + minutes;
			} else {
				str += minutes;
			}

			str += date.getFullYear();

			str += '.';

			var seconds = date.getSeconds();
			if (seconds < 10) {
				str += '0' + seconds;
			} else {
				str += seconds;
			}

			return str;
		}
	}, { "./Models/Model": 2, "./Views/ConsoleView": 3, "./Views/DebugView": 4, "./Views/EditorView": 5, "./Views/FileView": 6, "./Views/ProjectView": 7, "./Views/SettingsView": 8, "./Views/TabView": 9, "./Views/ToolbarView": 10 }], 2: [function (require, module, exports) {
		var EventEmitter = require('events').EventEmitter;

		var Model = function (_EventEmitter) {
			_inherits(Model, _EventEmitter);

			function Model(data) {
				_classCallCheck(this, Model);

				var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Model).call(this));

				var _data = data || {};
				_this._getData = function () {
					return _data;
				};
				return _this;
			}

			_createClass(Model, [{
				key: "getKey",
				value: function getKey(key) {
					return this._getData()[key];
				}
			}, {
				key: "setData",
				value: function setData(newData) {
					if (!newData) return;
					var newKeys = [];
					for (var key in newData) {
						if (!_equals(newData[key], this._getData()[key], false)) {
							newKeys.push(key);
							this._getData()[key] = newData[key];
						}
					}
					if (newKeys.length) {
						//console.log('changed setdata');
						this.emit('change', this._getData(), newKeys);
					}
					this.emit('set', this._getData(), Object.keys(newData));
				}
			}, {
				key: "setKey",
				value: function setKey(key, value) {
					if (!_equals(value, this._getData()[key], false)) {
						this._getData()[key] = value;
						//console.log('changed setkey');
						this.emit('change', this._getData(), [key]);
					}
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "pushIntoKey",
				value: function pushIntoKey(key, value) {
					this._getData()[key].push(value);
					this.emit('change', this._getData(), [key]);
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "spliceFromKey",
				value: function spliceFromKey(key, index) {
					this._getData()[key].splice(index, 1);
					this.emit('change', this._getData(), [key]);
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "print",
				value: function print() {
					console.log(this._getData());
				}
			}]);

			return Model;
		}(EventEmitter);

		module.exports = Model;

		function _equals(a, b, log) {
			if (log) console.log('a:', a, 'b:', b);
			if (a instanceof Array && b instanceof Array) {
				if (log) console.log('arrays', 'a:', a, 'b:', b, a.length === b.length, a.every(function (element, index) {
					return _equals(element, b[index], log);
				}));
				return a.length === b.length && a.every(function (element, index) {
					return _equals(element, b[index], log);
				});
			} else if (a instanceof Object && b instanceof Object) {
				if (log) console.log('objects', 'a:', a, 'b:', b);
				for (var c in a) {
					if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
					if (!_equals(a[c], b[c], log)) return false;
				}
				return true;
			} else {
				if (log) console.log('a:', a, 'b:', b, Object.is(a, b), a === b);
				return Object.is(a, b);
			}
		}
	}, { "events": 14 }], 3: [function (require, module, exports) {
		'use strict';

		var View = require('./View');
		var _console = require('../console');

		var verboseDebugOutput = false;

		var ConsoleView = function (_View) {
			_inherits(ConsoleView, _View);

			function ConsoleView(className, models, settings) {
				_classCallCheck(this, ConsoleView);

				var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(ConsoleView).call(this, className, models, settings));

				_this2.on('clear', function () {
					return _console.clear();
				});
				_console.on('focus', function (focus) {
					return _this2.emit('focus', focus);
				});
				_console.on('open-file', function (fileName, focus) {
					return _this2.emit('open-file', fileName, focus);
				});

				_this2.on('openNotification', _this2.openNotification);
				_this2.on('closeNotification', _this2.closeNotification);
				_this2.on('warn', function (warning, id) {
					console.log(warning);
					_console.warn(warning, id);
				});

				_this2.form = document.getElementById('beaglert-consoleForm');
				_this2.input = document.getElementById('beaglert-consoleInput');

				// console command line input events
				_this2.form.addEventListener('submit', function (e) {
					e.preventDefault();
					_this2.emit('input', _this2.input.value);
					_this2.input.value = '';
				});
				return _this2;
			}

			_createClass(ConsoleView, [{
				key: "openNotification",
				value: function openNotification(data) {
					if (!funcKey[data.func]) console.log(data.func);
					var output = funcKey[data.func];
					if (data.newProject || data.currentProject) output += ' ' + (data.newProject || data.currentProject);
					if (data.newFile || data.fileName) output += ' ' + (data.newFile || data.fileName);
					_console.notify(output + '...', data.timestamp);
				}
			}, {
				key: "closeNotification",
				value: function closeNotification(data) {
					if (data.error) {
						_console.reject(' ' + data.error, data.timestamp);
					} else {
						_console.fulfill(' done', data.timestamp);
					}
				}
			}, {
				key: "disconnect",
				value: function disconnect() {
					console.log('disconnected');
					_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
				}

				// model events
				// syntax

			}, {
				key: "_syntaxLog",
				value: function _syntaxLog(log, data) {
					if (this.settings.fullSyntaxCheckOutput) {
						_console.log(log);
					}
				}
			}, {
				key: "__verboseSyntaxError",
				value: function __verboseSyntaxError(log, data) {
					if (parseInt(this.settings.getKey('verboseErrors'))) {
						var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = log[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var line = _step2.value;

								_console.log(line.split(' ').join('&nbsp;'));
							}
						} catch (err) {
							_didIteratorError2 = true;
							_iteratorError2 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion2 && _iterator2.return) {
									_iterator2.return();
								}
							} finally {
								if (_didIteratorError2) {
									throw _iteratorError2;
								}
							}
						}
					}
				}
			}, {
				key: "__allErrors",
				value: function __allErrors(errors, data) {
					//console.log(data);
					_console.newErrors(errors);
				}

				// build

			}, {
				key: "_buildLog",
				value: function _buildLog(log, data) {
					//console.log(log, data);
					//if (this.settings.fullBuildOutput){
					_console.log(log);
					//}
				}

				// bela

			}, {
				key: "__belaLog",
				value: function __belaLog(log, data) {
					_console.log(log);
				}
			}, {
				key: "_building",
				value: function _building(status, data) {
					var timestamp = performance.now();
					if (status) {
						_console.notify('Building project...', timestamp, true);
						_console.fulfill('', timestamp, true);
					} else {
						_console.notify('Build finished', timestamp, true);
						_console.fulfill('', timestamp, true);
					}
				}
			}, {
				key: "_running",
				value: function _running(status, data) {
					var timestamp = performance.now();
					if (status) {
						_console.notify('Running project...', timestamp, true);
						_console.fulfill('', timestamp, true);
					} else {
						_console.notify('Bela stopped', timestamp, true);
						if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined') {
							_console.reject(' with signal ' + data.belaResult.signal, timestamp, true);
						} else {
							_console.fulfill('', timestamp, true);
						}
					}
				}
			}, {
				key: "_CPU",
				value: function _CPU(data) {
					if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela != 0) {
						_console.log(data.bela.split(' ').join('&nbsp;'));
					}
				}
			}, {
				key: "_consoleDelete",
				value: function _consoleDelete(value) {
					_console.setConsoleDelete(parseInt(value));
				}
			}, {
				key: "_verboseDebug",
				value: function _verboseDebug(value) {
					verboseDebugOutput = parseInt(value);
				}
			}, {
				key: "__debugReason",
				value: function __debugReason(reason) {
					console.log('reason', reason);
					var timestamp = performance.now();
					_console.notify(reason, timestamp, true);
					if (reason === 'exited' || reason === 'exited-signalled') _console.reject('', timestamp, true);else _console.fulfill('', timestamp, false);
				}
			}, {
				key: "_debugSignal",
				value: function _debugSignal(signal) {
					console.log('signal', signal);
					var timestamp = performance.now();
					_console.notify(signal, timestamp, true);
					_console.reject('', timestamp, true);
				}
			}, {
				key: "_gdbLog",
				value: function _gdbLog(data) {
					if (verboseDebugOutput) _console.log(data);else console.log(data);
				}
			}, {
				key: "__debugBelaLog",
				value: function __debugBelaLog(data) {
					_console.log(data);
				}
			}]);

			return ConsoleView;
		}(View);

		module.exports = ConsoleView;

		var funcKey = {
			'openProject': 'Opening project',
			'openExample': 'Opening example',
			'newProject': 'Creating project',
			'saveAs': 'Saving project',
			'deleteProject': 'Deleting project',
			'cleanProject': 'Cleaning project',
			'openFile': 'Opening file',
			'newFile': 'Creating file',
			'uploadFile': 'Uploading file',
			'renameFile': 'Renaming file',
			'deleteFile': 'Deleting file',
			'init': 'Initialising'
		};
	}, { "../console": 12, "./View": 11 }], 4: [function (require, module, exports) {
		var View = require('./View');

		var DebugView = function (_View2) {
			_inherits(DebugView, _View2);

			function DebugView(className, models) {
				_classCallCheck(this, DebugView);

				var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(DebugView).call(this, className, models));

				_this3._debugMode(false);
				return _this3;
			}

			// UI events


			_createClass(DebugView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					var data = $element.data();
					var func = data.func;
					if (func && this[func]) {
						this[func]($element.val());
					}
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					this.setLocation('');
					this.emit('debugger-event', $element.data().func);
				}
			}, {
				key: "debugMode",
				value: function debugMode(status) {
					this.emit('debug-mode', status == true);
				}

				// model events

			}, {
				key: "_debugMode",
				value: function _debugMode(status) {
					if (!status) {
						this.$parents.find('button').prop('disabled', 'disabled');
					}
				}
				// debugger process has started or stopped

			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					this.clearVariableList();
					this.clearBacktrace();
					this.$parents.find('button').prop('disabled', 'disabled');
					if (!status) this.setLocation('n/a');
				}
				// debugger is doing something

			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (!status) {
						this.$parents.find('button:not(#debugInterrupt)').prop('disabled', '');
						$('#expList, #backtraceList').removeClass('debuggerOutOfScope');
					} else {
						this.$parents.find('button:not(#debugInterrupt)').prop('disabled', 'disabled');
						$('#expList, #backtraceList').addClass('debuggerOutOfScope');
					}
				}
			}, {
				key: "_debugInterruptable",
				value: function _debugInterruptable(status) {
					if (status) $('#debugInterrupt').prop('disabled', '');else $('#debugInterrupt').prop('disabled', 'disabled');
				}
			}, {
				key: "_debugStatus",
				value: function _debugStatus(value, data) {
					if (value) this.setStatus(value);
				}
			}, {
				key: "_debugReason",
				value: function _debugReason(value) {
					this.setStatus($('#debuggerStatus').html() + ', ' + value);
				}
			}, {
				key: "_debugLine",
				value: function _debugLine(line, data) {
					var location = '';
					if (data.debugFile) location += data.debugFile + ', line ';

					if (data.debugLine) location += data.debugLine;

					this.setLocation(location);
				}
			}, {
				key: "_variables",
				value: function _variables(variables) {
					console.log(variables);
					this.clearVariableList();
					var _iteratorNormalCompletion3 = true;
					var _didIteratorError3 = false;
					var _iteratorError3 = undefined;

					try {
						for (var _iterator3 = variables[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
							var variable = _step3.value;

							this.addVariable($('#expList'), variable);
						}
					} catch (err) {
						_didIteratorError3 = true;
						_iteratorError3 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion3 && _iterator3.return) {
								_iterator3.return();
							}
						} finally {
							if (_didIteratorError3) {
								throw _iteratorError3;
							}
						}
					}

					prepareList();
				}
			}, {
				key: "_backtrace",
				value: function _backtrace(trace) {
					this.clearBacktrace();
					var _iteratorNormalCompletion4 = true;
					var _didIteratorError4 = false;
					var _iteratorError4 = undefined;

					try {
						for (var _iterator4 = trace[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
							var item = _step4.value;

							$('<li></li>').text(item).appendTo($('#backtraceList'));
						}
					} catch (err) {
						_didIteratorError4 = true;
						_iteratorError4 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion4 && _iterator4.return) {
								_iterator4.return();
							}
						} finally {
							if (_didIteratorError4) {
								throw _iteratorError4;
							}
						}
					}
				}

				// utility methods

			}, {
				key: "setStatus",
				value: function setStatus(value) {
					$('#debuggerStatus').html(value);
				}
			}, {
				key: "setLocation",
				value: function setLocation(value) {
					$('#debuggerLocation').html(value);
				}
			}, {
				key: "clearVariableList",
				value: function clearVariableList() {
					$('#expList').empty();
				}
			}, {
				key: "clearBacktrace",
				value: function clearBacktrace() {
					$('#backtraceList').empty();
				}
			}, {
				key: "addVariable",
				value: function addVariable(parent, variable) {
					var name;
					if (variable.key) name = variable.key;else {
						name = variable.name.split('.');
						if (name.length) name = name[name.length - 1];
					}
					//console.log('adding variable', name, variable);
					var li = $('<li></li>');
					var table = $('<table></table>').appendTo(li);
					$('<td></td>').text(variable.type).addClass('debuggerType').appendTo(table);
					$('<td></td>').text(name).addClass('debuggerName').appendTo(table);
					var valTD = $('<td></td>').text(variable.value).addClass('debuggerValue').appendTo(table);
					li.attr('id', variable.name).appendTo(parent);
					if (variable.numchild && variable.children && variable.children.length) {
						var ul = $('<ul></ul>').appendTo(li);
						var _iteratorNormalCompletion5 = true;
						var _didIteratorError5 = false;
						var _iteratorError5 = undefined;

						try {
							for (var _iterator5 = variable.children[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
								var child = _step5.value;

								this.addVariable(ul, child);
							}
						} catch (err) {
							_didIteratorError5 = true;
							_iteratorError5 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion5 && _iterator5.return) {
									_iterator5.return();
								}
							} finally {
								if (_didIteratorError5) {
									throw _iteratorError5;
								}
							}
						}
					}
					if (variable.value == undefined) {
						li.addClass('debuggerOutOfScope');
						valTD.text('out of scope');
					}
				}
			}]);

			return DebugView;
		}(View);

		module.exports = DebugView;

		function prepareList() {
			$('#expList').find('li:has(ul)').each(function () {
				var $this = $(this);
				if (!$this.hasClass('collapsed')) {
					$this.click(function (event) {
						$(this).toggleClass('expanded');
						$(this).children('ul').toggle('fast');
						return false;
					}).addClass('collapsed').children('ul').hide();
				}
			});
		};
	}, { "./View": 11 }], 5: [function (require, module, exports) {
		var View = require('./View');
		var Range = ace.require('ace/range').Range;

		var uploadDelay = 50;

		var uploadBlocked = false;
		var currentFile;

		var EditorView = function (_View3) {
			_inherits(EditorView, _View3);

			function EditorView(className, models) {
				_classCallCheck(this, EditorView);

				var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(EditorView).call(this, className, models));

				_this4.editor = ace.edit('editor');
				ace.require("ace/ext/language_tools");

				// set syntax mode
				_this4.editor.session.setMode('ace/mode/c_cpp');
				_this4.editor.$blockScrolling = Infinity;

				// set theme
				_this4.editor.setTheme("ace/theme/github");

				// autocomplete settings
				_this4.editor.setOptions({
					enableBasicAutocompletion: true,
					enableLiveAutocompletion: false,
					enableSnippets: true
				});

				// this function is called when the user modifies the editor
				_this4.editor.session.on('change', function (e) {
					//console.log('upload', !uploadBlocked);
					if (!uploadBlocked) _this4.editorChanged();
				});

				// set/clear breakpoints when the gutter is clicked
				_this4.editor.on("guttermousedown", function (e) {
					var target = e.domEvent.target;
					if (target.className.indexOf("ace_gutter-cell") == -1) return;
					if (!_this4.editor.isFocused()) return;
					if (e.clientX > 25 + target.getBoundingClientRect().left) return;

					var row = e.getDocumentPosition().row;

					_this4.emit('breakpoint', row);

					e.stop();
				});

				_this4.on('resize', function () {
					return _this4.editor.resize();
				});

				return _this4;
			}

			_createClass(EditorView, [{
				key: "editorChanged",
				value: function editorChanged() {
					var _this5 = this;

					clearTimeout(this.uploadTimeout);
					this.uploadTimeout = setTimeout(function () {
						return _this5.emit('change', _this5.editor.getValue());
					}, uploadDelay);
				}

				// model events
				// new file saved

			}, {
				key: "_fileData",
				value: function _fileData(data, opts) {

					if (data instanceof ArrayBuffer) {
						//console.log('arraybuffer');
						try {
							data = String.fromCharCode.apply(null, new Uint8Array(data));
						} catch (e) {
							console.log(e);
							return;
						}
					}

					// block upload
					uploadBlocked = true;

					// put the file into the editor
					this.editor.session.setValue(data, -1);

					// unblock upload
					uploadBlocked = false;

					// force a syntax check
					this.emit('change');

					// focus the editor
					this._focus(opts.focus);
				}
				// editor focus has changed

			}, {
				key: "_focus",
				value: function _focus(data) {

					if (data && data.line !== undefined && data.column !== undefined) this.editor.gotoLine(data.line, data.column);

					this.editor.focus();
				}
				// syntax errors in current file have changed

			}, {
				key: "_currentFileErrors",
				value: function _currentFileErrors(errors) {

					// clear any error annotations on the ace editor
					this.editor.session.clearAnnotations();

					if (errors.length >= 1) {
						// errors exist!
						// annotate the errors in this file
						this.editor.session.setAnnotations(errors);
					}
				}
				// autocomplete settings have changed

			}, {
				key: "_liveAutocompletion",
				value: function _liveAutocompletion(status) {
					//console.log(status, (parseInt(status) === 1));
					this.editor.setOptions({
						enableLiveAutocompletion: parseInt(status) === 1
					});
				}
				// readonly status has changed

			}, {
				key: "_readOnly",
				value: function _readOnly(status) {
					if (status) {
						this.editor.setReadOnly(true);
					} else {
						this.editor.setReadOnly(false);
					}
				}
				// a new file has been opened

			}, {
				key: "_fileName",
				value: function _fileName(name, data) {
					currentFile = name;
					this.__breakpoints(data.breakpoints, data);
				}
				// breakpoints have been changed

			}, {
				key: "__breakpoints",
				value: function __breakpoints(breakpoints, data) {
					//console.log('setting breakpoints', breakpoints);
					this.editor.session.clearBreakpoints();
					var _iteratorNormalCompletion6 = true;
					var _didIteratorError6 = false;
					var _iteratorError6 = undefined;

					try {
						for (var _iterator6 = breakpoints[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
							var breakpoint = _step6.value;

							if (breakpoint.file === data.fileName) {
								this.editor.session.setBreakpoint(breakpoint.line);
							}
						}
					} catch (err) {
						_didIteratorError6 = true;
						_iteratorError6 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion6 && _iterator6.return) {
								_iterator6.return();
							}
						} finally {
							if (_didIteratorError6) {
								throw _iteratorError6;
							}
						}
					}
				}
				// debugger highlight line has changed

			}, {
				key: "__debugLine",
				value: function __debugLine(line, data) {
					console.log(line, data.debugFile, currentFile);
					this.removeDebuggerMarker();

					// add new marker at line
					if (line && data.debugFile === currentFile) {
						this.editor.session.addMarker(new Range(line - 1, 0, line - 1, 1), "breakpointMarker", "fullLine");
						this.editor.gotoLine(line, 0);
					}
				}
				// debugger process has started or stopped

			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					if (!status) {
						this.removeDebuggerMarker();
					}
				}
			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (status) {
						this.removeDebuggerMarker();
					}
				}
			}, {
				key: "removeDebuggerMarker",
				value: function removeDebuggerMarker() {
					var _this6 = this;

					var markers = this.editor.session.getMarkers();

					// remove existing marker
					Object.keys(markers).forEach(function (key, index) {
						if (markers[key].clazz === 'breakpointMarker') {
							_this6.editor.session.removeMarker(markers[key].id);
						}
					});
				}
			}]);

			return EditorView;
		}(View);

		module.exports = EditorView;
	}, { "./View": 11 }], 6: [function (require, module, exports) {
		var View = require('./View');

		var sourceIndeces = ['cpp', 'c', 'S'];
		var headerIndeces = ['h', 'hh', 'hpp'];

		var FileView = function (_View4) {
			_inherits(FileView, _View4);

			function FileView(className, models) {
				_classCallCheck(this, FileView);

				// hack to upload file

				var _this7 = _possibleConstructorReturn(this, Object.getPrototypeOf(FileView).call(this, className, models));

				$('#uploadFileInput').on('change', function (e) {
					var _iteratorNormalCompletion7 = true;
					var _didIteratorError7 = false;
					var _iteratorError7 = undefined;

					try {
						var _loop = function _loop() {
							var file = _step7.value;
							reader = new FileReader();

							reader.onload = function (ev) {
								return _this7.emit('message', 'project-event', { func: 'uploadFile', newFile: file.name, fileData: ev.target.result });
							};
							reader.readAsArrayBuffer(file);
						};

						for (var _iterator7 = e.target.files[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
							var reader;

							_loop();
						}
					} catch (err) {
						_didIteratorError7 = true;
						_iteratorError7 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion7 && _iterator7.return) {
								_iterator7.return();
							}
						} finally {
							if (_didIteratorError7) {
								throw _iteratorError7;
							}
						}
					}
				});

				// drag and drop file upload on editor
				$('#editor').on('dragenter dragover drop', function (e) {
					e.stopPropagation();
					if (e.type === 'drop') {
						var _iteratorNormalCompletion8 = true;
						var _didIteratorError8 = false;
						var _iteratorError8 = undefined;

						try {
							var _loop2 = function _loop2() {
								var file = _step8.value;
								reader = new FileReader();

								reader.onload = function (ev) {
									return _this7.emit('message', 'project-event', { func: 'uploadFile', newFile: file.name, fileData: ev.target.result });
								};
								reader.readAsArrayBuffer(file);
							};

							for (var _iterator8 = e.originalEvent.dataTransfer.files[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
								var reader;

								_loop2();
							}
						} catch (err) {
							_didIteratorError8 = true;
							_iteratorError8 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion8 && _iterator8.return) {
									_iterator8.return();
								}
							} finally {
								if (_didIteratorError8) {
									throw _iteratorError8;
								}
							}
						}
					}
					return false;
				});

				return _this7;
			}

			// UI events


			_createClass(FileView, [{
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "newFile",
				value: function newFile(func) {
					var name = prompt("Enter the name of the new file");
					if (name !== null) {
						this.emit('message', 'project-event', { func: func, newFile: name });
					}
				}
			}, {
				key: "uploadFile",
				value: function uploadFile(func) {
					$('#uploadFileInput').trigger('click');
				}
			}, {
				key: "renameFile",
				value: function renameFile(func) {
					var name = prompt("Enter the new name of the file");
					if (name !== null) {
						this.emit('message', 'project-event', { func: func, newFile: name });
					}
				}
			}, {
				key: "deleteFile",
				value: function deleteFile(func) {
					var cont = confirm("This can't be undone! Continue?");
					if (cont) {
						this.emit('message', 'project-event', { func: func });
					}
				}
			}, {
				key: "openFile",
				value: function openFile(e) {
					this.emit('message', 'project-event', { func: 'openFile', newFile: $(e.currentTarget).html() });
				}

				// model events

			}, {
				key: "_fileList",
				value: function _fileList(files, data) {
					var _this8 = this;

					var $files = $('#fileList');
					$files.empty();

					var headers = [];
					var sources = [];
					var resources = [];

					for (var i = 0; i < files.length; i++) {

						var ext = files[i].split('.')[1];

						if (sourceIndeces.indexOf(ext) !== -1) {
							sources.push(files[i]);
						} else if (headerIndeces.indexOf(ext) !== -1) {
							headers.push(files[i]);
						} else if (files[i]) {
							resources.push(files[i]);
						}
					}

					headers.sort();
					sources.sort();
					resources.sort();

					if (headers.length) {
						$('<li></li>').html('Headers:').appendTo($files);
					}
					for (var _i = 0; _i < headers.length; _i++) {
						$('<li></li>').addClass('sourceFile').html(headers[_i]).appendTo($files).on('click', function (e) {
							return _this8.openFile(e);
						});
					}

					if (sources.length) {
						$('<li></li>').html('Sources:').appendTo($files);
					}
					for (var _i2 = 0; _i2 < sources.length; _i2++) {
						$('<li></li>').addClass('sourceFile').html(sources[_i2]).appendTo($files).on('click', function (e) {
							return _this8.openFile(e);
						});
					}

					if (resources.length) {
						$('<li></li>').html('Resources:').appendTo($files);
					}
					for (var _i3 = 0; _i3 < resources.length; _i3++) {
						$('<li></li>').addClass('sourceFile').html(resources[_i3]).appendTo($files).on('click', function (e) {
							return _this8.openFile(e);
						});
					}

					if (data && data.fileName) this._fileName(data.fileName);
				}
			}, {
				key: "_fileName",
				value: function _fileName(file, data) {

					// select the opened file in the file manager tab
					$('.selectedFile').removeClass('selectedFile');
					$('#fileList>li').each(function () {
						if ($(this).html() === file) {
							$(this).addClass('selectedFile');
						}
					});

					if (data && data.currentProject) {
						// set download link
						$('#downloadFileLink').attr('href', '/download?project=' + data.currentProject + '&file=' + file);
					}
				}
			}]);

			return FileView;
		}(View);

		module.exports = FileView;
	}, { "./View": 11 }], 7: [function (require, module, exports) {
		var View = require('./View');

		var ProjectView = function (_View5) {
			_inherits(ProjectView, _View5);

			function ProjectView(className, models) {
				_classCallCheck(this, ProjectView);

				return _possibleConstructorReturn(this, Object.getPrototypeOf(ProjectView).call(this, className, models));
			}

			// UI events


			_createClass(ProjectView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					//console.log($element.prop('id'));
					//if ($element.prop('id') === 'projects'){
					this.emit('message', 'project-event', { func: $element.data().func, currentProject: $element.val() });
					//} else if ($element.prop('id') === 'examples'){
					//this.emit('message', 'example-event', {func: $element.data().func, example: $element.val()})
					//}
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "newProject",
				value: function newProject(func) {
					var name = prompt("Enter the name of the new project");
					if (name !== null) {
						this.emit('message', 'project-event', { func: func, newProject: name });
					}
				}
			}, {
				key: "saveAs",
				value: function saveAs(func) {
					var name = prompt("Enter the name of the new project");
					if (name !== null) {
						this.emit('message', 'project-event', { func: func, newProject: name });
					}
				}
			}, {
				key: "deleteProject",
				value: function deleteProject(func) {
					var cont = confirm("This can't be undone! Continue?");
					if (cont) {
						this.emit('message', 'project-event', { func: func });
					}
				}
			}, {
				key: "cleanProject",
				value: function cleanProject(func) {
					this.emit('message', 'project-event', { func: func });
				}

				// model events

			}, {
				key: "_projectList",
				value: function _projectList(projects, data) {

					var $projects = $('#projects');
					$projects.empty();

					// add an empty option to menu and select it
					var opt = $('<option></option>').attr({ 'value': '', 'selected': 'selected' }).html('--Projects--').appendTo($projects);

					// fill project menu with projects
					for (var i = 0; i < projects.length; i++) {
						if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.') {
							var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
						}
					}

					if (data && data.currentProject) this._currentProject(data.currentProject);
				}
			}, {
				key: "_exampleList",
				value: function _exampleList(examples) {

					var $examples = $('#examples');
					$examples.empty();

					// add an empty option to menu and select it
					var opt = $('<option></option>').attr({ 'value': '', 'selected': 'selected' }).html('--Examples--').appendTo($examples);

					// fill project menu with examples
					for (var i = 0; i < examples.length; i++) {
						if (examples[i] && examples[i] !== 'undefined' && examples[i] !== 'exampleTempProject' && examples[i][0] !== '.') {
							var opt = $('<option></option>').attr('value', examples[i]).html(examples[i]).appendTo($examples);
						}
					}
				}
			}, {
				key: "_currentProject",
				value: function _currentProject(project) {

					// unselect currently selected project
					$('#projects').find('option').filter(':selected').attr('selected', '');

					if (project === 'exampleTempProject') {
						// select no project
						$('#projects option:first-child').attr('selected', 'selected');
					} else {
						// select new project
						$('#projects option[value="' + project + '"]').attr('selected', 'selected');
						// unselect currently selected example
						$('#examples').find('option').filter(':selected').attr('selected', '');
						// select no example
						$('#examples option:first-child').attr('selected', 'selected');
					}

					// set download link
					$('#downloadLink').attr('href', '/download?project=' + project);
				}
			}]);

			return ProjectView;
		}(View);

		module.exports = ProjectView;
	}, { "./View": 11 }], 8: [function (require, module, exports) {
		var View = require('./View');

		var SettingsView = function (_View6) {
			_inherits(SettingsView, _View6);

			function SettingsView(className, models, settings) {
				_classCallCheck(this, SettingsView);

				//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));

				var _this10 = _possibleConstructorReturn(this, Object.getPrototypeOf(SettingsView).call(this, className, models, settings));

				_this10.settings.on('change', function (data) {
					return _this10._IDESettings(data);
				});
				_this10.$elements.filterByData = function (prop, val) {
					return this.filter(function () {
						return $(this).data(prop) == val;
					});
				};
				return _this10;
			}

			_createClass(SettingsView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					var data = $element.data();
					var func = data.func;
					var key = data.key;
					if (func && this[func]) {
						this[func](func, key, $element.val());
					}
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "inputChanged",
				value: function inputChanged($element, e) {
					var data = $element.data();
					var func = data.func;
					var key = data.key;
					var type = $element.prop('type');
					if (type === 'number' || type === 'text') {
						if (func && this[func]) {
							this[func](func, key, $element.val());
						}
					} else if (type === 'checkbox') {
						if (func && this[func]) {
							this[func](func, key, $element.is(':checked') ? 1 : 0);
						}
					}
				}
			}, {
				key: "setCLArg",
				value: function setCLArg(func, key, value) {
					this.emit('project-settings', { func: func, key: key, value: value });
				}
			}, {
				key: "restoreDefaultCLArgs",
				value: function restoreDefaultCLArgs(func) {
					this.emit('project-settings', { func: func });
				}
			}, {
				key: "setIDESetting",
				value: function setIDESetting(func, key, value) {
					console.log(func, key, value);
					this.emit('IDE-settings', { func: func, key: key, value: value });
				}
			}, {
				key: "restoreDefaultIDESettings",
				value: function restoreDefaultIDESettings(func) {
					this.emit('IDE-settings', { func: func });
				}

				// model events

			}, {
				key: "_CLArgs",
				value: function _CLArgs(data) {
					var fullString = '';
					for (var key in data) {
						this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
						fullString += (key === 'user' ? '' : key) + data[key] + ' ';
					}
					$('#C_L_ARGS').val(fullString);
				}
			}, {
				key: "_IDESettings",
				value: function _IDESettings(data) {
					for (var key in data) {
						this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
					}
				}
			}, {
				key: "_breakpoints",
				value: function _breakpoints(value, keys) {
					this.emit('project-settings', { func: 'setBreakpoints', value: value });
				}
			}]);

			return SettingsView;
		}(View);

		module.exports = SettingsView;
	}, { "./View": 11 }], 9: [function (require, module, exports) {
		var View = require('./View');

		// private variables
		var _tabsOpen = false;

		var TabView = function (_View7) {
			_inherits(TabView, _View7);

			function TabView() {
				_classCallCheck(this, TabView);

				// open/close tabs

				var _this11 = _possibleConstructorReturn(this, Object.getPrototypeOf(TabView).call(this, 'tab'));

				$('#flexit').on('click', function () {
					//console.log("CLICKY");
					if (_tabsOpen) {
						_this11.closeTabs();
					} else {
						_this11.openTabs();
					}
				});

				$('label').on('click', function (e) {
					if (!_tabsOpen) {
						_this11.openTabs();
						e.stopPropagation();
					}
				});

				// golden layout
				var layout = new GoldenLayout({
					settings: {
						hasHeaders: false,
						constrainDragToContainer: true,
						reorderEnabled: false,
						selectionEnabled: false,
						popoutWholeStack: false,
						blockedPopoutsThrowError: true,
						closePopoutsOnUnload: true,
						showPopoutIcon: false,
						showMaximiseIcon: false,
						showCloseIcon: false
					},
					dimensions: {
						borderWidth: 5,
						minItemHeight: 10,
						minItemWidth: 10,
						headerHeight: 20,
						dragProxyWidth: 300,
						dragProxyHeight: 200
					},
					labels: {
						close: 'close',
						maximise: 'maximise',
						minimise: 'minimise',
						popout: 'open in new window'
					},
					content: [{
						type: 'column',
						content: [{
							type: 'row',
							content: [{
								type: 'component',
								componentName: 'Editor'
							}]
						}, {
							type: 'component',
							componentName: 'Console',
							height: 25
						}]
					}]
				});
				layout.registerComponent('Editor', function (container, componentState) {
					container.getElement().append($('#innerContent'));
				});
				layout.registerComponent('Console', function (container, componentState) {
					container.getElement().append($('#beaglert-console'));
				});

				layout.init();
				layout.on('initialised', function () {
					return _this11.emit('change');
				});
				layout.on('stateChanged', function () {
					return _this11.emit('change');
				});

				$(window).on('resize', function () {
					if (_tabsOpen) {
						_this11.openTabs();
					} else {
						_this11.closeTabs();
					}
				});

				return _this11;
			}

			_createClass(TabView, [{
				key: "openTabs",
				value: function openTabs() {
					$('#editor').css('right', '500px');
					$('#right').css('left', window.innerWidth - 500 + 'px');
					_tabsOpen = true;
					this.emit('change');
					$('#tab-0').addClass('open');
				}
			}, {
				key: "closeTabs",
				value: function closeTabs() {
					$('#editor').css('right', '60px');
					$('#right').css('left', window.innerWidth - 60 + 'px');
					_tabsOpen = false;
					this.emit('change');
					$('#tab-0').removeClass('open');
				}
			}]);

			return TabView;
		}(View);

		module.exports = new TabView();
	}, { "./View": 11 }], 10: [function (require, module, exports) {
		var View = require('./View');

		var ToolbarView = function (_View8) {
			_inherits(ToolbarView, _View8);

			function ToolbarView(className, models) {
				_classCallCheck(this, ToolbarView);

				var _this12 = _possibleConstructorReturn(this, Object.getPrototypeOf(ToolbarView).call(this, className, models));

				console.log(_this12.$elements);
				_this12.$elements.on('click', function (e) {
					return _this12.buttonClicked($(e.currentTarget), e);
				});

				$('#run').mouseover(function () {
					$('#control-text-1').html('<p>Run</p>');
				}).mouseout(function () {
					$('#control-text-1').html('');
				});

				$('#stop').mouseover(function () {
					$('#control-text-1').html('<p>Stop</p>');
				}).mouseout(function () {
					$('#control-text-1').html('');
				});

				$('#new-tab').mouseover(function () {
					$('#control-text-2').html('<p>New Tab</p>');
				}).mouseout(function () {
					$('#control-text-2').html('');
				});

				$('#download').mouseover(function () {
					$('#control-text-2').html('<p>Download project</p>');
				}).mouseout(function () {
					$('#control-text-2').html('');
				});

				$('#console').mouseover(function () {
					$('#control-text-3').html('<p>Clear console</p>');
				}).mouseout(function () {
					$('#control-text-3').html('');
				});

				$('#scope').mouseover(function () {
					$('#control-text-3').html('<p>Open scope</p>');
				}).mouseout(function () {
					$('#control-text-3').html('');
				});
				return _this12;
			}

			// UI events


			_createClass(ToolbarView, [{
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "run",
				value: function run(func) {
					this.emit('process-event', func);
				}
			}, {
				key: "stop",
				value: function stop(func) {
					this.emit('process-event', func);
				}
			}, {
				key: "clearConsole",
				value: function clearConsole() {
					this.emit('clear-console');
				}

				// model events

			}, {
				key: "__running",
				value: function __running(status) {
					if (status) {
						if (!$('#run').hasClass('spinning')) {
							$('#run').addClass('spinning');
						}
					} else {
						if ($('#run').hasClass('spinning')) {
							$('#run').removeClass('spinning');
						}
					}
				}
			}, {
				key: "__checkingSyntax",
				value: function __checkingSyntax(status) {
					if (status) {
						$('#status').css('background', 'url("images/toolbar.png") -210px 35px');
					} else {
						//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
					}
				}
			}, {
				key: "__allErrors",
				value: function __allErrors(errors) {
					//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout);
					if (errors.length) {
						$('#status').css('background', 'url("images/toolbar.png") -175px 35px');
					} else {
						$('#status').css('background', 'url("images/toolbar.png") -140px 35px');
					}
				}
			}, {
				key: "_CPU",
				value: function _CPU(data) {

					var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
					var bela = 0;

					if (data.bela != 0) {

						// extract the data from the output
						var lines = data.bela.split('\n');
						var taskData = [],
						    output = [];
						for (var j = 0; j < lines.length; j++) {
							taskData.push([]);
							lines[j] = lines[j].split(' ');
							for (var k = 0; k < lines[j].length; k++) {
								if (lines[j][k]) {
									taskData[j].push(lines[j][k]);
								}
							}
						}

						for (var j = 0; j < taskData.length; j++) {
							if (taskData[j].length) {
								var proc = {
									'name': taskData[j][7],
									'cpu': taskData[j][6],
									'msw': taskData[j][2],
									'csw': taskData[j][3]
								};
								// ignore uninteresting data
								if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:') {
									output.push(proc);
								}
							}
						}

						for (var j = 0; j < output.length; j++) {
							if (output[j].cpu) {
								bela += parseFloat(output[j].cpu);
							}
						}
					}

					$('#ide-cpu').html('IDE: ' + ide.toFixed(1) + '%');
					$('#bela-cpu').html('Bela: ' + bela.toFixed(1) + '%');
				}
			}, {
				key: "_cpuMonitoring",
				value: function _cpuMonitoring(value) {
					if (parseInt(value)) $('#ide-cpu, #bela-cpu').css('visibility', 'visible');else $('#ide-cpu, #bela-cpu').css('visibility', 'hidden');
				}
			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (status) {
						if (!$('#run').hasClass('spinning')) {
							$('#run').addClass('spinning');
						}
					} else {
						if ($('#run').hasClass('spinning')) {
							$('#run').removeClass('spinning');
						}
					}
				}
			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					if (!status && $('#run').hasClass('spinning')) $('#run').removeClass('spinning');
				}
			}]);

			return ToolbarView;
		}(View);

		module.exports = ToolbarView;
	}, { "./View": 11 }], 11: [function (require, module, exports) {
		var EventEmitter = require('events').EventEmitter;

		var View = function (_EventEmitter2) {
			_inherits(View, _EventEmitter2);

			function View(CSSClassName, models, settings) {
				_classCallCheck(this, View);

				var _this13 = _possibleConstructorReturn(this, Object.getPrototypeOf(View).call(this));

				_this13.className = CSSClassName;
				_this13.models = models;
				_this13.settings = settings;
				_this13.$elements = $('.' + CSSClassName);
				_this13.$parents = $('.' + CSSClassName + '-parent');

				if (models) {
					for (var i = 0; i < models.length; i++) {
						models[i].on('change', function (data, changedKeys) {
							_this13.modelChanged(data, changedKeys);
						});
						models[i].on('set', function (data, changedKeys) {
							_this13.modelSet(data, changedKeys);
						});
					}
				}

				_this13.$elements.filter('select').on('change', function (e) {
					return _this13.selectChanged($(e.currentTarget), e);
				});
				_this13.$elements.filter('input').on('input', function (e) {
					return _this13.inputChanged($(e.currentTarget), e);
				});
				_this13.$elements.filter('input[type=checkbox]').on('change', function (e) {
					return _this13.inputChanged($(e.currentTarget), e);
				});
				_this13.$elements.filter('button').on('click', function (e) {
					return _this13.buttonClicked($(e.currentTarget), e);
				});

				return _this13;
			}

			_createClass(View, [{
				key: "modelChanged",
				value: function modelChanged(data, changedKeys) {
					var _iteratorNormalCompletion9 = true;
					var _didIteratorError9 = false;
					var _iteratorError9 = undefined;

					try {
						for (var _iterator9 = changedKeys[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
							var value = _step9.value;

							if (this['_' + value]) {
								this['_' + value](data[value], data, changedKeys);
							}
						}
					} catch (err) {
						_didIteratorError9 = true;
						_iteratorError9 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion9 && _iterator9.return) {
								_iterator9.return();
							}
						} finally {
							if (_didIteratorError9) {
								throw _iteratorError9;
							}
						}
					}
				}
			}, {
				key: "modelSet",
				value: function modelSet(data, changedKeys) {
					var _iteratorNormalCompletion10 = true;
					var _didIteratorError10 = false;
					var _iteratorError10 = undefined;

					try {
						for (var _iterator10 = changedKeys[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
							var value = _step10.value;

							if (this['__' + value]) {
								this['__' + value](data[value], data, changedKeys);
							}
						}
					} catch (err) {
						_didIteratorError10 = true;
						_iteratorError10 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion10 && _iterator10.return) {
								_iterator10.return();
							}
						} finally {
							if (_didIteratorError10) {
								throw _iteratorError10;
							}
						}
					}
				}
			}, {
				key: "selectChanged",
				value: function selectChanged(element, e) {}
			}, {
				key: "buttonClicked",
				value: function buttonClicked(element, e) {}
			}, {
				key: "printElements",
				value: function printElements() {
					console.log('elements:', this.$elements, 'parents:', this.$parents);
				}
			}]);

			return View;
		}(EventEmitter);

		module.exports = View;
	}, { "events": 14 }], 12: [function (require, module, exports) {
		'use strict';

		var EventEmitter = require('events').EventEmitter;
		//var $ = require('jquery-browserify');

		// module variables
		var numElements = 0,
		    maxElements = 200,
		    consoleDelete = true;

		var Console = function (_EventEmitter3) {
			_inherits(Console, _EventEmitter3);

			function Console() {
				_classCallCheck(this, Console);

				var _this14 = _possibleConstructorReturn(this, Object.getPrototypeOf(Console).call(this));

				_this14.$element = $('#beaglert-consoleWrapper');
				_this14.parent = document.getElementById('beaglert-console');
				return _this14;
			}

			_createClass(Console, [{
				key: "print",
				value: function print(text, className, id, onClick) {
					var el = $('<div></div>').addClass('beaglert-console-' + className).appendTo(this.$element);
					if (id) el.prop('id', id);
					$('<span></span>').html(text).appendTo(el);
					if (numElements++ > maxElements) this.clear(numElements / 4);
					if (onClick) el.on('click', onClick);
					return el;
				}

				// log an unhighlighted message to the console

			}, {
				key: "log",
				value: function log(text) {
					var msgs = text.split('\n');
					for (var i = 0; i < msgs.length; i++) {
						if (msgs[i] !== '' && msgs[i] !== ' ') {
							this.print(msgs[i], 'log');
						}
					}
					this.scroll();
				}
				// log a warning message to the console

			}, {
				key: "warn",
				value: function warn(text, id) {
					var msgs = text.split('\n');
					for (var i = 0; i < msgs.length; i++) {
						if (msgs[i] !== '') {
							this.print(msgs[i], 'warning', id, function () {
								var $el = $(this);
								$el.addClass('beaglert-console-collapsed');
								$el.on('transitionend', function () {
									if ($el.hasClass('beaglert-console-collapsed')) {
										$el.remove();
									} else {
										$el.addClass('beaglert-console-collapsed');
									}
								});
							});
						}
					}
					this.scroll();
				}
			}, {
				key: "newErrors",
				value: function newErrors(errors) {
					var _this15 = this;

					$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();

					var _iteratorNormalCompletion11 = true;
					var _didIteratorError11 = false;
					var _iteratorError11 = undefined;

					try {
						var _loop3 = function _loop3() {
							var err = _step11.value;


							// create the element and add it to the error object
							div = $('<div></div>').addClass('beaglert-console-i' + err.type);

							// create the link and add it to the element

							anchor = $('<a></a>').html(err.text).appendTo(div);


							div.appendTo(_this15.$element);

							if (err.currentFile) {
								div.on('click', function () {
									return _this15.emit('focus', { line: err.row + 1, column: err.column - 1 });
								});
							} else {
								div.on('click', function () {
									return _this15.emit('open-file', err.file, { line: err.row + 1, column: err.column - 1 });
								});
							}
						};

						for (var _iterator11 = errors[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
							var div;
							var anchor;

							_loop3();
						}
					} catch (err) {
						_didIteratorError11 = true;
						_iteratorError11 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion11 && _iterator11.return) {
								_iterator11.return();
							}
						} finally {
							if (_didIteratorError11) {
								throw _iteratorError11;
							}
						}
					}

					this.scroll();
				}

				// log a positive notification to the console
				// if persist is not true, the notification will be removed quickly
				// otherwise it will just fade

			}, {
				key: "notify",
				value: function notify(notice, id) {
					$('#' + id).remove();
					var el = this.print(notice, 'notify', id);
					this.scroll();
					return el;
				}
			}, {
				key: "fulfill",
				value: function fulfill(message, id, persist) {
					var el = document.getElementById(id);
					//if (!el) el = this.notify(message, id);
					var $el = $(el);
					$el.appendTo(this.$element); //.removeAttr('id');
					$el.html($el.html() + message);
					setTimeout(function () {
						return $el.addClass('beaglert-console-faded');
					}, 500);
					if (!persist) {
						$el.on('transitionend', function () {
							if ($el.hasClass('beaglert-console-collapsed')) {
								$el.remove();
							} else {
								$el.addClass('beaglert-console-collapsed');
							}
						});
					}
				}
			}, {
				key: "reject",
				value: function reject(message, id, persist) {
					var el = document.getElementById(id);
					//if (!el) el = this.notify(message, id);
					var $el = $(el);
					$el.appendTo(this.$element); //.removeAttr('id');
					$el.html($el.html() + message);
					$el.addClass('beaglert-console-rejectnotification');
					setTimeout(function () {
						return $el.removeClass('beaglert-console-rejectnotification').addClass('beaglert-console-faded');
					}, 500);
					$el.on('click', function () {
						return $el.addClass('beaglert-console-collapsed').on('transitionend', function () {
							return $el.remove();
						});
					});
				}

				// clear the console

			}, {
				key: "clear",
				value: function clear(number) {
					if (!consoleDelete) return;
					if (number) {
						$("#beaglert-consoleWrapper > div:lt(" + parseInt(number) + ")").remove();
						numElements -= parseInt(number);
					} else {
						$('#beaglert-consoleWrapper > div').remove();
						numElements = 0;
					}
				}

				// force the console to scroll to the bottom

			}, {
				key: "scroll",
				value: function scroll() {
					var _this16 = this;

					setTimeout(function () {
						return _this16.parent.scrollTop = _this16.parent.scrollHeight;
					}, 0);
				}
			}, {
				key: "setConsoleDelete",
				value: function setConsoleDelete(to) {
					consoleDelete = to;
				}
			}]);

			return Console;
		}(EventEmitter);

		;

		module.exports = new Console();

		// gracefully remove a console element after an event ((this) must be bound to the element)
		/*function dismiss(){
  	if (IDE.getSetting('consoleAnimations')) $(this).addClass('beaglert-console-collapsed');
  	setTimeout(() => {
  		if ($.contains(parent, this)){
  			$(this).remove();
  			numElements -= 1;
  		}
  	}, 500);
  }*/
	}, { "events": 14 }], 13: [function (require, module, exports) {
		//var $ = require('jquery-browserify');
		var IDE;

		$(function () {
			IDE = require('./IDE-browser');
		});
	}, { "./IDE-browser": 1 }], 14: [function (require, module, exports) {
		// Copyright Joyent, Inc. and other Node contributors.
		//
		// Permission is hereby granted, free of charge, to any person obtaining a
		// copy of this software and associated documentation files (the
		// "Software"), to deal in the Software without restriction, including
		// without limitation the rights to use, copy, modify, merge, publish,
		// distribute, sublicense, and/or sell copies of the Software, and to permit
		// persons to whom the Software is furnished to do so, subject to the
		// following conditions:
		//
		// The above copyright notice and this permission notice shall be included
		// in all copies or substantial portions of the Software.
		//
		// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
		// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
		// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
		// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
		// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
		// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
		// USE OR OTHER DEALINGS IN THE SOFTWARE.

		function EventEmitter() {
			this._events = this._events || {};
			this._maxListeners = this._maxListeners || undefined;
		}
		module.exports = EventEmitter;

		// Backwards-compat with node 0.10.x
		EventEmitter.EventEmitter = EventEmitter;

		EventEmitter.prototype._events = undefined;
		EventEmitter.prototype._maxListeners = undefined;

		// By default EventEmitters will print a warning if more than 10 listeners are
		// added to it. This is a useful default which helps finding memory leaks.
		EventEmitter.defaultMaxListeners = 10;

		// Obviously not all Emitters should be limited to 10. This function allows
		// that to be increased. Set to zero for unlimited.
		EventEmitter.prototype.setMaxListeners = function (n) {
			if (!isNumber(n) || n < 0 || isNaN(n)) throw TypeError('n must be a positive number');
			this._maxListeners = n;
			return this;
		};

		EventEmitter.prototype.emit = function (type) {
			var er, handler, len, args, i, listeners;

			if (!this._events) this._events = {};

			// If there is no 'error' event listener then throw.
			if (type === 'error') {
				if (!this._events.error || isObject(this._events.error) && !this._events.error.length) {
					er = arguments[1];
					if (er instanceof Error) {
						throw er; // Unhandled 'error' event
					}
					throw TypeError('Uncaught, unspecified "error" event.');
				}
			}

			handler = this._events[type];

			if (isUndefined(handler)) return false;

			if (isFunction(handler)) {
				switch (arguments.length) {
					// fast cases
					case 1:
						handler.call(this);
						break;
					case 2:
						handler.call(this, arguments[1]);
						break;
					case 3:
						handler.call(this, arguments[1], arguments[2]);
						break;
					// slower
					default:
						args = Array.prototype.slice.call(arguments, 1);
						handler.apply(this, args);
				}
			} else if (isObject(handler)) {
				args = Array.prototype.slice.call(arguments, 1);
				listeners = handler.slice();
				len = listeners.length;
				for (i = 0; i < len; i++) {
					listeners[i].apply(this, args);
				}
			}

			return true;
		};

		EventEmitter.prototype.addListener = function (type, listener) {
			var m;

			if (!isFunction(listener)) throw TypeError('listener must be a function');

			if (!this._events) this._events = {};

			// To avoid recursion in the case that type === "newListener"! Before
			// adding it to the listeners, first emit "newListener".
			if (this._events.newListener) this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);

			if (!this._events[type])
				// Optimize the case of one listener. Don't need the extra array object.
				this._events[type] = listener;else if (isObject(this._events[type]))
				// If we've already got an array, just append.
				this._events[type].push(listener);else
				// Adding the second element, need to change to array.
				this._events[type] = [this._events[type], listener];

			// Check for listener leak
			if (isObject(this._events[type]) && !this._events[type].warned) {
				if (!isUndefined(this._maxListeners)) {
					m = this._maxListeners;
				} else {
					m = EventEmitter.defaultMaxListeners;
				}

				if (m && m > 0 && this._events[type].length > m) {
					this._events[type].warned = true;
					console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
					if (typeof console.trace === 'function') {
						// not supported in IE 10
						console.trace();
					}
				}
			}

			return this;
		};

		EventEmitter.prototype.on = EventEmitter.prototype.addListener;

		EventEmitter.prototype.once = function (type, listener) {
			if (!isFunction(listener)) throw TypeError('listener must be a function');

			var fired = false;

			function g() {
				this.removeListener(type, g);

				if (!fired) {
					fired = true;
					listener.apply(this, arguments);
				}
			}

			g.listener = listener;
			this.on(type, g);

			return this;
		};

		// emits a 'removeListener' event iff the listener was removed
		EventEmitter.prototype.removeListener = function (type, listener) {
			var list, position, length, i;

			if (!isFunction(listener)) throw TypeError('listener must be a function');

			if (!this._events || !this._events[type]) return this;

			list = this._events[type];
			length = list.length;
			position = -1;

			if (list === listener || isFunction(list.listener) && list.listener === listener) {
				delete this._events[type];
				if (this._events.removeListener) this.emit('removeListener', type, listener);
			} else if (isObject(list)) {
				for (i = length; i-- > 0;) {
					if (list[i] === listener || list[i].listener && list[i].listener === listener) {
						position = i;
						break;
					}
				}

				if (position < 0) return this;

				if (list.length === 1) {
					list.length = 0;
					delete this._events[type];
				} else {
					list.splice(position, 1);
				}

				if (this._events.removeListener) this.emit('removeListener', type, listener);
			}

			return this;
		};

		EventEmitter.prototype.removeAllListeners = function (type) {
			var key, listeners;

			if (!this._events) return this;

			// not listening for removeListener, no need to emit
			if (!this._events.removeListener) {
				if (arguments.length === 0) this._events = {};else if (this._events[type]) delete this._events[type];
				return this;
			}

			// emit removeListener for all listeners on all events
			if (arguments.length === 0) {
				for (key in this._events) {
					if (key === 'removeListener') continue;
					this.removeAllListeners(key);
				}
				this.removeAllListeners('removeListener');
				this._events = {};
				return this;
			}

			listeners = this._events[type];

			if (isFunction(listeners)) {
				this.removeListener(type, listeners);
			} else if (listeners) {
				// LIFO order
				while (listeners.length) {
					this.removeListener(type, listeners[listeners.length - 1]);
				}
			}
			delete this._events[type];

			return this;
		};

		EventEmitter.prototype.listeners = function (type) {
			var ret;
			if (!this._events || !this._events[type]) ret = [];else if (isFunction(this._events[type])) ret = [this._events[type]];else ret = this._events[type].slice();
			return ret;
		};

		EventEmitter.prototype.listenerCount = function (type) {
			if (this._events) {
				var evlistener = this._events[type];

				if (isFunction(evlistener)) return 1;else if (evlistener) return evlistener.length;
			}
			return 0;
		};

		EventEmitter.listenerCount = function (emitter, type) {
			return emitter.listenerCount(type);
		};

		function isFunction(arg) {
			return typeof arg === 'function';
		}

		function isNumber(arg) {
			return typeof arg === 'number';
		}

		function isObject(arg) {
			return (typeof arg === "undefined" ? "undefined" : _typeof(arg)) === 'object' && arg !== null;
		}

		function isUndefined(arg) {
			return arg === void 0;
		}
	}, {}] }, {}, [13]);

//# sourceMappingURL=bundle.js.map
