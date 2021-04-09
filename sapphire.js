(function (window, safari, extension, undefined) {
	if (window.top != window) { return; }
	
	
	/**
	 * The CSS Query Selector
	 * === Parameters ===
	 * - sel (string):			The CSS selector to search for
	 * - root (DOMObject):		The DOM object to start from, defaults to the document
	 **/
	function Sapphire (sel, root) { return toArray((root || document).querySelectorAll(sel)); }
	
	
	/**
	 * Version number
	 **/
	Sapphire.version = "0.8a";
	
	/**
	 * Shortcut for the extensions BaseURI
	 **/
	Sapphire.Base = extension.baseURI;
	
	
	/**
	 * Convert objects into query strings
	 * === Parameters ===
	 * - obj (object):			The object to convert
	 * === Returns ===
	 * - (string):				The resulting query string
	 **/
	function toQueryString (obj) {
		var qs = [], key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) { qs.push(key + "=" + encodeURIComponent(obj[key])); }
		}
		return qs.join('&');
	}
	
	/**
	 * Check if passed object is a Function
	 * === Parameters ===
	 * - obj (object):			The object to check
	 * === Returns ===
	 * - (bool):				true for functions, false for anything else
	 **/
	
	function isFunction (obj) { return toString.call(obj) === "[object Function]"; }
	/**
	 * Check if passed object is an Array
	 * === Parameters ===
	 * - obj (object):			The object to check
	 * === Returns ===
	 * - (bool):				true for arrays, false for anything else
	 **/
	function isArray (obj) { return toString.call(obj) === "[object Array]"; }
	
	
	
	function toArray (obj) { return Array.prototype.slice.call(obj); }
	
	/**
	 * Check if passed object is a plain Object
	 * === Parameters ===
	 * - obj (object):			The object to check
	 * === Returns ===
	 * - (bool):				true for plain objects, false for anything else
	 **/
	function isPlainObject (obj) {
		var key;
		if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval) { return false; }
		if (obj.constructor && !hasOwnProperty.call(obj, "constructor") && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
			return false;
		}
		for (key in obj) {}
		
		return key === undefined || hasOwnProperty.call( obj, key );
	}
	
	/**
	 * Check if passed object is an empty Object
	 * === Parameters ===
	 * - obj (object):			The object to check
	 * === Returns ===
	 * - (bool):				true is object is empty, false for anything else
	 **/
	function isEmptyObject (obj) {
		for (var name in obj) { return false; }
		return true;
	}
	
	
	
	/**
	 * Extend one object onto others
	 * - Based off of jQuery's implementation
	 **/
	Sapphire.Extend = function () {
		var target = arguments[0] || {};
		var deep = false;
		var i = 1;
		var len = arguments.length;
		var options, name, src, copy;
		
		if (typeof target === "boolean") {
			deep = target;
			target = arguments[1] || {};
			i = 2;
		}
		
		if (typeof target !== "object" && !isFunction(target)) { target = {}; }
		
		for ( ; i < len; i++) {
			if ((options = arguments[i]) != null) {
				for (var name in options) {
					src = target[name];
					copy = options[name];
					if (target === copy) { continue }
					
					if ( deep && copy && ( isPlainObject(copy) || isArray(copy) ) ) {
						var clone = src && ( isPlainObject(src) || isArray(src) ) ? src : isArray(copy) ? [] : {};
						target[ name ] = Sapphire.Extend( deep, clone, copy );
					}
					else if ( copy !== undefined ) { target[ name ] = copy; }
				}
			}
		}
		
		return target;
	}
	//	for (var key in extended) { original[key] = extended[key]; }
	//	return original;
	
	/**
	 * Create individual Event Emitters
	 * === Methods ===
	 * - emit:					Triggers the event, with scope and arguments passed
	 * - on:					Add listeners for events
	 * - removeListener:		Remove specific listeners from the event
	 * - removeAllListeners:	Remove all listeners from the event
	 * - listeners:				Return all of the listeners for the event
	 **/
	Sapphire.EventEmitter = function () {
		var events = {};
		var self = this;
		
		this.emit = function () {
			var args = Array.prototype.slice.call(arguments);
			var event = args.shift();
			var scope = args.shift() || window;
			if (!events[event]) return;
			events[event].forEach(function (listener) { listener.apply(scope, args); });
		};
		this.on = function (event, callback) {
			self.emit('newListener', null, event, callback);
			if (!events[event]) { events[event] = [ callback ]; return; }
			events[event].push(callback);
		};
		this.removeListener = function (event, callback) {
			if (!events[event]) return;
			events[event] = events[event].filter(function (listener) { return !(listener === callback); });
		};
		this.removeAllListeners = function (event) { events[event] = []; };
		this.listeners = function (event) { return events[event] || []; };
	}
	
	
	
	/**
	 * Request Default values
	 * - Alter this to change the defaults for the Request function
	 **/
	Sapphire.RequestDefaults = {
		url:		null,
		method:		"get",
		headers:	{
		    'Accept': 'text/javascript, text/html, application/xml, text/xml, application/json, */*'
		},
		urlEncode:	true,
		noCache:	false,
		async:		true,
		data:		null,
		encoding:	"utf-8",
		isSuccess:	function (status) { return ((status >= 200) && (status < 300)); },
		format:		"text"
	};
	
	/**
	 * Event Based XMLHttpRequest Wrapper
	 * - Implements EventEmitter
	 * === Parameters ===
	 * - url (string):			URL of the requested page to load
	 * - method (string):		The HTTP method to use when requesting the page
	 * - data (object/string):	Data sent during the request
	 * - headers (object):		Headers passed in the request
	 * - urlEncode (bool):		UrlEncode the data for POST requests
	 * - encoding (string):		Encoding of the URL encoded data
	 * - noCache (bool):		Force the resource to be loaded without caching
	 * - async (bool):			Perform the request asynchronously
	 * - isSuccess (function):	Function to detect if the response was a successful one
	 * - format (string):		Supported: text, json, xml.
	 * === Methods ===
	 * - send:					Sends the XMLHttpRequest
	 * - cancel:				Cancels the XMLHttpRequest
	 * - setHeader:				Sets the headers
	 * === Events ===
	 * - request:				Triggered just before the request is sent
	 * - success:				Triggered when the response matches the isSuccess critera
	 * - error:					Triggered when the response doesnt match the isSuccess criteria
	 * - cancel:				Triggered when cancel method is called
	 **/
	Sapphire.Request = function (options) {
		// Inherit events
		Sapphire.EventEmitter.call(this);
		
		options = Sapphire.Extend(true, {}, Sapphire.RequestDefaults, options);
		
		var xhr = new XMLHttpRequest();
		var status = 0;
		var running = false;
		var self = this;
		
		function onReadyStateChange () {
			if (xhr.readyState != 4 || !running) return;
			status = xhr.status || 0;
			running = false;
			
			if (options.isSuccess.call(xhr, status)) {
				var response = xhr.responseText;
				
				try {
					if (options.format == "json") { response = JSON.parse(response); }
					if (options.format == "xml") {
						response = xhr.responseXML || (new DOMParser()).parseFromString(response, "text/xml");
					}
					if (options.format == "html") {
						var temp = document.createElement('div');
						temp.innerHTML = response.replace(/<script(.|\s)*?\/script>/g, '');
						response = temp;
					}
				}
				catch (e) { }
				
				self.emit('success', xhr, response, status);
			}
			else { self.emit('error', xhr, status); }
		}
		
		this.send = function () {
			var method = options.method.toUpperCase();
			var url = options.url;
			var data = options.data;
			running = true;
			
			if (typeof data === "object") { data = toQueryString(data); }
			
			self.setHeader('X-Sapphire', Sapphire.version);
			
			if (options.urlEncode && method == "POST") {
				var encoding = (options.encoding) ? '; charset=' + options.encoding : '';
				self.setHeader('Content-type', 'application/x-www-form-urlencoded' + encoding);
			}
			
			if (options.noCache) {
				var noCache = 'noCache=' + (new Date()).getTime();
				data = (data) ? noCache + '&' + data : noCache;
			}
			
			if (data && method == "GET") {
				url = url + (url.indexOf('?') > -1 ? '&' : '?') + data;
				data = null;
			}
			
			xhr.open(method, url, options.async);
			if (options.format == "xml") { xhr.overrideMimeType("text/xml"); }
			for (var key in options.headers) { xhr.setRequestHeader(key, options.headers[key]); }
			xhr.onreadystatechange = onReadyStateChange;
			
			self.emit('request', xhr);
			xhr.send(data);
		};
		
		this.cancel = function () {
			if (!running) return;
			running = false;
			xhr.abort();
			xhr.onreadystatechange = function () {};
			xhr = new XMLHttpRequest();
			self.emit('cancel');
		};
		
		this.setHeader = function (name, value) { options.headers[name] = value; };
	}
	
	
	
	Sapphire.stats = function () {
		
		var last_run_version = window.localStorage.last_run_version;
		
		var platform = navigator.platform;
		
		
		var plist = new Sapphire.Request({
			url:		Sapphire.Base + "Info.plist",
			format:		"xml",
			isSuccess:	function () { return true; }
		});
		plist.on('success', function (xml) {
			
			var data = {};
			var keys = toArray(xml.querySelectorAll('plist key'));
			keys.forEach(function (item) {
				var key = item.textContent;
				var node = item.nextSibling;
				while(node && node.nodeType == 3) { node = node.nextSibling; }
				if (node.tagName !== "string") { return; }
				
				data[key] = node.textContent;
			});
			
			var name = data.CFBundleIdentifier;
			var version = "v" + data.CFBundleShortVersionString + ",b" + data.CFBundleVersion;
			
			// Version 
			if (last_run_version === version) { return; }
			
			window.localStorage.last_run_version = version;
			
			var data = { version: version, platform: platform, extension: name };
			
			if (typeof last_run_version !== "undefined") {
				// First run after update
				data.update_from = last_run_version;
			}
			
			var stats = new Sapphire.Request({
				url:	"http://dreamtbyphil.co.uk/extensions/stats.php",
				method:	"post",
				data:	data
			});
			
			// As you can plainly see, this code contains no evil.
			// It simply sends your platform and extension version
			// when the extension is installed or updated. This is
			// monitor basic usage statistics. No uniquely identifable
			// information is stored.
			
			stats.on('success', function () { console.log('Sapphire: First run data sent.'); });
			stats.on('error', function () { console.warn('Sapphire: First run data failed.'); });
			stats.send();
		});
		plist.on('error', function () { console.warn('Sapphire: Unable to load or parse Info.plist.'); });
		plist.send();
	}
	
	
	/**
	 * Current Tab Shortcut
	 **/
	
	Sapphire.currentTab = function () {
		return safari.activeBrowserWindow.activeTab;
	}
	
	
	/**
	 * Evented Settings Wrapper
	 * === Methods ===
	 * - setItem:				Sets a preference item to a value
	 * - getItem:				Returns a preference items value
	 * - removeItem:			Removes the contents of a preference item
	 * - clear:					Removes all preference items
	 * - on:					Listen for preference item changes
	 * - removeListener:		Removes specific listener for preference item changes
	 * - removeAllListeners:	Removes all listens for all preference item changes
	 * - listeners:				Lists all of the current event listeners for a specific preference item
	 **/
	Sapphire.Settings = new (function () {
		// Inherit event emitter
		Sapphire.EventEmitter.call(this);
		
		var self = this;
		
		var settings_lock = false;
		var settings_onchange = function (secure) {
			return function (event) {
				if (settings_lock) return;
				self.emit(event.key, event, event.oldValue, event.newValue, true);
			}
		};
		
		//extension.secureSettings.addEventListener('change', settings_onchange(true));
		extension.settings.addEventListener('change', settings_onchange(false));
		
		this.setItem = function (name, value, secure) {
			settings_lock = true;
			if (secure) { extension.secureSettings.setItem(name, value); }
			else { extension.settings.setItem(name, value); }
			settings_lock = false;
		};
		this.getItem = function (name, secure) {
			if (secure) { return extension.secureSettings.getItem(name); }
			return extension.settings.getItem(name);
		};
		this.removeItem = function (name, secure) {
			if (secure) { extension.secureSettings.removeItem(name); return; }
			extension.settings.removeItem(name);
		};
		this.clear = function (secure) {
			if (secure) { extension.secureSettings.clear(); return; }
			extension.settings.clear();
		};
	})();
	
	
	/**
	 * Quickly make a new Tab, and go to a URL
	 * === Parameters ===
	 * - url (string):				The URL to go to.
	 * === Returns ===
	 * - (SafariBrowserTab):		The new browser tab
	 **/
	Sapphire.newTab = function (url) {
		var tab = safari.activeBrowserWindow.openTab();
		tab.url = url;
		return tab;
	}
	/**
	 * Quickly make a new Window, and go to a URL
	 * === Parameters ===
	 * - url (string):				The URL to go to.
	 * === Returns ===
	 * - (SafariBrowserTab):		The new browser tab
	 **/
	Sapphire.newWindow = function (url) {
		var tab = safari.openBrowserWindow().activeTab;
		tab.url = url;
		return tab;
	}
	
	
	Sapphire.animateButton = function (button, path, list, interval) {
		var step = 0;
		var max = list.length - 1;
		interval = parseInt(interval) || 100;
		if (button.animation) { clearInterval(button.animation); }
		
		button.startAnimation = function () {
			button.animation = setInterval(function () {
				button.image = Sapphire.Base + path + list[step];
				if (++step > max) { step = 0; }
			}, interval);
		}
		button.stopAnimation = function () { clearInterval(button.animation); };
		
		button.startAnimation();
	}
	
	
	/**
	 * Simple Command Event Emitter
	 * - Implements EventEmitter
	 **/
	Sapphire.Command = new Sapphire.EventEmitter();
	Sapphire.Validate = new Sapphire.EventEmitter();
	Sapphire.Message = new Sapphire.EventEmitter();
	safari.addEventListener("command", function (event) { Sapphire.Command.emit(event.command, event, event.target); }, false);
	safari.addEventListener("validate", function (event) { Sapphire.Validate.emit(event.command, event, event.target); }, false);
	safari.addEventListener("message", function (event) { Sapphire.Message.emit(event.name, event, event.message); }, false)
	
	
	// Anonymous Usage statistics
	Sapphire.stats();
	
	
	/**
	 * Extend the Sapphire object and then expose it to the world with the Window object
	 **/
	window.Sapphire = window.$ = Sapphire;
	
	
})(window, safari.application, safari.extension);