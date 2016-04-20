var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		$('#flexit').on('click', () => {
			if (_tabsOpen){
				this.closeTabs();
			} else {
				this.openTabs();
			}
		});

		$('label').on('click', (e) => {
			if (!_tabsOpen){
				this.openTabs();
				e.stopPropagation();
			}
		});
		
	}
	
	openTabs(){
		$('#editor').css('right', '500px');
		$('#right').css('left', window.innerWidth - 500 + 'px');
		_tabsOpen = true;
		this.emit('change');
	}

	closeTabs(){
		$('#editor').css('right', '63px');
		$('#right').css('left', window.innerWidth - 63 + 'px');
		_tabsOpen = false;
		this.emit('change');
	}
	
}

module.exports = new TabView();