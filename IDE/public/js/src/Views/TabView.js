var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		/*$('#flexit').on('click', () => {
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
		});*/
		
		// golden layout
		var layout = new GoldenLayout({
			settings:{
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
					type:'row',
					content: [{
						type:'component',
						componentName: 'Editor',
					}, {
						type:'component',
						componentName: 'Tabs',
					}]
				}, {
					type:'component',
					componentName: 'Console',
					height: 25
				}]
			}]
		});
		layout.registerComponent( 'Editor', function( container, componentState ){
			container.getElement().append($('#editor'));
		});
		layout.registerComponent( 'Tabs', function( container, componentState ){
			container.getElement().append($('#right'));
		});
		layout.registerComponent( 'Console', function( container, componentState ){
			container.getElement().append($('#toolbar')).append($('#beaglert-console'));
		});
		
		layout.init();
		
	}
	
	openTabs(){
		$('#editor').css('right', '500px');
		$('#right').css('left', window.innerWidth - 500 + 'px');
		_tabsOpen = true;
		this.emit('change');
	}

	closeTabs(){
		$('#editor').css('right', '60px');
		$('#right').css('left', window.innerWidth - 60 + 'px');
		_tabsOpen = false;
		this.emit('change');
	}
	
}

module.exports = new TabView();