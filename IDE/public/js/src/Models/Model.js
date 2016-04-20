var EventEmitter = require('events').EventEmitter;

// private variables
var data = {};

class Model extends EventEmitter{

	constructor(){
		super();
	}
	
	setData(newData){
		var newKeys = [];
		for (let key in newData){
			if (newData[key] !== data[key]){
				newKeys.push(key);
				data[key] = newData[key];
			}
		}
		if (newKeys.length) {
			this.emit('change', data, newKeys);
		}
	}
	
	setKey(key, value){
		if (value !== data[key]){
			data[key] = value;
			this.emit('change', data, [key]);
		}
	}
	
	print(){
		console.log(data);
	}
	
}

module.exports = Model;