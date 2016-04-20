// singleton IDE controller

class IDE{ constructor(){} }
module.exports = new IDE();

var Model = require('./Models/Model');

var editor = ace.edit('editor');

// set up models
var models = {};
models.project = new Model();
models.settings = new Model();

// set up views
var tabView = require('./Views/TabView');
tabView.on('change', () => editor.resize() );