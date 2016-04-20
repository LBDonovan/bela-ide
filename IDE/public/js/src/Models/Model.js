var EventEmitter = require('events').EventEmitter;

class Model extends EventEmitter{

	constructor(data){
		super();
		var _data = data || {};
		this._getData = () => _data;
	}
	
	getKey(key){
		return this._getData()[key];
	}
	
	setData(newData){
		var newKeys = [];
		for (let key in newData){
			if (newData[key] !== this._getData()[key]){
				newKeys.push(key);
				this._getData()[key] = newData[key];
			}
		}
		if (newKeys.length) {
			this.emit('change', this._getData(), newKeys);
		}
	}
	
	setKey(key, value){
		if (value !== this._getData()[key]){
			this._getData()[key] = value;
			this.emit('change', this._getData(), [key]);
		}
	}
	
	print(){
		console.log(this._getData());
	}
	
}

module.exports = Model;