var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		$('#flexit').on('click', () => {
			console.log("CLICKY");
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
		var elem = document.getElementById("tab-0");
		$(elem).addClass('closed');
	}

	closeTabs(){
		$('#editor').css('right', '60px');
		$('#right').css('left', window.innerWidth - 60 + 'px');
		_tabsOpen = false;
		this.emit('change');
		var elem = document.getElementById("tab-0");
		$(elem).addClass('open');
	}
	
}

module.exports = new TabView();