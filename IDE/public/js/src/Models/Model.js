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
		if (!newData) return;
		var newKeys = [];
		for (let key in newData){
			if (!_equals(newData[key], this._getData()[key], false)){
				newKeys.push(key);
				this._getData()[key] = newData[key];
			}
		}
		if (newKeys.length) {
			this.emit('change', this._getData(), newKeys);
		}
		this.emit('set', this._getData(), Object.keys(newData));
	}
	
	setKey(key, value){
		if (!_equals(value, this._getData()[key])){
			this._getData()[key] = value;
			this.emit('change', this._getData(), [key]);
		}
		this.emit('set', this._getData(), [key]);
	}
	
	print(){
		console.log(this._getData());
	}
	
}

module.exports = Model;

function _equals(a, b, log){
	if (log) console.log('a:', a, 'b:', b);
	if (a instanceof Array && b instanceof Array){
		return ( (a.length === b.length) && a.every( function(element, index){ element === b[index] }) );
	} else if (a instanceof Object && b instanceof Object){
		if (log) console.log('objects', 'a:', a, 'b:', b);
		for (let c in a){ 
			if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
			if (!_equals(a[c], b[c], log)) return false;
		}
		return true;
	} else {
		if (log) console.log('a:', a, 'b:', b, Object.is(a, b), (a === b));
		return Object.is(a, b);
	}
}
	
	
	
	
	
	
	